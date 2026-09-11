import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { z } from "zod";
import { checkOrigin, errorResponse, json, requireAccount } from "@/care/server/auth";
import { CareError, rpcError } from "@/care/server/supabase";
import { getContent } from "@/care/server/content-data";
import { requestSchema } from "@/care/validation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const { account, supabase } = await requireAccount();
    const { error: limitError } = await supabase.rpc("rate_limit", { p_key: `request:${account.id}`, p_max: 20, p_seconds: 600 });
    if (limitError) throw rpcError(limitError, "RATE_LIMIT", 429);

    // Bound the stream before multipart parsing; never trust Content-Length alone.
    const reader = request.body?.getReader(); if (!reader) throw new CareError("INVALID", 422);
    const chunks: Uint8Array[] = []; let length = 0;
    while (true) { const part = await reader.read(); if (part.done) break; length += part.value.length; if (length > 6 * 1024 * 1024) { await reader.cancel(); throw new CareError("FILE", 413); } chunks.push(part.value); }
    const form = await new Response(Buffer.concat(chunks), { headers: { "Content-Type": request.headers.get("content-type") || "" } }).formData();
    const body = requestSchema.parse(Object.fromEntries([...form.entries()].filter(([key]) => key !== "image")));

    const serviceId = body.kind === "medical" ? z.uuid().parse(body.serviceId) : null;

    // Idempotency: return the earlier request if this submission was already stored.
    const { data: existing } = await supabase.from("requests").select("id, reference").eq("submission_key", body.submissionKey).maybeSingle();
    if (existing) return json({ id: existing.id, reference: existing.reference });

    const requestId = randomUUID();
    let attachmentPath: string | null = null;
    const file = form.get("image");
    if (file instanceof File && file.size) {
      if (file.size > 5 * 1024 * 1024 || !["image/jpeg", "image/png", "image/webp"].includes(file.type)) throw new CareError("FILE", 422);
      let webp: Buffer;
      try {
        const raw = Buffer.from(await file.arrayBuffer());
        const metadata = await sharp(raw, { limitInputPixels: 25000000 }).metadata();
        if (!["jpeg", "png", "webp"].includes(metadata.format || "") || (metadata.pages || 1) > 1) throw new Error("unsupported");
        webp = await sharp(raw, { limitInputPixels: 25000000 }).rotate().resize({ width: 1800, height: 1800, fit: "inside", withoutEnlargement: true }).webp({ quality: 85 }).toBuffer();
      } catch { throw new CareError("FILE", 422); }
      attachmentPath = `${account.id}/${requestId}.webp`;
      const upload = await supabase.storage.from("prescriptions").upload(attachmentPath, webp, { contentType: "image/webp", upsert: true });
      if (upload.error) throw new CareError("FILE", 422);
    }

    const pharmacyLabel = body.kind === "pharmacy" ? (await getContent()).values["nav.pharmacy"] : "";
    const { data, error } = await supabase.rpc("create_request", {
      p_id: requestId,
      p_kind: body.kind,
      p_service_id: serviceId,
      p_pharmacy_label: pharmacyLabel,
      p_name: body.name,
      p_phone: body.phone,
      p_address: body.formattedAddress || body.locationNotes || "",
      p_details: body.details,
      p_medicine: body.medicine,
      p_gender: body.gender,
      p_latitude: body.latitude,
      p_longitude: body.longitude,
      p_formatted_address: body.formattedAddress || null,
      p_location_notes: body.locationNotes,
      p_attachment_path: attachmentPath,
      p_submission_key: body.submissionKey,
    });
    if (error) {
      // Roll back an orphaned upload if the insert was rejected.
      if (attachmentPath) await supabase.storage.from("prescriptions").remove([attachmentPath]);
      throw rpcError(error);
    }
    const result = data as { id: string; reference: string };
    return json({ id: result.id, reference: result.reference }, 201);
  } catch (error) { return errorResponse(error); }
}
