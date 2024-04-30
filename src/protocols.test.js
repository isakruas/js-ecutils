import { test, expect } from '@jest/globals'
import { DiffieHellman, MasseyOmura } from './protocols'

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
  const private_key_sender = 123456n
  const mo_sender = new MasseyOmura(private_key_sender)

  const private_key_receiver = 654321n
  const mo_receiver = new MasseyOmura(private_key_receiver)

  const message = mo_sender.curve.G // Using the curve's generator point for simplicity

  // Sender encrypts the message
  const encrypted_by_sender = mo_sender.first_encryption_step(message)

  // Receiver encrypts the already encrypted message
  const encrypted_by_receiver =
    mo_receiver.second_encryption_step(encrypted_by_sender)

  // Sender decrypts the message partly
  const partially_decrypted_by_sender = mo_sender.partial_decryption_step(
    encrypted_by_receiver,
  )

  // Receiver completes decryption
  const fully_decrypted_message = mo_receiver.partial_decryption_step(
    partially_decrypted_by_sender,
  )

  // The fully decrypted message should match the original message
  expect(fully_decrypted_message).toStrictEqual(message)
})
