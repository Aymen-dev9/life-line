import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { z } from "zod";
import { checkOrigin, errorResponse, json } from "@/care/server/auth";
import { CareError, rpcError, supabaseAnon } from "@/care/server/supabase";
import { getContent } from "@/care/server/content-data";
import { publicRequestSchema } from "@/care/validation";
import { normalizePhone } from "@/care/client";

export const runtime = "nodejs";

// Public booking endpoint — NO authentication. A client submits a request without an
// account; the request is linked to a phone-keyed client record inside the RPC. Protected
// fields (status / providerId / ownerAdminId) are never accepted from the client.
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const supabase = supabaseAnon();

    // Spam control: rate-limit by caller IP (and, once known, by phone). Anonymous callers
    // may execute rate_limit() (granted to anon).
    const ip = (request.headers.get("x-forwarded-for") || "").split(",")[0]?.trim() || "unknown";
    const { error: ipError } = await supabase.rpc("rate_limit", { p_key: `public-request:ip:${ip}`, p_max: 12, p_seconds: 600 });
    if (ipError) throw rpcError(ipError, "RATE_LIMIT", 429);

    // Bound the stream before multipart parsing; never trust Content-Length alone.
    const reader = request.body?.getReader(); if (!reader) throw new CareError("INVALID", 422);
    const chunks: Uint8Array[] = []; let length = 0;
    while (true) { const part = await reader.read(); if (part.done) break; length += part.value.length; if (length > 6 * 1024 * 1024) { await reader.cancel(); throw new CareError("FILE", 413); } chunks.push(part.value); }
    const form = await new Response(Buffer.concat(chunks), { headers: { "Content-Type": request.headers.get("content-type") || "" } }).formData();

    const entries = Object.fromEntries([...form.entries()].filter(([key]) => key !== "image")) as Record<string, string>;
    entries.phone = normalizePhone(String(entries.phone ?? ""));
    const body = publicRequestSchema.parse(entries);

    const phone = normalizePhone(body.phone);
    const { error: phoneError } = await supabase.rpc("rate_limit", { p_key: `public-request:phone:${phone}`, p_max: 6, p_seconds: 600 });
    if (phoneError) throw rpcError(phoneError, "RATE_LIMIT", 429);

    const serviceId = body.kind === "medical" ? z.uuid().parse(body.serviceId) : null;

    // Idempotency: return the earlier request if this submission was already stored.
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
      attachmentPath = `public/${requestId}.webp`;
      const upload = await supabase.storage.from("prescriptions").upload(attachmentPath, webp, { contentType: "image/webp", upsert: true });
      if (upload.error) throw new CareError("FILE", 422);
    }

    const pharmacyLabel = body.kind === "pharmacy" ? (await getContent()).values["nav.pharmacy"] : "";
    const { data, error } = await supabase.rpc("create_public_request", {
      p_id: requestId,
      p_kind: body.kind,
      p_service_id: serviceId,
      p_pharmacy_label: pharmacyLabel,
      p_name: body.name,
      p_phone: phone,
      p_gender_pref: body.gender,
      p_client_gender: body.clientGender ?? "",
      p_client_age: body.age ?? null,
      p_details: body.details,
      p_medicine: body.medicine,
      p_latitude: body.latitude,
      p_longitude: body.longitude,
      p_formatted_address: body.formattedAddress || null,
      p_location_notes: body.locationNotes,
      p_attachment_path: attachmentPath,
      p_submission_key: body.submissionKey,
    });
    if (error) {
      if (attachmentPath) await supabase.storage.from("prescriptions").remove([attachmentPath]);
      throw rpcError(error);
    }
    const result = data as { id: string; reference: string };
    return json({ id: result.id, reference: result.reference }, 201);
  } catch (error) { return errorResponse(error); }
}
