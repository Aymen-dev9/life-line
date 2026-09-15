import { z } from "zod";
import { checkOrigin, errorResponse, json, readJson } from "@/care/server/auth";
import { CareError, rpcError, supabaseAnon, supabaseServer } from "@/care/server/supabase";

export const runtime = "nodejs";

// Admin-only authentication. Clients never authenticate — booking is public. Admins sign in
// with a username (mapped to a fixed <username>@lifeline.local email) and password against
// Supabase Auth; a non-admin credential is rejected and its session torn down immediately.
const ADMIN_EMAIL_DOMAIN = "lifeline.local";

const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("logout") }),
  z.object({
    action: z.literal("admin"),
    username: z.string().trim().min(1).max(254),
    password: z.string().min(1).max(200),
  }),
  z.object({ action: z.literal("changePassword"), password: z.string().min(8).max(200) }),
]);

function usernameToEmail(username: string): string {
  const value = username.trim().toLowerCase();
  return value.includes("@") ? value : `${value}@${ADMIN_EMAIL_DOMAIN}`;
}

async function rateLimit(key: string, max: number, seconds: number) {
  const { error } = await supabaseAnon().rpc("rate_limit", { p_key: key, p_max: max, p_seconds: seconds });
  if (error) throw rpcError(error, "RATE_LIMIT", 429);
}

export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const body = schema.parse(await readJson(request));

    if (body.action === "logout") {
      const supabase = await supabaseServer();
      await supabase.auth.signOut();
      return json({ ok: true });
    }

    // Admin changes their own password (must be a signed-in admin).
    if (body.action === "changePassword") {
      const supabase = await supabaseServer();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new CareError("UNAUTHORIZED", 401);
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
      if (profile?.role !== "admin") throw new CareError("FORBIDDEN", 403);
      const { error } = await supabase.auth.updateUser({ password: body.password });
      if (error) throw new CareError("UNAVAILABLE", 503);
      return json({ ok: true });
    }

    // Admin sign-in.
    const email = usernameToEmail(body.username);
    await rateLimit(`auth:admin:${email}`, 10, 600);
    await rateLimit("auth-global:admin", 300, 600);

    const supabase = await supabaseServer();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password: body.password });
    if (error || !data.user || !data.session) throw new CareError("CREDENTIALS", 401);

    // Re-derive the role from the verified email allowlist. Reject (and sign out) non-admins.
    const { data: profile, error: syncError } = await supabase.rpc("sync_profile");
    if (syncError) throw rpcError(syncError);
    if ((profile as { role?: string } | null)?.role !== "admin") {
      await supabase.auth.signOut();
      throw new CareError("FORBIDDEN", 403);
    }
    return json({ redirect: "/admin" });
  } catch (error) { return errorResponse(error); }
}
