# Database and ERD

## Core relationship map

```text
UserAccount ──< PatientRelationship >── Patient ──< MedicalCase
     │                                      │            │
     └──< SavedAddress                      │            ├──< ServiceRequest ──1 Appointment
                                            │            │        │                  │
ProviderProfile ──< ProviderSkill           │            │        └──< IntakeAnswer  └──< Assignment
     │                                      │            │                                  │
     └──< Credential / Shift / Zone         │            └──< Encounter >────────────────────┘
                                            │                     │
                                            └──< MedicalFile      ├──< VitalSign
                                                                  ├──< ClinicalNote/Amendment
                                                                  └──< FollowUp
```

Notifications use an outbox: `DomainEvent → Notification → NotificationDelivery`. Every sensitive mutation adds an `AuditLog` row in the same transaction.

## Invariants

- An account is not a patient; access requires an active relationship or explicit grant.
- A request belongs to exactly one patient and case; changing patient after submission is prohibited.
- One active assignment per appointment; the assigned eligible provider is checked transactionally.
- Encounter start requires accepted assignment; completion requires required structured documentation.
- Finalized clinical notes are immutable; correction creates an amendment/superseding version.
- Exact location is returned only to authorized operations staff and the assigned provider in an allowed state.
- Ratings are unique per completed request and patient account.
- Human references are unique but never used as authorization secrets.

## Identifier strategy

UUIDv7/ULID-style opaque primary/public IDs. Separate references such as `CASE-2026-000123` are generated from a concurrency-safe sequence. Timestamps are UTC; the relevant IANA timezone is retained for scheduling intent.

## Indexes and retention

Indexes cover patient timeline `(patient_id, occurred_at)`, request operations `(status, scheduled_start)`, assignment provider queues, notification due/status, and audit entity lookup. Partial unique indexes enforce active assignment and idempotency. Retention and deletion require legal policy; clinical/audit data is not cascade-deleted by user-facing actions.

## Future mappings

Patient→FHIR Patient, provider→Practitioner, appointment→Appointment, encounter→Encounter, vital→Observation, prescription→MedicationRequest, laboratory report→DiagnosticReport, file→DocumentReference. This is conceptual compatibility, not FHIR compliance.

