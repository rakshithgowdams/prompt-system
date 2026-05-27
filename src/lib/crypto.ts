// AES-256-GCM client-side encryption keyed from a USER-PROVIDED master password.
// The key is derived via PBKDF2 (600k iterations, SHA-256) using a per-user random
// salt stored in user_profiles. The master password is NEVER stored or sent to the
// server — if the user forgets it, vault entries are unrecoverable by design.
// This matches how 1Password and Bitwarden protect vault data.

const PBKDF2_ITERATIONS = 600_000; // OWASP 2023 recommendation
const KEY_LENGTH_BITS = 256;
const SALT_BYTES = 32;
const IV_BYTES = 12;

function bytesToBase64(bytes: Uint8Array): string {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export function generateSalt(): string {
  return bytesToBase64(crypto.getRandomValues(new Uint8Array(SALT_BYTES)));
}

async function deriveKey(masterPassword: string, saltB64: string, purpose: 'verify' | 'encrypt'): Promise<CryptoKey> {
  const enc = new TextEncoder();
  // Domain-separate the verify key from the encrypt key so the verifier
  // ciphertext cannot be used to attack vault entries.
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(masterPassword + ':' + purpose),
    'PBKDF2',
    false,
    ['deriveKey'],
  );
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: base64ToBytes(saltB64),
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: KEY_LENGTH_BITS },
    false,
    ['encrypt', 'decrypt'],
  );
}

// Build a verifier: encrypts a fixed known string under the 'verify' key.
// Stored in user_profiles.vault_verifier so we can check the master password
// is correct before attempting to decrypt vault entries.
export async function buildVerifier(masterPassword: string, saltB64: string): Promise<string> {
  const key = await deriveKey(masterPassword, saltB64, 'verify');
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const ct = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode('aiwithrakshith.vault.v1'),
  );
  return JSON.stringify({ iv: bytesToBase64(iv), ct: bytesToBase64(new Uint8Array(ct)) });
}

// Returns true if masterPassword + salt correctly decrypts the verifier.
export async function verifyMasterPassword(
  masterPassword: string,
  saltB64: string,
  verifier: string,
): Promise<boolean> {
  try {
    const key = await deriveKey(masterPassword, saltB64, 'verify');
    const { iv, ct } = JSON.parse(verifier);
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: base64ToBytes(iv) },
      key,
      base64ToBytes(ct),
    );
    return new TextDecoder().decode(decrypted) === 'aiwithrakshith.vault.v1';
  } catch {
    return false;
  }
}

export async function encryptPassword(plaintext: string, masterPassword: string, saltB64: string): Promise<string> {
  const key = await deriveKey(masterPassword, saltB64, 'encrypt');
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const ct = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(plaintext),
  );
  return JSON.stringify({ iv: bytesToBase64(iv), ct: bytesToBase64(new Uint8Array(ct)) });
}

export async function decryptPassword(encryptedData: string, masterPassword: string, saltB64: string): Promise<string> {
  const key = await deriveKey(masterPassword, saltB64, 'encrypt');
  const { iv, ct } = JSON.parse(encryptedData);
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: base64ToBytes(iv) },
    key,
    base64ToBytes(ct),
  );
  return new TextDecoder().decode(decrypted);
}
