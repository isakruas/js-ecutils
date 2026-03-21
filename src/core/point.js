/**
 * The Point class — public-facing representation of a point on an elliptic curve.
 *
 * A point on the short Weierstrass curve y² = x³ + ax + b (mod p) belongs
 * to an abelian group with the following properties:
 *
 * - Closure:       P + Q is also on the curve.
 * - Associativity: (P + Q) + R = P + (Q + R).
 * - Identity:      There exists a special "point at infinity" O such that P + O = P.
 * - Inverse:       For every P = (x, y), the inverse is -P = (x, -y mod p),
 *                  and P + (-P) = O.
 *
 * Usage:
 *
 *     const curve = new CurveParams({ p: 23n, a: 1n, b: 1n, n: 28n, h: 1n })
 *     const P = new Point(0n, 1n, curve)
 *     const Q = new Point(6n, 19n, curve)
 *     P.add(Q)          // point addition
 *     P.mul(5n)         // scalar multiplication
 *     P.neg()           // point negation
 *
 * To switch coordinate systems, create a new CurveParams with a
 * different coord field:
 *
 *     const affineCurve = new CurveParams({
 *       p: 23n, a: 1n, b: 1n, n: 28n,
 *       coord: CoordinateSystem.AFFINE
 *     })
 */

import { affineAdd, affineMul } from './arithmetic/affine.js'
import {
  jacAdd,
  jacMul,
  toAffine,
  toJacobian,
} from './arithmetic/jacobian.js'
import { CoordinateSystem } from './curve.js'
import { modularSqrt, modulus, modPow } from '../utils/math.js'

export class Point {
  /**
   * Create a point on an elliptic curve.
   *
   * Validates that the point lies on the curve at construction time:
   *
   *     y² ≡ x³ + ax + b  (mod p)
   *
   * Points produced by internal arithmetic use _trusted = true to skip
   * re-validation.
   *
   * @param {BigInt|null} x          - x-coordinate, or null for identity (point at infinity).
   * @param {BigInt|null} y          - y-coordinate, or null for identity.
   * @param {CurveParams|null} curve - Curve parameters (required for arithmetic).
   * @param {boolean} _trusted       - If true, skip on-curve validation.
   */
  constructor(x = null, y = null, curve = null, _trusted = false) {
    this.x = x
    this.y = y
    this.curve = curve

    // Validate: y² ≡ x³ + ax + b (mod p)
    if (!_trusted) {
      if (x !== null && y !== null && curve !== null) {
        const lhs = modPow(y, 2n, curve.p)
        const rhs = modulus(
          modPow(x, 3n, curve.p) + curve.a * x + curve.b,
          curve.p
        )
        if (lhs !== rhs) {
          throw new Error(
            `Point(${x}, ${y}) is not on the curve ` +
              `y² = x³ + ${curve.a}x + ${curve.b} (mod ${curve.p}).`
          )
        }
      }
    }

    Object.freeze(this)
  }

  /**
   * True when this point represents the point at infinity (identity element O).
   */
  get isIdentity() {
    return this.x === null || this.y === null
  }

  /**
   * Check whether this point satisfies the curve equation:
   *
   *     y² ≡ x³ + ax + b  (mod p)
   *
   * @returns {boolean}
   */
  isOnCurve() {
    if (this.isIdentity || this.curve === null) return false
    const lhs = modPow(this.y, 2n, this.curve.p)
    const rhs = modulus(
      modPow(this.x, 3n, this.curve.p) +
        this.curve.a * this.x +
        this.curve.b,
      this.curve.p
    )
    return lhs === rhs
  }

  _requireCurve() {
    if (this.curve === null) {
      throw new Error(
        "Cannot perform arithmetic on a Point without curve parameters. " +
          "Pass a CurveParams instance via the 'curve' argument."
      )
    }
    return this.curve
  }

  /**
   * Ensure other carries curve params (borrow ours if needed).
   */
  _coerce(other) {
    if (other.curve === null && this.curve !== null) {
      return new Point(other.x, other.y, this.curve, true)
    }
    return other
  }

  _wrap(x, y) {
    return new Point(x, y, this.curve, true)
  }

