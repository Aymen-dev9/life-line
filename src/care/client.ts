import type { ContentKey } from "./content";
export class ApiError extends Error { constructor(public code: string) { super(code); } }
export async function api<T>(url: string, options?: RequestInit): Promise<T> {
  let response: Response;
  try { response = await fetch(url, { ...options, cache: "no-store" }); } catch { throw new ApiError("NETWORK"); }
  const body = await response.json();
  if (!response.ok) throw new ApiError(body.error || "UNAVAILABLE");
  return body as T;
}
export function errorKey(error: unknown): ContentKey {
  const code = error instanceof ApiError ? error.code : "NETWORK";
  return `error.${code}` as ContentKey;
}
export function normalizePhone(value: string) {
  return value.trim().replace(/[٠-٩]/g, digit => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit))).replace(/[\s()-]/g, "");
}
export const dateLabel = (value: string) => new Intl.DateTimeFormat("ar-IQ", { dateStyle: "medium", timeZone: "Asia/Baghdad" }).format(new Date(value));
export const localDate = (value: string) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Baghdad", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(value));
