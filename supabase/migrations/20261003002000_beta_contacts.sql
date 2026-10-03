-- ベータ用IDでログインした利用者は、本人の架空アドレスだけ保存できる。
create function private.guard_beta_contact() returns trigger
language plpgsql security invoker set search_path = '' as $$
declare login_email text := (select auth.jwt() ->> 'email');
begin
  if login_email ~ '^beta[0-9]{3,6}@beta\.sototuna\.invalid$'
     and NEW.contact_email is distinct from login_email then
    raise exception 'Beta accounts must use their issued test email' using errcode = '23514';
  end if;
  return NEW;
end;
$$;
revoke all on function private.guard_beta_contact() from public;
create trigger guard_beta_contact before insert or update on public.cooperations
for each row execute function private.guard_beta_contact();
