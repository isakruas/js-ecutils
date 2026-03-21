/**
 * Elliptic curve arithmetic in affine coordinates.
 *
 * In affine coordinates a point on the curve y² = x³ + ax + b (mod p) is
 * represented directly by its (x, y) pair.  Each addition or doubling
 * requires one modular inversion, making this system straightforward but
 * slower than projective alternatives for scalar multiplication.
 *
 * Note: these routines are NOT constant-time and should not be used in
 * production contexts where timing side-channels are a concern.
 * See RFC 6090, Section 4 for background on secure implementation
 * considerations.
 */

import { modulus, modInverse } from '../../utils/math.js'

/**
 * Double a point in affine coordinates.
 *
 * Computes 2P using the tangent-line formula:
 *
 *     λ  = (3x₁² + a) · (2y₁)⁻¹  (mod p)
 *     x₃ = λ² - 2x₁              (mod p)
 *     y₃ = λ(x₁ - x₃) - y₁      (mod p)
 *
 * Returns [null, null] (identity) if the input is the identity or if
 * 2y₁ ≡ 0 (mod p) (vertical tangent).
 *
 * @param {BigInt|null} px - x-coordinate (null for identity).
 * @param {BigInt|null} py - y-coordinate (null for identity).
 * @param {CurveParams} curve
 * @returns {[BigInt|null, BigInt|null]}
 */
export function affineDouble(px, py, curve) {
  if (px === null || py === null) return [null, null]
  const p = curve.p
  const num = modulus(3n * px * px + curve.a, p)
  const den = modulus(2n * py, p)
  if (den === 0n) return [null, null]
  const inv = modInverse(den, p)
  const s = (num * inv) % p
  const x3 = modulus(s * s - 2n * px, p)
  const y3 = modulus(s * (px - x3) - py, p)
  return [x3, y3]
}

/**
 * Add two distinct points in affine coordinates.
 *
 * Given P₁ = (x₁, y₁) and P₂ = (x₂, y₂) with P₁ ≠ P₂, the chord-line
 * formula is:
 *
 *     λ  = (y₂ - y₁) · (x₂ - x₁)⁻¹  (mod p)
 *     x₃ = λ² - x₁ - x₂              (mod p)
 *     y₃ = λ(x₁ - x₃) - y₁           (mod p)
 *
 * If P₁ = P₂ the call is forwarded to {@link affineDouble}.
 *
 * @param {BigInt|null} p1x
 * @param {BigInt|null} p1y
 * @param {BigInt|null} p2x
 * @param {BigInt|null} p2y
 * @param {CurveParams} curve
 * @returns {[BigInt|null, BigInt|null]}
 */
export function affineAdd(p1x, p1y, p2x, p2y, curve) {
  if (p1x === null || p1y === null) return [p2x, p2y]
  if (p2x === null || p2y === null) return [p1x, p1y]
  if (p1x === p2x && p1y === p2y) return affineDouble(p1x, p1y, curve)
  const p = curve.p
  const num = modulus(p2y - p1y, p)
  const den = modulus(p2x - p1x, p)
  if (den === 0n) return [null, null]
  const inv = modInverse(den, p)
  const s = (num * inv) % p
  const x3 = modulus(s * s - p1x - p2x, p)
  const y3 = modulus(s * (p1x - x3) - p1y, p)
  return [x3, y3]
}

/**
 * Scalar multiplication in affine coordinates (double-and-add).
 *
 * Computes k·P by scanning the bits of k from LSB to MSB,
 * accumulating the result and doubling the base at each step.
 * Runs in O(log k) doublings and at most O(log k) additions.
 *
 * Warning: the double-and-add algorithm is NOT constant-time: the number
 * of additions depends on the Hamming weight of k.  For
 * constant-time requirements see RFC 6090, Section 4.
 *
 * @param {BigInt} k   - Scalar multiplier.
 * @param {BigInt|null} px - x-coordinate of the base point.
 * @param {BigInt|null} py - y-coordinate of the base point.
 * @param {CurveParams} curve
 * @returns {[BigInt|null, BigInt|null]}
 */
export function affineMul(k, px, py, curve) {
  if (px === null || py === null || k === 0n) return [null, null]
  let rx = null,
    ry = null
  while (k > 0n) {
    if (k & 1n) {
      ;[rx, ry] = affineAdd(rx, ry, px, py, curve)
    }
    ;[px, py] = affineDouble(px, py, curve)
    k >>= 1n
  }
  return [rx, ry]
}
