import { z } from "zod";
import { checkOrigin, errorResponse, json, readJson } from "@/care/server/auth";
import { CareError, rpcError, supabaseAnon, supabaseServer } from "@/care/server/supabase";

export const runtime = "nodejs";

const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("logout") }),
  z.object({ action: z.literal("password"), email: z.string().trim().max(254), password: z.string().min(1).max(200) }),
  z.object({
    action: z.enum(["send", "verify"]),
    channel: z.enum(["email", "whatsapp"]),
    identifier: z.string().trim().max(254),
    token: z.string().regex(/^\d{6,10}$/).optional(),
  }),
]);

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

    // Email + password sign-in (fixed test accounts on the free plan). OTP stays intact.
    if (body.action === "password") {
      const email = z.email().parse(body.email).toLowerCase();
      await rateLimit(`auth:password:${email}`, 10, 600);
      await rateLimit("auth-global:password", 300, 600);
      const supabase = await supabaseServer();
      const { data, error } = await supabase.auth.signInWithPassword({ email, password: body.password });
      if (error || !data.user || !data.session) throw new CareError("CREDENTIALS", 401);
      const { data: profile, error: syncError } = await supabase.rpc("sync_profile");
      if (syncError) throw rpcError(syncError);
      const role = (profile as { role?: string } | null)?.role === "admin" ? "admin" : "patient";
      return json({ redirect: role === "admin" ? "/admin" : "/" });
    }

    const identifier = body.channel === "email"
      ? z.email().parse(body.identifier).toLowerCase()
      : z.string().regex(/^\+[1-9]\d{7,14}$/).parse(body.identifier);
    await rateLimit(`auth:${body.action}:${body.channel}:${identifier}`, body.action === "send" ? 3 : 8, 600);
    await rateLimit(`auth-global:${body.action}`, body.action === "send" ? 100 : 300, 600);

    if (body.action === "send") {
      const supabase = supabaseAnon();
      const { error } = body.channel === "email"
        ? await supabase.auth.signInWithOtp({ email: identifier })
        : await supabase.auth.signInWithOtp({ phone: identifier, options: { channel: "whatsapp" } });
      if (error) throw new CareError("UNAVAILABLE", 503);
      return json({ sent: true });
    }

    if (!body.token) throw new CareError("INVALID", 422);
    // Cookie-bound client so a successful verification persists the session.
    const supabase = await supabaseServer();
    const { data, error } = body.channel === "email"
      ? await supabase.auth.verifyOtp({ email: identifier, token: body.token, type: "email" })
      : await supabase.auth.verifyOtp({ phone: identifier, token: body.token, type: "sms" });
    if (error || !data.user || !data.session) throw new CareError("OTP", 401);

    // Ensure the profile exists and re-derive the admin role from the verified email.
    const { data: profile, error: syncError } = await supabase.rpc("sync_profile");
    if (syncError) throw rpcError(syncError);
    const role = (profile as { role?: string } | null)?.role === "admin" ? "admin" : "patient";
    return json({ redirect: role === "admin" ? "/admin" : "/" });
  } catch (error) { return errorResponse(error); }
}
