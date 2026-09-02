export type DeliveryResult = {
  state: "simulated" | "queued" | "sent" | "failed";
  providerMessageId?: string;
};

export interface NotificationProvider {
  send(input: { recipient: string; template: string; variables: Record<string, string> }): Promise<DeliveryResult>;
}

export interface MapProvider {
  reverseGeocode(input: { latitude: number; longitude: number }): Promise<{ formattedAddress: string }>;
}

export interface ObjectStorageProvider {
  createUpload(input: { ownerId: string; mimeType: string; size: number }): Promise<{ objectKey: string; uploadUrl: string }>;
}

export interface PaymentProvider {
  createPayment(input: { reference: string; amount: number; currency: string }): Promise<{ state: "pending" | "simulated"; reference: string }>;
}

