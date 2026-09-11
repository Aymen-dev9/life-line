import { z } from "zod";

// Request payload validation shared by the API route and tests.
// Latitude/longitude are the authoritative location; address text is optional.
export const requestSchema = z.object({
  name: z.string().trim().min(2).max(120),
  phone: z.string().regex(/^\+[1-9]\d{7,14}$/),
  kind: z.enum(["medical", "pharmacy"]),
  serviceId: z.string().max(100),
  medicine: z.string().trim().max(250),
  details: z.string().trim().max(4000),
  gender: z.enum(["male", "female", "any"]),
  consent: z.literal("true"),
  submissionKey: z.uuid(),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  formattedAddress: z.string().trim().max(500).optional().default(""),
  locationNotes: z.string().trim().max(1000).optional().default(""),
});

export type RequestInput = z.infer<typeof requestSchema>;
