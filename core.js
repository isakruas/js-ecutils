class Point {
  /**
   * Represents a point on an elliptic curve.
   * @param {BigInt} x - The x-coordinate of the point.
   * @param {BigInt} y - The y-coordinate of the point.
   */
  constructor(x, y) {
    this.x = x;
    this.y = y;
    Object.freeze(this); // Freezing the object to make it immutable
  }
}

class EllipticCurveOperations {
  constructor() {}

  /**
   * Adds two points on the elliptic curve.
   * @param {Point} P - The first point.
   * @param {Point} Q - The second point.
   * @returns {Point} The resulting point.
   */
  add_points(P, Q) {
    if (P.x == undefined || P.y == undefined) {
      return Q;
    }

    if (Q.x == undefined || Q.y == undefined) {
      return P;
    }

    if (P === Q) {
      return this.double_point(P);
    }

    const lambda = (Q.y - P.y) * this.mod_inverse(Q.x - P.x);
    const x3 = lambda ** 2n - P.x - Q.x;
    const y3 = lambda * (P.x - x3) - P.y;
    return new Point(this.modulus(x3, this.p), this.modulus(y3, this.p));
  }

  /**
   * Doubles a point on the elliptic curve.
   * @param {Point} P - The point to double.
   * @returns {Point} The resulting point.
   */
  double_point(P) {
    if (P.x == undefined || P.y == undefined) {
      return P;
    }
    const lambda = (3n * P.x ** 2n + this.a) * this.mod_inverse(2n * P.y);
    if (!lambda) {
      return new Point();
    }
    const x3 = lambda ** 2n - 2n * P.x;
    const y3 = lambda * (P.x - x3) - P.y;
    return new Point(this.modulus(x3, this.p), this.modulus(y3, this.p));
  }

  /**
   * Multiplies a point on the elliptic curve by a scalar.
   * @param {BigInt} k - The scalar by which to multiply the point.
   * @param {Point} P - The point to multiply.
   * @returns {Point} The resulting point.
   */
  multiply_point(k, P) {
    if (typeof k !== "bigint" || k <= 0n || k >= this.n) {
      throw new Error("k is not in the range 0 < k < n");
    }

    let num_bits = k.toString(2).length;
    let r = new Point(0n, 0n);
    let Q = new Point(P.x, P.y);
    let l = 0;
    for (let i = num_bits - 1; i >= 0; i--) {
      if (r.x === 0n && r.y === 0n) {
        r = Q;
        if (l == 0) {
          continue;
        }
      }
      r = this.double_point(r);
      if ((k >> BigInt(i)) & BigInt(1)) {
        if (r.x === 0n && r.y === 0n) {
          r = P;
        } else {
          r = this.add_points(r, Q);
        }
      }
    }
    return r;
  }

  /**
   * Calculates the modular multiplicative inverse of a number.
   * @param {BigInt} a - The number.
   * @returns {BigInt} The modular multiplicative inverse.
   */
  mod_inverse(a) {
    return this.extended_gcd(a, this.p)[1];
  }

  /**
   * Extended Euclidean algorithm to calculate modular inverse.
   * @param {BigInt} a - The number.
   * @param {BigInt} b - The modulus.
   * @returns {BigInt[]} [gcd, x, y]
   */
  extended_gcd(a, b) {
    if (b === 0n) {
      return [a, 1n, 0n];
    }
    const [g, x, y] = this.extended_gcd(b, this.modulus(a, b));
    return [g, y, x - (a / b) * y];
  }

  /**
   * Custom modulo function to ensure positive result.
   * @param {BigInt} a - The number.
   * @param {BigInt} b - The modulus.
   * @returns {BigInt} The positive result of the modulo operation.
   */
  modulus(a, b) {
    return ((a % b) + b) % b;
  }
}

class EllipticCurve extends EllipticCurveOperations {
  /**
   * Represents an elliptic curve.
   * @param {BigInt} p - The prime modulus of the field.
   * @param {BigInt} a - The 'a' coefficient of the elliptic curve equation.
   * @param {BigInt} b - The 'b' coefficient of the elliptic curve equation.
   * @param {Point} G - The base point (generator) of the curve.
   * @param {BigInt} n - The order of the base point.
   * @param {BigInt} h - The cofactor of the curve.
   */
  constructor(p, a, b, G, n, h) {
    super(); 
    this.p = p;
    this.a = a;
    this.b = b;
    this.G = G;
    this.n = n;
    this.h = h;
    Object.freeze(this); // Freezing the object to make it immutable
  }
}
