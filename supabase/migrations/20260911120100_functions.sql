-- Life Line — functions & RPCs
-- All mutations run as SECURITY DEFINER functions that enforce authorization in the
-- database itself (auth.uid() / is_admin()). No table has a direct write policy, so
-- every write must go through one of these audited entry points.

-- Admin check (SECURITY DEFINER so it can read profiles without tripping RLS recursion).
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin');
$$;

-- Create a profile automatically whenever a Supabase auth user is created.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_admin text;
begin
  select value into v_admin from public.app_config where key = 'admin_email';
  insert into public.profiles(id, role, phone)
  values (
    new.id,
    case when coalesce(v_admin, '') <> '' and lower(coalesce(new.email, '')) = lower(v_admin) then 'admin' else 'patient' end,
    coalesce(new.phone, '')
  )
  on conflict (id) do nothing;
  return new;
end; $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Ensure the caller has a profile and re-derive admin from the configured email.
-- Called once per successful login. Admin status is decided from the verified JWT email,
-- never from client input.
create or replace function public.sync_profile()
returns public.profiles language plpgsql security definer set search_path = public as $$
declare v_admin text; v_email text; v_role text; result public.profiles;
begin
  if auth.uid() is null then raise exception 'UNAUTHORIZED'; end if;
  select value into v_admin from public.app_config where key = 'admin_email';
  v_email := lower(coalesce(auth.jwt() ->> 'email', ''));
  v_role  := case when coalesce(v_admin, '') <> '' and v_email = lower(v_admin) then 'admin' else 'patient' end;
  insert into public.profiles(id, role) values (auth.uid(), v_role)
  on conflict (id) do update set role = v_role, updated_at = now()
  returning * into result;
  return result;
end; $$;

-- Patient updates their own contact profile (cannot change their role).
create or replace function public.update_profile(p_name text, p_phone text, p_address text)
returns public.profiles language plpgsql security definer set search_path = public as $$
declare result public.profiles;
begin
  if auth.uid() is null then raise exception 'UNAUTHORIZED'; end if;
  update public.profiles set name = p_name, phone = p_phone, address = p_address, updated_at = now()
  where id = auth.uid() returning * into result;
  if not found then raise exception 'NOT_FOUND'; end if;
  return result;
end; $$;

-- Sliding-window rate limiter. Key is hashed so no raw identifier is stored.
create or replace function public.rate_limit(p_key text, p_max integer, p_seconds integer)
returns void language plpgsql security definer set search_path = public as $$
declare now_ms bigint := (extract(epoch from clock_timestamp()) * 1000)::bigint; c integer; k text := md5(p_key);
begin
  delete from public.rate_limits where reset_at < now_ms;
  insert into public.rate_limits(key, count, reset_at) values (k, 1, now_ms + p_seconds * 1000)
  on conflict (key) do update set count = public.rate_limits.count + 1
  returning count into c;
  if c > p_max then raise exception 'RATE_LIMIT'; end if;
end; $$;

-- Public read of the editable content document (values + revision).
create or replace function public.get_content()
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object('values', c.values, 'revision', c.revision) from public.content c where c.id = 1;
$$;

-- Admin updates the editable content document with optimistic concurrency.
create or replace function public.update_content(p_values jsonb, p_revision integer)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_current integer; result jsonb;
begin
  if not public.is_admin() then raise exception 'FORBIDDEN'; end if;
  select revision into v_current from public.content where id = 1 for update;
  if v_current <> p_revision then raise exception 'CONFLICT'; end if;
  update public.content as c set "values" = c."values" || p_values, revision = c.revision + 1 where c.id = 1;
  insert into public.audit_log(actor, action, entity) values (auth.uid()::text, 'content.update', 'site');
  select jsonb_build_object('values', c.values, 'revision', c.revision) into result from public.content c where c.id = 1;
  return result;
end; $$;

