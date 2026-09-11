import { z } from "zod";
import { defaultContent } from "@/care/content";
import { checkOrigin, errorResponse, json, readJson, requireAccount } from "@/care/server/auth";
import { CareError, rpcError } from "@/care/server/supabase";
import { getContent } from "@/care/server/content-data";

export const runtime = "nodejs";

export async function GET() {
  try { return json(await getContent()); } catch (error) { return errorResponse(error); }
}

export async function PUT(request: Request) {
  try {
    checkOrigin(request);
    const { supabase } = await requireAccount(true);
    const body = z.object({
      revision: z.number().int().nonnegative(),
      values: z.record(z.string(), z.string().trim().min(1).max(4000)),
    }).parse(await readJson(request));

    const valid = new Set(Object.keys(defaultContent));
    if (Object.keys(body.values).some(key => !valid.has(key))) throw new CareError("INVALID", 422);
    const template = body.values["whatsapp.template"];
    if (template && ["provider", "service", "name", "phone", "address", "details"].some(key => !template.includes(`{${key}}`))) throw new CareError("TEMPLATE", 422);

    const { data, error } = await supabase.rpc("update_content", { p_values: body.values, p_revision: body.revision });
    if (error) throw rpcError(error);
    const stored = (data as { values?: Record<string, string>; revision?: number }) ?? {};
    return json({ values: { ...defaultContent, ...(stored.values ?? {}) }, revision: stored.revision ?? 0 });
  } catch (error) { return errorResponse(error); }
}
