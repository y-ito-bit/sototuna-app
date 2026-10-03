-- Contact data lives separately from public profile and recruitment data.
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create table public.memberships (
  user_id uuid primary key references auth.users(id) on delete cascade,
  approved_at timestamptz not null default now()
);
alter table public.memberships enable row level security;
revoke all on public.memberships from anon, authenticated;
grant select on public.memberships to authenticated;
create policy membership_self on public.memberships for select to authenticated
  using (user_id = (select auth.uid()));

create function private.is_member() returns boolean
language sql stable security invoker set search_path = '' as $$
  select exists(select 1 from public.memberships where user_id = (select auth.uid()));
$$;
revoke all on function private.is_member() from public;
grant execute on function private.is_member() to authenticated;

create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade default auth.uid(),
  display_name text not null check(char_length(btrim(display_name)) between 1 and 10),
  affiliation text not null check(affiliation in ('current','obog','teacher','staff')),
  generation integer check(generation between 1 and 100),
  seminar text check(char_length(seminar) <= 40),
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
revoke all on public.profiles from anon, authenticated;
grant select, insert, update on public.profiles to authenticated;
create policy profile_read on public.profiles for select to authenticated
  using (user_id = (select auth.uid()) or (select private.is_member()));
create policy profile_create on public.profiles for insert to authenticated
  with check(user_id = (select auth.uid()));
create policy profile_edit on public.profiles for update to authenticated
  using(user_id = (select auth.uid())) with check(user_id = (select auth.uid()));

create table public.recruitments (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(user_id) default auth.uid(),
  kind text not null check(kind in ('survey','brainstorm','event','other')),
  title text not null check(char_length(btrim(title)) between 1 and 30),
  body text not null check(char_length(btrim(body)) between 1 and 200),
  deadline date not null,
  status text not null default 'open' check(status in ('open','closed')),
  created_at timestamptz not null default now()
);
create index recruitments_owner on public.recruitments(owner_id);
alter table public.recruitments enable row level security;
revoke all on public.recruitments from anon, authenticated;
grant select, insert, update, delete on public.recruitments to authenticated;
create policy recruitment_read on public.recruitments for select to authenticated
  using((select private.is_member()));
create policy recruitment_create on public.recruitments for insert to authenticated
  with check((select private.is_member()) and owner_id = (select auth.uid()));
create policy recruitment_edit on public.recruitments for update to authenticated
  using((select private.is_member()) and owner_id = (select auth.uid()))
  with check((select private.is_member()) and owner_id = (select auth.uid()));
create policy recruitment_delete on public.recruitments for delete to authenticated
  using((select private.is_member()) and owner_id = (select auth.uid()));

create table public.cooperations (
  recruitment_id uuid not null references public.recruitments(id) on delete cascade,
  helper_id uuid not null references public.profiles(user_id) default auth.uid(),
  contact_email text not null check(char_length(contact_email) <= 254 and contact_email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
  consent_version integer not null check(consent_version = 1),
  consent_at timestamptz not null default now(),
  primary key(recruitment_id, helper_id)
);
create index cooperations_helper on public.cooperations(helper_id);
alter table public.cooperations enable row level security;
revoke all on public.cooperations from anon, authenticated;
grant select, insert, update, delete on public.cooperations to authenticated;
create policy cooperation_read on public.cooperations for select to authenticated
  using((select private.is_member()) and (helper_id = (select auth.uid()) or exists(
      select 1 from public.recruitments r where r.id = recruitment_id and r.owner_id = (select auth.uid())
    )));
create policy cooperation_create on public.cooperations for insert to authenticated
  with check((select private.is_member()) and helper_id = (select auth.uid()) and exists(
    select 1 from public.recruitments r where r.id = recruitment_id and r.owner_id <> (select auth.uid())
      and r.status = 'open' and r.deadline >= current_date
  ));
create policy cooperation_edit on public.cooperations for update to authenticated
  using((select private.is_member()) and helper_id = (select auth.uid()))
  with check((select private.is_member()) and helper_id = (select auth.uid()) and exists(
    select 1 from public.recruitments r where r.id = recruitment_id and r.owner_id <> (select auth.uid())
      and r.status = 'open' and r.deadline >= current_date
  ));
-- Withdrawal remains possible after closing or removing membership approval.
create policy cooperation_withdraw on public.cooperations for delete to authenticated
  using(helper_id = (select auth.uid()));

create function private.stamp_cooperation() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if TG_OP = 'UPDATE' and (NEW.recruitment_id <> OLD.recruitment_id or NEW.helper_id <> OLD.helper_id) then
    raise exception 'Cooperation identity cannot change' using errcode = '23514';
  end if;
  NEW.consent_at := now();
  return NEW;
end;
$$;
revoke all on function private.stamp_cooperation() from public;
create trigger stamp_cooperation before insert or update on public.cooperations
  for each row execute function private.stamp_cooperation();

-- API exposes counts without exposing contact records; only approved members may call.
create function public.recruitment_counts() returns table(recruitment_id uuid, helper_count bigint)
language sql stable security definer set search_path = '' as $$
  select c.recruitment_id, count(*) from public.cooperations c
  where exists(select 1 from public.memberships m where m.user_id = (select auth.uid()))
  group by c.recruitment_id;
$$;
revoke all on function public.recruitment_counts() from public, anon;
grant execute on function public.recruitment_counts() to authenticated;