-- Create a medical or pharmacy request (with optional map location + attachment path).
create or replace function public.create_request(
  p_id uuid, p_kind text, p_service_id uuid, p_pharmacy_label text,
  p_name text, p_phone text, p_address text, p_details text, p_medicine text, p_gender text,
  p_latitude double precision, p_longitude double precision, p_formatted_address text,
  p_location_notes text, p_attachment_path text, p_submission_key uuid
) returns jsonb language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_service_name text; v_reference text; v_row record;
begin
  if v_uid is null then raise exception 'UNAUTHORIZED'; end if;
  select id, user_id, reference into v_row from public.requests where submission_key = p_submission_key;
  if found then
    if v_row.user_id <> v_uid then raise exception 'CONFLICT'; end if;
    return jsonb_build_object('id', v_row.id, 'reference', v_row.reference);
  end if;
  if p_kind = 'medical' then
    select name into v_service_name from public.services where id = p_service_id and active = true;
    if v_service_name is null then raise exception 'INVALID'; end if;
  else
    v_service_name := coalesce(nullif(p_pharmacy_label, ''), 'الصيدلية');
    if coalesce(p_medicine, '') = '' and coalesce(p_attachment_path, '') = '' then raise exception 'MEDICINE'; end if;
  end if;
  v_reference := 'R-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
  insert into public.requests(
    id, reference, user_id, kind, service_id, service_name, name, phone, address, details, medicine, gender,
    latitude, longitude, formatted_address, location_notes, attachment_path, submission_key
  ) values (
    coalesce(p_id, gen_random_uuid()), v_reference, v_uid, p_kind,
    case when p_kind = 'medical' then p_service_id else null end, v_service_name,
    p_name, p_phone, coalesce(p_address, ''), coalesce(p_details, ''), coalesce(p_medicine, ''), coalesce(p_gender, 'any'),
    p_latitude, p_longitude, p_formatted_address, coalesce(p_location_notes, ''), p_attachment_path, p_submission_key
  ) returning id, reference into v_row;
  insert into public.audit_log(actor, action, entity) values (v_uid::text, 'request.create.consent', v_row.id::text);
  return jsonb_build_object('id', v_row.id, 'reference', v_row.reference);
end; $$;

