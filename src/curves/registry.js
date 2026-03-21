/**
 * Pre-defined elliptic curve parameters, generator points, and a lookup function.
 *
 * All parameters are from the SEC 2 / NIST standards.
 *
 * Supported curves:
 *   secp192k1, secp192r1     — 192-bit (Koblitz & random)
 *   secp224k1, secp224r1     — 224-bit
 *   secp256k1, secp256r1     — 256-bit (secp256k1 is used by Bitcoin)
 *   secp384r1                — 384-bit (NIST P-384)
 *   secp521r1                — 521-bit (NIST P-521)
 */

import { CurveParams } from '../core/curve.js'
import { Point } from '../core/point.js'

// --------------------------------------------------------------------------
// Standard curves  (params from SEC 2 / NIST standards)
// --------------------------------------------------------------------------

const _REGISTRY = {
  secp192k1: {
    p: 0xfffffffffffffffffffffffffffffffffffffffeffffee37n,
    a: 0x0n,
    b: 0x3n,
    Gx: 0xdb4ff10ec057e9ae26b07d0280b7f4341da5d1b1eae06c7dn,
    Gy: 0x9b2f2f6d9c5628a7844163d015be86344082aa88d95e2f9dn,
    n: 0xfffffffffffffffffffffffe26f2fc170f69466a74defd8dn,
    h: 1n,
  },
  secp192r1: {
    p: 0xfffffffffffffffffffffffffffffffeffffffffffffffffn,
    a: 0xfffffffffffffffffffffffffffffffefffffffffffffffcn,
    b: 0x64210519e59c80e70fa7e9ab72243049feb8deecc146b9b1n,
    Gx: 0x188da80eb03090f67cbf20eb43a18800f4ff0afd82ff1012n,
    Gy: 0x07192b95ffc8da78631011ed6b24cdd573f977a11e794811n,
    n: 0xffffffffffffffffffffffff99def836146bc9b1b4d22831n,
    h: 1n,
  },
  secp224k1: {
    p: 0xfffffffffffffffffffffffffffffffffffffffffffffffeffffe56dn,
    a: 0x0n,
    b: 0x5n,
    Gx: 0xa1455b334df099df30fc28a169a467e9e47075a90f7e650eb6b7a45cn,
    Gy: 0x7e089fed7fba344282cafbd6f7e319f7c0b0bd59e2ca4bdb556d61a5n,
    n: 0x10000000000000000000000000001dce8d2ec6184caf0a971769fb1f7n,
    h: 1n,
  },
  secp224r1: {
    p: 0xffffffffffffffffffffffffffffffff000000000000000000000001n,
    a: 0xfffffffffffffffffffffffffffffffefffffffffffffffffffffffen,
    b: 0xb4050a850c04b3abf54132565044b0b7d7bfd8ba270b39432355ffb4n,
    Gx: 0xb70e0cbd6bb4bf7f321390b94a03c1d356c21122343280d6115c1d21n,
    Gy: 0xbd376388b5f723fb4c22dfe6cd4375a05a07476444d5819985007e34n,
    n: 0xffffffffffffffffffffffffffff16a2e0b8f03e13dd29455c5c2a3dn,
    h: 1n,
  },
  secp256k1: {
    p: 0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffefffffc2fn,
    a: 0x0n,
    b: 0x7n,
    Gx: 0x79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798n,
    Gy: 0x483ada7726a3c4655da4fbfc0e1108a8fd17b448a68554199c47d08ffb10d4b8n,
    n: 0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141n,
    h: 1n,
  },
  secp256r1: {
    p: 0xffffffff00000001000000000000000000000000ffffffffffffffffffffffffn,
    a: 0xffffffff00000001000000000000000000000000fffffffffffffffffffffffcn,
    b: 0x5ac635d8aa3a93e7b3ebbd55769886bc651d06b0cc53b0f63bce3c3e27d2604bn,
    Gx: 0x6b17d1f2e12c4247f8bce6e563a440f277037d812deb33a0f4a13945d898c296n,
    Gy: 0x4fe342e2fe1a7f9b8ee7eb4a7c0f9e162bce33576b315ececbb6406837bf51f5n,
    n: 0xffffffff00000000ffffffffffffffffbce6faada7179e84f3b9cac2fc632551n,
    h: 1n,
  },
  secp384r1: {
    p: 0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffeffffffff0000000000000000ffffffffn,
    a: 0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffeffffffff0000000000000000fffffffcn,
    b: 0xb3312fa7e23ee7e4988e056be3f82d19181d9c6efe8141120314088f5013875ac656398d8a2ed19d2a85c8edd3ec2aefn,
    Gx: 0xaa87ca22be8b05378eb1c71ef320ad746e1d3b628ba79b9859f741e082542a385502f25dbf55296c3a545e3872760ab7n,
    Gy: 0x3617de4a96262c6f5d9e98bf9292dc29f8f41dbd289a147ce9da3113b5f0b8c00a60b1ce1d7e819d7a431d7c90ea0e5fn,
    n: 0xffffffffffffffffffffffffffffffffffffffffffffffffc7634d81f4372ddf581a0db248b0a77aecec196accc52973n,
    h: 1n,
  },
  secp521r1: {
    p: 0x1ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffn,
    a: 0x1fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffcn,
    b: 0x051953eb9618e1c9a1f929a21a0b68540eea2da725b99b315f3b8b489918ef109e156193951ec7e937b1652c0bd3bb1bf073573df883d2c34f1ef451fd46b503f00n,
    Gx: 0x0c6858e06b70404e9cd9e3ecb662395b4429c648139053fb521f828af606b4d3dbaa14b5e77efe75928fe1dc127a2ffa8de3348b3c1856a429bf97e7e31c2e5bd66n,
    Gy: 0x11839296a789a3bc0045c8a5fb42c7d1bd998f54449579b446817afbd17273e662c97ee72995ef42640c550b9013fad0761353c7086a272c24088be94769fd16650n,
    n: 0x1fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffa51868783bf2f966b7fcc0148f709a5d03bb5c9b8899c47aebb6fb71e91386409n,
    h: 1n,
  },
}

/**
 * Return a CurveParams by standard name (case-insensitive).
 *
 * @param {string} name - Curve name (e.g. "secp256k1").
 * @returns {CurveParams}
 * @throws {Error} If the curve name is not registered.
 */
export function getCurve(name) {
  const key = name.toLowerCase().trim()
  if (!(key in _REGISTRY)) {
    const available = Object.keys(_REGISTRY).sort().join(', ')
    throw new Error(`Unknown curve '${name}'. Available: ${available}`)
  }
  const entry = _REGISTRY[key]
  return new CurveParams({
    p: entry.p,
    a: entry.a,
    b: entry.b,
    n: entry.n,
    h: entry.h,
  })
}

/**
 * Return the generator Point G for a named curve.
 *
 * The generator G is a point of order n on the curve, meaning n·G = O.
 *
 * @param {string} name - Curve name (e.g. "secp256k1").
 * @returns {Point}
 * @throws {Error} If the curve name is not registered.
 */
export function getGenerator(name) {
  const key = name.toLowerCase().trim()
  if (!(key in _REGISTRY)) {
    const available = Object.keys(_REGISTRY).sort().join(', ')
    throw new Error(`Unknown curve '${name}'. Available: ${available}`)
  }
  const entry = _REGISTRY[key]
  const curve = getCurve(name)
  return new Point(entry.Gx, entry.Gy, curve)
}
