import { test, expect, describe } from '@jest/globals'
import {
  isQuadraticResidue,
  modularSqrt,
  modPow,
  modulus,
  modInverse,
  extendedGcd,
} from './utils/math'

// ---------------------------------------------------------------------------
// Modular arithmetic basics
// ---------------------------------------------------------------------------

describe('Modular arithmetic utilities', () => {
  test('modulus returns non-negative result for negative dividends', () => {
    expect(modulus(-5n, 3n)).toBe(1n)
    expect(modulus(-1n, 7n)).toBe(6n)
    expect(modulus(5n, 3n)).toBe(2n)
  })

  test('modPow with m = 1 returns 0', () => {
    expect(modPow(5n, 3n, 1n)).toBe(0n)
  })

  test('modPow computes base^exp mod m correctly', () => {
    // 2^10 = 1024, 1024 mod 100 = 24
    expect(modPow(2n, 10n, 100n)).toBe(24n)
    // 3^0 = 1
    expect(modPow(3n, 0n, 7n)).toBe(1n)
  })

  test('extendedGcd returns correct Bezout coefficients', () => {
    const [g, x, y] = extendedGcd(35n, 15n)
    expect(g).toBe(5n)
    expect(35n * x + 15n * y).toBe(g)
  })

  test('modInverse returns correct inverse', () => {
    // 3 * 5 = 15 ≡ 1 (mod 7)
    expect(modInverse(3n, 7n)).toBe(5n)
    // Verify: a * a⁻¹ ≡ 1 (mod p)
    const inv = modInverse(17n, 23n)
    expect((17n * inv) % 23n).toBe(1n)
  })

  test('modInverse throws for non-coprime inputs', () => {
    expect(() => modInverse(6n, 3n)).toThrow('Modular inverse does not exist')
  })
})

// ---------------------------------------------------------------------------
// Quadratic residue testing — Euler's criterion
//
// A non-zero integer a is a quadratic residue mod p (odd prime) iff:
//   a^((p-1)/2) ≡ 1  (mod p)
//
// If a ≡ 0 (mod p), then a is not considered a QR.
// ---------------------------------------------------------------------------

describe('Quadratic residue (Euler criterion)', () => {
  test('1 is always a QR mod any prime', () => {
    expect(isQuadraticResidue(1n, 7n)).toBe(true)
    expect(isQuadraticResidue(1n, 23n)).toBe(true)
  })

  // 3^((7-1)/2) = 3³ = 27 ≡ 6 (mod 7) ≠ 1
  test('3 is not a QR mod 7', () => {
    expect(isQuadraticResidue(3n, 7n)).toBe(false)
  })

  test('0 ≡ 0 (mod p) returns false', () => {
    expect(isQuadraticResidue(0n, 7n)).toBe(false)
    expect(isQuadraticResidue(7n, 7n)).toBe(false)
  })

  // QR mod 23 = {1, 2, 3, 4, 6, 8, 9, 12, 13, 16, 18}
  test('complete QR set mod 23', () => {
    const qrSet = new Set([1n, 2n, 3n, 4n, 6n, 8n, 9n, 12n, 13n, 16n, 18n])
    for (let a = 1n; a < 23n; a++) {
      expect(isQuadraticResidue(a, 23n)).toBe(qrSet.has(a))
    }
  })

  // 25 ≡ 2 (mod 23), and 2 ∈ QR(23)
  test('values larger than p are reduced before testing', () => {
    expect(isQuadraticResidue(25n, 23n)).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Modular square root
//
// For p ≡ 3 (mod 4):  √a = a^((p+1)/4) mod p   (direct formula)
// For p ≡ 1 (mod 4):  Tonelli-Shanks algorithm
//
// Returns null if a is not a quadratic residue mod p.
// ---------------------------------------------------------------------------

describe('Modular square root', () => {
  // p = 23 ≡ 3 (mod 4) → direct formula: r = a^((p+1)/4) mod p
  test('direct formula for p ≡ 3 (mod 4): √16 mod 23', () => {
    const r = modularSqrt(16n, 23n)
    expect(r).not.toBe(null)
    expect(modPow(r, 2n, 23n)).toBe(16n)
  })

  // p = 13 ≡ 1 (mod 4) → Tonelli-Shanks: 4² = 16 ≡ 3 (mod 13)
  test('Tonelli-Shanks for p ≡ 1 (mod 4): √3 mod 13', () => {
    const r = modularSqrt(3n, 13n)
    expect(r).not.toBe(null)
    expect(modPow(r, 2n, 13n)).toBe(3n)
  })

  test('non-QR returns null: √5 mod 7', () => {
    expect(modularSqrt(5n, 7n)).toBe(null)
  })

  test('√0 = 0', () => {
    expect(modularSqrt(0n, 7n)).toBe(0n)
  })

  // Verify r² ≡ a (mod p) for every QR mod 23
  test('roundtrip for all QR mod 23', () => {
    for (let a = 1n; a < 23n; a++) {
      const r = modularSqrt(a, 23n)
      if (r !== null) {
        expect(modPow(r, 2n, 23n)).toBe(a)
      }
    }
  })

  // p = 17 ≡ 1 (mod 4): QR(17) = {1, 2, 4, 8, 9, 13, 15, 16}
  test('Tonelli-Shanks for all QR mod 17', () => {
    for (const a of [1n, 2n, 4n, 8n, 9n, 13n, 15n, 16n]) {
      const r = modularSqrt(a, 17n)
      expect(r).not.toBe(null)
      expect(modPow(r, 2n, 17n)).toBe(a)
    }
  })

  test('non-QR mod 17 return null', () => {
    for (const a of [3n, 5n, 6n, 7n, 10n, 11n, 12n, 14n]) {
      expect(modularSqrt(a, 17n)).toBe(null)
    }
  })

  // p = 41 ≡ 1 (mod 8): higher power of 2 in p-1 factorization
  // 17² = 289 ≡ 2 (mod 41)
  test('Tonelli-Shanks for p ≡ 1 (mod 8): √2 mod 41', () => {
    const r = modularSqrt(2n, 41n)
    expect(r).not.toBe(null)
    expect(modPow(r, 2n, 41n)).toBe(2n)
  })

  // √a where a > p (should reduce mod p first)
  test('modularSqrt with a > p reduces correctly', () => {
    // 27 ≡ 4 (mod 23), and √4 exists
    const r = modularSqrt(27n, 23n)
    expect(r).not.toBe(null)
    expect(modPow(r, 2n, 23n)).toBe(4n)
  })
})
