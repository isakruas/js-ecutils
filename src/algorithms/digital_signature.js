/**
 * Elliptic Curve Digital Signature Algorithm (ECDSA).
 *
 * ECDSA provides authentication and integrity through digital signatures
 * based on elliptic curve cryptography.
 *
 * Signing (private key d, generator G of order n):
 *     1. Choose random k ∈ [1, n-1]
 *     2. R = k·G,  r = R.x mod n
 *     3. s = (hash + r·d) · k⁻¹  mod n
 *
 * Verification (public key Q = d·G):
 *     1. w  = s⁻¹  mod n
 *     2. u₁ = hash·w mod n,  u₂ = r·w mod n
 *     3. R' = u₁·G + u₂·Q
 *     4. Accept iff R'.x mod n = r
 *
 * Usage:
 *
 *     const signer = new DigitalSignature(123456n, 'secp256k1')
 *     const [r, s] = signer.sign(messageHash)
 *     signer.verify(signer.publicKey, messageHash, r, s)  // true
 */

import { getCurve, getGenerator } from '../curves/registry.js'
import { validatePublicKey } from '../core/validation.js'
import { modulus, modInverse } from '../utils/math.js'

/**
 * Get the crypto module (works in both Node.js and browsers).
 * Uses globalThis.crypto (Web Crypto API) when available, with
 * a dynamic require fallback for Node.js environments.
 */
/* istanbul ignore next -- environment-specific crypto detection */
function getCrypto() {
  if (typeof globalThis.crypto !== 'undefined') return globalThis.crypto
  const mod = 'crypto'
  return typeof require !== 'undefined' ? require(mod) : null // eslint-disable-line no-undef
}

/**
 * Generate a cryptographically secure random BigInt in [1, max-1].
 *
 * Uses crypto.getRandomValues() (CSPRNG) instead of Math.random()
 * to prevent nonce prediction attacks.
 */
function secureRandBelow(max) {
  if (max <= 1n) return 1n
  const byteLen = (max.toString(16).length + 1) >> 1
  const bytes = new Uint8Array(byteLen)
  let result
  do {
    const cryptoMod = getCrypto()
    if (cryptoMod && cryptoMod.getRandomValues) {
      cryptoMod.getRandomValues(bytes)
    } /* istanbul ignore next -- Node.js without Web Crypto */ else if (
      cryptoMod &&
      cryptoMod.randomBytes
    ) {
      const buf = cryptoMod.randomBytes(byteLen)
      bytes.set(buf)
    } else {
      /* istanbul ignore next */
      throw new Error('No secure random number generator available.')
    }
    let hex = ''
    for (let i = 0; i < bytes.length; i++) {
      hex += bytes[i].toString(16).padStart(2, '0')
    }
    result = BigInt('0x' + hex) % max
  } while (result === 0n)
  return result
}

/**
 * ECDSA signature generation and verification.
 */
export class DigitalSignature {
  /**
   * @param {BigInt} privateKey       - The private scalar d.
   * @param {string} [curveName='secp256k1'] - Name of the curve.
   */
  constructor(privateKey, curveName = 'secp256k1') {
    this.privateKey = privateKey
    this.curveName = curveName
    Object.freeze(this)
  }

  get _curve() {
    return getCurve(this.curveName)
  }

  get _G() {
    return getGenerator(this.curveName)
  }

  /**
   * Compute the public key: Q = d · G.
   */
  get publicKey() {
    return this._G.mul(this.privateKey)
  }

  /**
   * Generate an ECDSA signature for a message hash.
   *
   * Algorithm:
   *     1. Choose random k ∈ [1, n-1]
   *     2. R = k·G,  r = R.x mod n
   *     3. s = (m + r·d) · k⁻¹  mod n   (d = private key, m = hash)
   *
   * Warning: the nonce k must NEVER be reused across different messages.
   * Reusing k leaks the private key (as demonstrated in the 2010 Sony
   * PS3 ECDSA attack).
   *
   * @param {BigInt} messageHash - Integer hash of the message (e.g. SHA-256).
   * @returns {[BigInt, BigInt]} [r, s]
   */
  sign(messageHash) {
    const n = this._curve.n
    const G = this._G
    let r = 0n,
      s = 0n
    while (r === 0n || s === 0n) {
      const k = secureRandBelow(n)
      const R = G.mul(k)
      r = modulus(R.x, n)
      s = modulus((messageHash + r * this.privateKey) * modInverse(k, n), n)
    }
    return [r, s]
  }

