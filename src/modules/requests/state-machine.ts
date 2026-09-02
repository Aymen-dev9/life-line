export const requestStatuses = [
  "SUBMITTED",
  "PENDING_ASSIGNMENT",
  "ASSIGNED",
  "PROVIDER_ACCEPTED",
  "PROVIDER_ON_THE_WAY",
  "ARRIVED",
  "IN_PROGRESS",
  "COMPLETED",
  "FOLLOW_UP_REQUIRED",
  "CANCELLED",
  "REJECTED"
] as const;

export type RequestStatus = (typeof requestStatuses)[number];

const allowedTransitions: Record<RequestStatus, readonly RequestStatus[]> = {
  SUBMITTED: ["PENDING_ASSIGNMENT", "REJECTED", "CANCELLED"],
  PENDING_ASSIGNMENT: ["ASSIGNED", "REJECTED", "CANCELLED"],
  ASSIGNED: ["PROVIDER_ACCEPTED", "PENDING_ASSIGNMENT", "CANCELLED"],
  PROVIDER_ACCEPTED: ["PROVIDER_ON_THE_WAY", "CANCELLED"],
  PROVIDER_ON_THE_WAY: ["ARRIVED", "CANCELLED"],
  ARRIVED: ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["COMPLETED", "FOLLOW_UP_REQUIRED"],
  FOLLOW_UP_REQUIRED: ["COMPLETED"],
  COMPLETED: [],
  CANCELLED: [],
  REJECTED: []
};

export function assertValidTransition(from: RequestStatus, to: RequestStatus): void {
  if (!(allowedTransitions[from] as readonly RequestStatus[]).includes(to)) {
    throw new DomainError("INVALID_STATUS_TRANSITION", 409);
  }
}

export class DomainError extends Error {
  constructor(
    public readonly code: string,
    public readonly status: number = 400
  ) {
    super(code);
    this.name = "DomainError";
  }
}
