-- 承認取消後も本人が連絡先の共有を取り消せるようにする。
alter policy cooperation_read on public.cooperations
  using(helper_id = (select auth.uid()) or ((select private.is_member()) and exists(
    select 1 from public.recruitments r
    where r.id = recruitment_id and r.owner_id = (select auth.uid())
  )));
