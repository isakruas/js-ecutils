import { test, expect, describe } from '@jest/globals'
import { Point } from './core/point'
import { CurveParams, CoordinateSystem } from './core/curve'
import { sameDomain, validatePublicKey } from './core/validation'
import { getCurve, getGenerator } from './curves/registry'
import { DiffieHellman } from './protocols/diffie_hellman'
import { MasseyOmura } from './protocols/massey_omura'
import { DigitalSignature } from './algorithms/digital_signature'

// ---------------------------------------------------------------------------
// Public-key validation
//
// Point.mul reduces the scalar modulo the point's own n.  A peer that
// supplies a Point on a foreign curve with small order r would receive
// (d mod r)·Q and learn the residue of the private key d modulo r; with
// several coprime r the residues combine via the CRT.
//
// Protocols must therefore validate peer points against the trusted domain:
//   • same (p, a, b, n, h)
//   • not the identity O
//   • 0 ≤ x, y < p
//   • y² ≡ x³ + ax + b  (mod p)
//   • n·Q = O when h > 1
// ---------------------------------------------------------------------------

// Toy curves over F₁₇ with points of small order 3, 5 and 7.
const FOREIGN_DOMAINS = [
  { p: 17n, a: 0n, b: 1n, n: 3n, x: 0n, y: 1n },
  { p: 17n, a: 1n, b: 5n, n: 5n, x: 5n, y: 4n },
  { p: 17n, a: 1n, b: 4n, n: 7n, x: 4n, y: 2n },
]

function foreignPoint({ p, a, b, n, x, y }) {
  return new Point(x, y, new CurveParams({ p, a, b, n, h: 1n }))
}

// y² = x³ + x + 1 over F₂₃ has 28 = 4·7 points; (5, 4) has order 7,
// (4, 0) has order 2 and (0, 1) has order 28.
const cofactorCurve = new CurveParams({ p: 23n, a: 1n, b: 1n, n: 7n, h: 4n })

describe('sameDomain', () => {
  test('equal parameters from separate instances match', () => {
    expect(sameDomain(getCurve('secp256k1'), getCurve('secp256k1'))).toBe(true)
  })

  test('coordinate system is ignored', () => {
    const c = getCurve('secp256k1')
    const affine = new CurveParams({ ...c, coord: CoordinateSystem.AFFINE })
    expect(sameDomain(c, affine)).toBe(true)
  })

  test('different curves or null do not match', () => {
    expect(sameDomain(getCurve('secp256k1'), getCurve('secp256r1'))).toBe(false)
    expect(sameDomain(getCurve('secp256k1'), null)).toBe(false)
    expect(sameDomain(null, getCurve('secp256k1'))).toBe(false)
  })

  test('a single differing parameter does not match', () => {
    const c = getCurve('secp256k1')
    expect(sameDomain(c, new CurveParams({ ...c, n: 3n }))).toBe(false)
    expect(sameDomain(c, new CurveParams({ ...c, h: 2n }))).toBe(false)
  })
})

describe('validatePublicKey', () => {
  const curve = getCurve('secp256k1')
  const G = getGenerator('secp256k1')

  test('accepts a valid point and returns it', () => {
    expect(validatePublicKey(G, curve)).toBe(G)
  })

  test('rejects non-Point values', () => {
    expect(() => validatePublicKey(null, curve)).toThrow('Point instance')
    expect(() => validatePublicKey({ x: G.x, y: G.y, curve }, curve)).toThrow(
      'Point instance',
    )
  })

  test('rejects a point without curve parameters', () => {
    expect(() => validatePublicKey(new Point(G.x, G.y), curve)).toThrow(
      'configured curve domain',
    )
  })

  test('rejects points from a foreign domain', () => {
    for (const d of FOREIGN_DOMAINS) {
      expect(() => validatePublicKey(foreignPoint(d), curve)).toThrow(
        'configured curve domain',
      )
    }
  })

  test('rejects the identity', () => {
    const inf = new Point(null, null, curve, true)
    expect(() => validatePublicKey(inf, curve)).toThrow('point at infinity')
  })

  test('rejects non-canonical coordinates even when built as trusted', () => {
    const P = new Point(G.x + curve.p, G.y, curve, true)
    expect(() => validatePublicKey(P, curve)).toThrow('[0, p-1]')
    const N = new Point(G.x, -G.y, curve, true)
    expect(() => validatePublicKey(N, curve)).toThrow('[0, p-1]')
  })

  test('rejects off-curve points even when built as trusted', () => {
    const P = new Point(G.x, G.y + 1n, curve, true)
    expect(() => validatePublicKey(P, curve)).toThrow('not on the configured')
  })

  test('cofactor > 1: accepts subgroup points, rejects others', () => {
    const inSubgroup = new Point(5n, 4n, cofactorCurve)
    expect(validatePublicKey(inSubgroup, cofactorCurve)).toBe(inSubgroup)
    // order 2 and order 28: on the curve but outside the order-7 subgroup
    for (const [x, y] of [
      [4n, 0n],
      [0n, 1n],
    ]) {
      expect(() =>
        validatePublicKey(new Point(x, y, cofactorCurve), cofactorCurve),
      ).toThrow('prime-order subgroup')
    }
  })
})

