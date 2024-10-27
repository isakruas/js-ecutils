import { test, expect } from '@jest/globals'
import { DigitalSignature, Koblitz } from './algorithms'

let ds

const private_key = BigInt(123456789)
ds = new DigitalSignature(private_key)

test('digital-signature: generate and verify signature', () => {
  const message_hash = BigInt(545454445644654n)
  const signature = ds.generate_signature(message_hash)
  const r = signature[0]
  const s = signature[1]

  const is_valid = ds.verify_signature(ds.public_key, message_hash, r, s)
  expect(is_valid).toBe(true)
})

test('digital-signature: verify signature with invalid inputs', () => {
  const message_hash = BigInt(545454445644654n)
  const signature = ds.generate_signature(message_hash)

  // Choose invalid r and s values (outside the range [1, n-1])
  const invalid_r = ds.curve.n
  const invalid_s = BigInt(0)

  // Check that the appropriate exception is raised for invalid r and s
  expect(() => {
    ds.verify_signature(
      ds.public_key,
      message_hash,
      invalid_r,
      BigInt(signature[1]),
    )
  }).toThrowError('r or s are not in the valid range [1, curve order - 1].')

  expect(() => {
    ds.verify_signature(
      ds.public_key,
      message_hash,
      BigInt(signature[0]),
      invalid_s,
    )
  }).toThrowError('r or s are not in the valid range [1, curve order - 1].')
})

const encoder = new Koblitz('secp521r1')
const decoder = new Koblitz('secp521r1')

test('koblitz: encode throws error for unsupported alphabet size', () => {
  const encoder = new Koblitz()
  const message = 'Test message'

  expect(() => {
    encoder.encode(message, 250n)
  }).toThrow('Alphabet size not supported')
})

test('koblitz: decode throws error for unsupported alphabet size', () => {
  const decoder = new Koblitz()
  const point = { x: 1n, y: 1n }
  const j = 0n

  expect(() => {
    decoder.decode(point, j, 250n)
  }).toThrow('Alphabet size not supported')
})

test('koblitz: encode and decode ascii', () => {
  const message = 'Hello, EC!'
  const encode = encoder.encode(message, 2n ** 8n)
  const encoded_point = encode[0]
  const j = encode[1]
  const decoded_message = decoder.decode(encoded_point, j, 2n ** 8n)
  expect(decoded_message).toBe(message)
})

test('koblitz: should serialize and deserialize points and auxiliary values', () => {
  const message = 'Hello, EC!'
  const encoded = encoder.encode(message, 2n ** 8n)
  const serialized = encoder.serialize([encoded])
  const deserialized = encoder.deserialize(serialized)
  expect(deserialized[0][0].x).toEqual(encoded[0].x)
  expect(deserialized[0][0].y).toEqual(encoded[0].y)
  expect(deserialized[0][1]).toEqual(encoded[1])
})

