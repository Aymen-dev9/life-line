export type LocalizedText = { ar: string; en: string };

export type IntakeOption = {
  value: string;
  label: LocalizedText;
};

export type IntakeCondition = {
  questionId: string;
  operator: "equals" | "includes";
  value: string | boolean;
};

export type IntakeQuestion = {
  id: string;
  type: "yes_no" | "single_choice" | "multi_choice" | "text" | "consent";
  label: LocalizedText;
  help?: LocalizedText;
  required: boolean;
  options?: IntakeOption[];
  condition?: IntakeCondition;
  safety?: "red_flag";
};

export type ServiceDefinition = {
  id: string;
  slug: string;
  category: string;
  name: LocalizedText;
  description: LocalizedText;
  estimatedDurationMinutes: number;
  basePrice: number;
  currency: string;
  requiredProfession: "NURSE" | "DOCTOR" | "PHLEBOTOMIST";
  requiredSkills: string[];
  supportsGenderPreference: boolean;
  requiresLocation: boolean;
  enabled: boolean;
  questions: IntakeQuestion[];
};

export function isQuestionVisible(
  question: IntakeQuestion,
  answers: Record<string, unknown>
): boolean {
  if (!question.condition) return true;
  const actual = answers[question.condition.questionId];
  return question.condition.operator === "includes"
    ? Array.isArray(actual) && actual.includes(question.condition.value)
    : actual === question.condition.value;
}

export function hasEmergencyRedFlag(
  service: ServiceDefinition,
  answers: Record<string, unknown>
): boolean {
  return service.questions.some((question) => {
    if (question.safety !== "red_flag" || !isQuestionVisible(question, answers)) return false;
    const answer = answers[question.id];
    return answer === true || (Array.isArray(answer) && answer.length > 0);
  });
}

