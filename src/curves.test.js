import { test, expect } from '@jest/globals'
import { get, secp256k1 } from './curves'

test('get valid curve', () => {
  const curveName = 'secp256k1'
  const expectedCurve = secp256k1
  const curve = get(curveName)
  expect(curve).toBe(expectedCurve)
})

test('get invalid curve', () => {
  const curveName = 'invalidCurveName'
  expect(() => {
    get(curveName)
  }).toThrowError()
})
