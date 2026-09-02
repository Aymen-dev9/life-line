export const appConfig = {
  brand: {
    nameAr: process.env.APP_NAME_AR ?? "منصة الرعاية",
    nameEn: process.env.APP_NAME_EN ?? "Care Platform",
    mark: "CP"
  },
  market: {
    country: process.env.APP_COUNTRY ?? "IQ",
    timezone: process.env.APP_TIMEZONE ?? "Asia/Baghdad",
    currency: process.env.APP_CURRENCY ?? "IQD",
    defaultLocale: process.env.APP_DEFAULT_LOCALE === "en" ? "en" : "ar"
  },
  emergency: {
    phone: process.env.EMERGENCY_CONTACT_PHONE ?? "",
    labelAr: process.env.EMERGENCY_CONTACT_LABEL_AR ?? "اتصل بخدمات الطوارئ المحلية",
    labelEn: process.env.EMERGENCY_CONTACT_LABEL_EN ?? "Call your local emergency service"
  }
} as const;

export type Locale = "ar" | "en";

