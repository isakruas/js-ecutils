/**
 * Public-key and domain validation for security-sensitive APIs.
 *
 * A Point carries its own CurveParams, and Point.mul reduces the scalar
 * modulo the point's n.  Protocols that multiply a *peer-supplied* point by
 * a *local secret* must therefore bind that point to the locally trusted
 * domain first; otherwise a peer can choose a foreign curve with a small
 * order r and learn d mod r from the result (see SEC 1 §3.2.2.1 and
 * NIST SP 800-56A §5.6.2.3).
 *
 * validatePublicKey performs full public-key validation:
 *
 *     1. point carries curve parameters equal to the trusted domain
 *        (p, a, b, n, h — compared structurally, coord excluded)
 *     2. point is not the identity O
 *     3. 0 ≤ x, y < p  (canonical field elements)
 *     4. y² ≡ x³ + ax + b  (mod p)
 *     5. n·Q = O when h > 1  (subgroup membership, computed WITHOUT
 *        reducing n mod n — Point.mul(n) would return O by construction)
 */

import { Point } from './point.js'
import { jacMul, toJacobian } from './arithmetic/jacobian.js'

/**
 * True when two CurveParams describe the same cryptographic domain.
 *
 * The coord field is a representation choice, not a domain parameter,
 * so it is intentionally ignored.
 *
 * @param {CurveParams|null} a
 * @param {CurveParams|null} b
 * @returns {boolean}
 */
export function sameDomain(a, b) {
  return (
    a != null &&
    b != null &&
    a.p === b.p &&
    a.a === b.a &&
    a.b === b.b &&
    a.n === b.n &&
    a.h === b.h
  )
}

/**
 * Validate a peer-supplied public key against a trusted curve domain.
 *
 * @param {Point} point       - The untrusted public key.
 * @param {CurveParams} curve - The trusted, locally configured domain.
 * @returns {Point} The same point, for chaining.
 * @throws {Error} If any validation step fails.
 */
export function validatePublicKey(point, curve) {
  if (!(point instanceof Point)) {
    throw new Error('Public key must be a Point instance.')
  }
  if (!sameDomain(point.curve, curve)) {
    throw new Error(
      'Public key does not belong to the configured curve domain.',
    )
  }
  if (point.isIdentity) {
    throw new Error('Public key must not be the point at infinity.')
  }
  if (
    typeof point.x !== 'bigint' ||
    typeof point.y !== 'bigint' ||
    point.x < 0n ||
    point.x >= curve.p ||
    point.y < 0n ||
    point.y >= curve.p
  ) {
    throw new Error('Public key coordinates must be integers in [0, p-1].')
  }
  if (!point.isOnCurve()) {
    throw new Error('Public key is not on the configured elliptic curve.')
  }
  if (curve.h !== 1n) {
    const check = jacMul(curve.n, toJacobian(point), curve)
    if (!(check.x === null || check.y === null || check.z === 0n)) {
      throw new Error('Public key is not in the prime-order subgroup.')
    }
  }
  return point
}
