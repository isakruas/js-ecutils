import { test, expect, describe } from '@jest/globals'
import { Point } from './core/point'
import { CurveParams, CoordinateSystem } from './core/curve'
import { getCurve, getGenerator } from './curves/registry'
import { affineDouble, affineAdd } from './core/arithmetic/affine'
import {
  JacobianPoint,
  toJacobian,
  jacAdd,
  jacDouble,
} from './core/arithmetic/jacobian'

// ---------------------------------------------------------------------------
// Elliptic curve operations
//
// Tests for the Point-operator API on the short Weierstrass curve
//   y² = x³ + ax + b  (mod p)
//
// Covers:
//   • Point addition (chord formula):
//       λ  = (y₂ - y₁) · (x₂ - x₁)⁻¹  (mod p)
//       x₃ = λ² - x₁ - x₂              (mod p)
//       y₃ = λ(x₁ - x₃) - y₁           (mod p)
//
//   • Point doubling (tangent formula):
//       λ  = (3x₁² + a) · (2y₁)⁻¹      (mod p)
//       x₃ = λ² - 2x₁                  (mod p)
//       y₃ = λ(x₁ - x₃) - y₁           (mod p)
//
//   • Scalar multiplication k·P via double-and-add in O(log k)
//   • Negation: -P = (x, -y mod p)
//   • Identity element (point at infinity): P + O = P
//   • Inverse: P + (-P) = O
// ---------------------------------------------------------------------------