  // ----- compression -----

  /**
   * Compress this point to its x-coordinate and parity bit.
   *
   * The y-coordinate can be recovered from x using the curve equation
   * and the parity bit selects which of the two square roots to use.
   *
   * @returns {[BigInt, BigInt]} [x, parity] where parity = y mod 2.
   * @throws {Error} If this point is the identity.
   */
  compress() {
    if (this.isIdentity) {
      throw new Error(
        'Cannot compress the identity point (point at infinity).'
      )
    }
    return [this.x, this.y % 2n]
  }

  /**
   * Reconstruct a point from its compressed form.
   *
   * Given x and a parity bit, computes:
   *
   *     rhs = x³ + ax + b  (mod p)
   *     y   = √rhs         (mod p)
   *
   * and selects the root matching the parity bit.
   *
   * @param {BigInt} x       - The x-coordinate.
   * @param {BigInt} parity  - 0n or 1n indicating which y to select.
   * @param {CurveParams} curve
   * @returns {Point}
   * @throws {Error} If x does not correspond to a valid point.
   */
  static decompress(x, parity, curve) {
    const rhs = modulus(
      modPow(x, 3n, curve.p) + curve.a * x + curve.b,
      curve.p
    )
    let y = modularSqrt(rhs, curve.p)
    if (y === null) {
      throw new Error(
        `x=${x} does not correspond to a valid point on the curve ` +
          `y² = x³ + ${curve.a}x + ${curve.b} (mod ${curve.p}).`
      )
    }
    if (y % 2n !== parity) {
      y = curve.p - y
    }
    return new Point(x, y, curve)
  }

  // ----- SEC 1 compression (interoperable) -----

  /**
   * Compress this point to SEC 1 / X9.62 format.
   *
   * The output is a single byte prefix (0x02 for even y, 0x03
   * for odd y) followed by the x-coordinate as a big-endian unsigned
   * integer, zero-padded to the field size.
   *
   * @returns {Uint8Array} Compressed point bytes.
   * @throws {Error} If this point is the identity or has no curve params.
   */
  compressSec1() {
    if (this.isIdentity) {
      throw new Error(
        'Cannot compress the identity point (point at infinity).'
      )
    }
    const curve = this._requireCurve()
    const byteLen = Number((BigInt(curve.p.toString(2).length) + 7n) / 8n)
    const prefix = this.y % 2n ? 0x03 : 0x02
    const xBytes = bigIntToBytes(this.x, byteLen)
    const result = new Uint8Array(1 + byteLen)
    result[0] = prefix
    result.set(xBytes, 1)
    return result
  }

  /**
   * Serialize this point to SEC 1 / X9.62 uncompressed format.
   *
   * The output is 0x04 || x || y, where x and y are big-endian
   * unsigned integers zero-padded to the field size.
   *
   * @returns {Uint8Array} Uncompressed point bytes.
   * @throws {Error} If this point is the identity or has no curve params.
   */
  toUncompressedSec1() {
    if (this.isIdentity) {
      throw new Error(
        'Cannot serialize the identity point (point at infinity).'
      )
    }
    const curve = this._requireCurve()
    const byteLen = Number((BigInt(curve.p.toString(2).length) + 7n) / 8n)
    const xBytes = bigIntToBytes(this.x, byteLen)
    const yBytes = bigIntToBytes(this.y, byteLen)
    const result = new Uint8Array(1 + 2 * byteLen)
    result[0] = 0x04
    result.set(xBytes, 1)
    result.set(yBytes, 1 + byteLen)
    return result
  }

