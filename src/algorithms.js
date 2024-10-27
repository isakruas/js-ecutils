import { get as get_curve } from './curves'
import { Point } from './core'
// const { Worker, isMainThread, parentPort } = require('');
// const { Point } = require('./ecutils/core'); // Assuming the Point class is exported from ecutils/core

export class DigitalSignature {
  /**
   * export class to perform digital signature and verification using the ECDSA scheme.
   * @param {number} private_key - The private key used for generating a signature.
   * @param {string} curve_name - The name of the elliptic curve to use. Defaults to 'secp192k1'.
   */
  constructor(private_key, curve_name = 'secp192k1') {
    this.private_key = private_key
    this.curve_name = curve_name
    this._curve = null // Placeholder for the elliptic curve object
    this._public_key = null // Placeholder for the public key
    this._signature_cache = new Map() // Cache for generated signatures
  }

  /**
   * Retrieves the elliptic curve associated with this `DigitalSignature` instance.
   * The `curve_name` attribute is used to fetch the corresponding elliptic curve object.
   * @returns {EllipticCurve} The elliptic curve object used for ECDSA operations.
   */
  get curve() {
    if (!this._curve) {
      this._curve = get_curve(this.curve_name)
    }
    return this._curve
  }

  /**
   * Computes and returns the public key corresponding to the private key.
   * @returns {Point} The public key point on the elliptic curve associated with this instance.
   */
  get public_key() {
    if (!this._public_key) {
      this._public_key = this.curve.multiply_point(
        this.private_key,
        this.curve.G,
      )
    }
    return this._public_key
  }

  /**
   * Generates an ECDSA signature for a given message hash using the private key.
   * @param {number} message_hash - The hash of the message to be signed.
   * @returns {Array<number>} The ECDSA signature as an array containing two integers [r, s].
   */
  generate_signature(message_hash) {
    const getRandomInt = (min, max) => {
      min = BigInt(min)
      max = BigInt(max)
      const range = max - min + BigInt(1)
      const randomBigInt = BigInt(
        Math.floor(Number(Math.random()) * Number(range)),
      )
      return BigInt((randomBigInt + min).toString())
    }

    if (!this._signature_cache.has(message_hash)) {
      let r = 0,
        s = 0
      while (r === 0 || s === 0) {
        const k = getRandomInt(1, this.curve.n - 1n)
        const p = this.curve.multiply_point(k, this.curve.G)
        r = this.curve.modulus(p.x, this.curve.n)
        s = this.curve.modulus(
          (message_hash + r * this.private_key) *
            this.curve.extended_gcd(k, this.curve.n)[1],
          this.curve.n,
        )
      }
      this._signature_cache.set(message_hash, [BigInt(r), BigInt(s)])
    }
    return this._signature_cache.get(message_hash)
  }

  /**
   * Verifies the authenticity of an ECDSA signature against a public key and message hash.
   * @param {Point} public_key - The public key associated with the signer.
   * @param {number} message_hash - The hash of the message that was supposedly signed.
   * @param {number} r - The first component (r) of the ECDSA signature.
   * @param {number} s - The second component (s) of the ECDSA signature.
   * @returns {boolean} True if the signature is valid, false otherwise.
   */
  verify_signature(public_key, message_hash, r, s) {
    if (r < 1n || r >= this.curve.n || s < 1n || s >= this.curve.n) {
      throw new Error('r or s are not in the valid range [1, curve order - 1].')
    }

    const w = this.curve.extended_gcd(s, this.curve.n)[1]
    const u_1 = this.curve.modulus(message_hash * w, this.curve.n)
    const u_2 = this.curve.modulus(r * w, this.curve.n)
    const p = this.curve.add_points(
      this.curve.multiply_point(u_1, this.curve.G),
      this.curve.multiply_point(u_2, public_key),
    )
    const v = this.curve.modulus(p.x, this.curve.n)
    return v === r
  }
}

export class Koblitz {
  /**
   * A class implementing the Koblitz method for encoding and decoding messages using elliptic curves.
   * @param {string} curve_name - The name of the elliptic curve to be used. Defaults to 'secp521r1'.
   */
  constructor(curve_name = 'secp521r1') {
    this.curve_name = curve_name
    this._curve = null // Placeholder for the elliptic curve object
  }

  /**
   * Lazy-loads and returns the elliptic curve used for encoding and decoding.
   * @returns {EllipticCurve} An instance of `EllipticCurve` associated with the specified `curve_name`.
   */
  get curve() {
    if (!this._curve) {
      this._curve = get_curve(this.curve_name)
    }
    return this._curve
  }

