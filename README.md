# Life Line

Arabic-first (RTL) home-healthcare platform for Iraq. Patients request home medical
visits or pharmacy/medicine deliveries — picking their location on an interactive map —
and an administrator dispatches each request to a provider over WhatsApp and keeps simple
accounting records. Interface text and branding are editable by the admin.

- **Frontend:** Next.js 16 (App Router) + React 19 + TypeScript
- **Backend:** Supabase — PostgreSQL, Auth (Email / WhatsApp OTP), and private Storage
- **Auth:** Supabase Auth with cookie sessions via `@supabase/ssr`
- **Maps:** Leaflet + OpenStreetMap tiles + Nominatim reverse geocoding (no API key)

The end-user interface is Arabic and RTL. Code identifiers, columns and comments are English.

## Architecture at a glance

- **Every write goes through a `SECURITY DEFINER` Postgres function (RPC)** that enforces
  authorization in the database (`auth.uid()` / `is_admin()`). No table has a direct write
  policy, so the anon/authenticated keys cannot mutate data except through these audited RPCs.
- **Reads are governed by Row Level Security.** Patients can read only their own requests;
  providers, payments and other patients' data are admin-only; content is public.
- **The app never uses the Supabase service-role key.** The browser-safe publishable key
  plus RLS/RPCs are sufficient. Keep the secret key out of the app.
- **Prescription images** live in a private Storage bucket (`prescriptions`), streamed back
  through an authenticated route — never via public URLs.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for detail and [docs/MVP-PLAN-AR.md](docs/MVP-PLAN-AR.md)
for the Arabic product plan.

## Requirements

- Node.js 20+ (24 recommended)
- A Supabase project (this repo is wired to one; see below)

## Local setup

```bash
npm install
cp .env.example .env.local   # then fill in the values (see below)
npm run dev                  # http://localhost:3000
```

### Environment variables

| Variable | Required | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | yes | Supabase project URL (public) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | yes | Supabase publishable/anon key (public) |
| `NEXT_PUBLIC_SITE_URL` | yes | Public site URL (must be a Supabase Auth redirect URL) |
| `CARE_APP_ORIGIN` | yes | Allowed origin for state-changing requests (CSRF guard) |

The app does **not** use a service-role key. See [.env.example](.env.example).

## Database & migrations

SQL migrations live in [`supabase/migrations/`](supabase/migrations) and are the source of
truth for the schema, functions, RLS policies and Storage bucket:

1. `..._core_schema.sql` — tables, indexes, RLS enabled, seed services.
2. `..._functions.sql` — `is_admin`, profile/role sync, and all mutation RPCs.
3. `..._policies_storage.sql` — RLS read policies + the private `prescriptions` bucket.

Apply them with the [Supabase CLI](https://supabase.com/docs/guides/local-development)
(`supabase db push`) or paste them into the SQL editor in order.

Core tables: `profiles`, `services`, `providers`, `requests` (includes `latitude`,
`longitude`, `formatted_address`, `location_notes`), `payments`, `content`, `app_config`,
`rate_limits`, `audit_log`.

## Authentication & admin bootstrap

- Login is passwordless **Email OTP** (primary) or **WhatsApp OTP** (requires a configured
  provider — see below). The UI asks for a 6-digit code.
- For the emailed 6-digit code to appear, the Supabase **Auth → Email Templates → Magic Link**
  template must include `{{ .Token }}` (see [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)).
- **The first admin is set in the database**, not from the browser:

  ```sql
  update public.app_config set value = 'admin@example.com' where key = 'admin_email';
  ```

  Any account that verifies with that exact email becomes an admin (checked server-side
  against the verified JWT). Everyone else is a patient.

### WhatsApp OTP

The UI supports WhatsApp login, but Supabase phone/WhatsApp auth needs an external SMS/
WhatsApp provider configured in the Supabase dashboard (Auth → Providers → Phone). Until
that is configured, use **Email OTP**, which works out of the box. WhatsApp login never
fakes a code — if no provider is configured the send simply fails cleanly.

## Location / map behaviour

The request form uses an interactive Leaflet map (OpenStreetMap tiles). The patient taps
the map or uses their device location; a draggable marker marks the exact point. Latitude
and longitude are the authoritative values stored with the request. A best-effort reverse
geocode (Nominatim, debounced) fills a human-readable address, and an optional landmark
note captures directions. The admin sees the location and a Google Maps link, and the
WhatsApp dispatch message includes that link.

## Scripts

```bash
npm run dev        # dev server
npm run build      # production build
npm run start      # run the production build
npm run lint       # eslint
npm run typecheck  # tsc --noEmit
npm test           # vitest (unit tests)
npm run check      # lint + typecheck + test + build
```

## Deployment (Vercel + Supabase)

1. Import the repo into Vercel (framework: Next.js).
2. Set the four environment variables above in Vercel (Production + Preview). Set
   `NEXT_PUBLIC_SITE_URL` and `CARE_APP_ORIGIN` to the deployed origin.
3. In Supabase → Authentication → URL Configuration, set the **Site URL** and add the
   deployed origin (and `http://localhost:3000` for local) to **Redirect URLs**.
4. Deploy. The Supabase backend is shared across environments.

Supabase is the backend (DB/Auth/Storage); Vercel hosts the Next.js frontend.
