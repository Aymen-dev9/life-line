import type { ServiceDefinition } from "./types";

export const homeNursingService: ServiceDefinition = {
  id: "service-home-nursing",
  slug: "home-nursing",
  category: "home-care",
  name: { ar: "تمريض منزلي", en: "Home nursing" },
  description: {
    ar: "زيارة تمريضية آمنة في منزل المريض",
    en: "Safe nursing care at the patient’s home"
  },
  estimatedDurationMinutes: 45,
  basePrice: 35000,
  currency: "IQD",
  requiredProfession: "NURSE",
  requiredSkills: ["HOME_NURSING", "VITAL_SIGNS"],
  supportsGenderPreference: true,
  requiresLocation: true,
  enabled: true,
  questions: [
    {
      id: "careReason",
      type: "single_choice",
      label: { ar: "ما نوع المساعدة المطلوبة؟", en: "What help is needed?" },
      required: true,
      options: [
        { value: "general", label: { ar: "رعاية تمريضية عامة", en: "General nursing care" } },
        { value: "postOp", label: { ar: "رعاية بعد عملية", en: "Post-operative care" } },
        { value: "elderly", label: { ar: "مساعدة لكبير السن", en: "Elderly support" } },
        { value: "vitals", label: { ar: "قياس العلامات الحيوية", en: "Vital signs check" } }
      ]
    },
    {
      id: "mobility",
      type: "single_choice",
      label: { ar: "هل يستطيع المريض الحركة؟", en: "Can the patient move independently?" },
      required: true,
      options: [
        { value: "independent", label: { ar: "نعم", en: "Yes" } },
        { value: "assisted", label: { ar: "بمساعدة", en: "With help" } },
        { value: "bedbound", label: { ar: "ملازم للفراش", en: "Bedbound" } }
      ]
    },
    {
      id: "emergencySigns",
      type: "multi_choice",
      label: { ar: "هل توجد أي من هذه العلامات الآن؟", en: "Are any of these happening now?" },
      help: {
        ar: "اختر فقط إذا كانت الحالة موجودة الآن",
        en: "Select only signs happening now"
      },
      required: false,
      safety: "red_flag",
      options: [
        { value: "breathing", label: { ar: "صعوبة شديدة في التنفس", en: "Severe breathing difficulty" } },
        { value: "unconscious", label: { ar: "فقدان الوعي", en: "Unconsciousness" } },
        { value: "bleeding", label: { ar: "نزف شديد لا يتوقف", en: "Severe uncontrolled bleeding" } },
        { value: "chestPain", label: { ar: "ألم شديد في الصدر", en: "Severe chest pain" } }
      ]
    },
    {
      id: "notes",
      type: "text",
      label: { ar: "هل هناك شيء آخر يجب أن يعرفه الممرض؟", en: "Anything else the nurse should know?" },
      required: false
    }
  ]
};

