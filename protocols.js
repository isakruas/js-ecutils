class DiffieHellman {
  /**
   * Class to perform Diffie-Hellman key exchange using elliptic curves.
   * @param {number} private_key - The private key of the user.
   * @param {string} curve_name - Name of the elliptic curve to be used. Defaults to 'secp192k1'.
   */
  constructor(private_key, curve_name = "secp192k1") {
    this.private_key = private_key;
    this.curve_name = curve_name;
    this._curve = null; // Placeholder for the elliptic curve object
    this._public_key = null; // Placeholder for the public key
    this._shared_secret_cache = new Map(); // Cache for shared secrets
  }

  /**
   * Retrieves the elliptic curve associated with this `DiffieHellman` instance.
   * The `curve_name` attribute is used to fetch the corresponding elliptic curve object.
   * @returns {EllipticCurve} The elliptic curve object used for ECDSA operations.
   */
  get curve() {
    if (!this._curve) {
      this._curve = get_curve(this.curve_name);
    }
    return this._curve;
  }

  /**
   * Computes and returns the public key corresponding to the private key.
   * @returns {Point} The public key point on the elliptic curve associated with this instance.
   */
  get public_key() {
    if (!this._public_key) {
      this._public_key = this.curve.multiply_point(
        this.private_key,
        this.curve.G
      );
    }
    return this._public_key;
  }

  /**
   * Computes the shared secret using the private key and the other party's public key.
   * @param {Point} other_public_key - The other party's public key.
   * @returns {Point} The resulting shared secret as a point on the elliptic curve.
   */
  compute_shared_secret(other_public_key) {
    const cacheKey = `${other_public_key.x},${other_public_key.y}`;
    if (!this._shared_secret_cache.has(cacheKey)) {
      const shared_secret = this.curve.multiply_point(
        this.private_key,
        other_public_key
      );
      this._shared_secret_cache.set(cacheKey, shared_secret);
    }
    return this._shared_secret_cache.get(cacheKey);
  }
}

class MasseyOmura {
  /**
   * Class to perform Massey-Omura key exchange using elliptic curves.
   * @param {number} private_key - The private key of the user.
   * @param {string} curve_name - Name of the elliptic curve to be used. Defaults to 'secp192k1'.
   */
  constructor(private_key, curve_name = "secp192k1") {
    this.private_key = private_key;
    this.curve_name = curve_name;
    this._curve = null; // Placeholder for the elliptic curve object
    this._public_key = null; // Placeholder for the public key
    this._encryption_cache = new Map(); // Cache for encryption steps
    this._partial_decryption_cache = new Map(); // Cache for partial decryption steps
  }

  /**
   * Retrieves the elliptic curve associated with this `MasseyOmura` instance.
   * The `curve_name` attribute is used to fetch the corresponding elliptic curve object.
   * @returns {EllipticCurve} The elliptic curve object used for ECDSA operations.
   */
  get curve() {
    if (!this._curve) {
      this._curve = get_curve(this.curve_name);
    }
    return this._curve;
  }

  /**
   * Computes and returns the public key corresponding to the private key.
   * @returns {Point} The public key point on the elliptic curve associated with this instance.
   */
  get public_key() {
    if (!this._public_key) {
      this._public_key = this.curve.multiply_point(
        this.private_key,
        this.curve.G
      );
    }
    return this._public_key;
  }

  /**
   * Encrypts the message with the sender's private key.
   * @param {Point} message - The message point to encrypt.
   * @returns {Point} The encrypted message point.
   */
  first_encryption_step(message) {
    if (!this._encryption_cache.has(message)) {
      const encrypted_message = this.curve.multiply_point(
        this.private_key,
        message
      );
      this._encryption_cache.set(message, encrypted_message);
    }
    return this._encryption_cache.get(message);
  }

  /**
   * Applies the receiver's private key on the received encrypted message.
   * @param {Point} received_encrypted_message - The received encrypted message point.
   * @returns {Point} The decrypted message point.
   */
  second_encryption_step(received_encrypted_message) {
    return this.first_encryption_step(received_encrypted_message);
  }

  /**
   * Partial decryption using the inverse of the sender's private key.
   * @param {Point} encrypted_message - The encrypted message point.
   * @returns {Point} The partially decrypted message point.
   */
  partial_decryption_step(encrypted_message) {
    if (!this._partial_decryption_cache.has(encrypted_message)) {
      const inverse_key = bigInt(this.private_key).modInv(this.curve.n).value;
      const partially_decrypted_message = this.curve.multiply_point(
        inverse_key,
        encrypted_message
      );
      this._partial_decryption_cache.set(
        encrypted_message,
        partially_decrypted_message
      );
    }
    return this._partial_decryption_cache.get(encrypted_message);
  }
}
