import { z } from "zod";
import { checkOrigin, errorResponse, json, readJson, requireAccount } from "@/care/server/auth";
import { CareError, rpcError } from "@/care/server/supabase";

export const runtime = "nodejs";

const phone = z.string().regex(/^\+[1-9]\d{7,14}$/);
const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("profile"), name: z.string().trim().min(2).max(120), phone, address: z.string().trim().max(1000) }),
  z.object({ action: z.literal("service"), id: z.string().optional(), name: z.string().trim().min(2).max(100), active: z.boolean() }),
  z.object({ action: z.literal("provider"), id: z.string().optional(), name: z.string().trim().min(2).max(120), phone, gender: z.enum(["male", "female"]), active: z.boolean() }),
  z.object({ action: z.literal("delete"), kind: z.enum(["provider", "service"]), id: z.uuid() }),
  z.object({ action: z.literal("forward"), id: z.uuid(), providerId: z.uuid() }),
  z.object({ action: z.literal("complete"), id: z.uuid() }),
  z.object({ action: z.literal("paid"), id: z.uuid(), amount: z.number().int().min(0).max(1000000000).nullable() }),
]);

async function workspace(supabase: Awaited<ReturnType<typeof requireAccount>>["supabase"]) {
  const { data, error } = await supabase.rpc("get_workspace");
  if (error || !data) throw rpcError(error);
  return data;
}

export async function GET() {
  try {
    const { supabase } = await requireAccount();
    return json(await workspace(supabase));
  } catch (error) { return errorResponse(error); }
}

export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const { account, supabase } = await requireAccount();
    const body = schema.parse(await readJson(request));
    if (body.action !== "profile" && account.role !== "admin") throw new CareError("FORBIDDEN", 403);

    let error;
    switch (body.action) {
      case "profile": ({ error } = await supabase.rpc("update_profile", { p_name: body.name, p_phone: body.phone, p_address: body.address })); break;
      case "service": ({ error } = await supabase.rpc("upsert_service", { p_id: body.id ?? null, p_name: body.name, p_active: body.active })); break;
      case "provider": ({ error } = await supabase.rpc("upsert_provider", { p_id: body.id ?? null, p_name: body.name, p_phone: body.phone, p_gender: body.gender, p_active: body.active })); break;
      case "delete": ({ error } = await supabase.rpc("delete_catalog", { p_kind: body.kind, p_id: body.id })); break;
      case "forward": ({ error } = await supabase.rpc("forward_request", { p_id: body.id, p_provider_id: body.providerId })); break;
      case "complete": ({ error } = await supabase.rpc("complete_request", { p_id: body.id })); break;
      case "paid": ({ error } = await supabase.rpc("record_payment", { p_id: body.id, p_amount: body.amount })); break;
    }
    if (error) throw rpcError(error);
    return json(await workspace(supabase));
  } catch (error) { return errorResponse(error); }
}