test('koblitz: encode and decode lengthy ascii', () => {
  const message = `Morbi nibh dolor, tempus vel arcu eget, sagittis scelerisque mi. Curabitur aliquet tempus odio, vitae rutrum tortor mollis sit amet. Aliquam finibus sapien eu urna efficitur cursus. Nullam ultricies justo et magna molestie, non tincidunt lacus fringilla. Nulla facilisi. Nullam commodo aliquam placerat. Vivamus imperdiet diam id tincidunt ultrices. Nulla vitae odio massa. Nullam rhoncus scelerisque quam vel scelerisque. Duis ac diam quam. Ut volutpat, tellus a vehicula aliquet, ipsum velit maximus ligula, vel fringilla urna libero vel orci. Nulla iaculis tristique sapien in faucibus. Nullam euismod hendrerit sapien, id pulvinar ipsum dictum non.
  Suspendisse aliquet leo non vulputate lacinia. Mauris sed malesuada sem, sit amet cursus erat. Donec ac cursus dui. Sed at facilisis arcu. Phasellus at pulvinar lorem, tristique fermentum mauris. Donec commodo consequat eros, ut facilisis risus. Donec eget nunc accumsan, scelerisque lectus non, lobortis urna. Mauris non volutpat enim. Curabitur dignissim lorem lacus, elementum luctus odio bibendum at. Praesent rhoncus magna metus, ut vehicula est sodales a. Donec euismod tristique nisl quis sagittis.
  Nam vehicula magna bibendum, posuere enim tempor, ultricies lacus. Vivamus in lorem magna. Nam interdum fringilla laoreet. Nullam convallis dolor quis urna facilisis faucibus a eget mi. Aenean volutpat leo sit amet lorem facilisis malesuada. Suspendisse nec fermentum ex, ut blandit dolor. Aenean id erat sed magna dignissim auctor. Vestibulum a nisi et augue tempus ornare. Maecenas non faucibus purus. Morbi lorem ante, venenatis viverra est a, ultricies auctor enim.
  Cras pellentesque porttitor enim, sit amet vulputate sapien ultricies at. Integer ac mattis ante, at suscipit mi. Sed sed est viverra ligula vestibulum rutrum. In interdum ante in mauris posuere vulputate. Cras et neque vel sapien fermentum luctus et eu quam. Etiam vel risus est. Vestibulum vestibulum nisi sed commodo feugiat. Nunc a condimentum quam. Curabitur eget urna libero. Cras ultrices fringilla erat non consequat. In tristique vulputate scelerisque.
  Praesent sit amet nunc sit amet tortor condimentum vestibulum sed ac ex. Aliquam sit amet lacinia enim, sed lacinia felis. Cras maximus ornare lorem, ut tempor orci luctus in. Curabitur rutrum ligula eget turpis posuere suscipit. Duis varius ex magna, sed scelerisque odio sagittis non. Ut ut gravida magna, a ultricies nibh. Praesent porttitor dapibus leo vitae rutrum. Quisque gravida finibus lorem. In eu cursus mi. Class aptent taciti sociosqu ad litora torquent per conubia nostra, per inceptos himenaeos. Integer in metus convallis, efficitur nulla vel, sollicitudin velit. Suspendisse mattis sit amet odio non volutpat.
  Vivamus vulputate quam at hendrerit euismod. Phasellus nec vehicula nisi. Nam at diam libero. Aenean porttitor gravida tortor, eu tristique risus aliquet in. Maecenas eros libero, faucibus vel ornare ut, molestie at massa. Pellentesque semper posuere urna, et commodo nisl porttitor eget. Duis a augue gravida, rutrum lacus eget, fringilla lacus. Curabitur scelerisque rutrum pulvinar. Aliquam sagittis ipsum eget felis lacinia, in aliquam dui congue. Nulla consectetur sit amet dui ut euismod.
  Aliquam posuere faucibus semper. Donec ullamcorper dui egestas risus rhoncus mollis. Nunc id metus pulvinar, tempor justo in, ornare tortor. Aenean id venenatis felis, ut euismod nisi. Quisque a ante tristique, blandit risus nec, scelerisque arcu. Praesent placerat efficitur turpis, vitae mattis massa sollicitudin vel. Integer ut lectus efficitur lectus eleifend consectetur et sed tellus. Morbi elementum, nulla sed pulvinar tincidunt, massa nulla sagittis orci, ultricies tincidunt felis arcu commodo turpis. Morbi sollicitudin magna dui, vel iaculis metus ullamcorper sit amet. Donec sit amet volutpat est, et hendrerit massa. Aenean aliquam feugiat erat, ac vehicula mauris dictum vel. Suspendisse aliquet dui ultrices mi ultricies, vel dignissim lectus feugiat. Curabitur sodales nisi eu tellus pharetra, ac dictum tellus pellentesque. Donec egestas sem ac condimentum placerat.
  Sed vel eleifend augue. Vestibulum lacinia pellentesque nibh, a scelerisque ante. Sed accumsan, orci vitae commodo consectetur, lorem neque lacinia nisl, a interdum mauris dolor rhoncus libero. Praesent malesuada consectetur semper. Maecenas cursus, diam quis ultrices volutpat, nisi neque imperdiet dolor, non porttitor justo elit id eros. Sed sodales tempus arcu, eget tempor dolor aliquam et. Quisque id tortor a arcu viverra cursus. Suspendisse elementum efficitur ante, id facilisis est consectetur pretium. Nam cursus turpis eu aliquam tempus. Morbi egestas risus sit amet lacinia elementum. Nunc tincidunt sit amet odio at molestie. Maecenas pretium consequat fermentum.`
  const encoded_points = encoder.encode(message, 2n ** 8n, true)
  const decoded_message = decoder.decode(encoded_points, 0n, 2n ** 8n, true)
  expect(decoded_message).toBe(message)
})

test('koblitz: encode and decode unicode', () => {
  const message = 'Hello, EC!'
  const encode = encoder.encode(message, 2n ** 16n)
  const encoded_point = encode[0]
  const j = encode[1]
  const decoded_message = decoder.decode(encoded_point, j, 2n ** 16n)
  expect(decoded_message).toBe(message)
})

