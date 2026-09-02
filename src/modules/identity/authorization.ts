import { DomainError } from "@/modules/requests/state-machine";

export const rolePermissions = {
  SUPER_ADMIN: ["*"] as const,
  SYSTEM_ADMIN: ["configuration.manage", "provider.manage", "service.manage", "audit.read"] as const,
  OPERATIONS_MANAGER: ["request.read.operational", "provider.assign", "schedule.manage", "location.read.precise.assigned"] as const,
  DISPATCHER: ["request.read.operational", "provider.assign", "location.read.precise.assigned"] as const,
  MEDICAL_SUPERVISOR: ["patient.read.clinical", "case.read", "case.write", "visit.read", "clinical.amend"] as const,
  DOCTOR: ["patient.read.clinical.assigned", "case.read.assigned", "visit.create", "prescription.create", "lab.order.create"] as const,
  NURSE: ["patient.read.clinical.assigned", "case.read.assigned", "visit.create.assigned", "visit.complete.assigned", "location.read.precise.assigned"] as const,
  LAB_MANAGER: ["lab.order.read", "lab.result.enter", "lab.result.verify"] as const,
  LAB_TECHNICIAN: ["lab.order.read.assigned", "lab.result.enter"] as const,
  PHARMACY_MANAGER: ["pharmacy.order.manage", "inventory.manage"] as const,
  PHARMACIST: ["pharmacy.order.review", "pharmacy.order.update"] as const,
  FINANCE: ["billing.read", "billing.manage"] as const,
  CUSTOMER_SUPPORT: ["patient.read.basic", "request.read.operational", "request.reschedule", "support.note.create"] as const,
  PATIENT: ["patient.read.authorized", "patient.write.authorized", "request.create.authorized", "case.read.authorized", "rating.create.authorized"] as const
} satisfies Record<string, readonly string[]>;

export type RoleCode = keyof typeof rolePermissions;
export type AuthorizationContext = {
  actorAccountId: string;
  patientAuthorized?: boolean;
  assignedProviderId?: string;
  actorProviderId?: string;
};

export function assertPermission(role: RoleCode, permission: string, context?: AuthorizationContext): void {
  const grants = rolePermissions[role] as readonly string[];
  const base = permission.replace(/\.(authorized|assigned)$/, "");
  const granted = grants.includes("*") || grants.includes(permission) || grants.some((item) => item.replace(/\.(authorized|assigned)$/, "") === base);
  if (!granted) throw new DomainError("FORBIDDEN", 403);
  if (permission.endsWith(".authorized") && context?.patientAuthorized !== true) throw new DomainError("PATIENT_ACCESS_DENIED", 403);
  if (permission.endsWith(".assigned") && (!context?.actorProviderId || context.actorProviderId !== context.assignedProviderId)) throw new DomainError("ASSIGNMENT_ACCESS_DENIED", 403);
}

