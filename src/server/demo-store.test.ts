import { afterEach, describe, expect, it } from "vitest";
import { assignProvider, completeVisit, createRequest, demoState, providerTransition, rateRequest, resetDemoState } from "./demo-store";
import { DomainError } from "@/modules/requests/state-machine";

afterEach(() => resetDemoState());

function createMotherRequest() {
  return createRequest({
    role: "PATIENT",
    patientId: "patient-mother",
    answers: { careReason: "elderly", mobility: "assisted", emergencySigns: [], notes: "Needs a routine check" },
    genderPreference: "FEMALE",
    schedule: { type: "ASAP" },
    address: demoState.addresses[0]!
  });
}

describe("Home Nursing vertical slice", () => {
  it("completes caregiver → operations → assigned nurse → visit → timeline → rating", () => {
    const request = createMotherRequest();
    expect(request.patientId).toBe("patient-mother");
    expect(request.status).toBe("PENDING_ASSIGNMENT");
    expect(demoState.notifications[0]?.body.en).not.toContain("elderly");

    expect(() => assignProvider({ role: "DISPATCHER", requestId: request.id, providerId: "provider-ineligible" })).toThrow(/PROVIDER_INELIGIBLE/);
    assignProvider({ role: "DISPATCHER", requestId: request.id, providerId: "provider-female-1" });
    expect(request.status).toBe("ASSIGNED");

    expect(() => providerTransition({ role: "NURSE", actorId: "provider-male-1", requestId: request.id, action: "accept" })).toThrow(new DomainError("ASSIGNMENT_ACCESS_DENIED", 403));
    providerTransition({ role: "NURSE", actorId: "provider-female-1", requestId: request.id, action: "accept" });
    providerTransition({ role: "NURSE", actorId: "provider-female-1", requestId: request.id, action: "onTheWay" });
    providerTransition({ role: "NURSE", actorId: "provider-female-1", requestId: request.id, action: "arrive" });
    providerTransition({ role: "NURSE", actorId: "provider-female-1", requestId: request.id, action: "start" });
    completeVisit({
      role: "NURSE",
      actorId: "provider-female-1",
      requestId: request.id,
      vitals: { systolic: 122, diastolic: 78, heartRate: 76, temperature: 36.7, spo2: 98 },
      clinicalNote: "Routine assessment completed; patient stable and advice provided.",
      followUpRequired: false
    });
    expect(request.status).toBe("COMPLETED");
    expect(request.timeline.map((event) => event.type)).toEqual(expect.arrayContaining(["REQUEST_SUBMITTED", "PROVIDER_ASSIGNED", "VITALS_RECORDED", "VISIT_COMPLETED"]));

    rateRequest({ role: "PATIENT", requestId: request.id, overall: 5, comment: "Professional care" });
    expect(request.rating?.overall).toBe(5);
    expect(() => rateRequest({ role: "PATIENT", requestId: request.id, overall: 5 })).toThrow(/RATING_ALREADY_EXISTS/);
  });

  it("blocks routine submission when emergency signs are present", () => {
    expect(() => createRequest({
      role: "PATIENT",
      patientId: "patient-mother",
      answers: { careReason: "elderly", mobility: "assisted", emergencySigns: ["breathing"] },
      genderPreference: "FEMALE",
      schedule: { type: "ASAP" },
      address: demoState.addresses[0]!
    })).toThrow(/EMERGENCY_GUIDANCE_REQUIRED/);
  });

  it("does not allow a patient role to assign a provider", () => {
    const request = createMotherRequest();
    expect(() => assignProvider({ role: "PATIENT", requestId: request.id, providerId: "provider-female-1" })).toThrow(/FORBIDDEN/);
  });
});

