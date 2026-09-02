# UX flows

## Booking principles

Ask only what is needed now, prefill verified data, use one-tap structured answers, save drafts locally and server-side, preserve Back navigation, and show a concise review. The first contextual question is “Who is this service for?” only when multiple patients exist.

## Journey matrix

| Journey | Required now | Optional/deferred | Safety and notifications |
| --- | --- | --- | --- |
| Registration | +964 phone, OTP, language, name | DOB/age and sex when clinically needed | rate-limited OTP; welcome in-app |
| Family patient | name, relationship, age/DOB | history added progressively | access scope and guardian consent policy |
| Home nursing | patient, reason, timing, location | notes/files | red flags; request/assignment/arrival/completion |
| Blood collection | patient, order/test, fasting unknown, timing/location | order image | preparation after test review; chain-of-custody updates |
| Wound dressing | body area/type/time, bleeding red flag | photo/instructions | emergency interruption for severe bleeding |
| Injection / IV | order evidence, medication if known, allergies/reaction | package photo | provider verifies order; no patient-authorized prescribing |
| Doctor consultation | concern, duration, modality | specialty and files | “help me choose”; encounter always created |
| Pharmacy | prescription upload or product request, fulfillment | notes | pharmacist review before structured authority |
| Location allowed | locate, show accuracy/map, confirm pin | save label/landmark | exact location exposure is state-scoped |
| Location denied | saved/map/manual path | enable-permission help | never blocks booking |
| ASAP/scheduled/recurring | operational slot/cadence | preference notes | capacity validated; occurrence-level changes |
| Provider lifecycle | accept, on way, arrive, start, document, complete | attachments | state transition + patient update each milestone |
| Lab/pharmacy/follow-up | structured workflow state | secure files | sensitive values omitted from external messages |
| Cancellation/complaint | reason and affected item | comment/file | retain history; clinical complaints escalate |

## Home Nursing screen sequence

Home action → patient/service context → 2–4 dynamic questions → gender preference → time → location → review → confirmation/timeline. A returning user can use Repeat Last Service, with patient, safe answers, location, and preference preselected for confirmation.

