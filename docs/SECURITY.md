# Security, privacy, and recovery

## Identity and authorization

Phone OTP is challenge-based, short-lived, single-use, rate-limited by phone/device/network, and stored as a hash. Sessions use rotated opaque tokens in secure, HttpOnly, SameSite cookies. Passkeys and device biometrics can be added without changing account identity.

RBAC grants permissions centrally; ABAC narrows them by patient relationship, assignment, provider eligibility, workflow state, and service zone. Roles never arrive trusted from the client. High-risk actions require step-up authentication where policy demands it.

## Data protection

TLS in transit; managed encryption at rest; field-level protection for selected identifiers where threat modeling warrants it. Medical files use private object keys, verified MIME/type/size, malware quarantine, and short-lived authorized URLs. Pre-assignment provider responses omit exact address and clinical detail.

## Application controls

Zod validation at trust boundaries, parameterized database access, output-safe React rendering, CSRF-resistant SameSite sessions plus origin checks for mutations, request/body limits, rate limiting, idempotency keys, dependency scanning, security headers, and generic user errors. IDOR tests cover all patient, case, file, and provider routes.

## Audit and clinical integrity

Sensitive read/write events record actor, effective role, action, entity, time, request/session context, reason, and safe change metadata. Audit storage is append-oriented and access-restricted. Final clinical content is versioned through correction/amendment.

## Backups and recovery

Production requires encrypted daily full plus point-in-time PostgreSQL recovery, versioned/cross-zone object backups, periodic Redis configuration backup where applicable, documented RPO/RTO, quarterly restore exercises, migration preflight, forward-fix migrations, and tested application rollback. A deployment is not complete until database and file restore are demonstrated in a non-production environment.

## Production gates

Threat model, penetration test, local legal/privacy review, incident response runbook, data retention schedule, breach notification policy, business continuity exercise, and named security/clinical owners.

