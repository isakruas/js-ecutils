/**
 * Modular arithmetic utilities for elliptic curve operations.
 *
 * Provides quadratic residue testing and modular square root computation,
 * essential building blocks for point decompression and Koblitz encoding.
 */

/**
 * Positive modulo helper.
 *
 * JavaScript's `%` operator can return negative results for negative
 * dividends.  This function ensures the result is always in [0, b).
 *
 * @param {BigInt} a - Dividend.
 * @param {BigInt} b - Divisor (must be positive).
 * @returns {BigInt} a mod b, always non-negative.
 */
export function modulus(a, b) {
  return ((a % b) + b) % b
}

/**
 * Extended Euclidean algorithm.
 *
 * Computes integers x, y such that:
 *
 *     a·x + b·y = gcd(a, b)
 *
 * Used internally by {@link modInverse} to find multiplicative inverses.
 *
 * @param {BigInt} a
 * @param {BigInt} b
 * @returns {[BigInt, BigInt, BigInt]} [gcd(a,b), x, y]
 */
export function extendedGcd(a, b) {
  let old_r = a,
    r = b
  let old_s = 1n,
    s = 0n
  let old_t = 0n,
    t = 1n
  while (r !== 0n) {
    const q = old_r / r
    ;[old_r, r] = [r, old_r - q * r]
    ;[old_s, s] = [s, old_s - q * s]
    ;[old_t, t] = [t, old_t - q * t]
  }
  return [old_r, old_s, old_t]
}

/**
 * Modular multiplicative inverse of a modulo p.
 *
 * Returns x such that:
 *
 *     a · x ≡ 1  (mod p)
 *
 * Computed via the extended Euclidean algorithm.  Throws if gcd(a, p) ≠ 1
 * (i.e., the inverse does not exist).
 *
 * @param {BigInt} a
 * @param {BigInt} p
 * @returns {BigInt} a⁻¹ mod p
 */
export function modInverse(a, p) {
  a = modulus(a, p)
  const [g, x] = extendedGcd(a, p)
  if (g !== 1n) {
    throw new Error('Modular inverse does not exist.')
  }
  return modulus(x, p)
}

/**
 * Modular exponentiation via binary method (square-and-multiply).
 *
 * Computes:
 *
 *     base^exp  mod m
 *
 * Runs in O(log exp) multiplications.
 *
 * @param {BigInt} base
 * @param {BigInt} exp - Non-negative exponent.
 * @param {BigInt} m   - Modulus.
 * @returns {BigInt}
 */
export function modPow(base, exp, m) {
  if (m === 1n) return 0n
  base = modulus(base, m)
  let result = 1n
  while (exp > 0n) {
    if (exp & 1n) {
      result = (result * base) % m
    }
    exp >>= 1n
    base = (base * base) % m
  }
  return result
}

/**
 * Check whether a is a quadratic residue modulo p using Euler's criterion.
 *
 * A non-zero integer a is a quadratic residue mod p (an odd prime) iff:
 *
 *     a^((p-1)/2) ≡ 1  (mod p)
 *
 * Returns false when a ≡ 0 (mod p).
 *
 * @param {BigInt} a - The integer to test (will be reduced mod p).
 * @param {BigInt} p - An odd prime.
 * @returns {boolean}
 */
export function isQuadraticResidue(a, p) {
  a = modulus(a, p)
  if (a === 0n) return false
  return modPow(a, (p - 1n) / 2n, p) === 1n
}

/**
 * Compute a square root of a modulo p, or null if none exists.
 *
 * Uses the direct formula when p ≡ 3 (mod 4):
 *
 *     r = a^((p+1)/4)  mod p
 *
 * Falls back to the Tonelli-Shanks algorithm for the general case
 * (p ≡ 1 mod 4):
 *
 *   1. Factor out powers of 2:  p - 1 = Q · 2^S
 *   2. Find a quadratic non-residue z
 *   3. Initialize:  M = S,  c = z^Q,  t = a^Q,  r = a^((Q+1)/2)
 *   4. Loop until t ≡ 1 (mod p):
 *        - Find least i such that t^(2^i) ≡ 1 (mod p)
 *        - b = c^(2^(M-i-1)),  M = i,  c = b²,  t = t·c,  r = r·b
 *
 * @param {BigInt} a - The value whose square root is sought (reduced mod p).
 * @param {BigInt} p - An odd prime.
 * @returns {BigInt|null} r such that r² ≡ a (mod p), or null if a is not a QR.
 */
export function modularSqrt(a, p) {
  a = modulus(a, p)
  if (a === 0n) return 0n

  if (!isQuadraticResidue(a, p)) return null

  // Shortcut for p ≡ 3 (mod 4)
  if (p % 4n === 3n) {
    return modPow(a, (p + 1n) / 4n, p)
  }

  // Tonelli-Shanks algorithm for the general case (p ≡ 1 mod 4)
  // Factor out powers of 2:  p - 1 = Q · 2^S
  let s = 0n
  let q = p - 1n
  while (q % 2n === 0n) {
    q /= 2n
    s += 1n
  }

  // Find a quadratic non-residue
  let z = 2n
  while (isQuadraticResidue(z, p)) {
    z += 1n
  }

  let m = s
  let c = modPow(z, q, p)
  let t = modPow(a, q, p)
  let r = modPow(a, (q + 1n) / 2n, p)

  while (true) {
    if (t === 1n) return r
    // Find the least i such that t^(2^i) ≡ 1 (mod p)
    let i = 1n
    let temp = (t * t) % p
    while (temp !== 1n) {
      temp = (temp * temp) % p
      i += 1n
    }
    // Update
    const b = modPow(c, 1n << (m - i - 1n), p)
    m = i
    c = (b * b) % p
    t = (t * c) % p
    r = (r * b) % p
  }
}
