// AES-256-GCM client-side encryption. The key is derived from the user's UID
// with PBKDF2 so plaintext passwords never leave the device.

const ITERATIONS = 200_000;
const KEY_LEN = 256;

async function deriveKey(userId: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(userId),
    'PBKDF2',
    false,
    ['deriveKey'],
  );
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      // Fixed salt scoped to userId so the key is stable across sessions
      salt: enc.encode(`promptvault:${userId}`),
      iterations: ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: KEY_LEN },
    false,
    ['encrypt', 'decrypt'],
  );
}

export async function encryptPassword(plaintext: string, userId: string): Promise<string> {
  const key = await deriveKey(userId);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded);
  const payload = {
    iv: btoa(String.fromCharCode(...iv)),
    ct: btoa(String.fromCharCode(...new Uint8Array(ciphertext))),
  };
  return btoa(JSON.stringify(payload));
}

export async function decryptPassword(encryptedData: string, userId: string): Promise<string> {
  const key = await deriveKey(userId);
  const { iv: ivB64, ct: ctB64 } = JSON.parse(atob(encryptedData));
  const iv = Uint8Array.from(atob(ivB64), (c) => c.charCodeAt(0));
  const ct = Uint8Array.from(atob(ctB64), (c) => c.charCodeAt(0));
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct);
  return new TextDecoder().decode(plain);
}
