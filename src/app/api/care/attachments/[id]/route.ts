import { z } from "zod";
import { errorResponse, requireAccount } from "@/care/server/auth";
import { CareError, rpcError } from "@/care/server/supabase";

export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { supabase } = await requireAccount();
    const { id } = await context.params;
    const requestId = z.uuid().parse(id);

    // Authorization is enforced in the RPC (owner or admin) and again by storage RLS.
    const { data: path, error } = await supabase.rpc("request_attachment_path", { p_id: requestId });
    if (error) throw rpcError(error, "NOT_FOUND", 404);
    if (!path) throw new CareError("NOT_FOUND", 404);

    const download = await supabase.storage.from("prescriptions").download(path as string);
    if (download.error || !download.data) throw new CareError("NOT_FOUND", 404);
    const bytes = new Uint8Array(await download.data.arrayBuffer());
    return new Response(bytes, {
      headers: {
        "Content-Type": "image/webp",
        "Cache-Control": "no-store, private",
        "Content-Disposition": "inline; filename=prescription.webp",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'; sandbox",
      },
    });
  } catch (error) { return errorResponse(error); }
}