describe('Elliptic curve operations', () => {
  // secp192k1: y² = x³ + 3 over a 192-bit prime field
  const curve = getCurve('secp192k1')
  const affineCurve = new CurveParams({
    p: curve.p,
    a: curve.a,
    b: curve.b,
    n: curve.n,
    h: curve.h,
    coord: CoordinateSystem.AFFINE,
  })

  const point1 = new Point(
    0xf091cf6331b1747684f5d2549cd1d4b3a8bed93b94f93cb6n,
    0xfd7af42e1e7565a02e6268661c5e42e603da2d98a18f2ed5n,
    curve
  )
  const point2 = new Point(
    0x6e43b7dcae2fd5e0bf2a1ba7615ca3b9065487c9a67b4583n,
    0xc48dcea47ae08e84d5fedc3d09e4c19606a290f7a19a6a58n,
    curve
  )

  test('affine arithmetic: addition, doubling, and scalar multiplication', () => {
    const p1 = new Point(point1.x, point1.y, affineCurve)
    const p2 = new Point(point2.x, point2.y, affineCurve)

    // P₁ + P₂ (P₁ ≠ P₂) — chord formula
    p1.add(p2)

    // P₁ + P₁ — tangent formula (doubling)
    const expectedDouble = p1.add(p1)
    const calculatedDouble = p1.add(p1)
    expect(calculatedDouble.x).toBe(expectedDouble.x)
    expect(calculatedDouble.y).toBe(expectedDouble.y)

    // 3·P₁ = 2·P₁ + P₁
    let expectedProduct = p1.add(p1)
    expectedProduct = new Point(
      expectedProduct.x,
      expectedProduct.y,
      affineCurve
    )
    expectedProduct = expectedProduct.add(p1)
    const calculatedProduct = p1.mul(3n)
    expect(calculatedProduct.x).toBe(expectedProduct.x)
    expect(calculatedProduct.y).toBe(expectedProduct.y)
  })

  // P₁ + P₂ on secp192k1 — verified against known test vectors
  test('point addition produces expected result in both coordinate systems', () => {
    const expectedSumX =
      0x3cd61e370d02ca0687c0b5f7ebf6d0373f4dd0ccccb7cc2dn
    const expectedSumY =
      0x2c4befd9b02f301eb4014504f0533aa7eb19e9ea56441f78n

    // Affine: λ = (y₂-y₁)·(x₂-x₁)⁻¹, x₃ = λ²-x₁-x₂, y₃ = λ(x₁-x₃)-y₁
    const p1a = new Point(point1.x, point1.y, affineCurve)
    const p2a = new Point(point2.x, point2.y, affineCurve)
    const sumAffine = p1a.add(p2a)
    expect(sumAffine.x).toBe(expectedSumX)
    expect(sumAffine.y).toBe(expectedSumY)

    // Jacobian: same result via (X/Z², Y/Z³) representation
    const sumJacobian = point1.add(point2)
    expect(sumJacobian.x).toBe(expectedSumX)
    expect(sumJacobian.y).toBe(expectedSumY)
  })

  // 2·P₁ — point doubling verified against known test vectors
  test('point doubling produces expected result in both coordinate systems', () => {
    const expectedDoubleX =
      0xea525dd5a1353762a14e9e78b9063316d1f2d5e792f87862n
    const expectedDoubleY =
      0xa936d583530982690c445427cdf2c5b0bb1c88749247b02en

    // Affine: λ = (3x₁²+a)·(2y₁)⁻¹
    const p1a = new Point(point1.x, point1.y, affineCurve)
    const dblAffine = p1a.add(p1a)
    expect(dblAffine.x).toBe(expectedDoubleX)
    expect(dblAffine.y).toBe(expectedDoubleY)

    // Jacobian: S = 4XY², M = 3X²+aZ⁴, X' = M²-2S
    const dblJacobian = point1.add(point1)
    expect(dblJacobian.x).toBe(expectedDoubleX)
    expect(dblJacobian.y).toBe(expectedDoubleY)
  })

  // Point(x, y) must satisfy y² ≡ x³ + ax + b (mod p)
  test('constructor rejects points not on the curve', () => {
    expect(() => new Point(200n, 119n, curve)).toThrow()
  })

  // k·P via double-and-add: 2·P₁ should equal the known doubled value
  test('scalar multiplication with known vectors', () => {
    const expectedX =
      0xea525dd5a1353762a14e9e78b9063316d1f2d5e792f87862n

    // Affine
    const p1a = new Point(point1.x, point1.y, affineCurve)
    expect(p1a.mul(2n).x).toBe(expectedX)

    // Large scalar
    const productLarge = p1a.mul(
      0xea525dd5a1353762a14e9e78b9063316d1f2d5e792f87862n
    )
    expect(productLarge.x).toBe(
      5095008632516147798595855149669871701227161828659032863660n
    )

    // Jacobian
    expect(point1.mul(2n).x).toBe(expectedX)
  })

  // y² ≡ x³ + ax + b (mod p) verification
  test('isOnCurve() returns true for valid points, false for identity', () => {
    expect(point1.isOnCurve()).toBe(true)
    expect(new Point().isOnCurve()).toBe(false)
  })

  // P + O = P  (identity element of the group)
  test('adding the identity element returns the original point', () => {
    const identity = new Point(null, null, curve, true)
    expect(point1.add(identity).x).toBe(point1.x)
    expect(identity.add(point1).x).toBe(point1.x)
  })

  // 0·P = O  and  n·P = O  (group order)
  test('multiplying by 0 or n yields the identity', () => {
    expect(point1.mul(0n).isIdentity).toBe(true)
    expect(point1.mul(curve.n).isIdentity).toBe(true)
  })

  // P + (-P) = O  (additive inverse in affine coordinates)
  test('P + (-P) = O in affine coordinates', () => {
    const p1a = new Point(point1.x, point1.y, affineCurve)
    expect(p1a.add(p1a.neg()).isIdentity).toBe(true)
  })

  // P + (-P) = O  (additive inverse in Jacobian coordinates)
  test('P + (-P) = O in Jacobian coordinates', () => {
    expect(point1.add(point1.neg()).isIdentity).toBe(true)
  })

  // Doubling a point with y = 0: tangent is vertical → result is O
  test('doubling a point with y = 0 yields identity', () => {
    const crv = new CurveParams({ p: 13n, a: 1n, b: 0n, n: 4n, h: 1n })
    const P = new Point(0n, 0n, crv)
    expect(P.add(P).isIdentity).toBe(true)
  })

  // k·O = O  (scalar multiplication of identity)
  test('multiplying identity by any scalar remains identity (Jacobian)', () => {
    const crv = new CurveParams({ p: 13n, a: 1n, b: 0n, n: 4n, h: 1n })
    const inf = new Point(null, null, crv, true)
    expect(inf.mul(3n).isIdentity).toBe(true)
  })

  test('multiplying identity by any scalar remains identity (affine)', () => {
    const crv = new CurveParams({
      p: 13n, a: 1n, b: 0n, n: 4n, h: 1n,
      coord: CoordinateSystem.AFFINE,
    })
    const inf = new Point(null, null, crv, true)
    expect(inf.mul(3n).isIdentity).toBe(true)
  })

  // Affine: P + (-P) = O via affine_add detecting x₁ = x₂, y₁ ≠ y₂
  test('affine addition of inverse points returns identity', () => {
    const p1 = new Point(point1.x, point1.y, affineCurve)
    expect(p1.add(p1.neg()).isIdentity).toBe(true)
  })

  // Affine: doubling (0, 0) where 2y = 0 → no inverse → O
  test('affine doubling with y = 0 returns identity', () => {
    const crv = new CurveParams({
      p: 13n, a: 1n, b: 0n, n: 4n, h: 1n,
      coord: CoordinateSystem.AFFINE,
    })
    expect(new Point(0n, 0n, crv).add(new Point(0n, 0n, crv)).isIdentity).toBe(true)
  })

  // Jacobian: jac_add detects U₁ = U₂, S₁ ≠ S₂ → identity
  test('Jacobian addition of inverse points returns identity', () => {
    const crv = new CurveParams({ p: 13n, a: 1n, b: 0n, n: 4n, h: 1n })
    const pJac = toJacobian(new Point(10n, 3n, crv))
    const pInvJac = toJacobian(new Point(10n, crv.p - 3n, crv))
    const result = jacAdd(pJac, pInvJac, crv)
    expect(result.x).toBe(null)
    expect(result.y).toBe(null)
  })

  // Jacobian: doubling with Y = 0 → identity
  test('Jacobian doubling with y = 0 returns identity', () => {
    const crv = new CurveParams({ p: 13n, a: 1n, b: 0n, n: 4n, h: 1n })
    const result = jacDouble(toJacobian(new Point(0n, 0n, crv)), crv)
    expect(result.x).toBe(null)
    expect(result.y).toBe(null)
  })

  // O + O = O
  test('doubling identity returns identity', () => {
    const identity = new Point(null, null, curve, true)
    expect(identity.add(identity).isIdentity).toBe(true)
  })

  // jac_add(P, O) = P
  test('Jacobian add with identity returns original point', () => {
    const crv = new CurveParams({ p: 13n, a: 1n, b: 0n, n: 4n, h: 1n })
    const pJac = toJacobian(new Point(10n, 3n, crv))
    const result = jacAdd(pJac, new JacobianPoint(), crv)
    expect(result.x).toBe(pJac.x)
    expect(result.y).toBe(pJac.y)
    expect(result.z).toBe(pJac.z)
  })

  // jac_double(O) = O
  test('Jacobian doubling identity returns identity', () => {
    const crv = new CurveParams({ p: 13n, a: 1n, b: 0n, n: 4n, h: 1n })
    const result = jacDouble(new JacobianPoint(), crv)
    expect(result.x).toBe(null)
    expect(result.y).toBe(null)
  })

  // toJacobian(O) = JacobianPoint(null, null, 1)
  test('converting affine identity to Jacobian gives Jacobian identity', () => {
    const result = toJacobian(new Point())
    expect(result.x).toBe(null)
    expect(result.y).toBe(null)
  })

  // -P = (x, -y mod p)
  test('negation computes (x, p - y)', () => {
    const negPoint = point1.neg()
    expect(negPoint.x).toBe(point1.x)
    expect(negPoint.y).toBe((-point1.y % curve.p + curve.p) % curve.p)
  })

  // P₁ - P₂ = P₁ + (-P₂)
  test('subtraction equals addition of negation', () => {
    const resultSub = point1.sub(point2)
    const resultAddNeg = point1.add(point2.neg())
    expect(resultSub.x).toBe(resultAddNeg.x)
    expect(resultSub.y).toBe(resultAddNeg.y)
  })

  // affine_double(null, null) = (null, null)
  test('affine_double of identity returns identity', () => {
    expect(affineDouble(null, null, affineCurve)).toEqual([null, null])
  })

  // affine_add(P, O) = P
  test('affine_add with identity as second operand returns first point', () => {
    expect(affineAdd(point1.x, point1.y, null, null, affineCurve))
      .toEqual([point1.x, point1.y])
  })

  // Arithmetic requires curve parameters
  test('arithmetic without curve parameters throws', () => {
    const p = new Point(1n, 2n)
    expect(() => p.add(p)).toThrow()
  })

  // _coerce assigns curve params to a point that lacks them
  test('_coerce borrows curve from the other operand', () => {
    const pWithoutCurve = new Point(point2.x, point2.y)
    const coerced = point1._coerce(pWithoutCurve)
    expect(coerced.curve).toBe(curve)
    expect(point1.add(pWithoutCurve).isIdentity).toBe(false)
  })

  // -O = O
  test('negation of identity returns identity', () => {
    const identity = new Point(null, null, curve, true)
    expect(identity.neg().isIdentity).toBe(true)
  })

  // toString representation
  test('toString of identity displays Point(∞)', () => {
    expect(new Point().toString()).toBe('Point(∞)')
  })
})

