# Life Line

Arabic-first (RTL) home-healthcare platform for Iraq. It is a **public service-booking site**
plus a **private admin operations dashboard**:

- **Clients book without any login/account.** They open the site, choose a service, enter
  their details, pick their location on a map, optionally attach files, and submit. There is
  no client login, registration, OTP, password, or session — the flow ends on a confirmation
  screen showing the request number. Each request is linked to a phone-keyed **client record**
  (a business record, not an auth account); repeat submissions from the same phone reuse it.
- **Only admins authenticate**, at `/admin/login` (username + password), and manage requests:
  approve, take responsibility, assign providers over WhatsApp, and keep accounting records.

- **Frontend:** Next.js 16 (App Router) + React 19 + TypeScript
- **Backend:** Supabase — PostgreSQL, Auth (admin only), and private Storage
- **Auth:** Supabase Auth (admins only) with cookie sessions via `@supabase/ssr`
- **Maps:** Leaflet + OpenStreetMap tiles + Nominatim reverse geocoding (no API key)

The end-user interface is Arabic and RTL. Code identifiers, columns and comments are English.

## Architecture at a glance

- **Every write goes through a `SECURITY DEFINER` Postgres function (RPC)** that enforces
  authorization in the database (`auth.uid()` / `is_admin()`). No table has a direct write
  policy, so the anon/authenticated keys cannot mutate data except through these audited RPCs.
- **Public booking** goes through `create_public_request()` (granted to `anon`). It finds or
  creates the client by normalized phone and inserts a `pending` request with `user_id = null`.
  Public callers can never set protected fields (status, provider, owning admin).
- **Admin ownership.** Every request is visible to all admins, but has at most one
  `owner_admin_id` at a time. Claiming/approving are atomic (a race gives exactly one owner);
  transfers/takeovers are recorded in `admin_ownership_history`, status changes in
  `request_status_history`.
- **Reads are governed by Row Level Security.** Clients read nothing directly (they have no
  session); providers, payments, clients, history and other admin data are admin-only; active
  services and content are public.
- **The app never uses the Supabase service-role key.** The browser-safe publishable key
  plus RLS/RPCs are sufficient. Keep the secret key out of the app.
- **Attachments** live in a private Storage bucket (`prescriptions`). Public uploads land
  under a `public/` prefix; images are streamed back only to admins — never via public URLs.
- **WhatsApp** notifications use a mock-first `NotificationService`; a failure is logged with
  status `FAILED` and never blocks approve/assign.

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
truth for the schema, functions, RLS policies and Storage bucket. **Apply them in filename
order** with the [Supabase CLI](https://supabase.com/docs/guides/local-development)
(`supabase db push`) or by pasting them into the SQL editor in order. Every migration is
additive — no drops of tables/data, no reset.

1. `..._core_schema.sql` — tables, indexes, RLS enabled, seed services.
2. `..._functions.sql` — `is_admin`, profile/role sync, and the original mutation RPCs.
3. `..._policies_storage.sql` — RLS read policies + the private `prescriptions` bucket.
4. `..._harden.sql` — locks down the trigger function's execute grant.
5. `..._admin_allowlist.sql` — comma-separated admin email allowlist.
6. `20260915120000_public_booking.sql` — `clients` table; `requests.client_id` /
   `owner_admin_id`; `user_id` made nullable; extended status set (`approved`/`cancelled`);
   `normalize_phone()`; **`create_public_request()` (anon)**; anon `public/` storage upload policy.
7. `20260915120100_admin_accounts.sql` — five admin Supabase Auth users (bcrypt) + allowlist.
8. `20260915120200_ownership.sql` — `request_status_history`, `admin_ownership_history`;
   profile `username`/`admin_active`/`last_login_at`; atomic `claim`/`approve`/`reject`/
   `transfer` RPCs; `request_history()`; `get_workspace()` extended with the admin roster.
9. `20260915120300_operations.sql` — `notifications`; `record_notification`, `search_clients`,
   `client_report`, `get_admins`, `export_backup`.

Core tables: `profiles`, `clients`, `services`, `providers`, `requests`, `payments`,
`notifications`, `request_status_history`, `admin_ownership_history`, `content`, `app_config`,
`rate_limits`, `audit_log`.

## Authentication (admins only)

Clients never authenticate. Admins sign in at **`/admin/login`** with a **username + password**.
The username maps to a fixed `<username>@lifeline.local` email and is verified against Supabase
Auth; a non-admin credential is rejected and its session torn down immediately.

- **Five admin accounts** are seeded by `20260915120100_admin_accounts.sql`: usernames
  `admin1`…`admin5`, dev passwords `LifeLine#Admin1`…`LifeLine#Admin5` (bcrypt-hashed — **rotate
  in production**; each admin changes their own password under *Admin Users*). If your Supabase/
  GoTrue version rejects the `auth.users` seed, create the five users from the dashboard
  (Authentication → Users) with the same emails; the allowlist grants them admin on first login.
- The admin allowlist is `app_config.admin_email` (comma-separated); add the owner's own email
  there too if desired. Role assignment is decided server-side from the verified JWT email.

  ```sql
  update public.app_config set value = value || ',owner@example.com' where key = 'admin_email';
  ```

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
