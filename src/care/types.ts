export type Role = "patient" | "admin";
export type Profile = { name: string; phone: string; address: string };
export type Account = Profile & { id: string; role: Role; demo: boolean };
export type Service = { id: string; name: string; active: boolean };
export type Provider = { id: string; name: string; phone: string; gender: "male" | "female"; active: boolean };
export type Client = { id: string; fullName: string; phone: string; gender: "male" | "female" | null; age: number | null };
export type RequestStatus = "pending" | "approved" | "forwarded" | "completed" | "cancelled";
export type Admin = { id: string; name: string; username: string | null; active: boolean };
export type RequestRecord = Profile & {
  id: string; reference: string; kind: "medical" | "pharmacy"; serviceId: string | null;
  serviceName: string; medicine: string; details: string; gender: "male" | "female" | "any";
  latitude: number | null; longitude: number | null; formattedAddress: string | null; locationNotes: string;
  status: RequestStatus; createdAt: string;
  providerId: string | null; clientId: string | null; ownerAdminId: string | null; ownerAdminName: string | null;
  attachment: boolean; paid: boolean;
};
export type Payment = { id: string; requestId: string; reference: string; serviceName: string; providerId: string; providerName: string; requestDate: string; paidAt: string; amount: number | null };
export type WorkspaceData = { user: Account; services: Service[]; providers: Provider[]; admins: Admin[]; requests: RequestRecord[]; payments: Payment[] };

// Admin operations / reports payloads (from /api/care/reports).
export type ClientSearchRow = { id: string; fullName: string; phone: string; gender: "male" | "female" | null; age: number | null; requestCount: number; lastAt: string | null };
export type ClientReportRequest = { id: string; reference: string; kind: string; serviceName: string; status: RequestStatus; medicine: string; details: string; createdAt: string; attachment: boolean; formattedAddress: string | null; locationNotes: string; providerName: string | null; ownerAdmin: string | null };
export type ClientReport = { client: { id: string; fullName: string; phone: string; gender: string | null; age: number | null; createdAt: string } | null; requests: ClientReportRequest[] };
export type AdminUser = { id: string; name: string; username: string | null; active: boolean; lastLoginAt: string | null; activeRequests: number; completedRequests: number };
export type HistoryEntry = { status?: string; reason?: string; note?: string; at: string; by?: string | null; from?: string | null; to?: string | null };
export type RequestHistory = { created: string; status: HistoryEntry[]; ownership: HistoryEntry[] };
