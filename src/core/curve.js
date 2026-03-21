/**
 * Elliptic curve parameters and coordinate system definitions.
 */

import { modPow } from '../utils/math.js'

/**
 * Coordinate system used for internal arithmetic.
 *
 * Two systems are supported:
 *
 * - **AFFINE** — points are (x, y).  Each operation requires one modular
 *   inversion, which is simple but relatively slow.
 *
 * - **JACOBIAN** — points are (X, Y, Z) with x = X/Z², y = Y/Z³.
 *   Avoids inversions during addition/doubling (~3x faster for scalar
 *   multiplication) at the cost of a single inversion when converting
 *   back to affine form.
 */
export const CoordinateSystem = Object.freeze({
  AFFINE: 'AFFINE',
  JACOBIAN: 'JACOBIAN',
})

/**
 * Immutable parameters defining an elliptic curve y² = x³ + ax + b (mod p).
 *
 * A valid (non-singular) elliptic curve requires a non-zero discriminant:
 *
 *     Δ = -16(4a³ + 27b²) ≠ 0  (mod p)
 *
 * This is verified automatically at construction time; attempting to
 * create a CurveParams with 4a³ + 27b² ≡ 0 (mod p) throws an Error.
 *
 * For cryptographic security the group order n should be at
 * least 2¹⁶⁰ (see NIST SP 800-57).  This library does not
 * enforce a minimum order so that small "toy" curves can be used
 * for educational purposes.
 *
 * @param {Object} params
 * @param {BigInt} params.p     - Prime order of the finite field.
 * @param {BigInt} params.a     - Coefficient 'a' in the curve equation.
 * @param {BigInt} params.b     - Coefficient 'b' in the curve equation.
 * @param {BigInt} params.n     - Order of the generator point.
 * @param {BigInt} [params.h=1n]           - Cofactor.
 * @param {string} [params.coord='JACOBIAN'] - Coordinate system for internal computations.
 */
export class CurveParams {
  constructor({ p, a, b, n, h = 1n, coord = CoordinateSystem.JACOBIAN }) {
    this.p = p
    this.a = a
    this.b = b
    this.n = n
    this.h = h
    this.coord = coord

    // Validate non-singular: 4a³ + 27b² ≠ 0 (mod p)
    const discriminant = (4n * modPow(a, 3n, p) + 27n * modPow(b, 2n, p)) % p
    if (discriminant === 0n) {
      throw new Error(
        `Singular curve: 4a³ + 27b² ≡ 0 (mod p) for a=${a}, b=${b}, p=${p}. ` +
          'The discriminant must be non-zero for a valid elliptic curve.',
      )
    }

    Object.freeze(this)
  }
}
