import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

const ids = { owner:'00000000-0000-0000-0000-000000000001', helper:'00000000-0000-0000-0000-000000000002', other:'00000000-0000-0000-0000-000000000003', pending:'00000000-0000-0000-0000-000000000004' };
const recruitment = '10000000-0000-0000-0000-000000000001';
const second = '10000000-0000-0000-0000-000000000002';
export async function fixture() {
  const db = new PGlite();
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth; create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    create function auth.jwt() returns jsonb language sql stable as $$ select jsonb_build_object('email',current_setting('request.jwt.claim.email',true)) $$;
    grant usage on schema auth, public to anon, authenticated;
    grant execute on function auth.uid() to anon, authenticated;`);
  await db.exec(await readFile(new URL('../../supabase/migrations/20261003000000_cooperation.sql',import.meta.url),'utf8'));
  await db.exec(await readFile(new URL('../../supabase/migrations/20261003001000_withdrawal_access.sql',import.meta.url),'utf8'));
  await db.exec(await readFile(new URL('../../supabase/migrations/20261003002000_beta_contacts.sql',import.meta.url),'utf8'));
  await db.exec(await readFile(new URL('../../supabase/migrations/20261003003000_beta_provisioning_grants.sql',import.meta.url),'utf8'));
  for (const [name,id] of Object.entries(ids)) {
    await db.query('insert into auth.users values($1)',[id]);
    await db.query("insert into profiles(user_id,display_name,affiliation) values($1,$2,'obog')",[id,name]);
    if (name !== 'pending') await db.query('insert into memberships(user_id) values($1)',[id]);
  }
  for (const id of [recruitment,second]) await db.query("insert into recruitments(id,owner_id,kind,title,body,deadline) values($1,$2,'survey','協力募集','確認用の募集',current_date+1)",[id,ids.owner]);
  async function as(name) {
    await db.exec('reset role');
    await db.query("select set_config('request.jwt.claim.sub',$1,false)",[ids[name] || '']);
    await db.exec(`set role ${name === 'anon' ? 'anon' : 'authenticated'}`);
  }
  return {db,as};
}
