import { describe, it, expect } from "vitest";
import { renderErrorPage } from "@/lib/error-page";
import { check } from "./helpers/check";

describe("error-page.ts — renderErrorPage", () => {
  it("renderErrorPage", () => {
    const html = renderErrorPage();
    check("trả về HTML document hợp lệ", () => {
      expect(html).toMatch(/^\s*<!doctype html>/i);
      expect(html).toContain("</html>");
    });
    check("chứa tiêu đề lỗi", () => {
      expect(html).toContain("This page didn't load");
    });
    check("có nút Try again (reload)", () => {
      expect(html).toContain("Try again");
      expect(html).toContain("location.reload()");
    });
    check("có link về trang chủ", () => {
      expect(html).toContain('href="/"');
      expect(html).toContain("Go home");
    });
    check("khai báo charset utf-8 và viewport (responsive)", () => {
      expect(html).toContain('charset="utf-8"');
      expect(html).toContain("viewport");
    });
    check("render giống nhau mỗi lần gọi (pure function)", () => {
      expect(renderErrorPage()).toBe(renderErrorPage());
    });
  });
});
