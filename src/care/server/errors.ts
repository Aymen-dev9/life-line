// Error vocabulary shared by the API layer. Kept dependency-free so it can be unit tested.
export class CareError extends Error {
  constructor(public code: string, public status = 400) { super(code); }
}

const KNOWN = new Set(["UNAUTHORIZED", "FORBIDDEN", "NOT_FOUND", "CONFLICT", "INVALID", "MEDICINE", "RATE_LIMIT", "TEMPLATE", "AUTH_CONFIG", "OTP", "FILE"]);
const STATUS: Record<string, number> = { UNAUTHORIZED: 401, FORBIDDEN: 403, NOT_FOUND: 404, CONFLICT: 409, RATE_LIMIT: 429, AUTH_CONFIG: 503, UNAVAILABLE: 503, OTP: 401 };

// Maps a PostgREST/RPC error into the app's error codes. RPCs raise bare codes like
// FORBIDDEN / CONFLICT / NOT_FOUND / RATE_LIMIT which pass straight through.
export function rpcError(error: { message?: string } | null | undefined, fallback = "UNAVAILABLE", status = 400): CareError {
  const raw = (error?.message || "").trim();
  const match = KNOWN.has(raw) ? raw : ([...KNOWN].find(code => raw.includes(code)) ?? fallback);
  return new CareError(match, STATUS[match] ?? status);
}