  /**
   * Encodes a textual message to a curve point using the Koblitz method.
   * @param {string} message - The message to be encoded.
   * @param {number} alphabet_size - The size of the alphabet/character set to consider for encoding.
   * @returns {Array<Point, number>} A tuple with the encoded point on the elliptic curve and an auxiliary value j used in the encoding process.
   */
  encode(message, alphabet_size = 256n, lengthy = false) {
    if (alphabet_size != 256n && alphabet_size != 65536n) {
      throw new Error('Alphabet size not supported')
    }

    const bigIntPow = (base, exponent, modulus) => {
      if (exponent === 0n) return 1n
      let result = 1n
      let currentBase = this.curve.modulus(base, modulus)
      while (exponent > 0n) {
        if (this.curve.modulus(exponent, 2n) === 1n) {
          result = this.curve.modulus(result * currentBase, modulus)
        }
        currentBase = this.curve.modulus(currentBase * currentBase, modulus)
        exponent = exponent / 2n
      }
      return result
    }

    let size
    if (alphabet_size == 256n) {
      size = 64
    } else {
      size = 32
    }

    if (!lengthy) {
      message = message.slice(0, size)
      // Convert the string message to a single large integer
      let message_decimal = BigInt(0)
      for (let i = 0; i < Math.min(message.length, size); i++) {
        message_decimal +=
          BigInt(message.charCodeAt(i)) *
          BigInt(Math.pow(Number(alphabet_size), i))
      }
      // Search for a valid curve point using the Koblitz method
      const d = 100n
      let x, y, j
      for (j = 1n; j < d - 1n; j++) {
        x = this.curve.modulus(d * message_decimal + j, this.curve.p)
        let s = this.curve.modulus(
          x ** 3n + this.curve.a * x + this.curve.b,
          this.curve.p,
        )
        if (s === bigIntPow(s, (this.curve.p + 1n) / 2n, this.curve.p)) {
          y = bigIntPow(s, (this.curve.p + 1n) / 4n, this.curve.p)
          if (
            this.curve.is_point_on_curve(new Point(x, y)) &&
            this.decode(new Point(x, y), j, alphabet_size, false) == message
          ) {
            break
          }
        }
      }
      return [new Point(x, y), j]
    }
    let encoded_messages = []

    for (let i = 0; i < message.length; i += size) {
      encoded_messages.push(
        this.encode(message.slice(i, i + size), alphabet_size),
      )
    }
    return encoded_messages
  }

  /**
   * Decodes a point on an elliptic curve to a textual message using the Koblitz method.
   * @param {Point} point - The encoded point on the elliptic curve.
   * @param {number} j - The auxiliary value 'j' used during the encoding process.
   * @param {number} alphabet_size - The size of the alphabet/character set considered for decoding.
   * @returns {string} The decoded textual message.
   */
  decode(encoded, j = 0n, alphabet_size = 256n, lengthy = false) {
    // Calculate the original large integer from the point and 'j'
    if (alphabet_size != 256n && alphabet_size != 65536n) {
      throw new Error('Alphabet size not supported')
    }

    if (!lengthy) {
      const d = 100n
      let message_decimal = (encoded.x - j) / d

      const characters = []

      while (message_decimal !== 0n) {
        characters.push(
          String.fromCharCode(
            Number(this.curve.modulus(message_decimal, alphabet_size)),
          ),
        )
        message_decimal = message_decimal / BigInt(alphabet_size)
      }
      return characters.join('')
    }
    let characters = []
    for (let i = 0; i < encoded.length; i++) {
      let enc = encoded[i]
      characters.push(this.decode(enc[0], enc[1], alphabet_size, false))
    }
    return characters.join('')
  }

  /**
   * Serializes an array of points and their corresponding auxiliary values 'j' into a JSON-friendly representation.
   *
   * @param {Array<Array<Point, number>>} points - An array of tuples, where each tuple contains a Point object representing a point on the elliptic curve and the auxiliary value 'j' used in its encoding.
   * @returns {Array<Object>} A new array containing objects with properties `x`, `y`, and `j`. Each object represents the serialized data for a point and its 'j' value.
   */
  serialize(points) {
    return points.map((point) => {
      return {
        x: point[0].x.toString(),
        y: point[0].y.toString(),
        j: point[1].toString(),
      }
    })
  }

  /**
   * Deserializes an array of objects back into an array of tuples containing Point objects and their corresponding auxiliary values 'j'.
   *
   * @param {Array<Object>} serializedPoints - An array of objects with properties `x`, `y`, and `j`. Each object represents the serialized data for a point and its 'j' value.
   * @returns {Array<Array<Point, number>>} A new array containing tuples, where each tuple contains a Point object and the auxiliary value 'j' deserialized from the input objects.
   */
  deserialize(serializedPoints) {
    return serializedPoints.map((item) => {
      return [new Point(BigInt(item.x), BigInt(item.y)), BigInt(item.j)]
    })
  }
}