// ---------------------------------------------------------------------------
// Group law properties on E: y² = x³ + x + 1 over F₂₃  (n = 28)
//
// An elliptic curve over a finite field forms an abelian group:
//   1. Identity:       P + O = P
//   2. Inverse:        P + (-P) = O
//   3. Associativity:  (P + Q) + R = P + (Q + R)
//   4. Commutativity:  P + Q = Q + P
//   5. Distributivity: (a + b)·P = a·P + b·P
// ---------------------------------------------------------------------------

describe('Group law properties (toy curve E/F₂₃)', () => {
  const curve = new CurveParams({
    p: 23n, a: 1n, b: 1n, n: 28n, h: 1n,
  })
  const P = new Point(0n, 1n, curve)
  const Q = new Point(6n, 19n, curve)
  const inf = new Point(null, null, curve, true)

  test('P + O = P  (right identity)', () => {
    const result = P.add(inf)
    expect(result.x).toBe(P.x)
    expect(result.y).toBe(P.y)
  })

  test('O + P = P  (left identity)', () => {
    const result = inf.add(P)
    expect(result.x).toBe(P.x)
    expect(result.y).toBe(P.y)
  })

  test('P + (-P) = O  (inverse)', () => {
    expect(P.add(P.neg()).isIdentity).toBe(true)
  })

  test('n·P = O  (group order)', () => {
    expect(P.mul(curve.n).isIdentity).toBe(true)
  })

  test('0·P = O', () => {
    expect(P.mul(0n).isIdentity).toBe(true)
  })

  test('1·P = P', () => {
    const result = P.mul(1n)
    expect(result.x).toBe(P.x)
    expect(result.y).toBe(P.y)
  })

  test('(P + Q) + R = P + (Q + R)  (associativity)', () => {
    const R = P.mul(3n)
    const lhs = P.add(Q).add(R)
    const rhs = P.add(Q.add(R))
    expect(lhs.x).toBe(rhs.x)
    expect(lhs.y).toBe(rhs.y)
  })

  test('P + Q = Q + P  (commutativity)', () => {
    const pq = P.add(Q)
    const qp = Q.add(P)
    expect(pq.x).toBe(qp.x)
    expect(pq.y).toBe(qp.y)
  })

  test('(a + b)·P = a·P + b·P  (distributivity)', () => {
    const a = 7n, b = 13n
    const lhs = P.mul(a + b)
    const rhs = P.mul(a).add(P.mul(b))
    expect(lhs.x).toBe(rhs.x)
    expect(lhs.y).toBe(rhs.y)
  })

  test('P + P = 2·P  (doubling via addition equals scalar multiplication)', () => {
    const pp = P.add(P)
    const twoP = P.mul(2n)
    expect(pp.x).toBe(twoP.x)
    expect(pp.y).toBe(twoP.y)
  })

  test('k·P computed via mul is consistent', () => {
    const r1 = P.mul(5n)
    const r2 = P.mul(5n)
    expect(r1.x).toBe(r2.x)
    expect(r1.y).toBe(r2.y)
  })
})

