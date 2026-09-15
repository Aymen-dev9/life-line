-- Life Line — admin ownership & responsibility. ADDITIVE & NON-DESTRUCTIVE.
-- Every request stays visible to all admins; at most one owner_admin_id at a time;
-- claims/approvals are atomic (no race can give two owners); transfers are audited.

-- ---------------------------------------------------------------------------
-- 1. Admin identity columns on profiles (username / active / last login).
-- ---------------------------------------------------------------------------
alter table public.profiles add column if not exists username      text;
alter table public.profiles add column if not exists admin_active  boolean not null default true;
alter table public.profiles add column if not exists last_login_at timestamptz;

-- ---------------------------------------------------------------------------
-- 2. History tables (admin-only read).
-- ---------------------------------------------------------------------------
create table if not exists public.request_status_history (
  id         uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.requests(id) on delete cascade,
  status     text not null,
  actor      uuid references public.profiles(id),
  note       text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists idx_status_history_request on public.request_status_history(request_id, created_at);
alter table public.request_status_history enable row level security;
drop policy if exists status_history_read on public.request_status_history;
create policy status_history_read on public.request_status_history for select to authenticated using (public.is_admin());

create table if not exists public.admin_ownership_history (
  id         uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.requests(id) on delete cascade,
  from_admin uuid references public.profiles(id),
  to_admin   uuid references public.profiles(id),
  changed_by uuid references public.profiles(id),
  reason     text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists idx_ownership_history_request on public.admin_ownership_history(request_id, created_at);
alter table public.admin_ownership_history enable row level security;
drop policy if exists ownership_history_read on public.admin_ownership_history;
create policy ownership_history_read on public.admin_ownership_history for select to authenticated using (public.is_admin());

-- ---------------------------------------------------------------------------
-- 3. sync_profile — capture username + last login (role logic unchanged).
-- ---------------------------------------------------------------------------
create or replace function public.sync_profile()
returns public.profiles language plpgsql security definer set search_path = public as $$
declare v_email text; v_role text; result public.profiles;
begin
  if auth.uid() is null then raise exception 'UNAUTHORIZED'; end if;
  v_email := lower(coalesce(auth.jwt() ->> 'email', ''));
  v_role  := case when public.is_email_admin(v_email) then 'admin' else 'patient' end;
  insert into public.profiles(id, role, username, last_login_at)
    values (auth.uid(), v_role, split_part(v_email, '@', 1), now())
  on conflict (id) do update set
    role = v_role,
    username = coalesce(nullif(profiles.username, ''), split_part(v_email, '@', 1)),
    last_login_at = now(),
    updated_at = now()
  returning * into result;
  return result;
end; $$;

-- ---------------------------------------------------------------------------
-- 4. Ownership RPCs (admin-only, atomic).
-- ---------------------------------------------------------------------------

-- Claim an unassigned request. Atomic: only the first caller succeeds.
create or replace function public.claim_request(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_changes integer; v_status text;
begin
  if not public.is_admin() then raise exception 'FORBIDDEN'; end if;
  update public.requests set owner_admin_id = v_uid where id = p_id and owner_admin_id is null;
  get diagnostics v_changes = row_count;
  if v_changes <> 1 then raise exception 'CONFLICT'; end if;
  select status into v_status from public.requests where id = p_id;
  insert into public.admin_ownership_history(request_id, from_admin, to_admin, changed_by, reason) values (p_id, null, v_uid, v_uid, 'claim');
  insert into public.request_status_history(request_id, status, actor, note) values (p_id, v_status, v_uid, 'claim');
  insert into public.audit_log(actor, action, entity) values (v_uid::text, 'request.claim', p_id::text);
end; $$;

-- Approve & take responsibility in one atomic step (pending -> approved, owner := me).
create or replace function public.approve_request(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_changes integer; v_prev uuid;
begin
  if not public.is_admin() then raise exception 'FORBIDDEN'; end if;
  select owner_admin_id into v_prev from public.requests where id = p_id;
  update public.requests set status = 'approved', owner_admin_id = v_uid
    where id = p_id and status = 'pending' and (owner_admin_id is null or owner_admin_id = v_uid);
  get diagnostics v_changes = row_count;
  if v_changes <> 1 then raise exception 'CONFLICT'; end if;
  if v_prev is null then
    insert into public.admin_ownership_history(request_id, from_admin, to_admin, changed_by, reason) values (p_id, null, v_uid, v_uid, 'approve');
  end if;
  insert into public.request_status_history(request_id, status, actor, note) values (p_id, 'approved', v_uid, '');
  insert into public.audit_log(actor, action, entity) values (v_uid::text, 'request.approve', p_id::text);
end; $$;

-- Reject a pending/approved request (owner takes responsibility for the rejection).
create or replace function public.reject_request(p_id uuid, p_reason text)
returns void language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_changes integer;
begin
  if not public.is_admin() then raise exception 'FORBIDDEN'; end if;
  update public.requests set status = 'cancelled', owner_admin_id = coalesce(owner_admin_id, v_uid)
    where id = p_id and status in ('pending', 'approved');
  get diagnostics v_changes = row_count;
  if v_changes <> 1 then raise exception 'CONFLICT'; end if;
  insert into public.request_status_history(request_id, status, actor, note) values (p_id, 'cancelled', v_uid, coalesce(p_reason, ''));
  insert into public.audit_log(actor, action, entity) values (v_uid::text, 'request.reject', p_id::text);
end; $$;

-- Transfer / take over responsibility (requires confirmation + optional reason at the UI).
create or replace function public.transfer_request(p_id uuid, p_to_admin uuid, p_reason text)
returns void language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_from uuid; v_changes integer;
begin
  if not public.is_admin() then raise exception 'FORBIDDEN'; end if;
  if not exists(select 1 from public.profiles where id = p_to_admin and role = 'admin' and admin_active) then raise exception 'NOT_FOUND'; end if;
  select owner_admin_id into v_from from public.requests where id = p_id;
  update public.requests set owner_admin_id = p_to_admin where id = p_id;
  get diagnostics v_changes = row_count;
  if v_changes <> 1 then raise exception 'NOT_FOUND'; end if;
  insert into public.admin_ownership_history(request_id, from_admin, to_admin, changed_by, reason) values (p_id, v_from, p_to_admin, v_uid, coalesce(p_reason, ''));
  insert into public.audit_log(actor, action, entity) values (v_uid::text, 'request.transfer', p_id::text);
end; $$;

-- ---------------------------------------------------------------------------
-- 5. forward/complete now claim-if-unowned and log status history.
-- ---------------------------------------------------------------------------
create or replace function public.forward_request(p_id uuid, p_provider_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_changes integer;
begin
  if not public.is_admin() then raise exception 'FORBIDDEN'; end if;
  if not exists(select 1 from public.providers where id = p_provider_id and active = true) then raise exception 'NOT_FOUND'; end if;
  update public.requests set provider_id = p_provider_id, status = 'forwarded', owner_admin_id = coalesce(owner_admin_id, v_uid)
    where id = p_id and status in ('pending', 'approved');
  get diagnostics v_changes = row_count;
  if v_changes <> 1 then raise exception 'CONFLICT'; end if;
  insert into public.request_status_history(request_id, status, actor, note) values (p_id, 'forwarded', v_uid, '');
  insert into public.audit_log(actor, action, entity) values (v_uid::text, 'forward', p_id::text);
end; $$;

create or replace function public.complete_request(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_changes integer;
begin
  if not public.is_admin() then raise exception 'FORBIDDEN'; end if;
  update public.requests set status = 'completed' where id = p_id and status = 'forwarded';
  get diagnostics v_changes = row_count;
  if v_changes <> 1 then raise exception 'CONFLICT'; end if;
  insert into public.request_status_history(request_id, status, actor, note) values (p_id, 'completed', v_uid, '');
  insert into public.audit_log(actor, action, entity) values (v_uid::text, 'complete', p_id::text);
end; $$;

-- ---------------------------------------------------------------------------
-- 6. Per-request timeline (created + status + ownership), admin-only.
-- ---------------------------------------------------------------------------
create or replace function public.request_history(p_id uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare result jsonb;
begin
  if not public.is_admin() then raise exception 'FORBIDDEN'; end if;
  result := jsonb_build_object(
    'created', (select created_at from public.requests where id = p_id),
    'status', coalesce((select jsonb_agg(jsonb_build_object('status', h.status, 'note', h.note, 'at', h.created_at,
        'by', (select coalesce(nullif(p.name,''), p.username) from public.profiles p where p.id = h.actor)) order by h.created_at)
      from public.request_status_history h where h.request_id = p_id), '[]'::jsonb),
    'ownership', coalesce((select jsonb_agg(jsonb_build_object('reason', o.reason, 'at', o.created_at,
        'from', (select coalesce(nullif(p.name,''), p.username) from public.profiles p where p.id = o.from_admin),
        'to', (select coalesce(nullif(p.name,''), p.username) from public.profiles p where p.id = o.to_admin),
        'by', (select coalesce(nullif(p.name,''), p.username) from public.profiles p where p.id = o.changed_by)) order by o.created_at)
      from public.admin_ownership_history o where o.request_id = p_id), '[]'::jsonb)
  );
  return result;
end; $$;

-- ---------------------------------------------------------------------------
-- 7. get_workspace — include the admin roster + each request's owner name.
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
    'admins', case when v_admin then coalesce((select jsonb_agg(jsonb_build_object('id', a.id, 'name', coalesce(nullif(a.name,''), a.username), 'username', a.username, 'active', a.admin_active) order by a.username) from public.profiles a where a.role = 'admin'), '[]'::jsonb) else '[]'::jsonb end,
    'requests', coalesce((select jsonb_agg(jsonb_build_object(
          'id', r.id, 'reference', r.reference, 'kind', r.kind, 'serviceId', r.service_id, 'serviceName', r.service_name,
          'name', r.name, 'phone', r.phone, 'address', r.address, 'details', r.details, 'medicine', r.medicine, 'gender', r.gender,
          'latitude', r.latitude, 'longitude', r.longitude, 'formattedAddress', r.formatted_address, 'locationNotes', r.location_notes,
          'status', r.status, 'createdAt', r.created_at, 'providerId', r.provider_id, 'clientId', r.client_id,
          'ownerAdminId', r.owner_admin_id, 'ownerAdminName', (select coalesce(nullif(p.name,''), p.username) from public.profiles p where p.id = r.owner_admin_id),
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
-- Grants
-- ---------------------------------------------------------------------------
grant execute on function public.claim_request(uuid)    to authenticated;
grant execute on function public.approve_request(uuid)  to authenticated;
grant execute on function public.reject_request(uuid, text) to authenticated;
grant execute on function public.transfer_request(uuid, uuid, text) to authenticated;
grant execute on function public.request_history(uuid)  to authenticated;
