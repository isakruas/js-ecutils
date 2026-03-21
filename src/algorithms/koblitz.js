/**
 * Koblitz method for encoding/decoding messages as elliptic curve points.
 *
 * Encoding algorithm:
 *     1. Convert the message string to an integer m using base-α
 *        positional encoding (α = alphabetSize).
 *     2. For j = 1, 2, ..., d-1:
 *          x = (d·m + j) mod p
 *     3. Test if x³ + ax + b is a quadratic residue mod p.
 *     4. If yes, compute y = √(x³ + ax + b) mod p and return
 *        (Point(x, y), j).
 *
 * With d = 100 the probability of failure per attempt is ≈ 1/2, so the
 * overall failure probability after 99 attempts is ≈ 2⁻⁹⁹.
 *
 * Usage:
 *
 *     const kob = new Koblitz('secp521r1')
 *     const [point, j] = kob.encode('Hello, world!')
 *     const text = kob.decode(point, j)
 *     // text === 'Hello, world!'
 */

import { Point } from '../core/point.js'
import { getCurve } from '../curves/registry.js'
import { modPow, modulus } from '../utils/math.js'

/**
 * Koblitz message encoding/decoding on an elliptic curve.
 */
export class Koblitz {
  /**
   * @param {string} [curveName='secp521r1'] - Name of the curve.
   *   Larger curves can encode longer messages in a single point.
   * @param {BigInt} [alphabetSize=256n]     - Character set size.
   *   256 for ASCII, 65536 for Unicode.
   */
  constructor(curveName = 'secp521r1', alphabetSize = 256n) {
    this.curveName = curveName
    this.alphabetSize = alphabetSize
    Object.freeze(this)
  }

  get _curve() {
    return getCurve(this.curveName)
  }

  /**
   * Encode a text message into a point on the curve.
   *
   * The message is first converted to an integer m via base-α encoding:
   *
   *     m = Σ  char_code(ch_i) · α^i
   *
   * Then Koblitz's method searches for a valid curve point:
   *
   *     for j = 1, 2, ..., 99:
   *       x = (100·m + j) mod p
   *       s = x³ + ax + b  (mod p)
   *       if s is a quadratic residue:
   *         y = √s mod p
   *         return (Point(x, y), j)
   *
   * @param {string} message - The text to encode (limited by curve size).
   * @returns {[Point, number]} [point, j] where j is needed for decoding.
   * @throws {Error} If no valid point is found (probability ≈ 2⁻⁹⁹).
   */
  encode(message) {
    const curve = this._curve
    const alpha = this.alphabetSize

    // Convert string → integer  (base-alpha encoding)
    let m = 0n
    for (let i = 0; i < message.length; i++) {
      m += BigInt(message.charCodeAt(i)) * alpha ** BigInt(i)
    }

    // Koblitz: try x = d·m + j until y² = x³ + ax + b has a root
    const d = 100n
    for (let j = 1; j < 100; j++) {
      const x = modulus(d * m + BigInt(j), curve.p)
      const s = modulus(modPow(x, 3n, curve.p) + curve.a * x + curve.b, curve.p)

      // Euler criterion + shortcut for p ≡ 3 (mod 4):
      //   s is a QR iff s ≡ s^((p+1)/2) (mod p)
      //   y = s^((p+1)/4) mod p
      if (s === modPow(s, (curve.p + 1n) / 2n, curve.p)) {
        const y = modPow(s, (curve.p + 1n) / 4n, curve.p)
        const pt = new Point(x, y, curve)
        if (pt.isOnCurve()) {
          return [pt, j]
        }
      }
    }

    /* istanbul ignore next -- failure probability ≈ 2⁻⁹⁹ */
    throw new Error('Failed to encode message to a valid point on the curve.')
  }

  /**
   * Decode a curve point back into the original text message.
   *
   * Reverses the encoding:
   *
   *     m = (x - j) / 100
   *
   * Then converts integer m back to a string via base-α decomposition.
   *
   * @param {Point} point - The encoded point (as returned by encode).
   * @param {number} j    - The auxiliary value returned alongside the point.
   * @returns {string} The original text message.
   */
  decode(point, j) {
    const alpha = this.alphabetSize
    const d = 100n
    let m = (point.x - BigInt(j)) / d

    const chars = []
    while (m > 0n) {
      chars.push(String.fromCharCode(Number(m % alpha)))
      m /= alpha
    }
    return chars.join('')
  }
}
