-- Member feedback: owner edits, broader book industries and shared attachments.
create function private.valid_post_attachment(value jsonb, allow_pdf boolean) returns boolean
language sql immutable set search_path='' as $$
 select value is null or value='null'::jsonb or (
  jsonb_typeof(value)='object' and jsonb_typeof(value->'name')='string'
  and char_length(value->>'name') between 1 and 255 and jsonb_typeof(value->'content')='string'
  and ((char_length(value->>'content')<=2200000 and value->>'content' ~ '^data:image/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$')
    or (allow_pdf and char_length(value->>'content')<=6990536 and value->>'content' ~ '^data:application/pdf;base64,JVBERi0[A-Za-z0-9+/=]*$'))
 ) is true;
$$;
revoke all on function private.valid_post_attachment(jsonb,boolean) from public;
grant execute on function private.valid_post_attachment(jsonb,boolean) to authenticated;
alter table public.recruitments add column attachment jsonb default null;
alter table public.recruitments add constraint recruitment_attachment_valid check(private.valid_post_attachment(attachment,true));
create or replace function private.validate_community() returns trigger language plpgsql security definer set search_path='' as $$
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
   if char_length(btrim(coalesce(p->>'title',''))) not between 1 and 100 or char_length(btrim(coalesce(p->>'author',''))) not between 1 and 80 or char_length(btrim(coalesce(p->>'comment',''))) not between 1 and 300 or coalesce(p->>'tag','') not in ('公務員','金融','メーカー','IT','教育','NPO','農業・林業','漁業','鉱業','建設','電気・ガス・水道','運輸・郵便','卸売・小売','不動産','専門・技術サービス','宿泊・飲食','生活関連サービス・娯楽','医療・福祉','複合サービス','その他サービス','業界共通・その他') then raise exception '本の情報を確認してください'; end if;
   NEW.payload:=jsonb_build_object('title',btrim(p->>'title'),'author',btrim(p->>'author'),'comment',btrim(p->>'comment'),'tag',p->>'tag');
 elsif NEW.kind='board_reply' then
   if not exists(select 1 from public.recruitments where id=NEW.target_id::uuid and status='open') then raise exception 'この募集には投稿できません'; end if;
   if not private.valid_post_attachment(p->'attachment',false) then raise exception '添付画像を確認してください'; end if;
   NEW.payload:=jsonb_build_object('text',content,'attachment',p->'attachment');
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
