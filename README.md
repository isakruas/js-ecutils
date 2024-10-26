# js-ecutils

**JavaScript Library for Elliptic Curve Cryptography**

[![Latest Version](https://img.shields.io/npm/v/js-ecutils.svg?style=flat)](https://www.npmjs.com/package/js-ecutils)
[![Downloads](https://img.shields.io/npm/dt/js-ecutils.svg)](https://www.npmjs.com/package/js-ecutils)
[![Downloads](https://img.shields.io/npm/dm/js-ecutils.svg)](https://www.npmjs.com/package/js-ecutils)
[![Downloads](https://img.shields.io/npm/dw/js-ecutils.svg)](https://www.npmjs.com/package/js-ecutils)
[![codecov](https://codecov.io/gh/isakruas/js-ecutils/branch/master/graph/badge.svg)](https://codecov.io/gh/isakruas/js-ecutils)

`js-ecutils` is a JavaScript library designed for implementing Elliptic Curve Cryptography (ECC) algorithms, including key exchanges (Diffie-Hellman, Massey-Omura), ECDSA signatures, and Koblitz encoding. This library is suitable for educational purposes in cryptography and for use in secure systems.

## Features

- ECDSA signatures
- Key exchange protocols (Diffie-Hellman and Massey-Omura)
- Koblitz encoding
- Support for elliptic curve operations

## Table of Contents

- [Installation](#installation)
- [Usage](#usage)
- [API Documentation](#api-documentation)
- [Examples](#examples)
- [Contributing](#contributing)
- [License](#license)
- [Language-Specific Libraries for Elliptic Curve Cryptography](#language-specific-libraries-for-elliptic-curve-cryptography)

## Installation

To install `js-ecutils`, you can use npm or include the script directly in your web application:

**Using npm:**

```bash
npm install js-ecutils
```

**Or, for web usage:**  
Include the following script in your HTML:

```html
<script src="https://unpkg.com/js-ecutils@latest/dist/web/min.js"></script>
```

## Usage

After installing the `js-ecutils` library, you can import it into your JavaScript project or use it directly in a browser. Below are the steps for using the library in both environments.

### Using in Node.js

To use the library in a Node.js project, import the required modules as shown below:

```javascript
// Importing necessary classes
const { core: { Point, EllipticCurve } } = require('js-ecutils');

// Defining parameters for the elliptic curve
const p = 23n;  // The prime number defining the finite field's order
const a = 1n;   // The 'a' coefficient in the curve equation
const b = 1n;   // The 'b' coefficient in the curve equation
const G = new Point(0n, 1n);  // Generator point
const n = 28n;  // Order of the point
const h = 1n;   // Cofactor

// Creating an instance of the elliptic curve
const curve = new EllipticCurve(p=p, a=a, b=b, G=G, n=n, h=h);

// Defining points on the curve
const point1 = new Point(6n, 19n);
const point2 = new Point(3n, 13n);

// Adding the points
const sum_point = curve.add_points(point1, point2);
console.log(`The sum of the points is (${sum_point.x}, ${sum_point.y}).`);
```

### Using in Browsers

To use the library in a browser, include the JavaScript file in your HTML and utilize the classes available in the global `ecutils` object. Add the script as shown below:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Elliptic Curve Cryptography Example</title>
    <script src="https://unpkg.com/js-ecutils@latest/dist/web/min.js"></script>
    <script>
        window.onload = function() {
            // Importing necessary classes from the global object
            const Point = window.ecutils.core.Point;
            const EllipticCurve = window.ecutils.core.EllipticCurve;

            // Defining parameters for the elliptic curve
            const p = 23n;
            const a = 1n;
            const b = 1n;
            const G = new Point(0n, 1n);
            const n = 28n;
            const h = 1n;

            // Creating an instance of the elliptic curve
            const curve = new EllipticCurve(p, a, b, G, n, h);

            // Defining points on the curve
            const point1 = new Point(6n, 19n);
            const point2 = new Point(3n, 13n);

            // Adding the points
            const sum_point = curve.add_points(point1, point2);
            console.log(`The sum of the points is (${sum_point.x}, ${sum_point.y}).`);
        };
    </script>
</head>
<body>
    <h1>Example using js-ecutils Library</h1>
</body>
</html>
```

## API Documentation

### Classes and Methods

#### Class: `DigitalSignature`

##### Constructor
- **`new DigitalSignature(private_key, curve_name = 'secp192k1')`**
  - Creates a new instance of the `DigitalSignature` class for performing ECDSA (Elliptic Curve Digital Signature Algorithm) operations.
  - **Parameters**:
    - `private_key`: The private key used for generating a signature.
    - `curve_name`: (Optional) The name of the elliptic curve to use. Defaults to `'secp192k1'`.

##### Methods

- **`generate_signature(message_hash)`**
  - Generates an ECDSA signature for a given message hash using the private key.
  - **Parameters**:
    - `message_hash`: The hash of the message to be signed.
  - **Returns**: An array with two integers `[r, s]` representing the signature.

- **`verify_signature(public_key, message_hash, r, s)`**
  - Verifies the authenticity of an ECDSA signature.
  - **Parameters**:
    - `public_key`: The public key corresponding to the private key of the signer.
    - `message_hash`: The hash of the message that was signed.
    - `r`: The first component (r) of the signature.
    - `s`: The second component (s) of the signature.
  - **Returns**: `true` if the signature is valid, `false` otherwise.

##### Attributes

- **`curve`**: Lazily retrieves the elliptic curve associated with the signature scheme based on the `curve_name`.
  
- **`public_key`**: Computes and returns the public key from the private key.

---

#### Class: `Koblitz`

##### Constructor

- **`new Koblitz(curve_name = 'secp521r1')`**
  - Creates a new instance of the `Koblitz` encoding/decoding class.
  - **Parameters**:
    - `curve_name`: (Optional) The name of the elliptic curve. Defaults to `'secp521r1'`.

##### Methods

- **`encode(message, alphabet_size = 256n)`**
  - Encodes a textual message into a point on the elliptic curve using the Koblitz method.
  - **Parameters**:
    - `message`: The message to encode.
    - `alphabet_size`: (Optional) The size of the alphabet. Defaults to `256n`.
  - **Returns**: A tuple `[Point, j]` where `Point` is the encoded curve point and `j` is an auxiliary value.

- **`decode(point, j, alphabet_size = 256n)`**
  - Decodes a point on the elliptic curve back into a textual message.
  - **Parameters**:
    - `point`: The `Point` on the elliptic curve that represents the encoded message.
    - `j`: The auxiliary value `j` used in encoding.
    - `alphabet_size`: (Optional) The size of the alphabet. Defaults to `256n`.
  - **Returns**: The decoded message as a string.

- **`serialize(points)`**
  - Serializes points and the corresponding `j` values into a JSON-friendly format.
  - **Parameters**:
    - `points`: An array of tuples `[Point, j]` where `Point` is the encoded curve point.
  - **Returns**: An array of objects in the format `{x, y, j}` representing the serialized points.

- **`deserialize(serializedPoints)`**
  - Deserializes the JSON format back to an array of tuples `[Point, j]`.
  - **Parameters**:
    - `serializedPoints`: An array of objects `{x, y, j}`.
  - **Returns**: An array of tuples `[Point, j]`.

##### Attributes

- **`curve`**: Lazily retrieves the elliptic curve for message encoding/decoding.

---

#### Class: `DiffieHellman`

##### Constructor

- **`new DiffieHellman(private_key, curve_name = 'secp192k1')`**
  - Creates an instance of the `DiffieHellman` class for performing Diffie-Hellman key exchange using elliptic curves.
  - **Parameters**:
    - `private_key`: The private key to use during the key exchange.
    - `curve_name`: (Optional) The name of the elliptic curve. Defaults to `'secp192k1'`.

##### Methods

- **`compute_shared_secret(other_public_key)`**
  - Computes the shared secret using the private key and the other party's public key.
  - **Parameters**:
    - `other_public_key`: The other party's public key (as a `Point`).
  - **Returns**: A point representing the shared secret on the elliptic curve.

##### Attributes

- **`curve`**: Retrieves the elliptic curve associated with the Diffie-Hellman exchange.
  
- **`public_key`**: Computes the Diffie-Hellman public key from the private key.

---

#### Class: `MasseyOmura`

##### Constructor

- **`new MasseyOmura(private_key, curve_name = 'secp192k1')`**
  - Creates an instance of the `MasseyOmura` class for performing Massey-Omura key exchange using elliptic curves.
  - **Parameters**:
    - `private_key`: The private key to use during the key exchange.
    - `curve_name`: (Optional) The name of the elliptic curve. Defaults to `'secp192k1'`.

##### Methods

- **`first_encryption_step(message)`**
  - Encrypts a message with the sender's private key.
  - **Parameters**:
    - `message`: The message (as a point) to encrypt.
  - **Returns**: The encrypted message (as a `Point`).

- **`second_encryption_step(encrypted_message)`**
  - Applies the receiver's private key to complete encryption steps. Used in the key exchange process.
  - **Parameters**:
    - `encrypted_message`: The encrypted message (as a `Point`).
  - **Returns**: The resulting encrypted message.

- **`partial_decryption_step(encrypted_message)`**
  - Partially decrypts a message using the inverse of the sender's private key.
  - **Parameters**:
    - `encrypted_message`: The encrypted message (as a `Point`).
  - **Returns**: The decrypted message (as a `Point`).

##### Attributes

- **`curve`**: Retrieves the elliptic curve associated with the Massey-Omura exchange.
  
- **`public_key`**: Computes and returns the Massey-Omura public key from the private key.

---

#### Class: `EllipticCurve`

- **This is an internal class representing an elliptic curve and offering operations on points and scalar multiplications.**

##### Constructor

- **`new EllipticCurve(p, a, b, G, n, h)`**
  - Initializes an elliptic curve instance.
  - **Parameters**:
    - `p`: The prime modulus of the field.
    - `a`: The `'a'` coefficient of the curve equation.
    - `b`: The `'b'` coefficient of the curve equation.
    - `G`: The base point (generator) on the curve.
    - `n`: The order of the base point.
    - `h`: The cofactor of the curve.
  
##### Methods

- **`add_points(P, Q)`**
  - Adds two points `P` and `Q` on the elliptic curve.
  - **Parameters**:
    - `P`: The first point.
    - `Q`: The second point.
  - **Returns**: The resulting point `R = P + Q`.

- **`multiply_point(k, P)`**
  - Multiplies a point `P` with a scalar `k`.
  - **Parameters**:
    - `k`: Scalar (integer) to multiply.
    - `P`: The point to be multiplied.
  - **Returns**: Point `kP`.

- **`is_point_on_curve(p)`**
  - Verifies if a point is on the elliptic curve.
  - **Parameters**:
    - `p`: The point to evaluate.
  - **Returns**: `true` if the point is on the curve, otherwise `false`.

---

## Examples

Here are some examples of using the key exchange protocols and other features of `js-ecutils`.

### Encoding and Decoding Messages with Koblitz

```js
// Importing necessary classes
const { algorithms: { Koblitz } } = require('js-ecutils');

// Initialize Koblitz with a specific curve
const koblitz = new Koblitz('secp521r1');

// Encode a message to a curve point
const [point, j] = koblitz.encode('Hello, EC!', 2n ** 8n);

// Decode the curve point back to a message
const decoded_message = koblitz.decode(point, j, 2n ** 8n);

console.log(decoded_message);
```

### Digital Signatures with ECDSA

```js
// Importing necessary classes
const { algorithms: { DigitalSignature } } = require('js-ecutils');

// Create a DigitalSignature instance with your private key
const privateKey = BigInt(123456);
const ds = new DigitalSignature(privateKey);

// Hash of your message
const messageHash = BigInt(545454445644654n);

// Generate signature
const [r, s] = ds.generate_signature(messageHash);

// Verify signature (typically on the receiver's side)
const isValid = ds.verify_signature(ds.public_key, messageHash, r, s);

console.log(`Is the signature valid? ${isValid}`);
```

### Diffie-Hellman Key Exchange

```js
// Importing necessary classes
const { protocols: { DiffieHellman } } = require('js-ecutils');

// Alice's side
const alice = new DiffieHellman(12345n);

// Bob's side
const bob = new DiffieHellman(67890n);

// Alice computes her shared secret with Bob's public key
const aliceSharedSecret = alice.compute_shared_secret(bob.public_key);

// Bob computes his shared secret with Alice's public key
const bobSharedSecret = bob.compute_shared_secret(alice.public_key);

// Check if aliceSharedSecret is equal to bobSharedSecret
const isSharedSecretEqual = aliceSharedSecret.x === bobSharedSecret.x && aliceSharedSecret.y === bobSharedSecret.y;

console.log(`Are the shared secrets equal? ${isSharedSecretEqual}`);
```

### Massey-Omura Key Exchange

```js
// Importing necessary classes
const { algorithms: { Koblitz }, protocols: { MasseyOmura } } = require('js-ecutils');

// Initialize the Koblitz instance for the elliptic curve 'secp192k1'
const koblitz = new Koblitz('secp192k1');

// Sender's side
// -------------
const privateKeySender = BigInt("70604135");
// Initialize Massey-Omura protocol with the sender's private key
const moSender = new MasseyOmura(privateKeySender);

// Encode the message using the Koblitz method
// `j` is used to handle the ambiguity in the decoding process
const [message, j] = koblitz.encode("Hello, world!");

// Perform the first encryption step with Massey-Omura protocol
const encryptedMsgSender = moSender.first_encryption_step(message);

// The encoded message is now sent to the receiver...
// (transmission of encryptedMsgSender)

// Receiver's side
// ---------------
const privateKeyReceiver = BigInt("48239108668");
// Initialize Massey-Omura protocol with the receiver's private key
const moReceiver = new MasseyOmura(privateKeyReceiver);

// Perform the second encryption step with Massey-Omura protocol
const encryptedMsgReceiver = moReceiver.second_encryption_step(encryptedMsgSender);

// The double-encrypted message is sent back to the sender...
// (transmission of encryptedMsgReceiver)

// Sender's side again
// -------------------
const partialDecryptedMsg = moSender.partial_decryption_step(encryptedMsgReceiver);

// The partially decrypted message is sent back to the receiver...
// (transmission of partialDecryptedMsg)

// Receiver's final decryption
// ---------------------------
const originalMessage = moReceiver.partial_decryption_step(partialDecryptedMsg);

// Decode the message using the Koblitz method
// `j` is used to resolve the mapping from the elliptic curve point back to the message
const decodedMessage = koblitz.decode(originalMessage, j);

console.log(decodedMessage);
```

## Contributing

Contributions are welcome! If you’d like to contribute to `js-ecutils`, please follow these steps:

1. Fork the repository.
2. Create a new branch for your feature or bug fix.
3. Make your changes and commit them.
4. Push your branch and open a pull request.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details. 

## Language-Specific Libraries for Elliptic Curve Cryptography

In addition to the JavaScript module, there are other language-specific libraries available for elliptic curve cryptography:

- **Python Library for Elliptic Curve Cryptography**: The `ecutils` package provides elliptic curve functionalities tailored for Python developers. You can find it on [GitHub](https://github.com/isakruas/ecutils).

- **Go Library for Elliptic Curve Cryptography**: The `go-ecutils` library offers similar elliptic curve utilities for Go developers. More information and documentation can be found on [GitHub](https://github.com/isakruas/go-ecutils).

These libraries enable developers to utilize elliptic curve cryptography in their preferred programming environments, ensuring flexibility and ease of integration.