  /**
   * Deserialize a point from SEC 1 / X9.62 format.
   *
   * Supports both compressed (0x02/0x03 prefix) and
   * uncompressed (0x04 prefix) encodings.
   *
   * @param {Uint8Array} data  - The SEC 1 encoded point bytes.
   * @param {CurveParams} curve
   * @returns {Point}
   * @throws {Error} If the data is malformed or the point is invalid.
   */
  static fromSec1(data, curve) {
    if (data.length < 2) {
      throw new Error('SEC 1 data too short.')
    }
    const byteLen = Number((BigInt(curve.p.toString(2).length) + 7n) / 8n)
    const prefix = data[0]

    if (prefix === 0x02 || prefix === 0x03) {
      if (data.length !== 1 + byteLen) {
        throw new Error(
          `Compressed SEC 1 data must be ${1 + byteLen} bytes, got ${data.length}.`
        )
      }
      const x = bytesToBigInt(data.slice(1))
      const parity = BigInt(prefix - 0x02) // 0 for even, 1 for odd
      return Point.decompress(x, parity, curve)
    }

    if (prefix === 0x04) {
      if (data.length !== 1 + 2 * byteLen) {
        throw new Error(
          `Uncompressed SEC 1 data must be ${1 + 2 * byteLen} bytes, got ${data.length}.`
        )
      }
      const x = bytesToBigInt(data.slice(1, 1 + byteLen))
      const y = bytesToBigInt(data.slice(1 + byteLen))
      return new Point(x, y, curve)
    }

    throw new Error(
      `Unknown SEC 1 prefix: 0x${prefix.toString(16).padStart(2, '0')}. Expected 0x02, 0x03, or 0x04.`
    )
  }

  // ----- operators -----

  /**
   * Return the additive inverse: -P = (x, -y mod p).
   *
   * @returns {Point}
   */
  neg() {
    if (this.isIdentity) return this
    const curve = this._requireCurve()
    return new Point(this.x, modulus(-this.y, curve.p), curve, true)
  }

  /**
   * Add two points on the same curve using the group law.
   *
   * Delegates to affine or Jacobian arithmetic depending on
   * curve.coord.  The chord-and-tangent formulas are:
   *
   * Addition (P ≠ Q):
   *     λ  = (y₂ - y₁) · (x₂ - x₁)⁻¹
   *     x₃ = λ² - x₁ - x₂
   *     y₃ = λ(x₁ - x₃) - y₁
   *
   * Doubling (P = Q):
   *     λ  = (3x₁² + a) · (2y₁)⁻¹
   *     x₃ = λ² - 2x₁
   *     y₃ = λ(x₁ - x₃) - y₁
   *
   * @param {Point} other
   * @returns {Point}
   */
  add(other) {
    const curve = this._requireCurve()
    other = this._coerce(other)

    if (curve.coord === CoordinateSystem.JACOBIAN) {
      const jp1 = toJacobian(this)
      const jp2 = toJacobian(other)
      const jp3 = jacAdd(jp1, jp2, curve)
      return this._wrap(...toAffine(jp3, curve))
    }

    return this._wrap(...affineAdd(this.x, this.y, other.x, other.y, curve))
  }

  /**
   * Subtract: P - Q = P + (-Q).
   *
   * @param {Point} other
   * @returns {Point}
   */
  sub(other) {
    return this.add(other.neg ? other.neg() : new Point(other.x, modulus(-other.y, this._requireCurve().p), other.curve || this.curve, true))
  }

  /**
   * Scalar multiplication: k · P via double-and-add in O(log k).
   *
   * The scalar k is reduced modulo the group order n before
   * multiplication, so that n·P = O (the identity).
   *
   * @param {BigInt} k - Scalar multiplier.
   * @returns {Point}
   */
  mul(k) {
    const curve = this._requireCurve()
    k = modulus(k, curve.n)

    if (curve.coord === CoordinateSystem.JACOBIAN) {
      const jp = toJacobian(this)
      const jpResult = jacMul(k, jp, curve)
      return this._wrap(...toAffine(jpResult, curve))
    }

    return this._wrap(...affineMul(k, this.x, this.y, curve))
  }

  toString() {
    if (this.isIdentity) return 'Point(∞)'
    return `Point(x=${this.x}, y=${this.y})`
  }
}

// ----- helper functions for byte ↔ BigInt conversion -----

function bigIntToBytes(value, length) {
  const hex = value.toString(16).padStart(length * 2, '0')
  const bytes = new Uint8Array(length)
  for (let i = 0; i < length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16)
  }
  return bytes
}

function bytesToBigInt(bytes) {
  let hex = ''
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, '0')
  }
  return BigInt('0x' + hex)
}
