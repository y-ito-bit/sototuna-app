-- Provisioning uses the server-only service role, never a browser key.
grant usage on schema public to service_role;
grant select, insert on public.profiles, public.memberships to service_role;
