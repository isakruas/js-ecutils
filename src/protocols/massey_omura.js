/**
 * Massey-Omura three-pass key exchange protocol over elliptic curves.
 *
 * The protocol allows two parties to exchange a secret message (encoded as a
 * curve point) without sharing a key beforehand.  Each party uses only their
 * own private key; no public keys are ever transmitted.
 *
 * Three-pass flow:
 *     1. Alice encrypts:   C₁ = e_A · M
 *     2. Bob encrypts:     C₂ = e_B · C₁
 *     3. Alice decrypts:   C₃ = e_A⁻¹ · C₂
 *     4. Bob decrypts:     M  = e_B⁻¹ · C₃
 *
 * The protocol works because scalar multiplication on elliptic curves
 * is commutative:
 *
 *     e_A · (e_B · M) = e_B · (e_A · M)
 *
 * Requirement: gcd(privateKey, n) = 1 so that the modular inverse
 * e⁻¹ mod n exists.
 *
 * Usage:
 *
 *     const alice = new MasseyOmura(0xA1n, 'secp521r1')
 *     const bob   = new MasseyOmura(0xB2n, 'secp521r1')
 *
 *     const c1 = alice.encrypt(M)       // Alice → Bob
 *     const c2 = bob.encrypt(c1)        // Bob → Alice
 *     const c3 = alice.decrypt(c2)      // Alice → Bob
 *     const plaintext = bob.decrypt(c3) // Bob recovers M
 */

import { getCurve } from '../curves/registry.js'
import { modInverse } from '../utils/math.js'

/**
 * Massey-Omura three-pass protocol.
 */
export class MasseyOmura {
  /**
   * @param {BigInt} privateKey          - The private scalar e, must be coprime with n.
   * @param {string} [curveName='secp521r1'] - Name of the curve.
   */
  constructor(privateKey, curveName = 'secp521r1') {
    this.privateKey = privateKey
    this.curveName = curveName
    Object.freeze(this)
  }

  get _curve() {
    return getCurve(this.curveName)
  }

  /**
   * Modular inverse of the private key: e⁻¹ mod n.
   */
  get _inverseKey() {
    return modInverse(this.privateKey, this._curve.n)
  }

  /**
   * Encrypt (multiply) a point with the private key.
   *
   *     C = e · P
   *
   * @param {Point} point - A curve point (message or partially encrypted).
   * @returns {Point} e · point
   */
  encrypt(point) {
    return point.mul(this.privateKey)
  }

  /**
   * Decrypt (multiply) a point with the inverse of the private key.
   *
   *     P = e⁻¹ · C
   *
   * @param {Point} point - A curve point to decrypt.
   * @returns {Point} e⁻¹ · point
   */
  decrypt(point) {
    return point.mul(this._inverseKey)
  }
}
