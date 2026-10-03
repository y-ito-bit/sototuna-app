-- Beta community features. Anonymous posts are exposed only through a sanitized feed.
alter table public.profiles add column avatar text not null default '🌱' check(avatar in ('🌱','🐸','🐧','🐰','🦊','🐹','🐻','🐱','🐺','🦉'));
alter table public.profiles add column role_label text not null default '' check(char_length(role_label)<=40);
alter table public.profiles add column bio text not null default '' check(char_length(bio)<=200);
create function private.protect_profile_scope() returns trigger language plpgsql set search_path='' as $$
begin
  if auth.uid() is not null and (NEW.affiliation<>OLD.affiliation or NEW.seminar is distinct from OLD.seminar or NEW.user_id<>OLD.user_id) then
    raise exception '所属区分・ゼミは運営が設定します';
  end if;
  return NEW;
end $$;
revoke all on function private.protect_profile_scope() from public;
create trigger protect_profile_scope before update on public.profiles for each row execute function private.protect_profile_scope();

create table public.community_records (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(user_id) default auth.uid(),
  kind text not null check(kind in ('question','answer','curious','thanks','book','event_join','host','board_reply','touron','touron_comment','event_request','report','preferences','visit','seminar','message','draft')),
  target_id text not null default '-' check(char_length(target_id) between 1 and 160),
  payload jsonb not null default '{}' check(jsonb_typeof(payload)='object' and octet_length(payload::text)<=2500000),
  created_at timestamptz not null default now(),
  dedupe_key text generated always as (case when kind in ('curious','thanks','event_join','host','preferences','visit','seminar','draft') then target_id else id::text end) stored,
  unique(owner_id,kind,dedupe_key)
);
create index community_target on public.community_records(kind,target_id);
alter table public.community_records enable row level security;
revoke all on public.community_records from anon,authenticated;
grant select,insert,update,delete on public.community_records to authenticated;
create policy community_own_read on public.community_records for select to authenticated
  using(owner_id=auth.uid() and private.is_member());
create policy community_create on public.community_records for insert to authenticated
  with check(owner_id=auth.uid() and private.is_member());
create policy community_edit on public.community_records for update to authenticated
  using(owner_id=auth.uid() and private.is_member()) with check(owner_id=auth.uid() and private.is_member());
create policy community_delete on public.community_records for delete to authenticated
  using(owner_id=auth.uid());

create function private.can_seminar(value text) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.profiles p join public.memberships m on m.user_id=p.user_id
 where p.user_id=auth.uid() and (p.affiliation<>'current' or p.seminar=value));
$$;
revoke all on function private.can_seminar(text) from public;
grant execute on function private.can_seminar(text) to authenticated;

