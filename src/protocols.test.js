import { test, expect, describe } from '@jest/globals'
import { DiffieHellman } from './protocols/diffie_hellman'
import { MasseyOmura } from './protocols/massey_omura'
import { Koblitz } from './algorithms/koblitz'
import { getGenerator } from './curves/registry'

// ---------------------------------------------------------------------------
// Elliptic Curve Diffie-Hellman (ECDH)
//
// Protocol:
//   1. Alice:  H_A = d_A · G
//   2. Bob:    H_B = d_B · G
//   3. Shared secret:  S = d_A · H_B = d_B · H_A = d_A · d_B · G
//
// Security: relies on the Elliptic Curve Discrete Logarithm Problem (ECDLP).
// Given G and Q = d·G, recovering d is computationally infeasible.
// ---------------------------------------------------------------------------

describe('Diffie-Hellman key exchange', () => {
  test('both parties compute the same shared secret', () => {
    const alice = new DiffieHellman(12345n)
    const bob = new DiffieHellman(67890n)

    // S_A = d_A · H_B = d_A · d_B · G
    const secretAlice = alice.computeSharedSecret(bob.publicKey)
    // S_B = d_B · H_A = d_B · d_A · G
    const secretBob = bob.computeSharedSecret(alice.publicKey)

    expect(secretAlice.x).toBe(secretBob.x)
    expect(secretAlice.y).toBe(secretBob.y)
  })

  test('default curve is secp256k1', () => {
    expect(new DiffieHellman(1n).curveName).toBe('secp256k1')
  })

  // H = d·G must satisfy y² ≡ x³ + ax + b (mod p)
  test('public key lies on the curve', () => {
    expect(new DiffieHellman(42n).publicKey.isOnCurve()).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Massey-Omura three-pass protocol
//
// Allows two parties to exchange a secret point M without sharing keys
// beforehand.  Each party uses only their own private key.
//
// Three-pass flow:
//   1. Alice encrypts:   C₁ = e_A · M
//   2. Bob encrypts:     C₂ = e_B · C₁
//   3. Alice decrypts:   C₃ = e_A⁻¹ · C₂
//   4. Bob decrypts:     M  = e_B⁻¹ · C₃
//
// Works because scalar multiplication is commutative:
//   e_A · (e_B · M) = e_B · (e_A · M)
//
// Requirement: gcd(private_key, n) = 1  (so that e⁻¹ mod n exists)
// ---------------------------------------------------------------------------

describe('Massey-Omura three-pass protocol', () => {
  test('complete encryption/decryption cycle recovers original message', () => {
    const sender = new MasseyOmura(123456n)
    const receiver = new MasseyOmura(654321n)

    const message = getGenerator(sender.curveName)

    // C₁ = e_sender · M
    const c1 = sender.encrypt(message)
    // C₂ = e_receiver · C₁
    const c2 = receiver.encrypt(c1)
    // C₃ = e_sender⁻¹ · C₂  (removes sender's encryption)
    const c3 = sender.decrypt(c2)
    // M  = e_receiver⁻¹ · C₃  (removes receiver's encryption)
    const recovered = receiver.decrypt(c3)

    expect(recovered.x).toBe(message.x)
    expect(recovered.y).toBe(message.y)
  })

  // d·G must lie on the curve
  test('point multiplication with private key produces on-curve point', () => {
    const mo = new MasseyOmura(123456n)
    const G = getGenerator(mo.curveName)
    expect(G.mul(123456n).isOnCurve()).toBe(true)
  })

  test('default curve is secp521r1', () => {
    expect(new MasseyOmura(1n).curveName).toBe('secp521r1')
  })

  // Full end-to-end with Koblitz encoding
  test('three-pass exchange with Koblitz-encoded message', () => {
    const koblitz = new Koblitz('secp521r1')
    const [message, j] = koblitz.encode('Hello!')

    const alice = new MasseyOmura(0xa1n, 'secp521r1')
    const bob = new MasseyOmura(0xb2n, 'secp521r1')

    const c1 = alice.encrypt(message)
    const c2 = bob.encrypt(c1)
    const c3 = alice.decrypt(c2)
    const plaintext = bob.decrypt(c3)

    expect(plaintext.x).toBe(message.x)
    expect(plaintext.y).toBe(message.y)
    expect(koblitz.decode(plaintext, j)).toBe('Hello!')
  })
})
