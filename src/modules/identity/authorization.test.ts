import { describe, expect, it } from "vitest";
import { assertPermission } from "./authorization";

describe("RBAC plus relationship and assignment scope", () => {
  it("allows a patient only with patient access context", () => {
    expect(() => assertPermission("PATIENT", "case.read.authorized", { actorAccountId: "a1", patientAuthorized: true })).not.toThrow();
    expect(() => assertPermission("PATIENT", "case.read.authorized", { actorAccountId: "a1", patientAuthorized: false })).toThrow(/PATIENT_ACCESS_DENIED/);
  });

  it("allows clinical assignment access only to the assigned provider", () => {
    expect(() => assertPermission("NURSE", "visit.complete.assigned", { actorAccountId: "a1", actorProviderId: "p1", assignedProviderId: "p1" })).not.toThrow();
    expect(() => assertPermission("NURSE", "visit.complete.assigned", { actorAccountId: "a1", actorProviderId: "p2", assignedProviderId: "p1" })).toThrow(/ASSIGNMENT_ACCESS_DENIED/);
  });

  it("does not grant support staff clinical access", () => {
    expect(() => assertPermission("CUSTOMER_SUPPORT", "patient.read.clinical", { actorAccountId: "a1" })).toThrow(/FORBIDDEN/);
  });
});