create function private.validate_community() returns trigger language plpgsql security definer set search_path='' as $$
declare p jsonb:=NEW.payload; content text; target uuid; role_name text; sem text;
begin
 if TG_OP='UPDATE' then
   if NEW.id<>OLD.id or NEW.owner_id<>OLD.owner_id or NEW.kind<>OLD.kind or NEW.target_id<>OLD.target_id then raise exception '投稿の所有者・種類・宛先は変更できません'; end if;
   NEW.created_at:=OLD.created_at;
 else NEW.created_at:=now(); end if;
 select affiliation,seminar into role_name,sem from public.profiles where user_id=NEW.owner_id;
 if NEW.kind in ('question','answer','board_reply','touron','touron_comment','event_request','message') then
   content:=btrim(coalesce(p->>'text',''));
   if char_length(content) not between 1 and (case when NEW.kind in ('question','answer') then 300 else 1000 end) then raise exception '本文の文字数を確認してください'; end if;
 end if;
 if NEW.kind='question' then
   if coalesce(p->>'category','') not in ('career','work','research','life') then raise exception 'カテゴリを確認してください'; end if;
   if p->>'image' is not null and (char_length(p->>'image')>2200000 or p->>'image' !~ '^data:image/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$') then raise exception '添付画像を確認してください'; end if;
   if p->>'bestAnswerId' is not null and not exists(select 1 from public.community_records r where r.id=(p->>'bestAnswerId')::uuid and r.kind='answer' and r.target_id=NEW.id::text) then raise exception 'この質問への回答を選んでください'; end if;
   NEW.payload:=jsonb_build_object('text',content,'category',p->>'category','anonymous',coalesce((p->>'anonymous')::boolean,true),'image',p->'image','solved',coalesce((p->>'solved')::boolean,false),'bestAnswerId',p->'bestAnswerId');
 elsif NEW.kind in ('answer','curious','thanks','report') then
   target:=NEW.target_id::uuid;
   if not exists(select 1 from public.community_records r where r.id=target and r.kind=(case when NEW.kind='thanks' then 'answer' else 'question' end)) then raise exception '対象の投稿が見つかりません'; end if;
   if NEW.kind='thanks' and exists(select 1 from public.community_records where id=target and owner_id=NEW.owner_id) then raise exception '自分の回答にはありがとうを送れません'; end if;
   if NEW.kind='answer' then NEW.payload:=jsonb_build_object('text',content);
   elsif NEW.kind='report' then
     if coalesce(p->>'reason','') not in ('spam','abuse','privacy','other') or char_length(coalesce(p->>'detail',''))>1000 or (p->>'reason'='other' and btrim(coalesce(p->>'detail',''))='') then raise exception '通報理由を確認してください'; end if;
     NEW.payload:=jsonb_build_object('reason',p->>'reason','detail',btrim(coalesce(p->>'detail','')),'status','submitted');
   else NEW.payload:='{}'; end if;
 elsif NEW.kind='book' then
   if char_length(btrim(coalesce(p->>'title',''))) not between 1 and 100 or char_length(btrim(coalesce(p->>'author',''))) not between 1 and 80 or char_length(btrim(coalesce(p->>'comment',''))) not between 1 and 300 or coalesce(p->>'tag','') not in ('公務員','金融','メーカー','IT','教育','NPO') then raise exception '本の情報を確認してください'; end if;
   NEW.payload:=jsonb_build_object('title',btrim(p->>'title'),'author',btrim(p->>'author'),'comment',btrim(p->>'comment'),'tag',p->>'tag');
 elsif NEW.kind='board_reply' then
   if not exists(select 1 from public.recruitments where id=NEW.target_id::uuid and status='open') then raise exception 'この募集には投稿できません'; end if;
   NEW.payload:=jsonb_build_object('text',content);
 elsif NEW.kind in ('touron','touron_comment') then
   if not private.can_seminar(NEW.target_id) or (NEW.kind='touron_comment' and role_name='current') then raise exception 'このゼミへの投稿権限がありません'; end if;
   if NEW.kind='touron' and char_length(btrim(coalesce(p->>'title',''))) not between 1 and 100 then raise exception 'タイトルを確認してください'; end if;
   NEW.payload:=jsonb_build_object('text',content,'title',p->>'title');
 elsif NEW.kind='event_join' then
   if NEW.target_id not in ('ev_dosokai','ev_sotsuron','ev_ob','ev_touron','ev_books','ev_shukatsu','ev_shinkan') then raise exception 'イベントを確認してください'; end if;
   NEW.payload:='{}';
 elsif NEW.kind='host' then
   if role_name<>'obog' then raise exception 'OB訪問の受付はOBOG用です'; end if;
   NEW.target_id:='host'; NEW.payload:='{}';
 elsif NEW.kind='event_request' then NEW.payload:=jsonb_build_object('text',content,'status','submitted');
 elsif NEW.kind='draft' then
   if char_length(coalesce(p->>'text',''))>300 or char_length(coalesce(p->>'image',''))>2200000 then raise exception '下書きが大きすぎます'; end if;
   NEW.payload:=jsonb_build_object('text',coalesce(p->>'text',''),'category',p->'category','anonymous',coalesce((p->>'anonymous')::boolean,true),'image',p->'image');
 elsif NEW.kind='preferences' then
   NEW.payload:=jsonb_build_object('emailEvents',false,'replies',coalesce((p->>'replies')::boolean,true),'thanks',coalesce((p->>'thanks')::boolean,true),'mentions',coalesce((p->>'mentions')::boolean,true));
 elsif NEW.kind='visit' then
   if NEW.target_id<>to_char(now() at time zone 'Asia/Tokyo','YYYY-MM-DD') then raise exception '今日のスタンプだけ記録できます'; end if; NEW.payload:='{}';
 elsif NEW.kind='seminar' then
   if NEW.target_id !~ '^[a-zA-Z0-9_-]{1,80}$' then raise exception '先生を確認してください'; end if; NEW.payload:='{}';
 elsif NEW.kind='message' then
   if not exists(select 1 from public.recruitments r join public.cooperations c on c.recruitment_id=r.id where r.id=NEW.target_id::uuid and ((r.owner_id=NEW.owner_id and c.helper_id=(p->>'recipientId')::uuid) or (c.helper_id=NEW.owner_id and r.owner_id=(p->>'recipientId')::uuid))) then raise exception '協力を申し込んだ募集者と協力者の間だけ連絡できます'; end if;
   NEW.payload:=jsonb_build_object('text',content,'recipientId',p->>'recipientId','recipientName',(select display_name from public.profiles where user_id=(p->>'recipientId')::uuid),'status','sent');
 end if;
 return NEW;
