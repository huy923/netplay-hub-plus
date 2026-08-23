import { describe, it, expect, beforeAll } from "vitest";
import { check } from "./helpers/check";

beforeAll(() => {
  process.env.ENCRYPTION_KEY = "abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890";
});

describe("encryption.ts — encrypt", () => {
  it("encrypt", async () => {
    const { encrypt } = await import("@/lib/encryption");
    await check("trả về chuỗi định dạng iv:encrypted (hex)", () => {
      expect(encrypt("admin123")).toMatch(/^[0-9a-f]{32}:[0-9a-f]+$/);
    });
    await check("tạo ciphertext khác nhau mỗi lần gọi (random IV)", () => {
      expect(encrypt("test")).not.toBe(encrypt("test"));
    });
    await check("xử lý chuỗi tiếng Việt + ký tự đặc biệt + emoji", async () => {
      const { encrypt: e, decrypt: d } = await import("@/lib/encryption");
      const text = "Mật khẩu phức tạp 123 !@# 💰";
      expect(d(e(text))).toBe(text);
    });
    await check("xử lý chuỗi rỗng", async () => {
      const { encrypt: e, decrypt: d } = await import("@/lib/encryption");
      expect(d(e(""))).toBe("");
    });
    await check("ném lỗi khi thiếu ENCRYPTION_KEY", () => {
      const savedKey = process.env.ENCRYPTION_KEY;
      delete process.env.ENCRYPTION_KEY;
      try {
        expect(() => encrypt("x")).toThrow(/Missing ENCRYPTION_KEY/);
      } finally {
        process.env.ENCRYPTION_KEY = savedKey;
      }
    });
  });
});

describe("encryption.ts — decrypt", () => {
  it("decrypt", async () => {
    const { encrypt, decrypt } = await import("@/lib/encryption");
    await check("giải mã đúng bản rõ ban đầu", () => {
      expect(decrypt(encrypt("admin123"))).toBe("admin123");
    });
    await check("ném lỗi với ciphertext không hợp lệ", () => {
      expect(() => decrypt("invalid")).toThrow();
    });
    await check("ném lỗi với chuỗi rỗng", () => {
      expect(() => decrypt("")).toThrow();
    });
  });
});

describe("encryption.ts — hashPassword / verifyPassword", () => {
  it("hashPassword", async () => {
    const { hashPassword } = await import("@/lib/encryption");
    const hashed = await hashPassword("secret123");
    const sameA = await hashPassword("same");
    const sameB = await hashPassword("same");
    await check("trả về chuỗi định dạng salt:hash", () => {
      expect(hashed).toMatch(/^[0-9a-f]{32}:[0-9a-f]{128}$/);
    });
    await check("sinh salt khác nhau mỗi lần gọi", () => {
      expect(sameA).not.toBe(sameB);
    });
  });

  it("verifyPassword", async () => {
    const { hashPassword, verifyPassword } = await import("@/lib/encryption");
    const storedHash = await hashPassword("secret123");
    const okResult = await verifyPassword("secret123", storedHash);
    const wrongResult = await verifyPassword("wrong", storedHash);
    const malformedResult = await verifyPassword("x", "no-colon-here");
    await check("đúng mật khẩu → true", () => {
      expect(okResult).toBe(true);
    });
    await check("sai mật khẩu → false", () => {
      expect(wrongResult).toBe(false);
    });
    await check("stored không đúng định dạng → false", () => {
      expect(malformedResult).toBe(false);
    });
  });
});
