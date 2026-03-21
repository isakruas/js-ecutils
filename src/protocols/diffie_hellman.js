/**
 * Elliptic Curve Diffie-Hellman (ECDH) key exchange protocol.
 *
 * Protocol:
 *     1. Alice computes her public key:  H_A = d_A · G
 *     2. Bob computes his public key:    H_B = d_B · G
 *     3. Shared secret:  S = d_A · H_B = d_B · H_A = d_A · d_B · G
 *
 * Security relies on the Elliptic Curve Discrete Logarithm Problem
 * (ECDLP): given G and Q = d·G, it is computationally infeasible to
 * recover the private scalar d.
 *
 * Usage:
 *
 *     const alice = new DiffieHellman(0xAn, 'secp256k1')
 *     const bob   = new DiffieHellman(0xBn, 'secp256k1')
 *
 *     const sharedAlice = alice.computeSharedSecret(bob.publicKey)
 *     const sharedBob   = bob.computeSharedSecret(alice.publicKey)
 *     // sharedAlice.x === sharedBob.x
 */

import { getGenerator } from '../curves/registry.js'

/**
 * Elliptic Curve Diffie-Hellman key exchange.
 */
export class DiffieHellman {
  /**
   * @param {BigInt} privateKey          - The private scalar d.
   * @param {string} [curveName='secp256k1'] - Name of the curve.
   */
  constructor(privateKey, curveName = 'secp256k1') {
    this.privateKey = privateKey
    this.curveName = curveName
    Object.freeze(this)
  }

  get _G() {
    return getGenerator(this.curveName)
  }

  /**
   * Compute the public key: H = d · G.
   */
  get publicKey() {
    return this._G.mul(this.privateKey)
  }

  /**
   * Compute the shared secret from another party's public key.
   *
   *     S = d · Q_other = d · d_other · G
   *
   * @param {Point} otherPublicKey - The other party's public key point Q.
   * @returns {Point} The shared secret point.
   */
  computeSharedSecret(otherPublicKey) {
    return otherPublicKey.mul(this.privateKey)
  }
}
