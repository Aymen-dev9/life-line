import { z } from "zod";

export const iraqiPhoneSchema = z.string().transform(normalizeIraqiPhone).pipe(
  z.string().regex(/^\+9647\d{9}$/, "INVALID_IRAQI_MOBILE")
);

export function normalizeIraqiPhone(input: string): string {
  const digits = input.replace(/[^0-9+]/g, "");
  if (digits.startsWith("+964")) return `+964${digits.slice(4).replace(/\D/g, "")}`;
  if (digits.startsWith("00964")) return `+964${digits.slice(5)}`;
  if (digits.startsWith("964")) return `+${digits}`;
  if (digits.startsWith("07")) return `+964${digits.slice(1)}`;
  if (digits.startsWith("7")) return `+964${digits}`;
  return digits;
}

