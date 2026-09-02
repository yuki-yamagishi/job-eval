/**
 * E2EE (End-to-End Encryption) Crypto Engine
 * Uses Web Crypto API (AES-GCM-256 with PBKDF2 key derivation)
 * Guarantees Zero-Knowledge privacy across devices and cloud databases.
 */

const SALT_STRING = "jobeval_e2ee_salt_v1";
const PBKDF2_ITERATIONS = 10000;

/**
 * Derives an AES-GCM-256 CryptoKey from a Room ID / Passphrase using PBKDF2
 */
async function deriveKey(passphrase: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const passwordKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(passphrase.trim().toUpperCase()),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );

  const salt = encoder.encode(SALT_STRING);

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    passwordKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

/**
 * Encrypts an arbitrary JSON-serializable object into an AES-GCM base64 string
 */
export async function encryptJson(data: any, roomId: string): Promise<string> {
  if (!data || !roomId) return "";

  try {
    const key = await deriveKey(roomId);
    const iv = crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV for AES-GCM
    const jsonString = JSON.stringify(data);
    const encodedData = new TextEncoder().encode(jsonString);

    const ciphertextBuffer = await crypto.subtle.encrypt(
      {
        name: "AES-GCM",
        iv,
      },
      key,
      encodedData
    );

    const ciphertext = new Uint8Array(ciphertextBuffer);

    // Combine IV (12 bytes) + Ciphertext into one buffer
    const combined = new Uint8Array(iv.length + ciphertext.length);
    combined.set(iv, 0);
    combined.set(ciphertext, iv.length);

    // Convert to Base64
    let binary = "";
    const len = combined.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(combined[i]);
    }
    return btoa(binary);
  } catch (err) {
    console.error("E2EE Encryption failed:", err);
    throw new Error("Failed to encrypt data");
  }
}

/**
 * Decrypts an AES-GCM base64 string back into a typed JSON object
 */
export async function decryptJson<T = any>(encryptedBase64: string, roomId: string): Promise<T | null> {
  if (!encryptedBase64 || !roomId) return null;

  try {
    const key = await deriveKey(roomId);
    const binary = atob(encryptedBase64);
    const combined = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      combined[i] = binary.charCodeAt(i);
    }

    if (combined.length < 13) {
      return null;
    }

    const iv = combined.slice(0, 12);
    const ciphertext = combined.slice(12);

    const decryptedBuffer = await crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv,
      },
      key,
      ciphertext
    );

    const decodedString = new TextDecoder().decode(decryptedBuffer);
    return JSON.parse(decodedString) as T;
  } catch (err) {
    console.warn("E2EE Decryption failed (invalid key or corrupted data)", err);
    return null;
  }
}