end $$;
revoke all on function private.validate_community() from public;
create trigger validate_community before insert or update on public.community_records for each row execute function private.validate_community();

create table public.community_notifications (
 id uuid primary key default gen_random_uuid(), recipient_id uuid not null references public.profiles(user_id),
 source_id uuid references public.community_records(id) on delete cascade,
 kind text not null, text text not null, href text not null, created_at timestamptz not null default now(), read_at timestamptz,
 unique(recipient_id,source_id,kind)
);
alter table public.community_notifications enable row level security;
revoke all on public.community_notifications from anon,authenticated;
grant select on public.community_notifications to authenticated;
grant update(read_at) on public.community_notifications to authenticated;
create policy notices_own on public.community_notifications for select to authenticated using(recipient_id=auth.uid() and private.is_member());
create policy notices_read on public.community_notifications for update to authenticated using(recipient_id=auth.uid() and private.is_member()) with check(recipient_id=auth.uid());
create function private.community_notify() returns trigger language plpgsql security definer set search_path='' as $$
declare recipient uuid; route text;
begin
 if NEW.kind in ('answer','thanks') then
   select owner_id into recipient from public.community_records where id=NEW.target_id::uuid;
   route:=case when NEW.kind='answer' then '#/qa/'||NEW.target_id else '#/me' end;
   if recipient<>NEW.owner_id then insert into public.community_notifications(recipient_id,source_id,kind,text,href) values(recipient,NEW.id,case when NEW.kind='answer' then 'replies' else 'thanks' end,case when NEW.kind='answer' then '質問に新しい回答が届きました' else '回答に「ありがとう」が届きました' end,route) on conflict do nothing; end if;
 elsif NEW.kind='message' then
   insert into public.community_notifications(recipient_id,source_id,kind,text,href) values((NEW.payload->>'recipientId')::uuid,NEW.id,'mentions','募集について連絡が届きました','#/board/'||NEW.target_id) on conflict do nothing;
 end if;
 if NEW.kind in ('question','answer','board_reply') then
   route:=case when NEW.kind='board_reply' then '#/board/'||NEW.target_id when NEW.kind='answer' then '#/qa/'||NEW.target_id else '#/qa/'||NEW.id end;
   insert into public.community_notifications(recipient_id,source_id,kind,text,href)
   select p.user_id,NEW.id,'mentions','投稿であなたが呼ばれました',route from public.profiles p join public.memberships m on m.user_id=p.user_id
   where p.user_id<>NEW.owner_id and strpos(NEW.payload->>'text','@'||p.display_name)>0 on conflict do nothing;
 end if;
 return NEW;
end $$;
revoke all on function private.community_notify() from public;
create trigger community_notify after insert on public.community_records for each row execute function private.community_notify();
create function private.community_cleanup() returns trigger language plpgsql security definer set search_path='' as $$
begin
 delete from public.community_records where target_id=OLD.id::text and kind in ('answer','curious','thanks','report','board_reply','message');
 if TG_TABLE_NAME='community_records' then
   if OLD.kind='answer' then update public.community_records set payload=payload||'{"bestAnswerId":null}'::jsonb where kind='question' and payload->>'bestAnswerId'=OLD.id::text; end if;
 end if;
 if TG_TABLE_NAME='recruitments' then delete from public.community_notifications where href='#/board/'||OLD.id::text; end if;
 return OLD;
end $$;
revoke all on function private.community_cleanup() from public;
create trigger community_cleanup after delete on public.community_records for each row execute function private.community_cleanup();
create trigger recruitment_community_cleanup after delete on public.recruitments for each row execute function private.community_cleanup();

