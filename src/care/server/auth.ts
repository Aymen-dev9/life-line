import { NextResponse } from "next/server";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { CareError, supabaseServer } from "./supabase";
import type { Account } from "../types";

export { CareError } from "./supabase";

// Resolve the signed-in account from the Supabase session (JWT validated by getUser).
// Returns the cookie-bound client too so callers can run authenticated RPCs/storage ops.
export async function currentAccount(): Promise<{ account: Account; supabase: SupabaseClient } | null> {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from("profiles").select("id, role, name, phone, address").eq("id", user.id).maybeSingle();
  if (!data) return null;
  const account: Account = { id: data.id, role: data.role, name: data.name ?? "", phone: data.phone ?? "", address: data.address ?? "", demo: false };
  return { account, supabase };
}

export async function requireAccount(admin = false): Promise<{ account: Account; supabase: SupabaseClient }> {
  const context = await currentAccount();
  if (!context) throw new CareError("UNAUTHORIZED", 401);
  if (admin && context.account.role !== "admin") throw new CareError("FORBIDDEN", 403);
  return context;
}

// Same-origin CSRF guard for state-changing requests.
export function checkOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const allowed = process.env.CARE_APP_ORIGIN || new URL(request.url).origin;
  if (origin !== allowed || request.headers.get("sec-fetch-site") === "cross-site") throw new CareError("FORBIDDEN", 403);
}

export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: { "Cache-Control": "no-store, private", "Vary": "Cookie" } });
}

export function errorResponse(error: unknown) {
  if (error instanceof CareError) return json({ error: error.code }, error.status);
  if (error instanceof z.ZodError) return json({ error: "INVALID" }, 422);
  return json({ error: "UNAVAILABLE" }, 503);
}

export async function readJson(request: Request) {
  const reader = request.body?.getReader();
  if (!reader) throw new CareError("INVALID", 422);
  let size = 0; const chunks: Uint8Array[] = [];
  while (true) {
    const part = await reader.read(); if (part.done) break;
    size += part.value.byteLength;
    if (size > 1024 * 1024) { await reader.cancel(); throw new CareError("INVALID", 413); }
    chunks.push(part.value);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString()) as unknown; } catch { throw new CareError("INVALID", 422); }
}
