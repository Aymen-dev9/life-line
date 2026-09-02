import { NextResponse } from "next/server";
import { z } from "zod";
import {
  assignProvider,
  completeVisit,
  createRequest,
  getView,
  providerTransition,
  rateRequest
} from "@/server/demo-store";
import { DomainError } from "@/modules/requests/state-machine";

const roleSchema = z.enum(["PATIENT", "DISPATCHER", "NURSE"]);

function identity(request: Request) {
  return {
    role: roleSchema.parse(request.headers.get("x-demo-role") ?? "PATIENT"),
    actorId: request.headers.get("x-demo-actor") ?? "account-caregiver"
  };
}

export async function GET(request: Request) {
  if (!demoModeEnabled()) return NextResponse.json({ error: { code: "NOT_FOUND" } }, { status: 404 });
  try {
    const actor = identity(request);
    return NextResponse.json({ data: getView(actor.role, actor.actorId), meta: { adapter: "simulated-development" } });
  } catch (error) {
    return errorResponse(error);
  }
}

const actionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("createRequest"),
    patientId: z.string(),
    answers: z.record(z.string(), z.unknown()),
    genderPreference: z.enum(["FEMALE", "MALE", "NO_PREFERENCE"]),
    schedule: z.object({ type: z.enum(["ASAP", "SCHEDULED"]), startAt: z.string().optional(), window: z.string().optional() }),
    address: z.object({
      id: z.string(),
      label: z.object({ ar: z.string(), en: z.string() }),
      city: z.string(),
      district: z.string(),
      landmark: z.string(),
      instructions: z.string(),
      latitude: z.number(),
      longitude: z.number(),
      zoneId: z.string()
    })
  }),
  z.object({ action: z.literal("assignProvider"), requestId: z.string(), providerId: z.string() }),
  z.object({ action: z.literal("providerTransition"), requestId: z.string(), transition: z.enum(["accept", "onTheWay", "arrive", "start"]) }),
  z.object({
    action: z.literal("completeVisit"),
    requestId: z.string(),
    vitals: z.object({ systolic: z.number().int().min(40).max(260), diastolic: z.number().int().min(20).max(180), heartRate: z.number().int().min(20).max(240), temperature: z.number().min(30).max(45), spo2: z.number().int().min(50).max(100) }),
    clinicalNote: z.string().min(10).max(4000),
    followUpRequired: z.boolean()
  }),
  z.object({ action: z.literal("rateRequest"), requestId: z.string(), overall: z.number().int().min(1).max(5), comment: z.string().max(1000).optional() })
]);

export async function POST(request: Request) {
  if (!demoModeEnabled()) return NextResponse.json({ error: { code: "NOT_FOUND" } }, { status: 404 });
  try {
    const actor = identity(request);
    const body = actionSchema.parse(await request.json());
    let result;
    switch (body.action) {
      case "createRequest":
        result = createRequest({ role: actor.role, patientId: body.patientId, answers: body.answers, genderPreference: body.genderPreference, schedule: body.schedule, address: body.address });
        break;
      case "assignProvider":
        result = assignProvider({ role: actor.role, requestId: body.requestId, providerId: body.providerId });
        break;
      case "providerTransition":
        result = providerTransition({ role: actor.role, actorId: actor.actorId, requestId: body.requestId, action: body.transition });
        break;
      case "completeVisit":
        result = completeVisit({ role: actor.role, actorId: actor.actorId, requestId: body.requestId, vitals: body.vitals, clinicalNote: body.clinicalNote, followUpRequired: body.followUpRequired });
        break;
      case "rateRequest":
        result = rateRequest({ role: actor.role, requestId: body.requestId, overall: body.overall, comment: body.comment });
        break;
    }
    return NextResponse.json({ data: result }, { status: 200 });
  } catch (error) {
    return errorResponse(error);
  }
}

function demoModeEnabled() {
  return process.env.NODE_ENV !== "production" || process.env.DEMO_MODE === "true";
}

function errorResponse(error: unknown) {
  if (error instanceof DomainError) return NextResponse.json({ error: { code: error.code } }, { status: error.status });
  if (error instanceof z.ZodError) return NextResponse.json({ error: { code: "VALIDATION_FAILED", fields: error.issues.map((issue) => issue.path.join(".")) } }, { status: 422 });
  return NextResponse.json({ error: { code: "INTERNAL_ERROR" } }, { status: 500 });
}
