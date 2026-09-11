export type Role = "patient" | "admin";
export type Profile = { name: string; phone: string; address: string };
export type Account = Profile & { id: string; role: Role; demo: boolean };
export type Service = { id: string; name: string; active: boolean };
export type Provider = { id: string; name: string; phone: string; gender: "male" | "female"; active: boolean };
export type RequestRecord = Profile & {
  id: string; reference: string; kind: "medical" | "pharmacy"; serviceId: string | null;
  serviceName: string; medicine: string; details: string; gender: "male" | "female" | "any";
  latitude: number | null; longitude: number | null; formattedAddress: string | null; locationNotes: string;
  status: "pending" | "forwarded" | "completed"; createdAt: string;
  providerId: string | null; attachment: boolean; paid: boolean;
};
export type Payment = { id: string; requestId: string; reference: string; serviceName: string; providerId: string; providerName: string; requestDate: string; paidAt: string; amount: number | null };
export type WorkspaceData = { user: Account; services: Service[]; providers: Provider[]; requests: RequestRecord[]; payments: Payment[] };
