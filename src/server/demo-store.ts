import { homeNursingService } from "@/modules/catalog/home-nursing";
import { hasEmergencyRedFlag } from "@/modules/catalog/types";
import { evaluateProviderEligibility, type GenderPreference } from "@/modules/providers/eligibility";
import { assertValidTransition, DomainError, type RequestStatus } from "@/modules/requests/state-machine";
import type { Address, CareRequest, DemoState, Notification, TimelineEvent } from "@/modules/requests/types";

type DemoRole = "PATIENT" | "DISPATCHER" | "NURSE";

function now(): string {
  return new Date().toISOString();
}

function id(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

function timeline(type: string, title: TimelineEvent["title"], detail?: TimelineEvent["detail"]): TimelineEvent {
  return { id: id("event"), type, occurredAt: now(), title, detail };
}

function createSeedState(): DemoState {
  return {
    account: { id: "account-caregiver", phone: "+9647701234567", name: { ar: "سارة كريم", en: "Sara Kareem" } },
    patients: [
      { id: "patient-sara", name: { ar: "سارة كريم", en: "Sara Kareem" }, relationship: "SELF", age: 31 },
      { id: "patient-mother", name: { ar: "أمينة حسن", en: "Amina Hassan" }, relationship: "MOTHER", age: 67 }
    ],
    addresses: [
      {
        id: "address-mother",
        label: { ar: "بيت أمي", en: "Mother’s home" },
        city: "Baghdad",
        district: "Al-Mansour",
        landmark: "Near Al-Dawoodi intersection",
        instructions: "Second building after the pharmacy, floor 1",
        latitude: 33.3152,
        longitude: 44.3661,
        zoneId: "baghdad-central"
      }
    ],
    providers: [
      {
        id: "provider-female-1",
        name: { ar: "نور علي", en: "Noor Ali" },
        gender: "FEMALE",
        profession: "NURSE",
        skills: ["HOME_NURSING", "VITAL_SIGNS", "WOUND_DRESSING"],
        verificationStatus: "VERIFIED",
        operationalState: "AVAILABLE",
        zoneIds: ["baghdad-central"],
        rating: 4.9
      },
      {
        id: "provider-male-1",
        name: { ar: "علي جاسم", en: "Ali Jasim" },
        gender: "MALE",
        profession: "NURSE",
        skills: ["HOME_NURSING", "VITAL_SIGNS"],
        verificationStatus: "VERIFIED",
        operationalState: "AVAILABLE",
        zoneIds: ["baghdad-central"],
        rating: 4.8
      },
      {
        id: "provider-ineligible",
        name: { ar: "مزود قيد التحقق", en: "Pending provider" },
        gender: "FEMALE",
        profession: "NURSE",
        skills: ["HOME_NURSING"],
        verificationStatus: "PENDING",
        operationalState: "AVAILABLE",
        zoneIds: ["baghdad-central"],
        rating: 0
      }
    ],
    requests: [],
    notifications: []
  };
}

const demoGlobal = globalThis as typeof globalThis & { __careDemoState?: DemoState };
export const demoState = demoGlobal.__careDemoState ?? createSeedState();
demoGlobal.__careDemoState = demoState;

export function getView(role: DemoRole, actorId: string): object {
  if (role === "PATIENT") {
    return {
      account: demoState.account,
      patients: demoState.patients,
      addresses: demoState.addresses,
      services: [homeNursingService],
      requests: demoState.requests,
      notifications: demoState.notifications
    };
  }
  if (role === "DISPATCHER") {
    return {
      requests: demoState.requests,
      providers: demoState.providers.map((provider) => ({
        ...provider,
        eligibilityByRequest: Object.fromEntries(
          demoState.requests.map((request) => [
            request.id,
            evaluateProviderEligibility({
              provider,
              service: homeNursingService,
              genderPreference: request.genderPreference,
              zoneId: request.address.zoneId
            })
          ])
        )
      }))
    };
  }
  const provider = demoState.providers.find((item) => item.id === actorId);
  if (!provider) throw new DomainError("PROVIDER_NOT_FOUND", 404);
  return {
    provider,
    requests: demoState.requests
      .filter((request) => request.assignedProviderId === actorId)
      .map((request) => ({ ...request, patient: demoState.patients.find((patient) => patient.id === request.patientId) }))
  };
}

function notify(event: string, title: Notification["title"], body: Notification["body"]): void {
  demoState.notifications.unshift({ id: id("notification"), event, createdAt: now(), title, body, read: false });
}

export function createRequest(input: {
  role: DemoRole;
  patientId: string;
  answers: Record<string, unknown>;
  genderPreference: GenderPreference;
  schedule: CareRequest["schedule"];
  address: Address;
}): CareRequest {
  if (input.role !== "PATIENT") throw new DomainError("FORBIDDEN", 403);
  if (!demoState.patients.some((patient) => patient.id === input.patientId)) throw new DomainError("PATIENT_ACCESS_DENIED", 403);
  if (hasEmergencyRedFlag(homeNursingService, input.answers)) throw new DomainError("EMERGENCY_GUIDANCE_REQUIRED", 422);
  const requiredMissing = homeNursingService.questions.some((question) => question.required && !input.answers[question.id]);
  if (requiredMissing) throw new DomainError("INTAKE_INCOMPLETE", 422);
  const sequence = String(demoState.requests.length + 1).padStart(6, "0");
  const createdAt = now();
  const request: CareRequest = {
    id: id("request"),
    reference: `REQ-2026-${sequence}`,
    caseId: id("case"),
    caseReference: `CASE-2026-${sequence}`,
    patientId: input.patientId,
    serviceId: homeNursingService.id,
    answers: input.answers,
    genderPreference: input.genderPreference,
    schedule: input.schedule,
    address: input.address,
    status: "PENDING_ASSIGNMENT",
    createdAt,
    timeline: [
      timeline("REQUEST_SUBMITTED", { ar: "تم استلام طلب الرعاية", en: "Care request received" }, { ar: "سيختار فريق العمليات ممرضاً مؤهلاً", en: "Operations will assign an eligible nurse" })
    ]
  };
  demoState.requests.unshift(request);
  notify("REQUEST_RECEIVED", { ar: "استلمنا طلبك", en: "We received your request" }, { ar: "سنخبرك عند تعيين الممرض", en: "We’ll let you know when a nurse is assigned" });
  return request;
}

export function assignProvider(input: { role: DemoRole; requestId: string; providerId: string }): CareRequest {
  if (input.role !== "DISPATCHER") throw new DomainError("FORBIDDEN", 403);
  const request = findRequest(input.requestId);
  const provider = demoState.providers.find((item) => item.id === input.providerId);
  if (!provider) throw new DomainError("PROVIDER_NOT_FOUND", 404);
  const eligibility = evaluateProviderEligibility({ provider, service: homeNursingService, genderPreference: request.genderPreference, zoneId: request.address.zoneId });
  if (!eligibility.eligible) throw new DomainError(`PROVIDER_INELIGIBLE:${eligibility.reasons.join(",")}`, 422);
  assertValidTransition(request.status, "ASSIGNED");
  request.status = "ASSIGNED";
  request.assignedProviderId = provider.id;
  provider.operationalState = "BUSY";
  request.timeline.push(timeline("PROVIDER_ASSIGNED", { ar: "تم تعيين الممرضة", en: "Nurse assigned" }, provider.name));
  notify("PROVIDER_ASSIGNED", { ar: "تم تعيين الممرضة", en: "Your nurse is assigned" }, { ar: `الممرضة ${provider.name.ar} ستؤكد الزيارة قريباً`, en: `${provider.name.en} will confirm shortly` });
  return request;
}

const providerTransitions: Record<string, RequestStatus> = {
  accept: "PROVIDER_ACCEPTED",
  onTheWay: "PROVIDER_ON_THE_WAY",
  arrive: "ARRIVED",
  start: "IN_PROGRESS"
};

export function providerTransition(input: { role: DemoRole; actorId: string; requestId: string; action: keyof typeof providerTransitions }): CareRequest {
  if (input.role !== "NURSE") throw new DomainError("FORBIDDEN", 403);
  const request = findAssignedRequest(input.requestId, input.actorId);
  const target = providerTransitions[input.action];
  if (!target) throw new DomainError("UNKNOWN_ACTION", 400);
  assertValidTransition(request.status, target);
  request.status = target;
  if (target === "IN_PROGRESS") request.visit = { startedAt: now() };
  const copy: Record<RequestStatus, { ar: string; en: string }> = {
    SUBMITTED: { ar: "", en: "" },
    PENDING_ASSIGNMENT: { ar: "", en: "" },
    ASSIGNED: { ar: "", en: "" },
    PROVIDER_ACCEPTED: { ar: "أكدت الممرضة الزيارة", en: "Nurse accepted the visit" },
    PROVIDER_ON_THE_WAY: { ar: "الممرضة في الطريق", en: "Nurse is on the way" },
    ARRIVED: { ar: "وصلت الممرضة", en: "Nurse has arrived" },
    IN_PROGRESS: { ar: "بدأت الزيارة", en: "Visit started" },
    COMPLETED: { ar: "", en: "" },
    FOLLOW_UP_REQUIRED: { ar: "", en: "" },
    CANCELLED: { ar: "", en: "" },
    REJECTED: { ar: "", en: "" }
  };
  request.timeline.push(timeline(target, copy[target]));
  notify(target, copy[target], { ar: "يمكنك متابعة الحالة داخل التطبيق", en: "Track the status securely in the app" });
  return request;
}

export function completeVisit(input: {
  role: DemoRole;
  actorId: string;
  requestId: string;
  vitals: NonNullable<CareRequest["visit"]>["vitals"];
  clinicalNote: string;
  followUpRequired: boolean;
}): CareRequest {
  if (input.role !== "NURSE") throw new DomainError("FORBIDDEN", 403);
  const request = findAssignedRequest(input.requestId, input.actorId);
  if (!input.vitals || input.clinicalNote.trim().length < 10) throw new DomainError("CLINICAL_DOCUMENTATION_INCOMPLETE", 422);
  assertValidTransition(request.status, input.followUpRequired ? "FOLLOW_UP_REQUIRED" : "COMPLETED");
  request.status = input.followUpRequired ? "FOLLOW_UP_REQUIRED" : "COMPLETED";
  request.visit = { ...request.visit, startedAt: request.visit?.startedAt ?? now(), completedAt: now(), vitals: input.vitals, clinicalNote: input.clinicalNote, followUpRequired: input.followUpRequired };
  request.timeline.push(
    timeline("VITALS_RECORDED", { ar: "تم تسجيل العلامات الحيوية", en: "Vital signs recorded" }),
    timeline("VISIT_COMPLETED", { ar: "اكتملت الزيارة", en: "Visit completed" }, { ar: input.followUpRequired ? "يوصى بمتابعة" : "لا توجد متابعة مطلوبة حالياً", en: input.followUpRequired ? "Follow-up recommended" : "No follow-up currently required" })
  );
  const provider = demoState.providers.find((item) => item.id === input.actorId);
  if (provider) provider.operationalState = "AVAILABLE";
  notify("VISIT_COMPLETED", { ar: "اكتملت الزيارة", en: "Visit completed" }, { ar: "أصبحت خلاصة الزيارة متاحة بأمان داخل التطبيق", en: "The visit summary is securely available in the app" });
  return request;
}

export function rateRequest(input: { role: DemoRole; requestId: string; overall: number; comment?: string }): CareRequest {
  if (input.role !== "PATIENT") throw new DomainError("FORBIDDEN", 403);
  const request = findRequest(input.requestId);
  if (!request.visit?.completedAt) throw new DomainError("VISIT_NOT_COMPLETED", 409);
  if (request.rating) throw new DomainError("RATING_ALREADY_EXISTS", 409);
  if (!Number.isInteger(input.overall) || input.overall < 1 || input.overall > 5) throw new DomainError("INVALID_RATING", 422);
  request.rating = { overall: input.overall, comment: input.comment };
  request.timeline.push(timeline("SERVICE_RATED", { ar: "تم إرسال التقييم", en: "Rating submitted" }));
  return request;
}

function findRequest(requestId: string): CareRequest {
  const request = demoState.requests.find((item) => item.id === requestId);
  if (!request) throw new DomainError("REQUEST_NOT_FOUND", 404);
  return request;
}

function findAssignedRequest(requestId: string, actorId: string): CareRequest {
  const request = findRequest(requestId);
  if (request.assignedProviderId !== actorId) throw new DomainError("ASSIGNMENT_ACCESS_DENIED", 403);
  return request;
}

export function resetDemoState(): void {
  const fresh = createSeedState();
  Object.assign(demoState, fresh);
}

