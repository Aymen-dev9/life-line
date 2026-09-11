# CLAUDE.md — Life Line

Arabic/RTL home-healthcare app. **Next.js 16 (App Router) + React 19 + TypeScript** front
end; **Supabase** (Postgres + Auth + Storage) backend. End-user text is Arabic/RTL; code,
columns and comments are English. Do not translate the UI to English.

## How it works (read before changing data flows)

- **All writes go through `SECURITY DEFINER` Postgres RPCs** (see
  `supabase/migrations/*_functions.sql`). No table has a write RLS policy — writing from the
  client directly is impossible. To add a mutation: add/extend an RPC, grant it to
  `authenticated`, then call it from a Route Handler via the user's Supabase client.
- **Reads use RLS** (`*_policies_storage.sql`). `is_admin()` decides admin access.
- **Never use a service-role key.** The app uses only the publishable/anon key + RLS + RPCs.
- **Auth:** Supabase OTP via `@supabase/ssr` cookies. `src/proxy.ts` refreshes the session.
  Admin = `app_config.admin_email` matched against the verified JWT email in `sync_profile()`.
- **Attachments:** private Storage bucket `prescriptions`, streamed via
  `/api/care/attachments/[id]`. No public URLs.
- **Map:** `src/care/location-picker.tsx` (Leaflet, dynamic import, OSM tiles, Nominatim).
  `requests.latitude/longitude` are authoritative.

## Layout

- `src/app/**` — routes & API (`src/app/api/care/*`).
- `src/care/**` — UI + server helpers (`server/supabase.ts`, `server/auth.ts`,
  `server/content-data.ts`, `server/errors.ts`), content defaults (`content.ts`), types,
  validation (`validation.ts`), map picker.
- `supabase/migrations/**` — schema, RPCs, RLS, storage (source of truth).

## Commands

```bash
npm run dev | build | start | lint | typecheck | test | check
```

`npm run check` = lint + typecheck + test + build. Keep all green.

## Conventions

- Editable UI copy lives in `content.ts` (`defaultContent`) and is admin-overridable via the
  content editor; add new strings there, not hard-coded in components.
- Errors use short codes (`FORBIDDEN`, `CONFLICT`, `NOT_FOUND`, `RATE_LIMIT`, …) mapped by
  `rpcError`; RPCs `raise exception '<CODE>'`.
- Two intentional lint warnings remain (blob-URL `<img>` preview; full-reload logout).
- Env: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL`,
  `CARE_APP_ORIGIN`. See `.env.example`.
