# Architecture

## Context

Care Platform connects patients and family caregivers with operations, verified professionals, doctors, laboratories, and pharmacies. The initial deployable is a Next.js 16 PWA and API modular monolith. Expo mobile clients may consume the same `/api/v1` contracts later.

## Module boundaries

| Module | Owns | May depend on |
| --- | --- | --- |
| Identity & access | account, session, role, permission, OTP challenge | audit, notifications |
| Patients & family | patient, relationship, access grant, address | identity, audit |
| Catalog & intake | service, localized content, schema, condition, pricing input | configuration |
| Cases & requests | case, request, answers, attachments, status history | patient, catalog |
| Scheduling & dispatch | slots, appointment, eligibility, assignment | request, provider |
| Providers | profile, credential, skill, zone, shift, operational state | identity |
| Visits & clinical | encounter, vitals, notes, procedures, amendment | case, assignment |
| Notifications | event, template, preference, delivery | integration ports |
| Laboratory / Pharmacy / Medications | later bounded contexts | cases, clinical |
| Support, billing, audit, admin | constrained operational views | explicit read models |

Dependencies point inward: UI and route handlers call application services; application services call domain policies and repository/integration ports. Vendor SDKs and Prisma records never enter domain rules.

## Runtime topology

- Next.js Node runtime: server-rendered UI, server actions, `/api/v1` route handlers.
- PostgreSQL: transactional records, append-only status/audit histories, notification outbox.
- Redis + BullMQ: durable delayed jobs, retries, deduplication, reminder schedules.
- Private S3-compatible storage: encrypted medical objects; short-lived authorized access only.
- Worker process: outbox relay, notification deliveries, file scanning callbacks, scheduled reminders.

## Request guarantees

Mutating APIs accept an idempotency key. A transaction records the aggregate mutation, status event, audit entry, and notification outbox event. Consumers deduplicate by event ID. State machines reject invalid transitions. Optimistic concurrency protects dispatch and clinical updates.

## Observability

Structured logs include correlation ID, actor ID, operation, safe entity reference, duration, and outcome—never intake answers, clinical notes, precise coordinates, secrets, or file URLs. OpenTelemetry traces and error monitoring are adapters. Health probes separately cover web, database, queue, and storage.

## Deployment

Containers use the Next.js standalone build. Migrations run as a controlled release step. Rolling deployment requires backward-compatible schema changes. See backup and rollback notes in `docs/SECURITY.md`.

