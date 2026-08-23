import { describe, it, expect } from "vitest";
import { formatVND, formatDate } from "@/lib/format";
import { check } from "./helpers/check";

describe("format.ts — formatVND", () => {
  it("formatVND", () => {
    check("format số 0 → '0 ₫'", () => {
      expect(formatVND(0)).toContain("0");
      expect(formatVND(0)).toContain("₫");
    });
    check("format hàng nghìn 10000 → '10.000 ₫'", () => {
      expect(formatVND(10000)).toContain("10.000");
      expect(formatVND(10000)).toContain("₫");
    });
    check("format hàng triệu 1500000 → '1.500.000 ₫'", () => {
      expect(formatVND(1500000)).toContain("1.500.000");
    });
    check("format số lớn 123456789", () => {
      expect(formatVND(123456789)).toContain("123.456.789");
    });
    check("làm tròn số thập phân (maximumFractionDigits: 0)", () => {
      const result = formatVND(9999.99);
      expect(result).not.toContain(",");
      expect(result).toContain("10.000");
    });
    check("không hiện số lẻ cho giá nguyên", () => {
      expect(formatVND(8000).replace(/[^\d]/g, "")).toBe("8000");
    });
  });
});

describe("format.ts — formatDate", () => {
  it("formatDate", () => {
    check("nhận Date object → chuỗi dd/mm/yyyy hh:mm", () => {
      const result = formatDate(new Date(2024, 0, 15, 10, 30));
      expect(result).toContain("15/01/2024");
      expect(result).toContain("10:30");
    });
    check("nhận ISO string → cùng kết quả với Date object", () => {
      const d = new Date(2024, 5, 3, 8, 5);
      expect(formatDate(d.toISOString())).toBe(formatDate(d));
    });
    check("đệm số 0 cho ngày/tháng/giờ < 10", () => {
      expect(formatDate(new Date(2024, 0, 5, 9, 5))).toContain("05/01/2024");
    });
    check("ném lỗi với chuỗi ngày không hợp lệ", () => {
      expect(() => formatDate("not-a-date")).toThrow();
    });
  });
});
