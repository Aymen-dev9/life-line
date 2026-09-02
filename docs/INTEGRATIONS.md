# External integrations

| Port | Development adapter | Production setup required |
| --- | --- | --- |
| Map/geocoding/navigation | fixed Baghdad examples + browser geolocation | approved Maps/Mapbox key, quotas, privacy terms |
| SMS/OTP | explicit console-safe mock challenge | approved Iraqi delivery provider, sender, templates |
| WhatsApp | queued delivery recorder | official Business Platform account, approved templates, opt-in |
| Push | in-app delivery recorder | FCM/APNs/Web Push credentials and lifecycle handling |
| Email | local capture | transactional provider and verified domain |
| Files | metadata-only mock | private S3 bucket, KMS, scanning/quarantine, signed access |
| Payments | cash/manual | legally approved local gateway adapter |
| Video | waiting-room mock | approved provider, retention and consent configuration |
| Delivery | manual operations | courier provider contract/webhooks if selected |

Adapters expose capability and health status. A mock returns `simulated`, never `sent`, `paid`, or `verified`. Secrets are environment-only and provider callbacks are signed, replay-protected, idempotent, and audited.

