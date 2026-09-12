-- Life Line — admin allowlist
-- Treat app_config.admin_email as a comma-separated allowlist so more than one email
-- (e.g. the owner plus a fixed test admin) can hold the admin role. Role assignment stays
-- fully database-enforced; no client-side email checks. The actual email values are set at
-- runtime via app_config (never committed).
create or replace function public.is_email_admin(p_email text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from public.app_config c,
         unnest(string_to_array(lower(coalesce(c.value, '')), ',')) as e(email)
    where c.key = 'admin_email'
      and btrim(e.email) <> ''
      and btrim(e.email) = lower(coalesce(p_email, ''))
  );
$$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles(id, role, phone)
  values (new.id, case when public.is_email_admin(new.email) then 'admin' else 'patient' end, coalesce(new.phone, ''))
  on conflict (id) do nothing;
  return new;
end; $$;

create or replace function public.sync_profile()
returns public.profiles language plpgsql security definer set search_path = public as $$
declare v_email text; v_role text; result public.profiles;
begin
  if auth.uid() is null then raise exception 'UNAUTHORIZED'; end if;
  v_email := lower(coalesce(auth.jwt() ->> 'email', ''));
  v_role  := case when public.is_email_admin(v_email) then 'admin' else 'patient' end;
  insert into public.profiles(id, role) values (auth.uid(), v_role)
  on conflict (id) do update set role = v_role, updated_at = now()
  returning * into result;
  return result;
end; $$;
