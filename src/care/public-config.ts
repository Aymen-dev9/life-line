// Public Supabase configuration.
//
// NEXT_PUBLIC_* values are inlined at build time. When a host injects them (e.g. Vercel
// project env vars) those win. The fallbacks below are the project's PUBLIC publishable
// key + URL — safe to embed in source (they are shipped to every browser anyway; all
// authorization is enforced by RLS + SECURITY DEFINER RPCs). They keep the app working
// on hosts that do not read committed .env files.
// `||` (not `??`) so an empty-string env value also falls back to the public default.
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://crwapkwvqappomsliass.supabase.co";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_kLR6ZtubJ588z6f68_fX6Q_jus5fxNt";
