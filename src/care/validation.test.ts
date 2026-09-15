import { describe, it, expect } from "vitest";
import { requestSchema, publicRequestSchema } from "./validation";

const base = {
  name: "أحمد علي",
  phone: "+9647701234567",
  kind: "medical",
  serviceId: "11111111-1111-4111-8111-111111111111",
  medicine: "",
  details: "",
  gender: "any",
  consent: "true",
  submissionKey: "22222222-2222-4222-8222-222222222222",
  latitude: "33.315",
  longitude: "44.366",
};

describe("requestSchema", () => {
  it("coerces string coordinates to numbers", () => {
    const parsed = requestSchema.parse(base);
    expect(parsed.latitude).toBeCloseTo(33.315);
    expect(parsed.longitude).toBeCloseTo(44.366);
    expect(typeof parsed.latitude).toBe("number");
  });

  it("rejects out-of-range latitude/longitude", () => {
    expect(() => requestSchema.parse({ ...base, latitude: "120" })).toThrow();
    expect(() => requestSchema.parse({ ...base, longitude: "-200" })).toThrow();
  });

  it("requires the consent literal", () => {
    expect(() => requestSchema.parse({ ...base, consent: "false" })).toThrow();
  });

  it("requires an international phone number", () => {
    expect(() => requestSchema.parse({ ...base, phone: "07701234567" })).toThrow();
  });

  it("defaults optional location text to empty strings", () => {
    const parsed = requestSchema.parse(base);
    expect(parsed.formattedAddress).toBe("");
    expect(parsed.locationNotes).toBe("");
  });
});

describe("publicRequestSchema", () => {
  it("treats empty client demographics as undefined", () => {
    const parsed = publicRequestSchema.parse({ ...base, clientGender: "", age: "" });
    expect(parsed.clientGender).toBeUndefined();
    expect(parsed.age).toBeUndefined();
  });

  it("coerces and accepts client gender and age when provided", () => {
    const parsed = publicRequestSchema.parse({ ...base, clientGender: "female", age: "45" });
    expect(parsed.clientGender).toBe("female");
    expect(parsed.age).toBe(45);
  });

  it("rejects an out-of-range age", () => {
    expect(() => publicRequestSchema.parse({ ...base, age: "300" })).toThrow();
  });
});
