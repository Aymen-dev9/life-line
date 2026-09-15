-- Life Line — public (unauthenticated) booking + admin ownership groundwork.
-- ADDITIVE & NON-DESTRUCTIVE: no drops of tables/data, no reset. Existing authenticated
-- patient requests keep working unchanged; new public requests carry client_id and a
-- null user_id. Clients are business records keyed by phone — NOT auth entities.

-- ---------------------------------------------------------------------------
-- 1. Clients — care recipients identified by a normalized phone number.
-- ---------------------------------------------------------------------------
create table if not exists public.clients (
  id         uuid primary key default gen_random_uuid(),
  full_name  text not null default '',
  phone      text not null unique,
  gender     text check (gender is null or gender in ('male', 'female')),
  age        integer check (age is null or (age >= 0 and age <= 150)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.clients enable row level security;

-- Client records are admin-only (they contain contact details across many requests).
drop policy if exists clients_read on public.clients;
create policy clients_read on public.clients for select to authenticated using (public.is_admin());

-- ---------------------------------------------------------------------------
-- 2. requests — link to client, allow public (null user_id), add owning admin.
-- ---------------------------------------------------------------------------
alter table public.requests add column if not exists client_id      uuid references public.clients(id);
alter table public.requests add column if not exists owner_admin_id uuid references public.profiles(id);
alter table public.requests alter column user_id drop not null;

-- Extend the status vocabulary while preserving every existing value.
alter table public.requests drop constraint if exists requests_status_check;
alter table public.requests add constraint requests_status_check
  check (status in ('pending', 'approved', 'forwarded', 'completed', 'cancelled'));

create index if not exists idx_requests_client on public.requests(client_id, created_at desc);
create index if not exists idx_requests_owner  on public.requests(owner_admin_id);

-- ---------------------------------------------------------------------------
-- 3. normalize_phone — SQL mirror of src/care/client.ts normalizePhone().
-- Canonicalizes Iraqi shapes (0780…, 964780…, 00964780…, Arabic-Indic digits) to +964…
-- ---------------------------------------------------------------------------
create or replace function public.normalize_phone(p text)
returns text language plpgsql immutable set search_path = public as $$
declare s text;
begin
  s := translate(coalesce(p, ''), '٠١٢٣٤٥٦٧٨٩', '0123456789');
  s := regexp_replace(s, '[\s()\-]', '', 'g');
  if left(s, 2) = '00' then s := '+' || substr(s, 3); end if;
  if left(s, 1) = '+'   then return s; end if;
  if left(s, 3) = '964' then return '+' || s; end if;
  if left(s, 1) = '0'   then return '+964' || substr(s, 2); end if;
  return s;
end; $$;

-- ---------------------------------------------------------------------------
-- 4. create_public_request — the public booking entry point (granted to anon).
-- Find-or-create the client by normalized phone, then insert a pending request.
-- Public callers CANNOT set status / provider / owner — those are server-controlled.
-- ---------------------------------------------------------------------------
create or replace function public.create_public_request(
  p_id uuid, p_kind text, p_service_id uuid, p_pharmacy_label text,
  p_name text, p_phone text, p_gender_pref text,
  p_client_gender text, p_client_age integer,
  p_details text, p_medicine text,
  p_latitude double precision, p_longitude double precision, p_formatted_address text,
  p_location_notes text, p_attachment_path text, p_submission_key uuid
) returns jsonb language plpgsql security definer set search_path = public as $$
declare v_phone text; v_client_id uuid; v_service_name text; v_reference text; v_row record;
begin
  -- Idempotency: return the earlier request if this submission was already stored.
  select id, reference into v_row from public.requests where submission_key = p_submission_key;
  if found then return jsonb_build_object('id', v_row.id, 'reference', v_row.reference); end if;

  v_phone := public.normalize_phone(p_phone);
  if v_phone !~ '^\+[1-9]\d{7,14}$' then raise exception 'PHONE'; end if;

  if p_kind = 'medical' then
    select name into v_service_name from public.services where id = p_service_id and active = true;
    if v_service_name is null then raise exception 'INVALID'; end if;
  elsif p_kind = 'pharmacy' then
    v_service_name := coalesce(nullif(p_pharmacy_label, ''), 'الصيدلية');
    if coalesce(p_medicine, '') = '' and coalesce(p_attachment_path, '') = '' then raise exception 'MEDICINE'; end if;
  else
    raise exception 'INVALID';
  end if;

  -- Find or create the client record (phone is the natural key; no login is created).
  select id into v_client_id from public.clients where phone = v_phone;
  if v_client_id is null then
    insert into public.clients(full_name, phone, gender, age)
    values (p_name, v_phone, nullif(p_client_gender, ''), p_client_age)
    returning id into v_client_id;
  else
    update public.clients set
      full_name = case when coalesce(p_name, '') <> '' then p_name else full_name end,
      gender    = coalesce(nullif(p_client_gender, ''), gender),
      age       = coalesce(p_client_age, age),
      updated_at = now()
    where id = v_client_id;
  end if;

  v_reference := 'R-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
  insert into public.requests(
    id, reference, user_id, client_id, kind, service_id, service_name, name, phone, address, details, medicine, gender,
    latitude, longitude, formatted_address, location_notes, attachment_path, submission_key, status
  ) values (
    coalesce(p_id, gen_random_uuid()), v_reference, null, v_client_id, p_kind,
    case when p_kind = 'medical' then p_service_id else null end, v_service_name,
    p_name, v_phone, coalesce(p_formatted_address, p_location_notes, ''), coalesce(p_details, ''), coalesce(p_medicine, ''),
    coalesce(p_gender_pref, 'any'), p_latitude, p_longitude, p_formatted_address, coalesce(p_location_notes, ''),
    p_attachment_path, p_submission_key, 'pending'
  ) returning id, reference into v_row;
  insert into public.audit_log(actor, action, entity) values ('public', 'request.create.public', v_row.id::text);
  return jsonb_build_object('id', v_row.id, 'reference', v_row.reference);
end; $$;

-- ---------------------------------------------------------------------------
-- 5. get_workspace — surface the owning admin + client id on each request row.
-- (Full ownership UI lands in a later migration; this keeps the payload forward-compatible.)
-- ---------------------------------------------------------------------------
create or replace function public.get_workspace()
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_admin boolean; v_profile public.profiles; result jsonb;
begin
  if v_uid is null then raise exception 'UNAUTHORIZED'; end if;
  select * into v_profile from public.profiles where id = v_uid;
  if not found then raise exception 'UNAUTHORIZED'; end if;
  v_admin := (v_profile.role = 'admin');
  result := jsonb_build_object(
    'user', jsonb_build_object('id', v_profile.id, 'role', v_profile.role, 'name', v_profile.name, 'phone', v_profile.phone, 'address', v_profile.address, 'demo', false),
    'services', coalesce((select jsonb_agg(jsonb_build_object('id', s.id, 'name', s.name, 'active', s.active) order by s.sort, s.created_at)
                          from public.services s where v_admin or s.active), '[]'::jsonb),
    'providers', case when v_admin then coalesce((select jsonb_agg(jsonb_build_object('id', p.id, 'name', p.name, 'phone', p.phone, 'gender', p.gender, 'active', p.active) order by p.created_at desc) from public.providers p), '[]'::jsonb) else '[]'::jsonb end,
    'requests', coalesce((select jsonb_agg(jsonb_build_object(
          'id', r.id, 'reference', r.reference, 'kind', r.kind, 'serviceId', r.service_id, 'serviceName', r.service_name,
          'name', r.name, 'phone', r.phone, 'address', r.address, 'details', r.details, 'medicine', r.medicine, 'gender', r.gender,
          'latitude', r.latitude, 'longitude', r.longitude, 'formattedAddress', r.formatted_address, 'locationNotes', r.location_notes,
          'status', r.status, 'createdAt', r.created_at, 'providerId', r.provider_id, 'clientId', r.client_id, 'ownerAdminId', r.owner_admin_id,
          'attachment', (r.attachment_path is not null), 'paid', (pay.id is not null)) order by r.created_at desc)
        from public.requests r left join public.payments pay on pay.request_id = r.id
        where v_admin or r.user_id = v_uid), '[]'::jsonb),
    'payments', case when v_admin then coalesce((select jsonb_agg(jsonb_build_object(
          'id', pay.id, 'requestId', pay.request_id, 'reference', r.reference, 'serviceName', r.service_name,
          'providerId', pay.provider_id, 'providerName', pay.provider_name, 'requestDate', r.created_at,
          'paidAt', pay.paid_at, 'amount', pay.amount) order by pay.paid_at desc)
        from public.payments pay join public.requests r on r.id = pay.request_id), '[]'::jsonb) else '[]'::jsonb end
  );
  return result;
end; $$;

-- ---------------------------------------------------------------------------
-- 6. Storage — allow anonymous uploads only under the "public/" prefix.
-- Reads stay admin-only (existing prescriptions_select_own_or_admin covers is_admin()).
-- ---------------------------------------------------------------------------
drop policy if exists "prescriptions_insert_public" on storage.objects;
create policy "prescriptions_insert_public" on storage.objects
  for insert to anon
  with check (bucket_id = 'prescriptions' and (storage.foldername(name))[1] = 'public');

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------
grant execute on function public.normalize_phone(text) to anon, authenticated;
grant execute on function public.create_public_request(uuid, text, uuid, text, text, text, text, text, integer, text, text, double precision, double precision, text, text, text, uuid) to anon, authenticated;
