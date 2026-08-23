import { describe, it, expect } from "vitest";
import { cn } from "@/lib/utils";
import { check } from "./helpers/check";

describe("utils.ts — cn (clsx + tailwind-merge)", () => {
  it("cn", () => {
    check("ghép nhiều class names", () => {
      expect(cn("px-4", "py-2")).toBe("px-4 py-2");
    });
    check("bỏ qua class falsy (false/null/undefined)", () => {
      const showHidden = false;
      expect(cn("base", showHidden && "hidden", "visible")).toBe("base visible");
      expect(cn("a", null, undefined, "", "b")).toBe("a b");
    });
    check("dedupe class tailwind trùng loại (px-4 + px-2 → px-2)", () => {
      expect(cn("px-4", "px-2")).toBe("px-2");
    });
    check("giữ các class khác loại khi merge (text-red-500 + bg-blue-500)", () => {
      const result = cn("text-red-500", "bg-blue-500");
      expect(result).toContain("text-red-500");
      expect(result).toContain("bg-blue-500");
    });
    check("xử lý object điều kiện { key: boolean }", () => {
      expect(cn("base", { hidden: false, block: true })).toBe("base block");
    });
    check("xử lý mảng lồng nhau", () => {
      expect(cn(["a", ["b", "c"]])).toBe("a b c");
    });
    check("trả về chuỗi rỗng khi không có input", () => {
      expect(cn()).toBe("");
    });
  });
});
