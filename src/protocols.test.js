import { test, expect } from '@jest/globals'
import { DiffieHellman, MasseyOmura } from './protocols'
import { Koblitz } from './algorithms'
import { Point } from './core'

test('diffie-hellman: compute shared secret', () => {
  const private_key_alice = 12345n
  const dh_alice = new DiffieHellman(private_key_alice)
  const private_key_bob = 67890n
  const dh_bob = new DiffieHellman(private_key_bob)

  // Alice computes the shared secret using Bob's public key
  const secret_alice = dh_alice.compute_shared_secret(dh_bob.public_key)

  // Bob computes the shared secret using Alice's public key
  const secret_bob = dh_bob.compute_shared_secret(dh_alice.public_key)

  // The secrets should match
  expect(secret_alice).toStrictEqual(secret_bob)
})

test('massey-omura: encryption decryption', () => {
  // Initialize the Koblitz instance for the elliptic curve 'secp192k1'
  const koblitz = new Koblitz('secp192k1')

  // Sender's side
  // -------------
  const privateKeySender = BigInt('70604135')
  // Initialize Massey-Omura protocol with the sender's private key
  const moSender = new MasseyOmura(privateKeySender)

  // Encode the message using the Koblitz method
  // `j` is used to handle the ambiguity in the decoding process
  const [message, j] = koblitz.encode('Hello, world!')

  // Perform the first encryption step with Massey-Omura protocol
  const encryptedMsgSender = moSender.first_encryption_step(message)

  // The encoded message is now sent to the receiver...
  // (transmission of encryptedMsgSender)

  // Receiver's side
  // ---------------
  const privateKeyReceiver = BigInt('48239108668')
  // Initialize Massey-Omura protocol with the receiver's private key
  const moReceiver = new MasseyOmura(privateKeyReceiver)

  // Perform the second encryption step with Massey-Omura protocol
  const encryptedMsgReceiver =
    moReceiver.second_encryption_step(encryptedMsgSender)

  // The double-encrypted message is sent back to the sender...
  // (transmission of encryptedMsgReceiver)

  // Sender's side again
  // -------------------
  const partialDecryptedMsg =
    moSender.partial_decryption_step(encryptedMsgReceiver)

  // The partially decrypted message is sent back to the receiver...
  // (transmission of partialDecryptedMsg)

  // Receiver's final decryption
  // ---------------------------
  const originalMessage =
    moReceiver.partial_decryption_step(partialDecryptedMsg)

  // Decode the message using the Koblitz method
  // `j` is used to resolve the mapping from the elliptic curve point back to the message
  const decodedMessage = koblitz.decode(originalMessage, j)

  // The fully decrypted message should match the original message
  expect(decodedMessage).toStrictEqual('Hello, world!')
})

test('massey-omura: validate the public key value', () => {
  const moSender = new MasseyOmura(654564n)

  const P1 = new Point(
    2561645154652864168258282342383115659685709191094067233983n,
    89709827696035605786509950363037856155865475850237621433n,
  )

  expect(moSender.public_key.toString()).toStrictEqual(P1.toString())
})