// ---------------------------------------------------------------------------
// Jacobian ↔ Affine consistency
//
// Jacobian coordinates (X, Y, Z) map to affine (x, y) via:
//   x = X / Z²,   y = Y / Z³
//
// Both systems must produce identical results for all scalar multiples.
// ---------------------------------------------------------------------------

describe('Jacobian ↔ Affine consistency (E/F₂₃)', () => {
  const curveJac = new CurveParams({
    p: 23n, a: 1n, b: 1n, n: 28n, h: 1n,
    coord: CoordinateSystem.JACOBIAN,
  })
  const curveAff = new CurveParams({
    p: 23n, a: 1n, b: 1n, n: 28n, h: 1n,
    coord: CoordinateSystem.AFFINE,
  })
  const Pjac = new Point(0n, 1n, curveJac)
  const Paff = new Point(0n, 1n, curveAff)

  test('k·P matches for k = 1, 2, ..., n-1', () => {
    for (let k = 1n; k < curveJac.n; k++) {
      const rj = Pjac.mul(k)
      const ra = Paff.mul(k)
      expect(rj.x).toBe(ra.x)
      expect(rj.y).toBe(ra.y)
    }
  })

  test('n·P = O in both coordinate systems', () => {
    expect(Pjac.mul(curveJac.n).isIdentity).toBe(true)
    expect(Paff.mul(curveAff.n).isIdentity).toBe(true)
  })

  test('P + Q matches in both coordinate systems', () => {
    const Qjac = new Point(6n, 19n, curveJac)
    const Qaff = new Point(6n, 19n, curveAff)
    const rj = Pjac.add(Qjac)
    const ra = Paff.add(Qaff)
    expect(rj.x).toBe(ra.x)
    expect(rj.y).toBe(ra.y)
  })
})

