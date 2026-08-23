import { describe, it, expect } from "vitest";
import vi from "@/lib/locales/vi.json";
import en from "@/lib/locales/en.json";
import { check } from "./helpers/check";

type Nested = Record<string, unknown>;

function flattenKeys(obj: Nested, prefix = ""): string[] {
  return Object.entries(obj).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === "object") return flattenKeys(value as Nested, path);
    return [path];
  });
}

describe("locales — đồng bộ key i18n (vi ↔ en)", () => {
  it("locale keys", () => {
    const viKeys = new Set(flattenKeys(vi as Nested));
    const enKeys = new Set(flattenKeys(en as Nested));

    check("mọi key tiếng Việt đều có bản dịch tiếng Anh", () => {
      const missing = [...viKeys].filter((k) => !enKeys.has(k));
      expect(missing).toEqual([]);
    });

    check("mọi key tiếng Anh đều có bản dịch tiếng Việt", () => {
      const missing = [...enKeys].filter((k) => !viKeys.has(k));
      expect(missing).toEqual([]);
    });

    check("không có giá trị rỗng trong cả 2 file locale", () => {
      for (const obj of [vi, en] as Nested[]) {
        for (const key of flattenKeys(obj)) {
          const value = key.split(".").reduce<unknown>((acc, part) => (acc as Nested)?.[part], obj);
          expect(String(value ?? "").trim().length, `${key} bị rỗng`).toBeGreaterThan(0);
        }
      }
    });
  });
});
