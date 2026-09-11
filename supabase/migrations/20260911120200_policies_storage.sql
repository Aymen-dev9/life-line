-- Life Line — RLS policies & private storage
-- Read policies only. There are deliberately NO insert/update/delete policies on any
-- table: every write goes through a SECURITY DEFINER RPC. RLS default-deny blocks
-- direct client writes even though Supabase grants the base table privileges.

-- Content is public UI text — readable by everyone (needed to render the shell/login).
create policy content_read on public.content
  for select to anon, authenticated using (true);

-- Patients see active services; admins see all.
create policy services_read on public.services
  for select to anon, authenticated using (active or public.is_admin());

-- Providers are admin-only.
create policy providers_read on public.providers
  for select to authenticated using (public.is_admin());

-- Patients read only their own requests; admins read all.
create policy requests_read on public.requests
  for select to authenticated using (user_id = auth.uid() or public.is_admin());

-- Payments (accounting) are admin-only.
create policy payments_read on public.payments
  for select to authenticated using (public.is_admin());

-- Profiles: own row, or any row for admins.
create policy profiles_read on public.profiles
  for select to authenticated using (id = auth.uid() or public.is_admin());

-- app_config, rate_limits and audit_log have RLS enabled and no policies:
-- they are reachable only through SECURITY DEFINER functions.

-- ---------------------------------------------------------------------------
-- Private storage bucket for prescription / medicine images.
-- Objects are stored under "{user_id}/{request_id}.webp".
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('prescriptions', 'prescriptions', false, 6291456, array['image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "prescriptions_insert_own" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'prescriptions' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "prescriptions_select_own_or_admin" on storage.objects
  for select to authenticated
  using (bucket_id = 'prescriptions' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));

create policy "prescriptions_update_own" on storage.objects
  for update to authenticated
  using (bucket_id = 'prescriptions' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'prescriptions' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "prescriptions_delete_own_or_admin" on storage.objects
  for delete to authenticated
  using (bucket_id = 'prescriptions' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));