create table public.community_files (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references public.profiles(user_id) default auth.uid(),
 seminar text not null check(char_length(seminar) between 1 and 40), title text not null check(char_length(btrim(title)) between 1 and 100),
 name text not null check(char_length(name) between 1 and 160), content text not null check(octet_length(content)<=7000000),
 created_at timestamptz not null default now(),
 check(octet_length(decode(content,'base64'))<=5242880 and substring(decode(content,'base64') from 1 for 5)=decode('255044462d','hex'))
);
alter table public.community_files enable row level security;
revoke all on public.community_files from anon,authenticated;
grant select,insert,delete on public.community_files to authenticated;
create policy files_read on public.community_files for select to authenticated using(private.is_member() and exists(select 1 from public.profiles p where p.user_id=auth.uid() and p.affiliation<>'current'));
create policy files_submit on public.community_files for insert to authenticated with check(owner_id=auth.uid() and private.can_seminar(seminar));
create policy files_remove on public.community_files for delete to authenticated using(owner_id=auth.uid() and private.is_member());

create function public.community_feed() returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('records',coalesce((select jsonb_agg(jsonb_build_object('id',r.id,'kind',r.kind,'targetId',r.target_id,'data',r.payload,'createdAt',r.created_at,'mine',r.owner_id=auth.uid(),'ownerId',case when r.kind='question' and (r.payload->>'anonymous')::boolean and r.owner_id<>auth.uid() then null else r.owner_id end,'author',case when r.kind='question' and (r.payload->>'anonymous')::boolean and r.owner_id<>auth.uid() then null else jsonb_build_object('name',p.display_name,'attr',p.affiliation,'gen',p.generation,'avatar',p.avatar,'currentRole',p.role_label,'bio',p.bio) end) order by r.created_at desc)
 from public.community_records r join public.profiles p on p.user_id=r.owner_id
 where private.is_member() and (
 r.kind in ('question','answer','curious','thanks','book','event_join','host','board_reply')
 or (r.kind in ('touron','touron_comment') and private.can_seminar(r.target_id))
 or (r.kind='message' and (r.owner_id=auth.uid() or r.payload->>'recipientId'=auth.uid()::text))
 or (r.kind in ('report','event_request') and exists(select 1 from public.profiles p2 where p2.user_id=auth.uid() and p2.affiliation='staff'))
 )), '[]'::jsonb),
 'files',coalesce((select jsonb_agg(jsonb_build_object('id',f.id,'userId',f.owner_id,'seminar',f.seminar,'title',f.title,'name',f.name,'size',octet_length(decode(f.content,'base64')),'createdAt',f.created_at,'mine',f.owner_id=auth.uid())) from public.community_files f where private.can_seminar(f.seminar)), '[]'::jsonb));
$$;
revoke all on function public.community_feed() from public,anon;
grant execute on function public.community_feed() to authenticated;

create function private.cooperation_notice() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.community_notifications(recipient_id,kind,text,href)
 select owner_id,'mentions','募集に協力の申し込みが届きました','#/board/'||NEW.recruitment_id from public.recruitments where id=NEW.recruitment_id;
 return NEW;
end $$;
revoke all on function private.cooperation_notice() from public;
create trigger cooperation_notice after insert on public.cooperations for each row execute function private.cooperation_notice();
create function private.limit_community_files() returns trigger language plpgsql security definer set search_path='' as $$
begin
 perform 1 from public.profiles where user_id=NEW.owner_id for update;
 if (select coalesce(sum(octet_length(decode(content,'base64'))),0) from public.community_files where owner_id=NEW.owner_id)+octet_length(decode(NEW.content,'base64'))>10485760 then raise exception '資料は1人合計10MBまでです。不要な資料を削除してください'; end if;
 NEW.created_at:=now(); return NEW;
end $$;
revoke all on function private.limit_community_files() from public;
create trigger limit_community_files before insert on public.community_files for each row execute function private.limit_community_files();
create function public.remove_community_file(file_id uuid) returns void language plpgsql security definer set search_path='' as $$
begin
 if not private.is_member() or not exists(select 1 from public.community_files where id=file_id and owner_id=auth.uid()) then raise exception '自分が提出した資料だけ削除できます'; end if;
 delete from public.community_files where id=file_id and owner_id=auth.uid();
end $$;
revoke all on function public.remove_community_file(uuid) from public,anon;
grant execute on function public.remove_community_file(uuid) to authenticated;
