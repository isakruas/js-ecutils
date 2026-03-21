import { test, expect, describe } from '@jest/globals'
import { getCurve, getGenerator } from './curves/registry'
import { CoordinateSystem, CurveParams } from './core/curve'
import { Point } from './core/point'

// ---------------------------------------------------------------------------
// Curve registry
//
// Lookup functions for SEC 2 / NIST standard curves.
// getCurve(name)     → CurveParams { p, a, b, n, h, coord }
// getGenerator(name) → Point(Gx, Gy, curve)
// ---------------------------------------------------------------------------

describe('Curve registry', () => {
  test('getCurve returns a valid CurveParams with all fields', () => {
    const curve = getCurve('secp256k1')
    expect(curve.p).toBeDefined()
    expect(curve.a).toBeDefined()
    expect(curve.b).toBeDefined()
    expect(curve.n).toBeDefined()
    expect(curve.h).toBeDefined()
  })

  test('getGenerator returns a point that satisfies y² ≡ x³ + ax + b (mod p)', () => {
    const G = getGenerator('secp256k1')
    expect(G.x).not.toBe(null)
    expect(G.y).not.toBe(null)
    expect(G.isOnCurve()).toBe(true)
  })

  test('getCurve throws for unknown curve names', () => {
    expect(() => getCurve('invalidCurveName')).toThrow()
  })

  test('getGenerator throws for unknown curve names', () => {
    expect(() => getGenerator('invalidCurveName')).toThrow()
  })

  test('lookup is case-insensitive', () => {
    const c1 = getCurve('secp256k1')
    const c2 = getCurve('SECP256K1')
    expect(c1.p).toBe(c2.p)
    expect(c1.n).toBe(c2.n)
  })

  test('all 8 standard curves are accessible and their generators are on-curve', () => {
    const names = [
      'secp192k1',
      'secp192r1',
      'secp224k1',
      'secp224r1',
      'secp256k1',
      'secp256r1',
      'secp384r1',
      'secp521r1',
    ]
    for (const name of names) {
      const curve = getCurve(name)
      expect(curve.p > 0n).toBe(true)
      const G = getGenerator(name)
      expect(G.isOnCurve()).toBe(true)
    }
  })
})

// ---------------------------------------------------------------------------
// Curve validation
//
// A valid (non-singular) elliptic curve y² = x³ + ax + b (mod p) requires:
//   Δ = -16(4a³ + 27b²) ≠ 0  (mod p)
//
// CurveParams validates this at construction time.
// ---------------------------------------------------------------------------

describe('Curve validation', () => {
  test('well-formed curve is created without errors', () => {
    const curve = new CurveParams({ p: 23n, a: 1n, b: 1n, n: 28n, h: 1n })
    expect(curve.p).toBe(23n)
    expect(curve.a).toBe(1n)
    expect(curve.b).toBe(1n)
  })

  // y² = x³ (a=0, b=0) → 4·0³ + 27·0² = 0
  test('singular curve a=0, b=0 raises error', () => {
    expect(() => new CurveParams({ p: 23n, a: 0n, b: 0n, n: 1n })).toThrow(
      'Singular curve',
    )
  })

  // 4·(-3)³ + 27·(2)² = -108 + 108 = 0
  test('singular curve a=-3, b=2, p=7 raises error', () => {
    expect(() => new CurveParams({ p: 7n, a: -3n, b: 2n, n: 1n })).toThrow()
  })

  test('all registry curves have non-zero discriminant', () => {
    const names = [
      'secp192k1',
      'secp192r1',
      'secp224k1',
      'secp224r1',
      'secp256k1',
      'secp256r1',
      'secp384r1',
      'secp521r1',
    ]
    for (const name of names) {
      // If discriminant were zero, getCurve would throw
      expect(() => getCurve(name)).not.toThrow()
    }
  })

  test('explicit AFFINE coordinate system is accepted', () => {
    const curve = new CurveParams({
      p: 23n,
      a: 1n,
      b: 1n,
      n: 28n,
      coord: CoordinateSystem.AFFINE,
    })
    expect(curve.coord).toBe(CoordinateSystem.AFFINE)
  })

  test('CurveParams is frozen (immutable)', () => {
    const curve = new CurveParams({ p: 23n, a: 1n, b: 1n, n: 28n })
    expect(Object.isFrozen(curve)).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Coordinate system settings
//
// The default coordinate system is JACOBIAN for performance (~3× faster
// scalar multiplication).  Both systems must produce identical results.
// ---------------------------------------------------------------------------

describe('Coordinate system settings', () => {
  test('default coordinate system is JACOBIAN', () => {
    const curve = getCurve('secp256r1')
    expect(curve.coord).toBe(CoordinateSystem.JACOBIAN)
  })

  // 42·G must be the same point regardless of coordinate system
  test('affine and Jacobian produce identical results for 42·G on secp192k1', () => {
    const curveJac = getCurve('secp192k1')
    const curveAff = new CurveParams({
      p: curveJac.p,
      a: curveJac.a,
      b: curveJac.b,
      n: curveJac.n,
      h: curveJac.h,
      coord: CoordinateSystem.AFFINE,
    })

    const Gjac = getGenerator('secp192k1')
    const Gaff = new Point(Gjac.x, Gjac.y, curveAff)

    const resultJac = Gjac.mul(42n)
    const resultAff = Gaff.mul(42n)

    expect(resultJac.x).toBe(resultAff.x)
    expect(resultJac.y).toBe(resultAff.y)
  })
})
