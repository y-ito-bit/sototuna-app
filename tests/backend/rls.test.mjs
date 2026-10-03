import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

const ids = { owner:'00000000-0000-0000-0000-000000000001', helper:'00000000-0000-0000-0000-000000000002', other:'00000000-0000-0000-0000-000000000003', pending:'00000000-0000-0000-0000-000000000004' };
const recruitment = '10000000-0000-0000-0000-000000000001';
const second = '10000000-0000-0000-0000-000000000002';
async function fixture() {
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
test('contacts are visible only to the helper and recruitment owner', async () => {
  const {db,as} = await fixture();
  try {
    await as('helper');
    await db.query("insert into cooperations(recruitment_id,contact_email,consent_version,consent_at) values($1,'helper@example.com',1,'2000-01-01')",[recruitment]);
    const own = (await db.query('select * from cooperations')).rows;
    assert.equal(own.length,1); assert.notEqual(new Date(own[0].consent_at).getUTCFullYear(),2000);
    await as('owner'); assert.equal((await db.query('select contact_email from cooperations')).rows[0].contact_email,'helper@example.com');
    assert.equal((await db.query("update cooperations set contact_email='stolen@example.com' returning *")).rows.length,0);
    await as('other'); assert.equal((await db.query('select * from cooperations')).rows.length,0);
    assert.equal((await db.query('select * from recruitment_counts()')).rows[0].helper_count,1);
    assert.equal((await db.query('delete from cooperations returning *')).rows.length,0);
    await as('pending'); assert.equal((await db.query('select * from cooperations')).rows.length,0);
    assert.equal((await db.query('select * from recruitments')).rows.length,0);
    assert.equal((await db.query('select * from recruitment_counts()')).rows.length,0);
    await assert.rejects(db.query('insert into memberships(user_id) values($1)',[ids.pending]));
    await as('anon'); await assert.rejects(db.query('select * from cooperations'));
  } finally { await db.close(); }
});
test('forgery, missing consent, self cooperation and identity changes are rejected', async () => {
  const {db,as} = await fixture();
  try {
    await as('helper');
    await assert.rejects(db.query("insert into cooperations(recruitment_id,helper_id,contact_email,consent_version) values($1,$2,'other@example.com',1)",[recruitment,ids.other]));
    await assert.rejects(db.query("insert into cooperations(recruitment_id,contact_email,consent_version) values($1,'helper@example.com',0)",[recruitment]));
    await assert.rejects(db.query("insert into cooperations(recruitment_id,contact_email,consent_version) values($1,'bad',1)",[recruitment]));
    await db.query("insert into cooperations(recruitment_id,contact_email,consent_version) values($1,'helper@example.com',1)",[recruitment]);
    await assert.rejects(db.query('update cooperations set recruitment_id=$1',[second]));
    await as('owner');
    await assert.rejects(db.query("insert into cooperations(recruitment_id,contact_email,consent_version) values($1,'owner@example.com',1)",[recruitment]));
  } finally { await db.close(); }
});
test('closing or expiring blocks new applications; withdrawing removes contacts and counts', async () => {
  const {db,as} = await fixture();
  try {
    await as('helper'); await db.query("insert into cooperations(recruitment_id,contact_email,consent_version) values($1,'helper@example.com',1)",[recruitment]);
    await as('owner'); await db.query("update recruitments set status='closed' where id=$1",[recruitment]);
    await db.query('update recruitments set deadline=current_date-1 where id=$1',[second]);
    await as('other');
    for (const id of [recruitment,second]) await assert.rejects(db.query("insert into cooperations(recruitment_id,contact_email,consent_version) values($1,'other@example.com',1)",[id]));
    await as('helper'); await db.query('delete from cooperations where recruitment_id=$1',[recruitment]);
    await as('owner'); assert.equal((await db.query('select * from cooperations')).rows.length,0); assert.equal((await db.query('select * from recruitment_counts()')).rows.length,0);
  } finally { await db.close(); }
});

test('withdrawal still works after membership approval is revoked', async () => {
  const {db,as}=await fixture();
  try {
    await as('helper'); await db.query("insert into cooperations(recruitment_id,contact_email,consent_version) values($1,'helper@example.com',1)",[recruitment]);
    await db.exec('reset role'); await db.query('delete from memberships where user_id=$1',[ids.helper]);
    await as('helper'); assert.equal((await db.query('select * from cooperations')).rows.length,1);
    assert.equal((await db.query('delete from cooperations returning *')).rows.length,1);
  } finally {await db.close();}
});


test('beta contact restriction cannot be bypassed by editing the browser request',async()=>{
  const {db,as}=await fixture();
  try {
    await as('helper');
    await db.query("select set_config('request.jwt.claim.email','beta001@beta.sototuna.invalid',false)");
    await assert.rejects(db.query('insert into cooperations(recruitment_id,helper_id,contact_email,consent_version) values($1,$2,$3,1)',[recruitment,ids.helper,'real@example.com']),/Beta accounts/);
    await db.query('insert into cooperations(recruitment_id,helper_id,contact_email,consent_version) values($1,$2,$3,1)',[recruitment,ids.helper,'beta001@beta.sototuna.invalid']);
    await assert.rejects(db.query("update cooperations set contact_email='beta002@beta.sototuna.invalid'"),/Beta accounts/);
  } finally {await db.close();}
});


test('provisioning role can approve members but receives no update or delete grants',async()=>{
  const {db}=await fixture();
  try {
    await db.exec('set role service_role');
    await db.query('insert into memberships(user_id) values($1)',[ids.pending]);
    assert.equal((await db.query('select * from memberships')).rows.length,4);
    await assert.rejects(db.query('delete from memberships'),/permission denied/);
    await assert.rejects(db.query("update profiles set display_name='changed'"),/permission denied/);
    await assert.rejects(db.query('select * from cooperations'),/permission denied/);
  }finally{await db.close();}
});
