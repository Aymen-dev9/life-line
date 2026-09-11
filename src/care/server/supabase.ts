import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { CareError } from "./errors";

export { CareError, rpcError } from "./errors";

function credentials() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new CareError("AUTH_CONFIG", 503);
  return { url, key };
}

// Cookie-bound client: reads/writes the Supabase session cookies. Use for anything
// that depends on the signed-in user (getUser, authenticated RPCs, OTP verify, logout).
// Session mutations happen in Route Handlers / Server Actions / middleware; in a plain
// Server Component the cookie writes are swallowed and refreshed by middleware instead.
export async function supabaseServer(): Promise<SupabaseClient> {
  const store = await cookies();
  const { url, key } = credentials();
  return createServerClient(url, key, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try { list.forEach(({ name, value, options }) => store.set(name, value, options)); } catch { /* Server Component: refreshed by middleware */ }
      },
    },
  });
}

// Stateless anonymous client for public reads (content) and OTP dispatch.
export function supabaseAnon(): SupabaseClient {
  const { url, key } = credentials();
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
}

