# Life Line — Architecture

## Overview

Life Line is an Arabic/RTL home-healthcare platform. Patients authenticate with an OTP,
submit medical or pharmacy requests (choosing a location on a map), and track status.
Admins manage services, providers, dynamic content/branding, dispatch requests over
WhatsApp, and keep accounting records.

```
Browser (Next.js 16 / React 19, Arabic RTL)
        │  cookies (Supabase session via @supabase/ssr)
        ▼
Next.js server (Route Handlers + Server Components)  ── proxy.ts refreshes the session
        │  supabase-js (publishable key, user JWT)
        ▼
Supabase
  ├─ Postgres        RLS read policies + SECURITY DEFINER RPCs for every write
  ├─ Auth            Email OTP (primary), WhatsApp OTP (needs provider)
  └─ Storage         private "prescriptions" bucket (owner/admin only)
```

## Data access model

- **Writes → RPCs only.** `create_request`, `update_profile`, `upsert_service`,
  `upsert_provider`, `delete_catalog`, `forward_request`, `complete_request`,
  `record_payment`, `update_content`. Each is `SECURITY DEFINER` and checks `auth.uid()` /
  `public.is_admin()` internally. No table has an insert/update/delete policy, so a client
  holding the anon key cannot write directly — RLS default-deny blocks it.
- **Reads → RLS.** `content` is public; `services` show active rows to patients and all to
  admins; `providers` and `payments` are admin-only; `requests` and `profiles` are own-row
  or admin. `get_workspace()` assembles the whole payload for the current user in one call.
- **No service-role key in the app.** Authorization is entirely RLS + RPCs.

### Roles & admin bootstrap

`profiles.role` is `patient` or `admin`. A trigger creates a profile for each new
`auth.users` row. `sync_profile()` (run once per login) re-derives admin status by comparing
the verified JWT email to `app_config.admin_email`. There is no way for a browser to grant
itself admin.

## Authentication

- `@supabase/ssr` cookie sessions. `proxy.ts` refreshes the session on navigation; Server
  Components read it via `supabaseServer()`.
- OTP send uses a stateless anon client; verify uses the cookie-bound client so the session
  persists, then calls `sync_profile()`.
- **Email OTP** is the immediately-testable flow. For the 6-digit code to appear in the
  email, add `{{ .Token }}` to the Supabase *Magic Link* email template (Auth → Email
  Templates). **WhatsApp OTP** needs a phone provider configured in Supabase; the code path
  is ready and never fabricates codes.

## Location / maps

`src/care/location-picker.tsx` dynamically imports Leaflet on the client (avoids SSR
`window` issues), renders OpenStreetMap tiles, supports tap-to-select, a draggable marker,
and the Geolocation API. Latitude/longitude are authoritative; Nominatim reverse geocoding
(debounced, best-effort) fills `formatted_address`; `location_notes` holds a landmark.
Stored on `requests`. The admin view and WhatsApp message include a Google Maps link.

## Storage

Private bucket `prescriptions`, objects at `{user_id}/{request_id}.webp`. Uploads/downloads
use the user's session client (Storage RLS: owner or admin). Images are normalized to WebP
with `sharp` before upload. Download is streamed through
`/api/care/attachments/[id]` after `request_attachment_path()` confirms ownership/admin —
no public URLs.

## Key files

| Path | Role |
|---|---|
| `src/care/server/supabase.ts` | SSR + anon clients, error mapping |
| `src/care/server/auth.ts` | `currentAccount` / `requireAccount`, CSRF, JSON helpers |
| `src/care/server/content-data.ts` | public content read (merged with defaults) |
| `src/proxy.ts` | Supabase session refresh |
| `src/app/api/care/*` | auth, requests, attachments, content, workspace routes |
| `src/care/location-picker.tsx` | interactive map |
| `src/care/content.ts` | default Arabic copy + `whatsapp.template` |
| `supabase/migrations/*` | schema, RPCs, RLS, storage |

## Security advisories (accepted by design)

- `rls_enabled_no_policy` on `app_config` / `rate_limits` / `audit_log` — intentional: these
  are reachable only through `SECURITY DEFINER` functions.
- `*_security_definer_function_executable` on the RPCs — intentional: this is the RPC
  authorization model; each function enforces `auth.uid()` / `is_admin()` internally.
