# Progress

Last updated: 2026-09-02

## Completed

- Preserved pre-existing HTML artifacts and initialized a valid Git repository.
- Recorded product, architecture, database, UX, security, notification, integration, compliance, and test decisions.
- Chose staged PWA → Expo architecture, TypeScript modular monolith, PostgreSQL, Prisma 7, adapter-based integrations, and Arabic-first design.
- Added the reviewed PostgreSQL schema, RBAC entities, state/history invariants, outbox, audit, notification delivery, and local infrastructure definition.
- Implemented a working Home Nursing slice across patient booking, dynamic intake/red flags, GPS/saved/map/manual location, dispatcher eligibility, nurse lifecycle, structured vitals/notes, case timeline, notifications, and rating.
- Added domain and vertical-slice tests for Iraqi phone normalization, dynamic intake, red flags, eligibility, state transitions, authorization, privacy, and the complete care journey.
- Passed lint, strict type checking, 16 automated tests, Prisma client generation, and a production build.
- Verified the responsive experience in a real browser in Arabic RTL and English LTR, including family booking, saved and manual addresses, explainable nurse assignment, the provider visit workflow, the patient timeline, and rating.

## Current milestone

- Foundation and the first operational vertical slice are complete. Production adapters and the remaining clinical services are intentionally tracked as the next phase.

## Next

- Production repository adapters and initial migration against a configured PostgreSQL instance.
- OTP/session implementation behind an approved Iraqi SMS provider.
- Additional blood collection, wound dressing, injection, and doctor-consultation schemas using the shared intake engine.

## External setup still required

Production PostgreSQL/Redis/object storage, maps/geocoding, OTP/SMS, WhatsApp Business, FCM/APNs, payment, video, email, monitoring, malware scanning, domains/TLS, and jurisdiction-specific legal/clinical policies.
