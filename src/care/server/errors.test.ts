import { describe, it, expect } from "vitest";
import { CareError, rpcError } from "./errors";

describe("rpcError", () => {
  it("maps a bare RPC code to the right status", () => {
    expect(rpcError({ message: "FORBIDDEN" })).toMatchObject({ code: "FORBIDDEN", status: 403 });
    expect(rpcError({ message: "CONFLICT" })).toMatchObject({ code: "CONFLICT", status: 409 });
    expect(rpcError({ message: "RATE_LIMIT" })).toMatchObject({ code: "RATE_LIMIT", status: 429 });
    expect(rpcError({ message: "NOT_FOUND" })).toMatchObject({ code: "NOT_FOUND", status: 404 });
  });

  it("finds a known code embedded in a longer Postgres message", () => {
    expect(rpcError({ message: 'new row violates ... "FORBIDDEN"' }).code).toBe("FORBIDDEN");
  });

  it("falls back to UNAVAILABLE for unknown errors", () => {
    const err = rpcError({ message: "some random db error" });
    expect(err).toBeInstanceOf(CareError);
    expect(err.code).toBe("UNAVAILABLE");
    expect(err.status).toBe(503);
  });

  it("handles null/undefined", () => {
    expect(rpcError(null).code).toBe("UNAVAILABLE");
    expect(rpcError(undefined).code).toBe("UNAVAILABLE");
  });
});
