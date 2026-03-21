/**
 * Elliptic curve arithmetic in Jacobian (projective) coordinates.
 *
 * In Jacobian coordinates a point is represented as (X, Y, Z) where the
 * affine equivalents are x = X/Z² and y = Y/Z³.  The identity (point at
 * infinity) is represented by x = null, y = null.
 *
 * The key advantage over affine arithmetic is that point addition and
 * doubling can be performed WITHOUT modular inversions (only
 * multiplications and squarings), making scalar multiplication roughly
 * 3x faster for large scalars.
 *
 * Trade-off: each point uses three coordinates instead of two, and a
 * single inversion is needed at the end to convert back to affine form.
 *
 * See RFC 6090, Section 4 for a detailed treatment of projective
 * coordinate systems and their security considerations.
 */

import { modulus, modInverse } from '../../utils/math.js'

/**
 * A point in Jacobian projective coordinates (X, Y, Z).
 *
 * The affine point (x, y) corresponds to (X/Z², Y/Z³).
 * The identity element is represented by x = null, y = null.
 */
export class JacobianPoint {
  constructor(x = null, y = null, z = 1n) {
    this.x = x
    this.y = y
    this.z = z
    Object.freeze(this)
  }
}

/**
 * Convert an affine Point to Jacobian coordinates.
 *
 * The affine point (x, y) maps to (x, y, 1) in Jacobian form.
 * The identity point maps to JacobianPoint(null, null, 1).
 *
 * @param {Point} point - An affine Point.
 * @returns {JacobianPoint}
 */
export function toJacobian(point) {
  if (point.isIdentity) {
    return new JacobianPoint()
  }
  return new JacobianPoint(point.x, point.y, 1n)
}

/**
 * Convert a JacobianPoint back to affine (x, y) coordinates.
 *
 *     x = X · Z⁻²  (mod p)
 *     y = Y · Z⁻³  (mod p)
 *
 * @param {JacobianPoint} jp
 * @param {CurveParams} curve
 * @returns {[BigInt|null, BigInt|null]}
 */
export function toAffine(jp, curve) {
  if (jp.x === null || jp.y === null || jp.z === 0n) {
    return [null, null]
  }
  const invZ = modInverse(jp.z, curve.p)
  const invZ2 = (invZ * invZ) % curve.p
  const invZ3 = (invZ2 * invZ) % curve.p
  return [modulus(jp.x * invZ2, curve.p), modulus(jp.y * invZ3, curve.p)]
}

/**
 * Double a point in Jacobian coordinates.
 *
 * Uses the standard Jacobian doubling formulas (see RFC 6090 Section 4):
 *
 *     S  = 4 · X · Y²
 *     M  = 3 · X² + a · Z⁴
 *     X' = M² - 2·S
 *     Y' = M · (S - X') - 8·Y⁴
 *     Z' = 2 · Y · Z
 *
 * Cost: 1S + 4M (no field inversions).
 *
 * @param {JacobianPoint} jp
 * @param {CurveParams} curve
 * @returns {JacobianPoint}
 */
export function jacDouble(jp, curve) {
  if (jp.x === null || jp.y === null || jp.y === 0n) {
    return new JacobianPoint()
  }
  const p = curve.p
  const ysq = modulus(jp.y * jp.y, p)
  const zsqr = modulus(jp.z * jp.z, p)
  const s = modulus(4n * jp.x * ysq, p)
  const m = modulus(3n * jp.x * jp.x + curve.a * zsqr * zsqr, p)
  const nx = modulus(m * m - 2n * s, p)
  const ny = modulus(m * (s - nx) - 8n * ysq * ysq, p)
  const nz = modulus(2n * jp.y * jp.z, p)
  return new JacobianPoint(nx, ny, nz)
}

/**
 * Add two points in Jacobian coordinates.
 *
 * Uses the standard Jacobian addition formulas (see RFC 6090 Section 4):
 *
 *     U₁ = X₁ · Z₂²,   U₂ = X₂ · Z₁²
 *     S₁ = Y₁ · Z₂³,   S₂ = Y₂ · Z₁³
 *     H  = U₂ - U₁,     R  = 2 · (S₂ - S₁)
 *     X' = R² - H³ - 2 · U₁ · H²
 *     Y' = R · (U₁ · H² - X') - 2 · S₁ · H³
 *     Z' = ((Z₁ + Z₂)² - Z₁² - Z₂²) · H
 *
 * If U₁ = U₂ and S₁ ≠ S₂ the points are inverses → identity.
 * If U₁ = U₂ and S₁ = S₂ the points are equal → delegates to jacDouble.
 *
 * @param {JacobianPoint} jp1
 * @param {JacobianPoint} jp2
 * @param {CurveParams} curve
 * @returns {JacobianPoint}
 */
export function jacAdd(jp1, jp2, curve) {
  if (jp1.x === null || jp1.y === null) return jp2
  if (jp2.x === null || jp2.y === null) return jp1
  const p = curve.p
  const z1z1 = modulus(jp1.z * jp1.z, p)
  const z2z2 = modulus(jp2.z * jp2.z, p)
  const u1 = modulus(jp1.x * z2z2, p)
  const u2 = modulus(jp2.x * z1z1, p)
  const s1 = modulus(jp1.y * jp2.z * z2z2, p)
  const s2 = modulus(jp2.y * jp1.z * z1z1, p)
  if (u1 === u2) {
    if (s1 !== s2) return new JacobianPoint()
    return jacDouble(jp1, curve)
  }
  const h = u2 - u1
  const i = modulus(2n * h * (2n * h), p)
  const j = modulus(h * i, p)
  const r = modulus(2n * (s2 - s1), p)
  const v = modulus(u1 * i, p)
  const x = modulus(r * r - j - 2n * v, p)
  const y = modulus(r * (v - x) - 2n * s1 * j, p)
  const z = modulus(((jp1.z + jp2.z) * (jp1.z + jp2.z) - z1z1 - z2z2) * h, p)
  return new JacobianPoint(x, y, z)
}

/**
 * Scalar multiplication in Jacobian coordinates (double-and-add).
 *
 * Computes k·P using the binary expansion of k.  Runs in O(log k)
 * doublings and at most O(log k) additions, all without field inversions
 * until the final conversion back to affine.
 *
 * @param {BigInt} k   - Scalar multiplier.
 * @param {JacobianPoint} jp - Base point in Jacobian coordinates.
 * @param {CurveParams} curve
 * @returns {JacobianPoint}
 */
export function jacMul(k, jp, curve) {
  if (k === 0n || jp.x === null || jp.y === null) {
    return new JacobianPoint()
  }
  let result = new JacobianPoint()
  const bits = k.toString(2)
  for (let idx = 0; idx < bits.length; idx++) {
    if (bits[bits.length - idx - 1] === '1') {
      result = jacAdd(result, jp, curve)
    }
    jp = jacDouble(jp, curve)
  }
  return result
}
