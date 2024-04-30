import { test, expect } from '@jest/globals'
import { secp192k1 } from './curves'
import { Point, EllipticCurve } from './core'

test('add_points(P1, P2) to equal the expected sum', () => {
  const P1 = new Point(
    BigInt('0xF091CF6331B1747684F5D2549CD1D4B3A8BED93B94F93CB6'),
    BigInt('0xFD7AF42E1E7565A02E6268661C5E42E603DA2D98A18F2ED5'),
  )
  const P2 = new Point(
    BigInt('0x6E43B7DCAE2FD5E0BF2A1BA7615CA3B9065487C9A67B4583'),
    BigInt('0xC48DCEA47AE08E84D5FEDC3D09E4C19606A290F7A19A6A58'),
  )
  const expectedSum = new Point(
    BigInt('0X3CD61E370D02CA0687C0B5F7EBF6D0373F4DD0CCCCB7CC2D'),
    BigInt('0X2C4BEFD9B02F301EB4014504F0533AA7EB19E9EA56441F78'),
  )
  expect(secp192k1.add_points(P1, P2)).toStrictEqual(expectedSum)
})

test('double_point(P) to equal the expected double', () => {
  const P = new Point(
    BigInt('0xF091CF6331B1747684F5D2549CD1D4B3A8BED93B94F93CB6'),
    BigInt('0xFD7AF42E1E7565A02E6268661C5E42E603DA2D98A18F2ED5'),
  )
  const expectedDouble = new Point(
    BigInt('0XEA525DD5A1353762A14E9E78B9063316D1F2D5E792F87862'),
    BigInt('0XA936D583530982690C445427CDF2C5B0BB1C88749247B02E'),
  )
  expect(secp192k1.double_point(P)).toStrictEqual(expectedDouble)
})

test('multiply_point(scalar, P) to equal the expected product', () => {
  const scalar = BigInt('2')
  const P = new Point(
    BigInt('0xF091CF6331B1747684F5D2549CD1D4B3A8BED93B94F93CB6'),
    BigInt('0xFD7AF42E1E7565A02E6268661C5E42E603DA2D98A18F2ED5'),
  )
  const expectedProduct = new Point(
    BigInt('0xEA525DD5A1353762A14E9E78B9063316D1F2D5E792F87862'),
    BigInt('0xA936D583530982690C445427CDF2C5B0BB1C88749247B02E'),
  )
  expect(secp192k1.multiply_point(scalar, P)).toStrictEqual(expectedProduct)
})

test('is_point_on_curve(P) to be true for a point on the curve and false otherwise', () => {
  const P1 = new Point(
    BigInt('0xF091CF6331B1747684F5D2549CD1D4B3A8BED93B94F93CB6'),
    BigInt('0xFD7AF42E1E7565A02E6268661C5E42E603DA2D98A18F2ED5'),
  )
  const P2 = new Point(200n, 119n)
  const P3 = new Point()
  expect(secp192k1.is_point_on_curve(P1)).toBe(true)
  expect(secp192k1.is_point_on_curve(P2)).toBe(false)
  expect(secp192k1.is_point_on_curve(P3)).toBe(false)
})

test('add_points(P1, offCurvePoint) to throw an error for adding invalid points not on the curve', () => {
  const P1 = new Point(
    BigInt('0xF091CF6331B1747684F5D2549CD1D4B3A8BED93B94F93CB6'),
    BigInt('0xFD7AF42E1E7565A02E6268661C5E42E603DA2D98A18F2ED5'),
  )
  const offCurvePoint = new Point(BigInt('200'), BigInt('119'))
  expect(() => {
    secp192k1.add_points(P1, offCurvePoint)
  }).toThrow()
})

test('add_points(P, identity) to equal P and vice versa', () => {
  const P = new Point(
    BigInt('0xF091CF6331B1747684F5D2549CD1D4B3A8BED93B94F93CB6'),
    BigInt('0xFD7AF42E1E7565A02E6268661C5E42E603DA2D98A18F2ED5'),
  )
  const identity = new Point() // Assuming Point at infinity
  expect(secp192k1.add_points(P, identity)).toStrictEqual(P)
  expect(secp192k1.add_points(identity, P)).toStrictEqual(P)
})

test('multiply_point(0, P) and multiply_point(n, P) to throw an error, and multiply_point(scalar, offCurvePoint) to throw an error', () => {
  const P = new Point(
    BigInt('0xF091CF6331B1747684F5D2549CD1D4B3A8BED93B94F93CB6'),
    BigInt('0xFD7AF42E1E7565A02E6268661C5E42E603DA2D98A18F2ED5'),
  )
  const offCurvePoint = new Point(200n, 199n)
  expect(() => {
    secp192k1.multiply_point(0n, P)
  }).toThrow()
  expect(() => {
    secp192k1.multiply_point(secp192k1.n, P)
  }).toThrow()
  expect(() => {
    secp192k1.multiply_point(2n, offCurvePoint)
  }).toThrow()
})

test('add_points(P, inversePoint) to equal the identity element', () => {
  const P = new Point(
    BigInt('0xF091CF6331B1747684F5D2549CD1D4B3A8BED93B94F93CB6'),
    BigInt('0xFD7AF42E1E7565A02E6268661C5E42E603DA2D98A18F2ED5'),
  )
  const inversePoint = new Point(
    BigInt('0XF091CF6331B1747684F5D2549CD1D4B3A8BED93B94F93CB6'),
    BigInt('0X2850BD1E18A9A5FD19D9799E3A1BD19FC25D2665E70BF62'),
  )
  const identity = new Point() // Point at infinity
  expect(secp192k1.add_points(P, inversePoint)).toStrictEqual(identity)
})

test('Doubling a point with y=0 should result in the point at infinity', () => {
  const curve = new EllipticCurve(
    13n, // prime number defining the finite field
    1n, // 'a' coefficient of the elliptic curve equation
    0n, // 'b' coefficient of the elliptic curve equation
    new Point(2n, 1n), // generator point for the curve group
    4n, // order of the base point G
    0n, // cofactor
  )
  const pointWithYZero = new Point(0n, 0n)
  const expectedInfinity = new Point() // Point at infinity
  expect(curve.add_points(pointWithYZero, pointWithYZero)).toStrictEqual(
    expectedInfinity,
  )
})

test('Multiplying the point at infinity by any scalar should remain the point at infinity', () => {
  const curve = new EllipticCurve(
    13n, // prime number defining the finite field
    1n, // 'a' coefficient of the elliptic curve equation
    0n, // 'b' coefficient of the elliptic curve equation
    new Point(2n, 1n), // generator point for the curve group
    4n, // order of the base point G
    0n, // cofactor
  )
  const pointAtInfinity = new Point() // Point at infinity
  const expectedInfinity = new Point() // Point at infinity
  expect(curve.multiply_point(3n, pointAtInfinity)).toStrictEqual(
    expectedInfinity,
  )
})
