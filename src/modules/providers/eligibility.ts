import type { ServiceDefinition } from "@/modules/catalog/types";

export type GenderPreference = "FEMALE" | "MALE" | "NO_PREFERENCE";

export type Provider = {
  id: string;
  name: { ar: string; en: string };
  gender: "FEMALE" | "MALE";
  profession: "NURSE" | "DOCTOR" | "PHLEBOTOMIST";
  skills: string[];
  verificationStatus: "VERIFIED" | "PENDING" | "SUSPENDED";
  operationalState: "AVAILABLE" | "BUSY" | "OFFLINE";
  zoneIds: string[];
  rating: number;
};

export type EligibilityResult = { eligible: true; reasons: string[] } | { eligible: false; reasons: string[] };

export function evaluateProviderEligibility(input: {
  provider: Provider;
  service: ServiceDefinition;
  genderPreference: GenderPreference;
  zoneId: string;
}): EligibilityResult {
  const reasons: string[] = [];
  const { provider, service, genderPreference, zoneId } = input;
  if (provider.verificationStatus !== "VERIFIED") reasons.push("PROVIDER_NOT_VERIFIED");
  if (provider.operationalState !== "AVAILABLE") reasons.push("PROVIDER_NOT_AVAILABLE");
  if (provider.profession !== service.requiredProfession) reasons.push("PROFESSION_MISMATCH");
  if (!service.requiredSkills.every((skill) => provider.skills.includes(skill))) reasons.push("MISSING_SKILL");
  if (!provider.zoneIds.includes(zoneId)) reasons.push("OUTSIDE_SERVICE_ZONE");
  if (genderPreference !== "NO_PREFERENCE" && provider.gender !== genderPreference) reasons.push("GENDER_PREFERENCE_MISMATCH");
  return reasons.length === 0 ? { eligible: true, reasons: ["CLINICALLY_ELIGIBLE"] } : { eligible: false, reasons };
}

