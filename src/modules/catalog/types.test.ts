import { describe, expect, it } from "vitest";
import { homeNursingService } from "./home-nursing";
import { hasEmergencyRedFlag, isQuestionVisible, type IntakeQuestion } from "./types";

describe("dynamic intake", () => {
  it("evaluates conditional questions without frontend-specific logic", () => {
    const question: IntakeQuestion = {
      id: "upload",
      type: "text",
      label: { ar: "رفع", en: "Upload" },
      required: true,
      condition: { questionId: "hasOrder", operator: "equals", value: true }
    };
    expect(isQuestionVisible(question, { hasOrder: false })).toBe(false);
    expect(isQuestionVisible(question, { hasOrder: true })).toBe(true);
  });

  it("interrupts routine booking when a configured red flag is selected", () => {
    expect(hasEmergencyRedFlag(homeNursingService, { emergencySigns: [] })).toBe(false);
    expect(hasEmergencyRedFlag(homeNursingService, { emergencySigns: ["breathing"] })).toBe(true);
  });
});

