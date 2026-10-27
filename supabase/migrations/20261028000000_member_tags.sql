-- 2026-10-28 my tags on the profile (取組 or 取組:中身, e.g. "pbl:sumoto"). Members can read them; only the owner edits.
-- The choices live in public/tag-catalog.js; the database only checks the shape so new choices need no migration.
create function private.valid_tags(value jsonb) returns boolean
language sql immutable set search_path='' as $$
 select jsonb_typeof(value)='array' and jsonb_array_length(value)<=60
  and not exists(select 1 from jsonb_array_elements(value) e
   where jsonb_typeof(e)<>'string' or (e#>>'{}') !~ '^[a-z0-9_]{1,30}(:[a-z0-9_]{1,40})?$');
$$;
revoke all on function private.valid_tags(jsonb) from public;
grant execute on function private.valid_tags(jsonb) to authenticated;
alter table public.profiles add column tags jsonb not null default '[]'::jsonb;
alter table public.profiles add constraint profile_tags_valid check(private.valid_tags(tags));
