import { describe, it, expect, beforeAll } from "vitest";

beforeAll(() => {
  process.env.ENCRYPTION_KEY = "abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890";
});

describe("encryption", () => {
  it("encrypts and decrypts correctly", async () => {
    const { encrypt, decrypt } = await import("@/lib/encryption");
    const plaintext = "admin123";
    const encrypted = encrypt(plaintext);
    expect(encrypted).toContain(":");
    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe(plaintext);
  });

  it("produces different ciphertexts each time", async () => {
    const { encrypt } = await import("@/lib/encryption");
    const a = encrypt("test");
    const b = encrypt("test");
    expect(a).not.toBe(b);
  });

  it("throws on invalid ciphertext", async () => {
    const { decrypt } = await import("@/lib/encryption");
    expect(() => decrypt("invalid")).toThrow();
  });
});