describe('Point canonical coordinates', () => {
  const curve = getCurve('secp256k1')
  const G = getGenerator('secp256k1')

  test('constructor rejects x ≥ p, y ≥ p and negative coordinates', () => {
    expect(() => new Point(G.x + curve.p, G.y, curve)).toThrow('[0, p-1]')
    expect(() => new Point(G.x, G.y + curve.p, curve)).toThrow('[0, p-1]')
    expect(() => new Point(G.x, G.y - curve.p, curve)).toThrow('[0, p-1]')
  })

  test('fromSec1 rejects compressed x = p + 1', () => {
    const hex = (curve.p + 1n).toString(16).padStart(64, '0')
    const bytes = new Uint8Array(33)
    bytes[0] = 0x02
    for (let i = 0; i < 32; i++) {
      bytes[i + 1] = parseInt(hex.slice(i * 2, i * 2 + 2), 16)
    }
    expect(() => Point.fromSec1(bytes, curve)).toThrow('[0, p-1]')
  })

  test('fromSec1 rejects uncompressed x ≥ p', () => {
    const bytes = G.toUncompressedSec1()
    bytes.fill(0xff, 1, 33)
    expect(() => Point.fromSec1(bytes, curve)).toThrow('[0, p-1]')
  })

  test('serialization rejects coordinates that overflow the field size', () => {
    const P = new Point(1n << 256n, G.y, curve, true)
    expect(() => P.compressSec1()).toThrow('does not fit')
  })
})

describe('Diffie-Hellman peer validation', () => {
  const victim = new DiffieHellman(23n, 'secp256k1')

  test('rejects small-order points on foreign curves', () => {
    for (const d of FOREIGN_DOMAINS) {
      expect(() => victim.computeSharedSecret(foreignPoint(d))).toThrow(
        'configured curve domain',
      )
    }
  })

  test('rejects a valid key from another named curve', () => {
    const other = new DiffieHellman(5n, 'secp256r1')
    expect(() => victim.computeSharedSecret(other.publicKey)).toThrow(
      'configured curve domain',
    )
  })

  test('rejects the identity as peer key', () => {
    const inf = new Point(null, null, getCurve('secp256k1'), true)
    expect(() => victim.computeSharedSecret(inf)).toThrow('point at infinity')
  })

  test('rejects a shared secret equal to the identity', () => {
    const n = getCurve('secp256k1').n
    const zeroKey = new DiffieHellman(n, 'secp256k1')
    const peer = new DiffieHellman(7n, 'secp256k1')
    expect(() => zeroKey.computeSharedSecret(peer.publicKey)).toThrow(
      'Shared secret is the point at infinity',
    )
  })

  test('accepts same-domain keys with a different coordinate system', () => {
    const c = getCurve('secp256k1')
    const affine = new CurveParams({ ...c, coord: CoordinateSystem.AFFINE })
    const bob = new DiffieHellman(99n, 'secp256k1')
    const H = bob.publicKey
    const S1 = victim.computeSharedSecret(H)
    const S2 = victim.computeSharedSecret(new Point(H.x, H.y, affine))
    expect(S1.x).toBe(S2.x)
    expect(S1.y).toBe(S2.y)
  })
})

describe('Massey-Omura input validation', () => {
  const mo = new MasseyOmura(0xa1n, 'secp521r1')

  test('encrypt and decrypt reject foreign-domain points', () => {
    for (const d of FOREIGN_DOMAINS) {
      expect(() => mo.encrypt(foreignPoint(d))).toThrow(
        'configured curve domain',
      )
      expect(() => mo.decrypt(foreignPoint(d))).toThrow(
        'configured curve domain',
      )
    }
  })

  test('encrypt rejects the identity', () => {
    const inf = new Point(null, null, getCurve('secp521r1'), true)
    expect(() => mo.encrypt(inf)).toThrow('point at infinity')
  })
})

describe('ECDSA public-key validation', () => {
  test('verify rejects a public key from a foreign domain', () => {
    const ds = new DigitalSignature(12345n)
    const [r, s] = ds.sign(42n)
    expect(() =>
      ds.verify(foreignPoint(FOREIGN_DOMAINS[0]), 42n, r, s),
    ).toThrow('configured curve domain')
  })

  test('verify rejects the identity as public key', () => {
    const ds = new DigitalSignature(12345n)
    const [r, s] = ds.sign(42n)
    const inf = new Point(null, null, getCurve('secp256k1'), true)
    expect(() => ds.verify(inf, 42n, r, s)).toThrow('point at infinity')
  })
})
