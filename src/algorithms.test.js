import { test, expect, describe } from '@jest/globals'
import { DigitalSignature } from './algorithms/digital_signature'
import { Koblitz } from './algorithms/koblitz'

// ---------------------------------------------------------------------------
// ECDSA — Elliptic Curve Digital Signature Algorithm
//
// Signing (private key d, generator G of order n):
//   1. Choose random k ∈ [1, n-1]
//   2. R = k·G,  r = R.x mod n
//   3. s = (hash + r·d) · k⁻¹  mod n
//
// Verification (public key Q = d·G):
//   1. w  = s⁻¹ mod n
//   2. u₁ = hash·w mod n,  u₂ = r·w mod n
//   3. R' = u₁·G + u₂·Q
//   4. Accept iff R'.x mod n = r
//
// Security: the nonce k must never be reused across different messages
// (cf. Sony PS3 ECDSA attack, 2010).
// ---------------------------------------------------------------------------

describe('ECDSA digital signatures', () => {
  const privateKey = 123456789n
  const ds = new DigitalSignature(privateKey)

  test('default curve is secp256k1', () => {
    expect(ds.curveName).toBe('secp256k1')
  })

  test('sign and verify: valid signature is accepted', () => {
    const messageHash = 545454445644654n
    const [r, s] = ds.sign(messageHash)
    expect(ds.verify(ds.publicKey, messageHash, r, s)).toBe(true)
  })

  // r and s must be in [1, n-1]
  test('verify rejects r or s outside [1, n-1]', () => {
    const messageHash = 545454445644654n
    const [r, s] = ds.sign(messageHash)
    const n = ds._curve.n

    expect(() => ds.verify(ds.publicKey, messageHash, n, s)).toThrow(
      'r or s are not in the valid range [1, n-1].',
    )
    expect(() => ds.verify(ds.publicKey, messageHash, r, 0n)).toThrow(
      'r or s are not in the valid range [1, n-1].',
    )
  })

  // signMessage hashes the message with SHA-256, then signs the integer hash
  test('signMessage and verifyMessage with SHA-256', async () => {
    const message = 'Hello, ECDSA!'
    const [r, s] = await ds.signMessage(message)
    expect(await ds.verifyMessage(ds.publicKey, message, r, s)).toBe(true)
  })

  // Q = d·G must lie on the curve
  test('public key Q = d·G is on the curve', () => {
    expect(ds.publicKey.isOnCurve()).toBe(true)
  })

  // signMessage/verifyMessage with a custom hash function
  test('signMessage and verifyMessage with custom hash function', async () => {
    const customHash = async (msg) => {
      // Simple deterministic "hash" for testing: hex of char codes
      let hex = ''
      const str = typeof msg === 'string' ? msg : String.fromCharCode(...msg)
      for (let i = 0; i < str.length; i++) {
        hex += str.charCodeAt(i).toString(16).padStart(2, '0')
      }
      return hex.padStart(64, '0')
    }
    const message = 'custom hash test'
    const [r, s] = await ds.signMessage(message, customHash)
    expect(
      await ds.verifyMessage(ds.publicKey, message, r, s, customHash),
    ).toBe(true)
  })

  // signMessage with Uint8Array input
  test('signMessage and verifyMessage with Uint8Array input', async () => {
    const message = new Uint8Array([72, 101, 108, 108, 111]) // "Hello"
    const [r, s] = await ds.signMessage(message)
    expect(await ds.verifyMessage(ds.publicKey, message, r, s)).toBe(true)
  })

  // verify rejects a tampered signature
  test('verify rejects tampered signature', () => {
    const messageHash = 123456789n
    const [r, s] = ds.sign(messageHash)
    // Tamper with the hash
    expect(ds.verify(ds.publicKey, messageHash + 1n, r, s)).toBe(false)
  })

  // DigitalSignature with a different curve
  test('works with secp384r1', () => {
    const ds384 = new DigitalSignature(42n, 'secp384r1')
    const hash = 0xabcdefn
    const [r, s] = ds384.sign(hash)
    expect(ds384.verify(ds384.publicKey, hash, r, s)).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Koblitz encoding
//
// Maps a text message to a point on an elliptic curve:
//   1. Convert string → integer m  (base-α positional encoding, α = alphabet_size)
//   2. For j = 1, 2, ..., 99:
//        x = (100·m + j) mod p
//        Compute s = x³ + ax + b (mod p)
//        If s is a quadratic residue, compute y = √s and return (Point(x,y), j)
//
// Decoding reverses the process:
//   m = (x - j) / 100
//   Convert integer m → string via base-α decomposition
//
// Failure probability after 99 attempts: ≈ 2⁻⁹⁹
// ---------------------------------------------------------------------------

describe('Koblitz encoding', () => {
  test('encode/decode roundtrip with Unicode alphabet (secp192k1)', () => {
    const kob = new Koblitz('secp192k1', 65536n)
    const message = 'Hello, EC!'
    const [point, j] = kob.encode(message)
    expect(kob.decode(point, j)).toBe(message)
  })

  test('encode/decode roundtrip with ASCII alphabet (secp192k1)', () => {
    const kob = new Koblitz('secp192k1', 256n)
    const message = 'Hello, EC!'
    const [point, j] = kob.encode(message)
    expect(kob.decode(point, j)).toBe(message)
  })

  test('encode/decode with default settings (secp521r1, ASCII)', () => {
    const kob = new Koblitz()
    const message = 'Hello, Elliptic Curve Cryptography!'
    const [point, j] = kob.encode(message)
    expect(kob.decode(point, j)).toBe(message)
  })

  test('default curve is secp521r1', () => {
    expect(new Koblitz().curveName).toBe('secp521r1')
  })

  test('default alphabet size is 256 (ASCII)', () => {
    expect(new Koblitz().alphabetSize).toBe(256n)
  })

  // The encoded point must satisfy y² ≡ x³ + ax + b (mod p)
  test('encoded point lies on the curve', () => {
    const [point] = new Koblitz().encode('Test')
    expect(point.isOnCurve()).toBe(true)
  })
})
