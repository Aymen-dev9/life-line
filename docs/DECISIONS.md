# Architecture decisions

## ADR-001 — Hybrid staged delivery

**Decision:** launch a responsive installable PWA plus web operations surfaces, then add Expo native shells when push reliability, continuous provider location, camera workflows, or background execution justify them.

**Why:** the PWA offers the fastest Arabic-first rollout, one deployable client, good GPS/camera/file support, and low installation friction. Native apps remain necessary for reliable background operations and the strongest push/location experience. Shared API contracts and domain types prevent a rewrite.

## ADR-002 — TypeScript modular monolith

**Decision:** one deployable Next.js 16 application with domain modules and versioned route handlers; no microservices initially.

**Why:** transactions across cases, requests, assignments, visits, and notifications stay simple. Domain boundaries can later be extracted around notification delivery, dispatch, laboratory, or pharmacy when scaling evidence exists.

## ADR-003 — PostgreSQL and Prisma 7

PostgreSQL is the source of truth. Prisma 7 is selected because it is fully supported and stable; Prisma 8 is intentionally deferred until its new contract/query workflow has production maturity. Database enums are avoided for frequently changing workflow vocabularies where lookup tables or checked strings give safer migrations.

## ADR-004 — Separate account, patient, case, appointment, encounter

Medical records attach to `Patient`, access attaches through relationships and permissions, appointments represent plans, encounters represent care delivered, and cases aggregate the clinical episode.

## ADR-005 — Integration ports

Maps, geocoding, files, SMS, WhatsApp, push, email, payments, video, and delivery are ports with mock/local adapters. Vendor identifiers and delivery attempts remain at the boundary.

## ADR-006 — Security posture

Opaque IDs, server authorization, role plus permission checks, assignment-scoped clinical access, private files, append-oriented audit events, idempotency keys, redacted logs, and notification privacy are baseline controls. No regulatory compliance claim is made without legal review.

## ADR-007 — Toolchain compatibility pins

Next.js is allowed compatible 16.x updates through the lockfile. ESLint remains on the final 9.x release because Next’s current bundled React/import/accessibility plugins do not yet declare ESLint 10 compatibility. Vitest is pinned to the last verifiably published 4.1 release after registry metadata advertised a missing later tarball. These pins should be revisited during scheduled dependency upgrades.
