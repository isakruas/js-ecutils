// export class DigitalSignature {
//   /**
//    * export class to perform digital signature and verification using the ECDSA scheme.
//    * @param {number} private_key - The private key used for generating a signature.
//    * @param {string} curve_name - The name of the elliptic curve to use. Defaults to 'secp192k1'.
//    */
//   constructor(private_key, curve_name = 'secp192k1') {
//     this.private_key = private_key
//     this.curve_name = curve_name
//     this._curve = null // Placeholder for the elliptic curve object
//     this._public_key = null // Placeholder for the public key
//     this._signature_cache = new Map() // Cache for generated signatures
//   }

//   /**
//    * Retrieves the elliptic curve associated with this `DigitalSignature` instance.
//    * The `curve_name` attribute is used to fetch the corresponding elliptic curve object.
//    * @returns {EllipticCurve} The elliptic curve object used for ECDSA operations.
//    */
//   get curve() {
//     if (!this._curve) {
//       this._curve = get_curve(this.curve_name)
//     }
//     return this._curve
//   }

//   /**
//    * Computes and returns the public key corresponding to the private key.
//    * @returns {Point} The public key point on the elliptic curve associated with this instance.
//    */
//   get public_key() {
//     if (!this._public_key) {
//       this._public_key = this.curve.multiply_point(
//         this.private_key,
//         this.curve.G,
//       )
//     }
//     return this._public_key
//   }

//   /**
//    * Generates an ECDSA signature for a given message hash using the private key.
//    * @param {number} message_hash - The hash of the message to be signed.
//    * @returns {Array<number>} The ECDSA signature as an array containing two integers [r, s].
//    */
//   generate_signature(message_hash) {
//     if (!this._signature_cache.has(message_hash)) {
//       let r = 0,
//         s = 0
//       while (r === 0 || s === 0) {
//         const k = bigInt.randBetween(1, this.curve.n.minus(1))
//         const p = this.curve.multiply_point(k, this.curve.G)
//         r = p.x.mod(this.curve.n)
//         s = message_hash
//           .plus(r.times(this.private_key))
//           .times(k.modInv(this.curve.n))
//           .mod(this.curve.n)
//       }
//       this._signature_cache.set(message_hash, [r, s])
//     }
//     return this._signature_cache.get(message_hash)
//   }

//   /**
//    * Verifies the authenticity of an ECDSA signature against a public key and message hash.
//    * @param {Point} public_key - The public key associated with the signer.
//    * @param {number} message_hash - The hash of the message that was supposedly signed.
//    * @param {number} r - The first component (r) of the ECDSA signature.
//    * @param {number} s - The second component (s) of the ECDSA signature.
//    * @returns {boolean} True if the signature is valid, false otherwise.
//    */
//   verify_signature(public_key, message_hash, r, s) {
//     if (!(1 <= r < this.curve.n && 1 <= s < this.curve.n)) {
//       throw new Error('r or s are not in the valid range [1, curve order - 1].')
//     }

//     const w = s.modInv(this.curve.n)
//     const u_1 = message_hash.times(w).mod(this.curve.n)
//     const u_2 = r.times(w).mod(this.curve.n)
//     const p = this.curve.add_points(
//       this.curve.multiply_point(u_1, this.curve.G),
//       this.curve.multiply_point(u_2, public_key),
//     )
//     const v = p.x.mod(this.curve.n)
//     return v.eq(r)
//   }
// }
