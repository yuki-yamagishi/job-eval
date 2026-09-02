import { describe, it, expect } from "vitest";
import { encryptJson, decryptJson } from "@/core/crypto/e2eeCrypto";

describe("E2EE Crypto Engine (AES-GCM-256)", () => {
  const testRoomId = "JE-8492-7K9A";
  const mockPayload = {
    user: "Yamada Taro",
    desiredSalary: 12000000,
    skills: ["TypeScript", "React", "Rust", "Cloudflare D1"],
    confidentialNotes: "年収1200万以上、フルリモート希望",
  };

  it("successfully encrypts and decrypts complex JSON payload with correct Room ID", async () => {
    const encryptedBase64 = await encryptJson(mockPayload, testRoomId);
    expect(encryptedBase64).toBeTypeOf("string");
    expect(encryptedBase64.length).toBeGreaterThan(20);

    // Verify plaintext is not visible in ciphertext
    expect(encryptedBase64).not.toContain("Yamada");
    expect(encryptedBase64).not.toContain("TypeScript");

    // Decrypt
    const decrypted = await decryptJson<typeof mockPayload>(encryptedBase64, testRoomId);
    expect(decrypted).toEqual(mockPayload);
  });

  it("fails to decrypt when using a different Room ID (Zero-Knowledge verification)", async () => {
    const encryptedBase64 = await encryptJson(mockPayload, testRoomId);
    const wrongRoomId = "JE-9999-XXXX";

    const decrypted = await decryptJson(encryptedBase64, wrongRoomId);
    expect(decrypted).toBeNull();
  });

  it("returns null gracefully for invalid or corrupted ciphertext", async () => {
    const corrupted = "not-a-valid-base64-or-too-short";
    const decrypted = await decryptJson(corrupted, testRoomId);
    expect(decrypted).toBeNull();
  });
});
