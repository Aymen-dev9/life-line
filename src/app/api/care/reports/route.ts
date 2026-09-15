import { z } from "zod";
import { checkOrigin, errorResponse, json, readJson, requireAccount } from "@/care/server/auth";
import { rpcError } from "@/care/server/supabase";

export const runtime = "nodejs";

// Admin-only read operations: client lookup, per-client report, admin roster, request
// timeline, and system backup. All authorization is enforced inside the RPCs (is_admin()).
const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("searchClients"), query: z.string().trim().max(120) }),
  z.object({ action: z.literal("clientReport"), clientId: z.uuid() }),
  z.object({ action: z.literal("admins") }),
  z.object({ action: z.literal("history"), id: z.uuid() }),
  z.object({ action: z.literal("backup") }),
]);

export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const { supabase } = await requireAccount(true);
    const body = schema.parse(await readJson(request));

    let data, error;
    switch (body.action) {
      case "searchClients": ({ data, error } = await supabase.rpc("search_clients", { p_query: body.query })); break;
      case "clientReport": ({ data, error } = await supabase.rpc("client_report", { p_client_id: body.clientId })); break;
      case "admins": ({ data, error } = await supabase.rpc("get_admins")); break;
      case "history": ({ data, error } = await supabase.rpc("request_history", { p_id: body.id })); break;
      case "backup": ({ data, error } = await supabase.rpc("export_backup")); break;
    }
    if (error) throw rpcError(error);
    return json({ data });
  } catch (error) { return errorResponse(error); }
}
