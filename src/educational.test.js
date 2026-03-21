import { test, expect, describe } from '@jest/globals'
import { Point } from './core/point'
import { CurveParams, CoordinateSystem } from './core/curve'
import { isQuadraticResidue, modularSqrt } from './utils/math'

// ---------------------------------------------------------------------------
// Educational examples on small curves
//
// These tests use "toy" curves with small primes to illustrate elliptic
// curve concepts with values that can be verified by hand.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// E: y² = x³ + x + 1  over F₂₃   (n = 28, cofactor h = 1)
//
// Points used:
//   P = (0, 1)    — satisfies 1² ≡ 0³ + 0 + 1 ≡ 1 (mod 23) ✓
//   Q = (6, 19)   — satisfies 19² = 361 ≡ 16 ≡ 6³ + 6 + 1 = 223 ≡ 16 (mod 23) ✓
//
// Hand-calculated results:
//   P + Q:  λ = (19-1)·(6-0)⁻¹ = 18·4 = 72 ≡ 3 (mod 23)
//           x₃ = 3² - 0 - 6 = 3 (mod 23)
//           y₃ = 3·(0-3) - 1 = -10 ≡ 13 (mod 23)
//           → (3, 13)
//
//   2·P:    λ = (3·0²+1)·(2·1)⁻¹ = 1·12 = 12 (mod 23)
//           x₃ = 12² - 0 = 144 ≡ 6 (mod 23)
//           y₃ = 12·(0-6) - 1 = -73 ≡ 19 (mod 23)
//           → (6, 19)
//
//   -P:     (0, -1 mod 23) = (0, 22)
// ---------------------------------------------------------------------------

describe('Educational: E/F₂₃  y² = x³ + x + 1', () => {
  const curve = new CurveParams({
    p: 23n, a: 1n, b: 1n, n: 28n, h: 1n,
    coord: CoordinateSystem.AFFINE,
  })
  const P = new Point(0n, 1n, curve)
  const Q = new Point(6n, 19n, curve)

  test('P(0,1) + Q(6,19) = (3, 13)', () => {
    const R = P.add(Q)
    expect(R.x).toBe(3n)
    expect(R.y).toBe(13n)
  })

  test('2·P(0,1) = (6, 19)', () => {
    const R = P.mul(2n)
    expect(R.x).toBe(6n)
    expect(R.y).toBe(19n)
  })

  test('3·P = 2·P + P  (scalar multiplication consistency)', () => {
    const R2 = P.mul(2n)
    const R3manual = R2.add(P)
    const R3 = P.mul(3n)
    expect(R3.x).toBe(R3manual.x)
    expect(R3.y).toBe(R3manual.y)
  })

  test('28·P = O  (n·P is the identity)', () => {
    expect(P.mul(28n).isIdentity).toBe(true)
  })

  test('P + (-P) = O  (additive inverse)', () => {
    expect(P.add(P.neg()).isIdentity).toBe(true)
  })

  test('-P(0,1) = (0, 22)', () => {
    const neg = P.neg()
    expect(neg.x).toBe(0n)
    expect(neg.y).toBe(22n)
  })
})

// ---------------------------------------------------------------------------
// E: y² = x³ + 2  over F₇   (n = 9, cofactor h = 1)
//
// Known points:
//   (0, 3): 3² = 9 ≡ 2 ≡ 0³ + 2 (mod 7)  ✓
//   (0, 4): 4² = 16 ≡ 2 ≡ 0³ + 2 (mod 7)  ✓
//   (3, 1): 1² = 1 ≡ 3³ + 2 = 29 ≡ 1 (mod 7)  ✓
// ---------------------------------------------------------------------------

