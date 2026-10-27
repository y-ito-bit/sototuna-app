-- 管理者のSQL Editorで実行。一般会員へ公開しない。
-- 利用日は2026-10-15の導入以降、アプリを開いた日を日本時間で記録。
-- メールアドレス・パスワード・閲覧内容は出力しない。
with period as (
 select (now() at time zone 'Asia/Tokyo')::date as today,
 date_trunc('month',now() at time zone 'Asia/Tokyo')::date as month_start
), members as (
 select p.user_id from public.profiles p join public.memberships m using(user_id)
 join auth.users u on u.id=p.user_id
 where u.email ~ '^beta[0-9]{3,6}@beta\.sototuna\.invalid$'
)
select
 (select count(*) from members) as issued_approved_accounts,
 (select count(*) from members m join auth.users u on u.id=m.user_id where u.last_sign_in_at is not null) as ever_signed_in_accounts,
 (select count(distinct v.user_id) from private.app_visits v join members m using(user_id) cross join period p where v.visited_on=p.today) as dau_today,
 (select count(distinct v.user_id) from private.app_visits v join members m using(user_id) cross join period p where v.visited_on>=p.month_start and v.visited_on<=p.today) as mau_calendar_month,
 (select count(distinct v.user_id) from private.app_visits v join members m using(user_id) cross join period p where v.visited_on between p.today-29 and p.today) as active_last_30_days,
 15 as target_mau,
 '2026-10-15' as measurement_started;

-- IDごとの状況。配布先名簿は別管理。ログイン履歴とアプリ利用日は別指標。
select split_part(u.email,'@',1) as test_id,p.display_name,
 case when u.last_sign_in_at is null then '未ログイン' else 'ログイン済み' end as login_status,
 to_char(u.last_sign_in_at at time zone 'Asia/Tokyo','YYYY-MM-DD HH24:MI') as last_sign_in_jst,
 max(v.visited_on) as last_app_visit_jst,
 count(distinct v.visited_on) filter(where v.visited_on>=date_trunc('month',now() at time zone 'Asia/Tokyo')::date) as active_days_this_month
from auth.users u join public.profiles p on p.user_id=u.id
join public.memberships m on m.user_id=u.id
left join private.app_visits v on v.user_id=u.id
where u.email ~ '^beta[0-9]{3,6}@beta\.sototuna\.invalid$'
group by u.email,p.display_name,u.last_sign_in_at
order by test_id;
