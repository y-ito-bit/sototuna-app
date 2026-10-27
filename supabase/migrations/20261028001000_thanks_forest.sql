-- 2026-10-28 ありがとうの森: every approved member's tree (public profile fields, tags and thanks received).
-- Thanks on anonymous answers/replies are not counted, so a named tree never grows at the moment an anonymous post is thanked.
create function public.member_forest() returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('id',p.user_id,'name',p.display_name,'attr',p.affiliation,'gen',p.generation,'avatar',p.avatar,
   'role',p.role_label,'tags',p.tags,'thanks',coalesce(t.n,0),'mine',p.user_id=auth.uid()) order by coalesce(t.n,0) desc, p.display_name),'[]'::jsonb)
 from public.profiles p
 join public.memberships m on m.user_id=p.user_id
 left join (
  select owner_id, count(*) n from (
   select r.owner_id from public.community_records th join public.community_records r on r.id::text=th.target_id
    where th.kind='thanks' and r.kind in ('answer','book','board_reply') and not coalesce((r.payload->>'anonymous')::boolean,false)
   union all
   select rc.owner_id from public.community_records th join public.recruitments rc on rc.id::text=th.target_id where th.kind='thanks'
  ) received group by owner_id
 ) t on t.owner_id=p.user_id
 where private.is_member();
$$;
revoke all on function public.member_forest() from public,anon;
grant execute on function public.member_forest() to authenticated;