describe('Educational: E/F₇  y² = x³ + 2', () => {
  const curve = new CurveParams({
    p: 7n, a: 0n, b: 2n, n: 9n, h: 1n,
    coord: CoordinateSystem.AFFINE,
  })

  test('(0,3) and (0,4) lie on the curve', () => {
    expect(new Point(0n, 3n, curve).isOnCurve()).toBe(true)
    expect(new Point(0n, 4n, curve).isOnCurve()).toBe(true)
  })

  test('point addition produces a valid curve point', () => {
    const P = new Point(0n, 3n, curve)
    const Q = new Point(3n, 1n, curve)
    const R = P.add(Q)
    expect(R.isOnCurve() || R.isIdentity).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Quadratic residues and point compression (educational)
//
// Point compression stores (x, parity_of_y) instead of (x, y).
// Decompression recovers y by computing √(x³ + ax + b) mod p and
// selecting the root matching the parity bit.
// ---------------------------------------------------------------------------

describe('Educational: quadratic residues and point compression', () => {
  // QR(F₂₃) = {1, 2, 3, 4, 6, 8, 9, 12, 13, 16, 18}
  test('QR set of F₂₃ matches expected values', () => {
    const expectedQR = new Set([1n, 2n, 3n, 4n, 6n, 8n, 9n, 12n, 13n, 16n, 18n])
    for (let a = 1n; a < 23n; a++) {
      expect(isQuadraticResidue(a, 23n)).toBe(expectedQR.has(a))
    }
  })

  // √4 mod 23:  r² ≡ 4 (mod 23)  →  r ∈ {2, 21}
  test('√4 mod 23 equals 2 or 21', () => {
    const r = modularSqrt(4n, 23n)
    expect([2n, 21n]).toContain(r)
    expect((r * r) % 23n).toBe(4n)
  })

  // compress → (x, parity),  decompress → Point(x, y)
  test('compress/decompress roundtrip on Z₂₃ curve', () => {
    const curve = new CurveParams({
      p: 23n, a: 1n, b: 1n, n: 28n, h: 1n,
    })
    const P = new Point(0n, 1n, curve)
    const [x, parity] = P.compress()
    const recovered = Point.decompress(x, parity, curve)
    expect(recovered.x).toBe(P.x)
    expect(recovered.y).toBe(P.y)
  })
})

// ---------------------------------------------------------------------------
// Jacobian vs Affine arithmetic (educational)
//
// Jacobian coordinates (X, Y, Z) avoid modular inversions during
// intermediate operations, converting back only at the end:
//   x = X / Z²,   y = Y / Z³
//
// Both coordinate systems must produce identical affine results.
// ---------------------------------------------------------------------------

describe('Educational: Jacobian vs Affine arithmetic', () => {
  test('addition gives the same result in both coordinate systems', () => {
    const affineCurve = new CurveParams({
      p: 23n, a: 1n, b: 1n, n: 28n, h: 1n,
      coord: CoordinateSystem.AFFINE,
    })
    const jacobianCurve = new CurveParams({
      p: 23n, a: 1n, b: 1n, n: 28n, h: 1n,
      coord: CoordinateSystem.JACOBIAN,
    })
    const Pa = new Point(0n, 1n, affineCurve)
    const Qa = new Point(6n, 19n, affineCurve)
    const Ra = Pa.add(Qa)

    const Pj = new Point(0n, 1n, jacobianCurve)
    const Qj = new Point(6n, 19n, jacobianCurve)
    const Rj = Pj.add(Qj)

    expect(Ra.x).toBe(Rj.x)
    expect(Ra.y).toBe(Rj.y)
  })

  test('scalar multiplication gives the same result for k ∈ {2, 5, 13, 27}', () => {
    const affineCurve = new CurveParams({
      p: 23n, a: 1n, b: 1n, n: 28n, h: 1n,
      coord: CoordinateSystem.AFFINE,
    })
    const jacobianCurve = new CurveParams({
      p: 23n, a: 1n, b: 1n, n: 28n, h: 1n,
      coord: CoordinateSystem.JACOBIAN,
    })
    const Pa = new Point(0n, 1n, affineCurve)
    const Pj = new Point(0n, 1n, jacobianCurve)

    for (const k of [2n, 5n, 13n, 27n]) {
      const Ra = Pa.mul(k)
      const Rj = Pj.mul(k)
      expect(Ra.x).toBe(Rj.x)
      expect(Ra.y).toBe(Rj.y)
    }
  })
})
