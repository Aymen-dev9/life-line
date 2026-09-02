import { describe, expect, it } from "vitest";
import { iraqiPhoneSchema, normalizeIraqiPhone } from "./phone";

describe("Iraqi phone normalization", () => {
  it.each([
    ["0770 123 4567", "+9647701234567"],
    ["7701234567", "+9647701234567"],
    ["00964 770 123 4567", "+9647701234567"],
    ["+964-770-123-4567", "+9647701234567"]
  ])("normalizes %s", (input, expected) => expect(normalizeIraqiPhone(input)).toBe(expected));

  it("rejects invalid Iraqi mobile numbers", () => {
    expect(iraqiPhoneSchema.safeParse("12345").success).toBe(false);
  });
});