  /**
   * Verify an ECDSA signature.
   *
   * Algorithm:
   *     1. w  = s⁻¹ mod n
   *     2. u₁ = m·w mod n,  u₂ = r·w mod n
   *     3. R' = u₁·G + u₂·Q   (Q = public key)
   *     4. Accept iff R'.x mod n = r
   *
   * @param {Point} publicKey   - The signer's public key Q.
   * @param {BigInt} messageHash - Integer hash of the signed message.
   * @param {BigInt} r          - First component of the signature.
   * @param {BigInt} s          - Second component of the signature.
   * @returns {boolean}
   * @throws {Error} If r or s are outside [1, n-1], or the public key is
   *   not a valid point on the configured curve.
   */
  verify(publicKey, messageHash, r, s) {
    const n = this._curve.n
    if (!(1n <= r && r < n && 1n <= s && s < n)) {
      throw new Error('r or s are not in the valid range [1, n-1].')
    }
    validatePublicKey(publicKey, this._curve)
    const G = this._G
    const w = modInverse(s, n)
    const u1 = modulus(messageHash * w, n)
    const u2 = modulus(r * w, n)
    const R = G.mul(u1).add(publicKey.mul(u2))
    return modulus(R.x, n) === r
  }

  /**
   * Hash a message and sign it.
   *
   * Computes SHA-256(message) and converts the hex digest to an integer
   * before signing.
   *
   * @param {Uint8Array|string} message - The raw message to sign.
   * @param {Function} [hashFunc]       - Optional async hash function
   *   returning a hex string.  Defaults to SHA-256.
   * @returns {Promise<[BigInt, BigInt]>} [r, s]
   */
  async signMessage(message, hashFunc) {
    const messageHash = await defaultHash(message, hashFunc)
    return this.sign(messageHash)
  }

  /**
   * Hash a message and verify its ECDSA signature.
   *
   * @param {Point} publicKey           - The signer's public key.
   * @param {Uint8Array|string} message - The raw message.
   * @param {BigInt} r                  - First component of the signature.
   * @param {BigInt} s                  - Second component of the signature.
   * @param {Function} [hashFunc]       - Optional async hash function.
   * @returns {Promise<boolean>}
   */
  async verifyMessage(publicKey, message, r, s, hashFunc) {
    const messageHash = await defaultHash(message, hashFunc)
    return this.verify(publicKey, messageHash, r, s)
  }
}

/**
 * Default hash: SHA-256 via Web Crypto or Node.js crypto.
 * Returns the digest as a BigInt.
 */
async function defaultHash(message, hashFunc) {
  if (hashFunc) {
    const hex = await hashFunc(message)
    return BigInt('0x' + hex)
  }

  let bytes
  if (typeof message === 'string') {
    bytes = new TextEncoder().encode(message)
  } else {
    bytes = message
  }

  const cryptoMod = getCrypto()
  if (cryptoMod && cryptoMod.subtle) {
    const digest = await cryptoMod.subtle.digest('SHA-256', bytes)
    const arr = new Uint8Array(digest)
    let hex = ''
    for (let i = 0; i < arr.length; i++) {
      hex += arr[i].toString(16).padStart(2, '0')
    }
    return BigInt('0x' + hex)
  }

  // Node.js fallback
  /* istanbul ignore next -- Node.js without Web Crypto */
  if (cryptoMod && cryptoMod.createHash) {
    const hash = cryptoMod.createHash('sha256').update(bytes).digest('hex')
    return BigInt('0x' + hash)
  }

  /* istanbul ignore next */
  throw new Error('No hash function available.')
}
