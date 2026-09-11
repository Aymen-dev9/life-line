import { describe, it, expect } from "vitest";
import { normalizePhone } from "./client";

describe("normalizePhone", () => {
  it("strips spaces, dashes and parentheses", () => {
    expect(normalizePhone(" +964 (770) 123-4567 ")).toBe("+9647701234567");
  });

  it("converts Arabic-Indic digits to Latin", () => {
    expect(normalizePhone("+٩٦٤٧٧٠١٢٣٤٥٦٧")).toBe("+9647701234567");
  });
});
