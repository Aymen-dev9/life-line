# Notification architecture

`Domain event → transactional outbox → orchestrator → privacy policy → preference/fallback policy → localized template → delivery job → provider adapter → status callback`

In-app is the authoritative channel. Push, WhatsApp, SMS, and email carry the minimum information needed and deep-link to the secure app. Diagnosis, laboratory values, medication names, notes, and exact location are excluded from external channels by default.

Deliveries have idempotency keys, scheduled UTC time plus IANA timezone, attempt count, exponential backoff with jitter, terminal/dead-letter state, provider message ID, and sanitized failure code. Transactional health messages and marketing preferences are separate. Quiet hours never silently suppress clinically important reminders.

Initial events: request received, provider assigned/accepted/on-the-way/arrived, visit completed, follow-up due, medication reminder, lab preparation/result available, prescription created, and pharmacy status. Templates are versioned and localized in Arabic and English.

