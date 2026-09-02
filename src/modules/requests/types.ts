import type { GenderPreference, Provider } from "@/modules/providers/eligibility";
import type { RequestStatus } from "./state-machine";

export type Patient = {
  id: string;
  name: { ar: string; en: string };
  relationship: "SELF" | "MOTHER" | "FATHER" | "CHILD" | "SPOUSE" | "OTHER";
  age: number;
};

export type Address = {
  id: string;
  label: { ar: string; en: string };
  city: string;
  district: string;
  landmark: string;
  instructions: string;
  latitude: number;
  longitude: number;
  zoneId: string;
};

export type TimelineEvent = {
  id: string;
  type: string;
  occurredAt: string;
  title: { ar: string; en: string };
  detail?: { ar: string; en: string };
};

export type Notification = {
  id: string;
  event: string;
  createdAt: string;
  title: { ar: string; en: string };
  body: { ar: string; en: string };
  read: boolean;
};

export type VisitRecord = {
  startedAt: string;
  completedAt?: string;
  vitals?: { systolic: number; diastolic: number; heartRate: number; temperature: number; spo2: number };
  clinicalNote?: string;
  followUpRequired?: boolean;
};

export type CareRequest = {
  id: string;
  reference: string;
  caseId: string;
  caseReference: string;
  patientId: string;
  serviceId: string;
  answers: Record<string, unknown>;
  genderPreference: GenderPreference;
  schedule: { type: "ASAP" | "SCHEDULED"; startAt?: string; window?: string };
  address: Address;
  status: RequestStatus;
  createdAt: string;
  assignedProviderId?: string;
  visit?: VisitRecord;
  timeline: TimelineEvent[];
  rating?: { overall: number; comment?: string };
};

export type DemoState = {
  account: { id: string; phone: string; name: { ar: string; en: string } };
  patients: Patient[];
  addresses: Address[];
  providers: Provider[];
  requests: CareRequest[];
  notifications: Notification[];
};

