import { describe, it, expect } from "vitest";
import { formatVND } from "@/lib/format";

describe("formatVND", () => {
  it("formats zero", () => {
    const result = formatVND(0);
    expect(result).toContain("0");
    expect(result).toContain("₫");
  });

  it("formats thousands", () => {
    const result = formatVND(10000);
    expect(result).toContain("10.000");
    expect(result).toContain("₫");
  });

  it("formats millions", () => {
    const result = formatVND(1500000);
    expect(result).toContain("1.500.000");
    expect(result).toContain("₫");
  });

  it("handles large numbers", () => {
    const result = formatVND(123456789);
    expect(result).toContain("123.456.789");
    expect(result).toContain("₫");
  });
});
