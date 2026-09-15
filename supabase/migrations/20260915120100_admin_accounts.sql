-- Life Line — five admin accounts (Supabase Auth) + allowlist.
-- Admin authentication stays on Supabase Auth. Each admin signs in with a username on
-- /admin/login which maps to a fixed <username>@lifeline.local email. Passwords are stored
-- ONLY as bcrypt hashes (pgcrypto), never plain text. The emails are added to the admin
-- allowlist so handle_new_user()/sync_profile() grant the 'admin' role automatically.
--
-- DEV/BOOTSTRAP passwords below MUST be rotated in production (admins can use the in-app
-- "change password" flow, or reset from the Supabase dashboard).
--
-- If your GoTrue/Supabase version rejects the auth.users/auth.identities inserts, create the
-- five users from the Supabase dashboard instead (Authentication → Users → Add user) using the
-- emails and passwords listed here; the allowlist + trigger will still grant them admin on login.

create extension if not exists pgcrypto;

-- 1. Add the five admin emails to the comma-separated allowlist (idempotent, preserves owner).
do $$
declare
  v_current text;
  v_emails  text[] := array['admin1@lifeline.local','admin2@lifeline.local','admin3@lifeline.local','admin4@lifeline.local','admin5@lifeline.local'];
  v_list    text[];
  v_email   text;
begin
  select value into v_current from public.app_config where key = 'admin_email';
  v_list := string_to_array(coalesce(v_current, ''), ',');
  -- trim + drop empties
  v_list := array(select btrim(x) from unnest(v_list) as x where btrim(x) <> '');
  foreach v_email in array v_emails loop
    if not (lower(v_email) = any (select lower(y) from unnest(v_list) as y)) then
      v_list := v_list || v_email;
    end if;
  end loop;
  insert into public.app_config(key, value) values ('admin_email', array_to_string(v_list, ','))
  on conflict (key) do update set value = excluded.value;
end $$;

-- 2. Seed the five Supabase Auth users with bcrypt passwords (guarded; safe to re-run).
do $$
declare
  v_defs jsonb := jsonb_build_array(
    jsonb_build_object('email','admin1@lifeline.local','name','مدير 1','password','LifeLine#Admin1'),
    jsonb_build_object('email','admin2@lifeline.local','name','مدير 2','password','LifeLine#Admin2'),
    jsonb_build_object('email','admin3@lifeline.local','name','مدير 3','password','LifeLine#Admin3'),
    jsonb_build_object('email','admin4@lifeline.local','name','مدير 4','password','LifeLine#Admin4'),
    jsonb_build_object('email','admin5@lifeline.local','name','مدير 5','password','LifeLine#Admin5')
  );
  v_def   jsonb;
  v_email text;
  v_uid   uuid;
begin
  for v_def in select * from jsonb_array_elements(v_defs) loop
    v_email := v_def->>'email';
    if exists (select 1 from auth.users where email = v_email) then
      continue;
    end if;
    v_uid := gen_random_uuid();
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      created_at, updated_at, raw_app_meta_data, raw_user_meta_data, is_super_admin,
      confirmation_token, recovery_token, email_change_token_new, email_change
    ) values (
      '00000000-0000-0000-0000-000000000000', v_uid, 'authenticated', 'authenticated', v_email,
      crypt(v_def->>'password', gen_salt('bf')), now(), now(), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('name', v_def->>'name'), false, '', '', '', ''
    );
    insert into auth.identities (
      id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
    ) values (
      gen_random_uuid(), v_uid, v_uid::text,
      jsonb_build_object('sub', v_uid::text, 'email', v_email, 'email_verified', true),
      'email', now(), now(), now()
    );
  end loop;
end $$;
