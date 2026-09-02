# Product requirements

## Product promise

A patient or family caregiver can request safe healthcare at home with minimal repetition, follow the complete case, receive clinically appropriate updates, and retain a longitudinal medical record.

## Personas and surfaces

Patient/caregiver, provider, doctor, laboratory staff, pharmacy staff, dispatcher/operations, administrator, and customer support share one domain and permission model but receive task-specific views.

## Core journey

`Patient → Medical Case → Service Request → Appointment → Assignment → Encounter → Clinical record → Follow-up → Longitudinal timeline`

## Initial outcome

The Home Nursing slice must let a caregiver select a patient, answer a metadata-driven intake, choose provider gender, select GPS/saved/map/manual location, choose ASAP or a slot, review, submit, receive assignment/on-the-way/completion updates, see clinical documentation, and rate the visit. Dispatch can assign only verified eligible nurses. Only the assigned nurse can access and complete the encounter.

## Non-functional baseline

- Arabic-first and fully mirrored RTL; English LTR uses the same semantic components.
- Mobile-first, WCAG-conscious controls, resilient drafts, low JavaScript, useful low-bandwidth states.
- Least privilege, private files, data minimization, append-oriented audit, and safe notifications.
- Country, brand, currency, timezone, emergency guidance, service radius, policies, and providers are configuration.
- External services degrade honestly through adapters; no fake production success.

## Product measures

Booking completion rate, median time to submit, repeat-service interaction count, assignment time, provider acceptance time, on-time arrival, cancellation reasons, visit documentation completeness, notification delivery, and patient-reported experience.