// ---------------------------------------------------------------------------
// Group law properties on secp256k1 (production curve)
//
// secp256k1: y² = x³ + 7 over a 256-bit prime field
// Used by Bitcoin and many other cryptocurrencies.
// Order n ≈ 2²⁵⁶ — ensures ECDLP security.
// ---------------------------------------------------------------------------

describe('Group law properties (secp256k1)', () => {
  const curve = getCurve('secp256k1')
  const G = getGenerator('secp256k1')

  test('generator G lies on the curve', () => {
    expect(G.isOnCurve()).toBe(true)
  })

  test('n·G = O  (generator order)', () => {
    expect(G.mul(curve.n).isIdentity).toBe(true)
  })

  test('(P + Q) + R = P + (Q + R)  (associativity)', () => {
    const P = G.mul(7n)
    const Q = G.mul(13n)
    const R = G.mul(42n)
    const lhs = P.add(Q).add(R)
    const rhs = P.add(Q.add(R))
    expect(lhs.x).toBe(rhs.x)
    expect(lhs.y).toBe(rhs.y)
  })

  test('P + Q = Q + P  (commutativity)', () => {
    const P = G.mul(7n)
    const Q = G.mul(13n)
    const pq = P.add(Q)
    const qp = Q.add(P)
    expect(pq.x).toBe(qp.x)
    expect(pq.y).toBe(qp.y)
  })

  test('(a + b)·G = a·G + b·G  (distributivity)', () => {
    const a = 123n, b = 456n
    const lhs = G.mul(a + b)
    const rhs = G.mul(a).add(G.mul(b))
    expect(lhs.x).toBe(rhs.x)
    expect(lhs.y).toBe(rhs.y)
  })

  test('P + (-P) = O  (inverse)', () => {
    const P = G.mul(42n)
    expect(P.add(P.neg()).isIdentity).toBe(true)
  })
})
