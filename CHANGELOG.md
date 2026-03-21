# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.0.2-alpha] - 2025-03-21

### Added
- **Modular architecture** — restructured from monolithic files into `core/`, `curves/`, `algorithms/`, `protocols/`, and `utils/` modules.
- **Jacobian coordinate arithmetic** — projective (X, Y, Z) coordinates for ~3x faster scalar multiplication (`jacDouble`, `jacAdd`, `jacMul`).
- **`CoordinateSystem` enum** — runtime switching between `AFFINE` and `JACOBIAN` arithmetic.
- **`CurveParams` class** — immutable curve parameter container with discriminant validation (4a³ + 27b² ≢ 0 mod p).
- **SEC 1 point compression** — `compress()`, `decompress()`, `compressSec1()`, `toUncompressedSec1()`, `fromSec1()` methods on `Point`.
- **Modular square root** — `modularSqrt()` using direct formula for p ≡ 3 (mod 4) and Tonelli-Shanks for p ≡ 1 (mod 4).
- **Quadratic residue testing** — `isQuadraticResidue()` via Euler's criterion.
- **Secure nonce generation** — `crypto.getRandomValues()` (CSPRNG) for ECDSA nonce k, replacing insecure `Math.random()`.
- **`signMessage()` / `verifyMessage()`** — async methods with SHA-256 hashing via Web Crypto API or Node.js crypto.
- **Custom hash function support** — optional `hashFunc` parameter for `signMessage()` and `verifyMessage()`.
- **On-curve validation** — `Point` constructor validates that (x, y) satisfies the curve equation.
- **Point negation and subtraction** — `neg()`, `sub()` methods on `Point`.
- **Comprehensive JSDoc documentation** — all source files include mathematical formulas and algorithm descriptions.
- **107 unit tests** across 6 test suites covering core arithmetic, curves, math utilities, algorithms, protocols, and educational examples.

### Changed
- **`DigitalSignature`** — default curve changed from `secp192k1` to `secp256k1`; methods renamed: `generate_signature()` → `sign()`, `verify_signature()` → `verify()`.
- **`Koblitz`** — `alphabetSize` moved to constructor parameter; `encode()` returns `[Point, j]` directly; `decode()` takes `(point, j)`.
- **`DiffieHellman`** — default curve changed from `secp192k1` to `secp256k1`; method renamed: `compute_shared_secret()` → `computeSharedSecret()`.
- **`MasseyOmura`** — default curve changed from `secp192k1` to `secp521r1`; methods renamed: `first_encryption_step()` / `second_encryption_step()` → `encrypt()`, `partial_decryption_step()` → `decrypt()`.
- **`Point`** — now carries a reference to its `CurveParams`; arithmetic methods (`add`, `mul`, etc.) are instance methods instead of `EllipticCurve` methods.
- **Registry** — `getCurve()` returns `CurveParams`, `getGenerator()` returns `Point`; replaces the old `get()` function that returned a monolithic `EllipticCurve`.
- **Exports** — flat exports (`Point`, `CurveParams`, `getCurve`, etc.) replace nested namespace (`core.Point`, `algorithms.Koblitz`).

### Removed
- **`EllipticCurve` class** — replaced by `CurveParams` + `Point` with instance methods.
- **`EllipticCurveOperations` class** — arithmetic is now internal (affine/jacobian modules).
- **`Koblitz.serialize()` / `Koblitz.deserialize()`** — removed (not present in the standard API).
- **`lengthy` parameter** — removed from Koblitz encoding.
- **Monolithic source files** — `core.js`, `curves.js`, `algorithms.js`, `protocols.js` replaced by modular structure.
- **`Math.random()` usage** — replaced entirely with CSPRNG.

## [0.0.1-alpha] - 2024-10-26

### Added
- Initial implementation of core functionality.
- Comprehensive README documentation outlining installation and usage.
- Example application for using the JavaScript interface.
- NPM deployment workflow and update to package files.
- Automated tagging and release creation in GitHub Actions workflow.

### Changed
- Updated project structure for better organization and maintainability.
- Updated build process and documentation for browser and NPM usage.

### Removed
- Unrelated files to optimize project structure.

### Deprecated
- Initial alpha versions may have breaking changes as features are refined and expanded.
