import { describe, expect, it } from "vitest";
import { homeNursingService } from "@/modules/catalog/home-nursing";
import { evaluateProviderEligibility, type Provider } from "./eligibility";

const provider: Provider = {
  id: "p1",
  name: { ar: "نور", en: "Noor" },
  gender: "FEMALE",
  profession: "NURSE",
  skills: ["HOME_NURSING", "VITAL_SIGNS"],
  verificationStatus: "VERIFIED",
  operationalState: "AVAILABLE",
  zoneIds: ["baghdad-central"],
  rating: 4.9
};

describe("provider eligibility", () => {
  it("requires profession, verified skills, status, zone, and preference", () => {
    expect(evaluateProviderEligibility({ provider, service: homeNursingService, genderPreference: "FEMALE", zoneId: "baghdad-central" }).eligible).toBe(true);
    const result = evaluateProviderEligibility({ provider: { ...provider, verificationStatus: "PENDING", skills: ["HOME_NURSING"] }, service: homeNursingService, genderPreference: "MALE", zoneId: "basra" });
    expect(result).toEqual({ eligible: false, reasons: expect.arrayContaining(["PROVIDER_NOT_VERIFIED", "MISSING_SKILL", "OUTSIDE_SERVICE_ZONE", "GENDER_PREFERENCE_MISMATCH"]) });
  });
});

