// Shared crypto utilities for Edge Functions
// AES-256-GCM encryption/decryption using Web Crypto API

const ALGORITHM = 'AES-GCM'
const KEY_LENGTH = 256
const IV_LENGTH = 12 // 96 bits, standard for AES-GCM

/**
 * Import a base64-encoded key string as a CryptoKey.
 */
async function importKey(base64Key: string): Promise<CryptoKey> {
  const rawKey = Uint8Array.from(atob(base64Key), c => c.charCodeAt(0))
  return crypto.subtle.importKey(
    'raw',
    rawKey,
    { name: ALGORITHM, length: KEY_LENGTH },
    false,
    ['encrypt', 'decrypt']
  )
}

/**
 * Encrypt a plaintext string.
 * Returns: { ciphertext: base64, iv: base64 }
 */
export async function encryptToken(
  plaintext: string,
  base64Key: string
): Promise<{ ciphertext: string; iv: string }> {
  const key = await importKey(base64Key)
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH))
  const encoded = new TextEncoder().encode(plaintext)

  const encrypted = await crypto.subtle.encrypt(
    { name: ALGORITHM, iv },
    key,
    encoded
  )

  return {
    ciphertext: btoa(String.fromCharCode(...new Uint8Array(encrypted))),
    iv: btoa(String.fromCharCode(...iv))
  }
}

/**
 * Decrypt a base64-encoded ciphertext using a base64-encoded IV.
 * Returns the plaintext string.
 */
export async function decryptToken(
  ciphertext: string,
  ivBase64: string,
  base64Key: string
): Promise<string> {
  const key = await importKey(base64Key)
  const iv = Uint8Array.from(atob(ivBase64), c => c.charCodeAt(0))
  const encrypted = Uint8Array.from(atob(ciphertext), c => c.charCodeAt(0))

  const decrypted = await crypto.subtle.decrypt(
    { name: ALGORITHM, iv },
    key,
    encrypted
  )

  return new TextDecoder().decode(decrypted)
}
