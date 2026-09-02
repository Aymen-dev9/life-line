# Test plan

## Test layers

- Unit: phone normalization, intake conditions, red flags, state transitions, provider eligibility, privacy rendering, time scheduling.
- Application: booking transaction, assignment race, clinical completion requirements, outbox creation, rating uniqueness.
- Database: constraints, migrations, indexes, row scoping, idempotency, rollback.
- API authorization: every role/permission plus relationship/assignment boundaries and IDOR attempts.
- End-to-end: Arabic and English patient, dispatcher, provider, doctor, lab, and pharmacy journeys.
- Non-functional: accessibility, responsive/mobile, poor network/draft retry, file attacks, rate limits, session rotation, queue retry/deduplication.

## Initial critical slice

New +964 account; mother family profile; female nurse booking; GPS allowed; GPS denied/manual fallback; saved address reuse; only eligible provider assignment; unauthorized provider denied; assigned provider completes structured visit; timeline visible; notification privacy; Arabic RTL and English LTR; rating only after completion.

Later release gates retain all 22 critical scenarios from the product brief, adding prescription authorization, reminder scheduling, lab release, pharmacy review/delivery, and WhatsApp privacy.