-- Admin: add or edit a service.
create or replace function public.upsert_service(p_id uuid, p_name text, p_active boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'FORBIDDEN'; end if;
  if p_id is null then
    insert into public.services(name, active) values (p_name, p_active);
  else
    update public.services set name = p_name, active = p_active where id = p_id;
    if not found then raise exception 'NOT_FOUND'; end if;
  end if;
  insert into public.audit_log(actor, action, entity) values (auth.uid()::text, 'service', coalesce(p_id::text, 'new'));
end; $$;

-- Admin: add or edit a provider.
create or replace function public.upsert_provider(p_id uuid, p_name text, p_phone text, p_gender text, p_active boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'FORBIDDEN'; end if;
  if p_id is null then
    insert into public.providers(name, phone, gender, active) values (p_name, p_phone, p_gender, p_active);
  else
    update public.providers set name = p_name, phone = p_phone, gender = p_gender, active = p_active where id = p_id;
    if not found then raise exception 'NOT_FOUND'; end if;
  end if;
  insert into public.audit_log(actor, action, entity) values (auth.uid()::text, 'provider', coalesce(p_id::text, 'new'));
end; $$;

-- Admin: delete a service/provider, or deactivate it if it is referenced by a request.
create or replace function public.delete_catalog(p_kind text, p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_used boolean;
begin
  if not public.is_admin() then raise exception 'FORBIDDEN'; end if;
  if p_kind = 'service' then
    select exists(select 1 from public.requests where service_id = p_id) into v_used;
    if v_used then update public.services set active = false where id = p_id;
    else delete from public.services where id = p_id; end if;
  elsif p_kind = 'provider' then
    select exists(select 1 from public.requests where provider_id = p_id) into v_used;
    if v_used then update public.providers set active = false where id = p_id;
    else delete from public.providers where id = p_id; end if;
  else
    raise exception 'INVALID';
  end if;
  insert into public.audit_log(actor, action, entity) values (auth.uid()::text, 'delete', p_id::text);
end; $$;

-- Admin: forward a pending request to an active provider.
create or replace function public.forward_request(p_id uuid, p_provider_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_changes integer;
begin
  if not public.is_admin() then raise exception 'FORBIDDEN'; end if;
  if not exists(select 1 from public.providers where id = p_provider_id and active = true) then raise exception 'NOT_FOUND'; end if;
  update public.requests set provider_id = p_provider_id, status = 'forwarded' where id = p_id and status = 'pending';
  get diagnostics v_changes = row_count;
  if v_changes <> 1 then raise exception 'CONFLICT'; end if;
  insert into public.audit_log(actor, action, entity) values (auth.uid()::text, 'forward', p_id::text);
end; $$;

-- Admin: mark a forwarded request as completed.
create or replace function public.complete_request(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_changes integer;
begin
  if not public.is_admin() then raise exception 'FORBIDDEN'; end if;
  update public.requests set status = 'completed' where id = p_id and status = 'forwarded';
  get diagnostics v_changes = row_count;
  if v_changes <> 1 then raise exception 'CONFLICT'; end if;
  insert into public.audit_log(actor, action, entity) values (auth.uid()::text, 'complete', p_id::text);
end; $$;

-- Admin: record a payment against a forwarded/completed request.
create or replace function public.record_payment(p_id uuid, p_amount bigint)
returns void language plpgsql security definer set search_path = public as $$
declare v_req record; v_provider record;
begin
  if not public.is_admin() then raise exception 'FORBIDDEN'; end if;
  select provider_id, status into v_req from public.requests where id = p_id;
  if v_req.provider_id is null or v_req.status = 'pending' then raise exception 'CONFLICT'; end if;
  if exists(select 1 from public.payments where request_id = p_id) then raise exception 'CONFLICT'; end if;
  select id, name into v_provider from public.providers where id = v_req.provider_id;
  if v_provider.id is null then raise exception 'NOT_FOUND'; end if;
  insert into public.payments(request_id, provider_id, provider_name, amount, recorded_by)
  values (p_id, v_provider.id, v_provider.name, p_amount, auth.uid());
  insert into public.audit_log(actor, action, entity) values (auth.uid()::text, 'paid', p_id::text);
end; $$;

-- Assemble the full workspace payload for the current user (admin sees everything).
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
          'status', r.status, 'createdAt', r.created_at, 'providerId', r.provider_id,
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

-- Return the attachment storage path for a request the caller is allowed to see.
create or replace function public.request_attachment_path(p_id uuid)
returns text language plpgsql stable security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_row record;
begin
  if v_uid is null then raise exception 'UNAUTHORIZED'; end if;
  select user_id, attachment_path into v_row from public.requests where id = p_id;
  if v_row is null or v_row.attachment_path is null then raise exception 'NOT_FOUND'; end if;
  if v_row.user_id <> v_uid and not public.is_admin() then raise exception 'NOT_FOUND'; end if;
  return v_row.attachment_path;
end; $$;

-- ---------------------------------------------------------------------------
-- Execute grants: lock down, then open only what each role needs.
-- ---------------------------------------------------------------------------
revoke execute on all functions in schema public from public, anon;

-- is_admin() is evaluated inside RLS policies as the querying role, so both roles need execute.
grant execute on function public.is_admin() to anon, authenticated;
grant execute on function public.get_content() to anon, authenticated;
grant execute on function public.rate_limit(text, integer, integer) to anon, authenticated;

grant execute on function public.sync_profile() to authenticated;
grant execute on function public.update_profile(text, text, text) to authenticated;
grant execute on function public.get_workspace() to authenticated;
grant execute on function public.create_request(uuid, text, uuid, text, text, text, text, text, text, text, double precision, double precision, text, text, text, uuid) to authenticated;
grant execute on function public.request_attachment_path(uuid) to authenticated;
grant execute on function public.update_content(jsonb, integer) to authenticated;
grant execute on function public.upsert_service(uuid, text, boolean) to authenticated;
grant execute on function public.upsert_provider(uuid, text, text, text, boolean) to authenticated;
grant execute on function public.delete_catalog(text, uuid) to authenticated;
grant execute on function public.forward_request(uuid, uuid) to authenticated;
grant execute on function public.complete_request(uuid) to authenticated;
grant execute on function public.record_payment(uuid, bigint) to authenticated;
