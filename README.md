# js-ecutils

**JavaScript Library for Elliptic Curve Cryptography**

[![Latest Version](https://img.shields.io/npm/v/js-ecutils.svg?style=flat)](https://www.npmjs.com/package/js-ecutils)
[![Downloads](https://img.shields.io/npm/dt/js-ecutils.svg)](https://www.npmjs.com/package/js-ecutils)
[![Downloads](https://img.shields.io/npm/dm/js-ecutils.svg)](https://www.npmjs.com/package/js-ecutils)
[![Downloads](https://img.shields.io/npm/dw/js-ecutils.svg)](https://www.npmjs.com/package/js-ecutils)
[![codecov](https://codecov.io/gh/isakruas/js-ecutils/branch/master/graph/badge.svg)](https://codecov.io/gh/isakruas/js-ecutils)

`js-ecutils` is a JavaScript library for Elliptic Curve Cryptography (ECC) on short Weierstrass curves (y² = x³ + ax + b over a prime field F_p). It provides ECDSA digital signatures, key exchange protocols (Diffie-Hellman, Massey-Omura), Koblitz message encoding, SEC 1 point compression, and both affine and Jacobian coordinate arithmetic. Suitable for cryptography education and secure systems.

## Features

- **Point arithmetic** — addition, doubling, scalar multiplication in affine and Jacobian coordinates
- **8 standard curves** — secp192k1, secp192r1, secp224k1, secp224r1, secp256k1, secp256r1, secp384r1, secp521r1
- **ECDSA signatures** — `sign()`, `verify()`, `signMessage()`, `verifyMessage()` with SHA-256
- **Koblitz encoding** — encode/decode text messages as elliptic curve points
- **Diffie-Hellman key exchange** — ECDH shared secret computation
- **Massey-Omura three-pass protocol** — key-free message exchange via encrypt/decrypt
- **SEC 1 point compression** — `compress()`, `decompress()`, `compressSec1()`, `toUncompressedSec1()`, `fromSec1()`
- **Modular arithmetic utilities** — modular square root (Tonelli-Shanks), quadratic residue testing
- **Secure nonce generation** — uses `crypto.getRandomValues()` (CSPRNG) instead of `Math.random()`
- **Cross-platform** — works in Node.js and browsers (Web Crypto API)

## Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [API Documentation](#api-documentation)
- [Examples](#examples)
- [Contributing](#contributing)
- [License](#license)
- [Related Libraries](#related-libraries)

## Installation

**Using npm:**

```bash
npm install js-ecutils
```

**Or, for web usage:**

```html
<script src="https://unpkg.com/js-ecutils@latest/dist/web/min.js"></script>
```

## Quick Start

### Node.js

```javascript
const {
  Point, CurveParams, getCurve, getGenerator,
  DigitalSignature, Koblitz,
  DiffieHellman, MasseyOmura
} = require('js-ecutils')

// Point arithmetic on a toy curve  y² = x³ + x + 1  over F₂₃
const curve = new CurveParams({ p: 23n, a: 1n, b: 1n, n: 28n, h: 1n })
const P = new Point(0n, 1n, curve)
const Q = new Point(6n, 19n, curve)
const R = P.add(Q)
console.log(`P + Q = (${R.x}, ${R.y})`)  // (13, 16)

// Scalar multiplication on secp256k1
const G = getGenerator('secp256k1')
const pubKey = G.mul(42n)
console.log(`42·G = (${pubKey.x}, ${pubKey.y})`)
```

### Browser

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>js-ecutils Example</title>
    <script src="https://unpkg.com/js-ecutils@latest/dist/web/min.js"></script>
    <script>
        window.onload = function() {
            const { Point, CurveParams } = window.ecutils

            const curve = new CurveParams({ p: 23n, a: 1n, b: 1n, n: 28n, h: 1n })
            const P = new Point(0n, 1n, curve)
            const Q = new Point(6n, 19n, curve)
            const R = P.add(Q)
            console.log(`P + Q = (${R.x}, ${R.y})`)
        }
    </script>
</head>
<body>
    <h1>js-ecutils Example</h1>
</body>
</html>
```

## API Documentation

### Core

#### `Point`

Represents a point on an elliptic curve. The identity element (point at infinity) is represented as `Point(0n, 0n)`.

```javascript
const { Point, CurveParams } = require('js-ecutils')

const curve = new CurveParams({ p: 23n, a: 1n, b: 1n, n: 28n, h: 1n })
const P = new Point(0n, 1n, curve)
```

**Constructor:** `new Point(x, y, curve, _trusted)`
- `x` — x-coordinate (BigInt)
- `y` — y-coordinate (BigInt)
- `curve` — `CurveParams` instance (optional, can be borrowed from another point during operations)
- `_trusted` — skip on-curve validation (internal use only)

**Properties:**
- `isIdentity` — `true` if this is the point at infinity

**Methods:**
- `isOnCurve()` — verifies y² ≡ x³ + ax + b (mod p)
- `neg()` — additive inverse: returns (x, p - y)
- `add(other)` — point addition: P + Q
- `sub(other)` — point subtraction: P - Q
- `mul(k)` — scalar multiplication: k·P (double-and-add)
- `compress()` — returns `[x, yParity]` where yParity is 0n or 1n
- `decompress(x, yParity, curve)` — (static) recovers a point from compressed form
- `compressSec1()` — SEC 1 compressed format (Uint8Array: `02`/`03` prefix + x)
- `toUncompressedSec1()` — SEC 1 uncompressed format (Uint8Array: `04` prefix + x + y)
- `fromSec1(data, curve)` — (static) parses SEC 1 compressed or uncompressed bytes
- `toString()` — human-readable representation

---

#### `CurveParams`

Immutable container for elliptic curve domain parameters.

```javascript
const { CurveParams, CoordinateSystem } = require('js-ecutils')

const curve = new CurveParams({
  p: 23n, a: 1n, b: 1n, n: 28n, h: 1n,
  coord: CoordinateSystem.JACOBIAN  // default
})
```

**Constructor:** `new CurveParams({ p, a, b, n, h, coord })`
- `p` — prime modulus of the finite field F_p
- `a`, `b` — curve equation coefficients (y² = x³ + ax + b)
- `n` — order of the generator point
- `h` — cofactor (default: 1n)
- `coord` — coordinate system: `CoordinateSystem.AFFINE` or `CoordinateSystem.JACOBIAN` (default)

Validates that the discriminant 4a³ + 27b² ≢ 0 (mod p), ensuring the curve is non-singular.

---

#### `CoordinateSystem`

Enum for selecting the internal arithmetic representation.

- `CoordinateSystem.AFFINE` — standard (x, y) coordinates, uses modular inversion per operation
- `CoordinateSystem.JACOBIAN` — projective (X, Y, Z) coordinates where x = X/Z², y = Y/Z³, ~3x faster

---

### Curves

#### `getCurve(name)` / `getGenerator(name)`

Look up standard curve parameters and generator points by name.

```javascript
const { getCurve, getGenerator } = require('js-ecutils')

const curve = getCurve('secp256k1')   // returns CurveParams
const G = getGenerator('secp256k1')   // returns Point (generator)
```

**Supported curves:** `secp192k1`, `secp192r1`, `secp224k1`, `secp224r1`, `secp256k1`, `secp256r1`, `secp384r1`, `secp521r1`

Lookup is case-insensitive. Throws an error for unknown curve names.

---

### Algorithms

#### `DigitalSignature`

ECDSA signature generation and verification.

```javascript
const { DigitalSignature } = require('js-ecutils')

const ds = new DigitalSignature(123456n, 'secp256k1')
```

**Constructor:** `new DigitalSignature(privateKey, curveName = 'secp256k1')`

**Properties:**
- `publicKey` — the public key point Q = d·G

**Methods:**
- `sign(messageHash)` — generates an ECDSA signature `[r, s]` for an integer hash
- `verify(publicKey, messageHash, r, s)` — verifies a signature, returns `boolean`
- `signMessage(message, hashFunc?)` — hashes a message (SHA-256 by default) and signs it, returns `Promise<[r, s]>`
- `verifyMessage(publicKey, message, r, s, hashFunc?)` — hashes and verifies, returns `Promise<boolean>`

The nonce k is generated using a cryptographically secure random number generator (`crypto.getRandomValues()`).

---

#### `Koblitz`

Encode/decode text messages as elliptic curve points using Koblitz's method.

```javascript
const { Koblitz } = require('js-ecutils')

const kob = new Koblitz('secp521r1')
const [point, j] = kob.encode('Hello, world!')
const text = kob.decode(point, j)
// text === 'Hello, world!'
```

**Constructor:** `new Koblitz(curveName = 'secp521r1', alphabetSize = 256n)`
- `curveName` — larger curves can encode longer messages in a single point
- `alphabetSize` — 256n for ASCII, 65536n for Unicode

**Methods:**
- `encode(message)` — returns `[Point, j]` where j is an auxiliary value needed for decoding
- `decode(point, j)` — recovers the original text string

---

### Protocols

#### `DiffieHellman`

Elliptic Curve Diffie-Hellman (ECDH) key exchange.

```javascript
const { DiffieHellman } = require('js-ecutils')

const alice = new DiffieHellman(0xAn, 'secp256k1')
const bob   = new DiffieHellman(0xBn, 'secp256k1')

const sharedA = alice.computeSharedSecret(bob.publicKey)
const sharedB = bob.computeSharedSecret(alice.publicKey)
// sharedA.x === sharedB.x && sharedA.y === sharedB.y
```

**Constructor:** `new DiffieHellman(privateKey, curveName = 'secp256k1')`

**Properties:**
- `publicKey` — H = d·G

**Methods:**
- `computeSharedSecret(otherPublicKey)` — returns the shared secret point S = d·Q_other

---

#### `MasseyOmura`

Massey-Omura three-pass protocol for key-free message exchange.

```javascript
const { MasseyOmura, Koblitz } = require('js-ecutils')

const kob   = new Koblitz('secp521r1')
const alice = new MasseyOmura(0xA1n, 'secp521r1')
const bob   = new MasseyOmura(0xB2n, 'secp521r1')

const [M, j] = kob.encode('Secret message')

const c1 = alice.encrypt(M)        // Alice → Bob
const c2 = bob.encrypt(c1)         // Bob → Alice
const c3 = alice.decrypt(c2)       // Alice → Bob
const plaintext = bob.decrypt(c3)  // Bob recovers M

const text = kob.decode(plaintext, j)
// text === 'Secret message'
```

**Constructor:** `new MasseyOmura(privateKey, curveName = 'secp521r1')`
- `privateKey` must be coprime with n (so that e⁻¹ mod n exists)

**Methods:**
- `encrypt(point)` — C = e·P (multiply by private key)
- `decrypt(point)` — P = e⁻¹·C (multiply by modular inverse)

---

### Utilities

#### `isQuadraticResidue(a, p)`

Tests whether `a` is a quadratic residue modulo prime `p` using Euler's criterion: a^((p-1)/2) ≡ 1 (mod p).

#### `modularSqrt(a, p)`

Computes √a mod p. Uses the direct formula when p ≡ 3 (mod 4), otherwise falls back to the Tonelli-Shanks algorithm. Returns `null` if `a` is not a quadratic residue.

---

## Examples

### Point Arithmetic

```javascript
const { Point, CurveParams, getGenerator } = require('js-ecutils')

// Toy curve: y² = x³ + x + 1 over F₂₃ (order 28)
const curve = new CurveParams({ p: 23n, a: 1n, b: 1n, n: 28n, h: 1n })
const P = new Point(0n, 1n, curve)

// Doubling: 2·P
const P2 = P.mul(2n)
console.log(`2·P = (${P2.x}, ${P2.y})`)  // (6, 19)

// Group order: 28·P = O (identity)
const identity = P.mul(28n)
console.log(`28·P is identity: ${identity.isIdentity}`)  // true

// Negation: -P = (x, p - y)
const neg = P.neg()
console.log(`-P = (${neg.x}, ${neg.y})`)  // (0, 22)
```

### SEC 1 Point Compression

```javascript
const { getGenerator, Point, getCurve } = require('js-ecutils')

const G = getGenerator('secp256k1')

// Compress to SEC 1 format (33 bytes for 256-bit curve)
const compressed = G.compressSec1()
console.log(`Compressed: ${compressed[0] === 0x02 ? '02' : '03'}...`)

// Decompress back
const curve = getCurve('secp256k1')
const recovered = Point.fromSec1(compressed, curve)
console.log(`Match: ${recovered.x === G.x && recovered.y === G.y}`)  // true
```

### ECDSA Digital Signatures

```javascript
const { DigitalSignature } = require('js-ecutils')

const ds = new DigitalSignature(123456n, 'secp256k1')

// Sign a raw hash
const hash = 0xDEADBEEFn
const [r, s] = ds.sign(hash)
console.log(`Valid: ${ds.verify(ds.publicKey, hash, r, s)}`)  // true

// Sign a message string (async, uses SHA-256)
async function demo() {
  const [r, s] = await ds.signMessage('Hello, ECDSA!')
  const valid = await ds.verifyMessage(ds.publicKey, 'Hello, ECDSA!', r, s)
  console.log(`Message signature valid: ${valid}`)  // true
}
demo()
```

### Koblitz Encoding

```javascript
const { Koblitz } = require('js-ecutils')

const kob = new Koblitz('secp521r1')
const [point, j] = kob.encode('Hello, EC!')
const decoded = kob.decode(point, j)
console.log(decoded)  // 'Hello, EC!'
```

### Diffie-Hellman Key Exchange

```javascript
const { DiffieHellman } = require('js-ecutils')

const alice = new DiffieHellman(12345n, 'secp256k1')
const bob   = new DiffieHellman(67890n, 'secp256k1')

const sharedA = alice.computeSharedSecret(bob.publicKey)
const sharedB = bob.computeSharedSecret(alice.publicKey)

console.log(`Shared secrets match: ${sharedA.x === sharedB.x}`)  // true
```

### Massey-Omura Three-Pass Protocol

```javascript
const { Koblitz, MasseyOmura } = require('js-ecutils')

const kob   = new Koblitz('secp521r1')
const alice = new MasseyOmura(70604135n, 'secp521r1')
const bob   = new MasseyOmura(48239108668n, 'secp521r1')

// Encode the message as a curve point
const [M, j] = kob.encode('Hello, world!')

// Three-pass exchange
const c1 = alice.encrypt(M)        // Step 1: Alice encrypts
const c2 = bob.encrypt(c1)         // Step 2: Bob encrypts
const c3 = alice.decrypt(c2)       // Step 3: Alice removes her encryption
const recovered = bob.decrypt(c3)  // Step 4: Bob removes his encryption

const text = kob.decode(recovered, j)
console.log(text)  // 'Hello, world!'
```

## Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## Related Libraries

- **Python** — [`ecutils`](https://github.com/isakruas/ecutils) on PyPI
- **Go** — [`go-ecutils`](https://github.com/isakruas/go-ecutils) on GitHub
