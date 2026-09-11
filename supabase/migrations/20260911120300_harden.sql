-- Life Line — hardening
-- handle_new_user() is a trigger function only; it never needs to be callable as an RPC.
-- Triggers still fire regardless of EXECUTE grants (they run as the table owner).
revoke execute on function public.handle_new_user() from public, anon, authenticated;
