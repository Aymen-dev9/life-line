-- Life Line — core schema
-- Clean data model mirroring the src/care application (patient + admin home-healthcare platform).
-- All identifiers/columns in English; end-user copy lives in the content table.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

-- Runtime configuration (e.g. the bootstrap admin email). Never exposed to clients.
create table if not exists public.app_config (
  key   text primary key,
  value text not null default ''
);
insert into public.app_config(key, value) values ('admin_email', '')
  on conflict (key) do nothing;

-- One profile row per Supabase auth user.
create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  role       text not null default 'patient' check (role in ('patient', 'admin')),
  name       text not null default '',
  phone      text not null default '',
  address    text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Dynamic medical services managed by the admin.
create table if not exists public.services (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  active     boolean not null default true,
  sort       integer not null default 0,
  created_at timestamptz not null default now()
);

-- Service providers (medical staff / pharmacies) managed by the admin.
create table if not exists public.providers (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  phone      text not null,
  gender     text not null check (gender in ('male', 'female')),
  active     boolean not null default true,
  created_at timestamptz not null default now()
);

-- Medical + pharmacy service requests, including the map-selected location.
create table if not exists public.requests (
  id                uuid primary key default gen_random_uuid(),
  reference         text not null unique,
  user_id           uuid not null references public.profiles(id) on delete cascade,
  kind              text not null check (kind in ('medical', 'pharmacy')),
  service_id        uuid references public.services(id),
  service_name      text not null,
  name              text not null,
  phone             text not null,
  address           text not null default '',
  details           text not null default '',
  medicine          text not null default '',
  gender            text not null default 'any' check (gender in ('male', 'female', 'any')),
  latitude          double precision,
  longitude         double precision,
  formatted_address text,
  location_notes    text not null default '',
  status            text not null default 'pending' check (status in ('pending', 'forwarded', 'completed')),
  provider_id       uuid references public.providers(id),
  attachment_path   text,
  submission_key    uuid not null unique,
  created_at        timestamptz not null default now(),
  constraint requests_latitude_range  check (latitude  is null or (latitude  between -90  and 90)),
  constraint requests_longitude_range check (longitude is null or (longitude between -180 and 180))
);
create index if not exists idx_requests_user_date on public.requests(user_id, created_at desc);
create index if not exists idx_requests_date on public.requests(created_at desc);

-- Accounting: one payment record per completed/forwarded request.
create table if not exists public.payments (
  id            uuid primary key default gen_random_uuid(),
  request_id    uuid not null unique references public.requests(id) on delete cascade,
  provider_id   uuid not null references public.providers(id),
  provider_name text not null,
  amount        bigint check (amount is null or amount >= 0),
  paid_at       timestamptz not null default now(),
  recorded_by   uuid not null references public.profiles(id)
);
create index if not exists idx_payments_provider on public.payments(provider_id);

-- Editable interface text / branding (single row). Values merge over code defaults.
create table if not exists public.content (
  id       integer primary key default 1 check (id = 1),
  values   jsonb not null default '{}'::jsonb,
  revision integer not null default 0
);
insert into public.content(id, values, revision) values (1, '{}'::jsonb, 0)
  on conflict (id) do nothing;

-- Server-side rate limiting (keyed by an md5 of channel+identifier; no raw PII stored).
create table if not exists public.rate_limits (
  key      text primary key,
  count    integer not null,
  reset_at bigint not null
);

-- Lightweight audit trail.
create table if not exists public.audit_log (
  id          uuid primary key default gen_random_uuid(),
  actor       text not null,
  action      text not null,
  entity      text not null,
  occurred_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Enable Row Level Security on every table (policies added in a later migration)
-- ---------------------------------------------------------------------------
alter table public.app_config  enable row level security;
alter table public.profiles    enable row level security;
alter table public.services    enable row level security;
alter table public.providers   enable row level security;
alter table public.requests    enable row level security;
alter table public.payments    enable row level security;
alter table public.content     enable row level security;
alter table public.rate_limits enable row level security;
alter table public.audit_log   enable row level security;

-- Seed the default service catalogue once.
insert into public.services(name, active, sort) values
  ('سحب دم', true, 1),
  ('إجراء تحليل مختبري', true, 2),
  ('تضميد جرح', true, 3)
on conflict do nothing;
