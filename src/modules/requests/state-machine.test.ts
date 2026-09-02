import { describe, expect, it } from "vitest";
import { assertValidTransition, DomainError } from "./state-machine";

describe("request state machine", () => {
  it("allows the operational happy path", () => {
    expect(() => assertValidTransition("PENDING_ASSIGNMENT", "ASSIGNED")).not.toThrow();
    expect(() => assertValidTransition("ASSIGNED", "PROVIDER_ACCEPTED")).not.toThrow();
    expect(() => assertValidTransition("PROVIDER_ACCEPTED", "PROVIDER_ON_THE_WAY")).not.toThrow();
    expect(() => assertValidTransition("PROVIDER_ON_THE_WAY", "ARRIVED")).not.toThrow();
    expect(() => assertValidTransition("ARRIVED", "IN_PROGRESS")).not.toThrow();
    expect(() => assertValidTransition("IN_PROGRESS", "COMPLETED")).not.toThrow();
  });

  it("rejects arbitrary status mutation", () => {
    expect(() => assertValidTransition("PENDING_ASSIGNMENT", "COMPLETED")).toThrow(DomainError);
  });
});

