import { describe, it, expect } from "vitest";
import { interpolate, defaultContent } from "./content";

describe("interpolate", () => {
  it("substitutes all WhatsApp template variables including the map link", () => {
    const message = interpolate(defaultContent["whatsapp.template"], {
      provider: "كادر التمريض",
      service: "سحب دم",
      name: "أحمد",
      phone: "+9647701234567",
      address: "بغداد، الكرادة",
      map: "https://www.google.com/maps?q=33.31,44.36",
      details: "الحالة مستقرة",
    });
    expect(message).toContain("كادر التمريض");
    expect(message).toContain("https://www.google.com/maps?q=33.31,44.36");
    expect(message).not.toContain("{map}");
    expect(message).not.toContain("{provider}");
  });

  it("leaves unknown placeholders untouched", () => {
    expect(interpolate("hi {unknown}", {})).toBe("hi {unknown}");
  });

  it("default template keeps the operational variables", () => {
    for (const key of ["provider", "service", "name", "phone", "address", "details"]) {
      expect(defaultContent["whatsapp.template"]).toContain(`{${key}}`);
    }
  });
});