test('koblitz: encode and decode lengthy unicode', () => {
  const message = `Morbi nibh dolor, tempus vel arcu eget, sagittis scelerisque mi. Curabitur aliquet tempus odio, vitae rutrum tortor mollis sit amet. Aliquam finibus sapien eu urna efficitur cursus. Nullam ultricies justo et magna molestie, non tincidunt lacus fringilla. Nulla facilisi. Nullam commodo aliquam placerat. Vivamus imperdiet diam id tincidunt ultrices. Nulla vitae odio massa. Nullam rhoncus scelerisque quam vel scelerisque. Duis ac diam quam. Ut volutpat, tellus a vehicula aliquet, ipsum velit maximus ligula, vel fringilla urna libero vel orci. Nulla iaculis tristique sapien in faucibus. Nullam euismod hendrerit sapien, id pulvinar ipsum dictum non.
    Suspendisse aliquet leo non vulputate lacinia. Mauris sed malesuada sem, sit amet cursus erat. Donec ac cursus dui. Sed at facilisis arcu. Phasellus at pulvinar lorem, tristique fermentum mauris. Donec commodo consequat eros, ut facilisis risus. Donec eget nunc accumsan, scelerisque lectus non, lobortis urna. Mauris non volutpat enim. Curabitur dignissim lorem lacus, elementum luctus odio bibendum at. Praesent rhoncus magna metus, ut vehicula est sodales a. Donec euismod tristique nisl quis sagittis.
    Nam vehicula magna bibendum, posuere enim tempor, ultricies lacus. Vivamus in lorem magna. Nam interdum fringilla laoreet. Nullam convallis dolor quis urna facilisis faucibus a eget mi. Aenean volutpat leo sit amet lorem facilisis malesuada. Suspendisse nec fermentum ex, ut blandit dolor. Aenean id erat sed magna dignissim auctor. Vestibulum a nisi et augue tempus ornare. Maecenas non faucibus purus. Morbi lorem ante, venenatis viverra est a, ultricies auctor enim.
    Cras pellentesque porttitor enim, sit amet vulputate sapien ultricies at. Integer ac mattis ante, at suscipit mi. Sed sed est viverra ligula vestibulum rutrum. In interdum ante in mauris posuere vulputate. Cras et neque vel sapien fermentum luctus et eu quam. Etiam vel risus est. Vestibulum vestibulum nisi sed commodo feugiat. Nunc a condimentum quam. Curabitur eget urna libero. Cras ultrices fringilla erat non consequat. In tristique vulputate scelerisque.
    Praesent sit amet nunc sit amet tortor condimentum vestibulum sed ac ex. Aliquam sit amet lacinia enim, sed lacinia felis. Cras maximus ornare lorem, ut tempor orci luctus in. Curabitur rutrum ligula eget turpis posuere suscipit. Duis varius ex magna, sed scelerisque odio sagittis non. Ut ut gravida magna, a ultricies nibh. Praesent porttitor dapibus leo vitae rutrum. Quisque gravida finibus lorem. In eu cursus mi. Class aptent taciti sociosqu ad litora torquent per conubia nostra, per inceptos himenaeos. Integer in metus convallis, efficitur nulla vel, sollicitudin velit. Suspendisse mattis sit amet odio non volutpat.
    Vivamus vulputate quam at hendrerit euismod. Phasellus nec vehicula nisi. Nam at diam libero. Aenean porttitor gravida tortor, eu tristique risus aliquet in. Maecenas eros libero, faucibus vel ornare ut, molestie at massa. Pellentesque semper posuere urna, et commodo nisl porttitor eget. Duis a augue gravida, rutrum lacus eget, fringilla lacus. Curabitur scelerisque rutrum pulvinar. Aliquam sagittis ipsum eget felis lacinia, in aliquam dui congue. Nulla consectetur sit amet dui ut euismod.
    Aliquam posuere faucibus semper. Donec ullamcorper dui egestas risus rhoncus mollis. Nunc id metus pulvinar, tempor justo in, ornare tortor. Aenean id venenatis felis, ut euismod nisi. Quisque a ante tristique, blandit risus nec, scelerisque arcu. Praesent placerat efficitur turpis, vitae mattis massa sollicitudin vel. Integer ut lectus efficitur lectus eleifend consectetur et sed tellus. Morbi elementum, nulla sed pulvinar tincidunt, massa nulla sagittis orci, ultricies tincidunt felis arcu commodo turpis. Morbi sollicitudin magna dui, vel iaculis metus ullamcorper sit amet. Donec sit amet volutpat est, et hendrerit massa. Aenean aliquam feugiat erat, ac vehicula mauris dictum vel. Suspendisse aliquet dui ultrices mi ultricies, vel dignissim lectus feugiat. Curabitur sodales nisi eu tellus pharetra, ac dictum tellus pellentesque. Donec egestas sem ac condimentum placerat.
    Sed vel eleifend augue. Vestibulum lacinia pellentesque nibh, a scelerisque ante. Sed accumsan, orci vitae commodo consectetur, lorem neque lacinia nisl, a interdum mauris dolor rhoncus libero. Praesent malesuada consectetur semper. Maecenas cursus, diam quis ultrices volutpat, nisi neque imperdiet dolor, non porttitor justo elit id eros. Sed sodales tempus arcu, eget tempor dolor aliquam et. Quisque id tortor a arcu viverra cursus. Suspendisse elementum efficitur ante, id facilisis est consectetur pretium. Nam cursus turpis eu aliquam tempus. Morbi egestas risus sit amet lacinia elementum. Nunc tincidunt sit amet odio at molestie. Maecenas pretium consequat fermentum.`
  const encoded_points = encoder.encode(message, 2n ** 16n, true)
  const decoded_message = decoder.decode(encoded_points, 0n, 2n ** 16n, true)
  expect(decoded_message).toBe(message)
})
