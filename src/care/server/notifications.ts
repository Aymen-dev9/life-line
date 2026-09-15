// WhatsApp notification service. Abstracted so a real provider can be plugged in later via
// env vars; until then a Mock provider is used. Sending never throws to the caller — a
// failure is returned as a status so the core workflow (approve/forward) is never blocked.

export type NotifyAudience = "client" | "provider";
export type NotifyStatus = "sent" | "failed" | "mock";
export type NotifyResult = { status: NotifyStatus; detail: string };

type NotifyInput = { to: string; message: string };

interface WhatsAppProvider {
  readonly name: string;
  send(input: NotifyInput): Promise<NotifyResult>;
}

// Mock provider — records intent without contacting an external service.
const mockProvider: WhatsAppProvider = {
  name: "mock",
  async send({ to }) {
    return { status: "mock", detail: `mock:${to}` };
  },
};

// A real provider would live here (e.g. Meta Cloud API / Twilio) and read credentials from
// env. If credentials are absent we fall back to the mock provider.
function resolveProvider(): WhatsAppProvider {
  const token = process.env.WHATSAPP_API_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_ID;
  if (!token || !phoneId) return mockProvider;
  // Placeholder for a real integration; kept as mock until wired to avoid silent failures.
  return mockProvider;
}

export async function sendWhatsApp(input: NotifyInput): Promise<NotifyResult> {
  try {
    return await resolveProvider().send(input);
  } catch (error) {
    return { status: "failed", detail: error instanceof Error ? error.message.slice(0, 200) : "error" };
  }
}

// Client-facing copy (no unnecessary clinical detail).
export function clientApprovedMessage(reference: string): string {
  return `تمت الموافقة على طلبك رقم ${reference} وسيتم التواصل معك قريباً.`;
}
export function clientAssignedMessage(reference: string): string {
  return `تم تحديد مقدم الخدمة لطلبك رقم ${reference}. سيتم التواصل معك لتنسيق الزيارة.`;
}
