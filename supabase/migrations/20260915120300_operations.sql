-- Life Line — notifications, client lookup/reports, admin roster, backup. ADDITIVE.

-- ---------------------------------------------------------------------------
-- 1. Notifications log (WhatsApp/other). Failures here never block core workflow.
-- ---------------------------------------------------------------------------
create table if not exists public.notifications (
  id         uuid primary key default gen_random_uuid(),
  request_id uuid references public.requests(id) on delete cascade,
  channel    text not null default 'whatsapp',
  audience   text not null check (audience in ('client', 'provider')),
  status     text not null default 'pending' check (status in ('pending', 'sent', 'failed', 'mock')),
  detail     text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists idx_notifications_request on public.notifications(request_id, created_at desc);
alter table public.notifications enable row level security;
drop policy if exists notifications_read on public.notifications;
create policy notifications_read on public.notifications for select to authenticated using (public.is_admin());

create or replace function public.record_notification(p_request_id uuid, p_audience text, p_channel text, p_status text, p_detail text)
returns void language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid();
begin
  if not public.is_admin() then raise exception 'FORBIDDEN'; end if;
  insert into public.notifications(request_id, audience, channel, status, detail)
    values (p_request_id, p_audience, coalesce(nullif(p_channel,''),'whatsapp'), coalesce(nullif(p_status,''),'mock'), coalesce(p_detail,''));
  insert into public.audit_log(actor, action, entity) values (v_uid::text, 'notify.' || coalesce(p_status,'mock'), coalesce(p_request_id::text,'-'));
end; $$;

-- ---------------------------------------------------------------------------
-- 2. Client lookup by phone/name (admin) + a full per-client report.
-- ---------------------------------------------------------------------------
create or replace function public.search_clients(p_query text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_norm text; result jsonb;
begin
  if not public.is_admin() then raise exception 'FORBIDDEN'; end if;
  if coalesce(btrim(p_query), '') = '' then return '[]'::jsonb; end if;
  v_norm := public.normalize_phone(p_query);
  result := coalesce((select jsonb_agg(row order by row->>'lastAt' desc) from (
    select jsonb_build_object(
      'id', c.id, 'fullName', c.full_name, 'phone', c.phone, 'gender', c.gender, 'age', c.age,
      'requestCount', (select count(*) from public.requests r where r.client_id = c.id),
      'lastAt', (select max(r.created_at) from public.requests r where r.client_id = c.id)
    ) as row
    from public.clients c
    where c.phone ilike '%' || v_norm || '%' or c.phone ilike '%' || p_query || '%' or c.full_name ilike '%' || p_query || '%'
    limit 50
  ) s), '[]'::jsonb);
  return result;
end; $$;

create or replace function public.client_report(p_client_id uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare result jsonb;
begin
  if not public.is_admin() then raise exception 'FORBIDDEN'; end if;
  result := jsonb_build_object(
    'client', (select jsonb_build_object('id', c.id, 'fullName', c.full_name, 'phone', c.phone, 'gender', c.gender, 'age', c.age, 'createdAt', c.created_at) from public.clients c where c.id = p_client_id),
    'requests', coalesce((select jsonb_agg(jsonb_build_object(
        'id', r.id, 'reference', r.reference, 'kind', r.kind, 'serviceName', r.service_name, 'status', r.status,
        'medicine', r.medicine, 'details', r.details, 'createdAt', r.created_at, 'attachment', (r.attachment_path is not null),
        'formattedAddress', r.formatted_address, 'locationNotes', r.location_notes,
        'providerName', (select p.name from public.providers p where p.id = r.provider_id),
        'ownerAdmin', (select coalesce(nullif(pr.name,''), pr.username) from public.profiles pr where pr.id = r.owner_admin_id)
      ) order by r.created_at desc) from public.requests r where r.client_id = p_client_id), '[]'::jsonb)
  );
  return result;
end; $$;

-- ---------------------------------------------------------------------------
-- 3. Admin roster with per-admin request counts (admin-only).
-- ---------------------------------------------------------------------------
create or replace function public.get_admins()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare result jsonb;
begin
  if not public.is_admin() then raise exception 'FORBIDDEN'; end if;
  result := coalesce((select jsonb_agg(jsonb_build_object(
      'id', a.id, 'name', coalesce(nullif(a.name,''), a.username), 'username', a.username,
      'active', a.admin_active, 'lastLoginAt', a.last_login_at,
      'activeRequests', (select count(*) from public.requests r where r.owner_admin_id = a.id and r.status in ('approved','forwarded')),
      'completedRequests', (select count(*) from public.requests r where r.owner_admin_id = a.id and r.status = 'completed')
    ) order by a.username) from public.profiles a where a.role = 'admin'), '[]'::jsonb);
  return result;
end; $$;

-- ---------------------------------------------------------------------------
-- 4. System backup (admin-only). Excludes passwords, tokens, secrets, app_config.
-- ---------------------------------------------------------------------------
create or replace function public.export_backup()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare result jsonb;
begin
  if not public.is_admin() then raise exception 'FORBIDDEN'; end if;
  result := jsonb_build_object(
    'exportedAt', now(),
    'version', 1,
    'services', coalesce((select jsonb_agg(to_jsonb(s) - 'id') from public.services s), '[]'::jsonb),
    'providers', coalesce((select jsonb_agg(jsonb_build_object('name', p.name, 'phone', p.phone, 'gender', p.gender, 'active', p.active, 'createdAt', p.created_at)) from public.providers p), '[]'::jsonb),
    'clients', coalesce((select jsonb_agg(jsonb_build_object('fullName', c.full_name, 'phone', c.phone, 'gender', c.gender, 'age', c.age, 'createdAt', c.created_at)) from public.clients c), '[]'::jsonb),
    'requests', coalesce((select jsonb_agg(jsonb_build_object(
        'reference', r.reference, 'kind', r.kind, 'serviceName', r.service_name, 'name', r.name, 'phone', r.phone,
        'status', r.status, 'gender', r.gender, 'medicine', r.medicine, 'details', r.details,
        'formattedAddress', r.formatted_address, 'locationNotes', r.location_notes, 'latitude', r.latitude, 'longitude', r.longitude,
        'createdAt', r.created_at, 'ownerAdmin', (select pr.username from public.profiles pr where pr.id = r.owner_admin_id),
        'providerName', (select pv.name from public.providers pv where pv.id = r.provider_id))) from public.requests r), '[]'::jsonb),
    'payments', coalesce((select jsonb_agg(jsonb_build_object('reference', (select rr.reference from public.requests rr where rr.id = pay.request_id), 'providerName', pay.provider_name, 'amount', pay.amount, 'paidAt', pay.paid_at)) from public.payments pay), '[]'::jsonb),
    -- Admin METADATA only — never password hashes, tokens or emails.
    'admins', coalesce((select jsonb_agg(jsonb_build_object('username', a.username, 'name', a.name, 'active', a.admin_active)) from public.profiles a where a.role = 'admin'), '[]'::jsonb)
  );
  return result;
end; $$;

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------
grant execute on function public.record_notification(uuid, text, text, text, text) to authenticated;
grant execute on function public.search_clients(text) to authenticated;
grant execute on function public.client_report(uuid)  to authenticated;
grant execute on function public.get_admins()         to authenticated;
grant execute on function public.export_backup()      to authenticated;
