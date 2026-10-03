import {test} from 'node:test';
import assert from 'node:assert/strict';
import {BETA_IDS,issueAccounts} from '../../scripts/issue-beta-accounts.mjs';
test('issue 15 accounts without changing an existing password or losing credentials on approval failure',async()=>{
  const calls=[],records=[];
  const request=async(path,options={})=>{
    calls.push({path,...options});
    if(path.startsWith('/auth/v1/admin/users?'))return {users:[{id:'existing',email:'beta001@beta.sototuna.invalid'}]};
    if(path==='/auth/v1/admin/users')return {id:'new-'+options.body.email,email:options.body.email};
    return {};
  };
  const result=await issueAccounts({request,record:async r=>records.push(r),password:()=> 'generated-random-password'});
  assert.deepEqual(result,{total:15,created:14});
  assert.equal(BETA_IDS.at(-1),'beta015');
  assert.equal(records[0].password,'');
  assert.equal(calls.filter(c=>c.method==='POST'&&c.path==='/auth/v1/admin/users').length,14);
  assert.ok(calls.filter(c=>c.path==='/auth/v1/admin/users').every(c=>c.body.email_confirm===true));
  assert.ok(calls.every(c=>!c.path.includes('invite')));
  const persisted=[];
  await assert.rejects(issueAccounts({request:async(path,options)=>{
    if(path.includes('?page='))return {users:[]};
    if(path==='/auth/v1/admin/users')return {id:'new'};
    throw new Error('approval unavailable');
  },record:async r=>persisted.push(r),password:()=> 'recoverable-password'}),/approval unavailable/);
  assert.equal(persisted[0].password,'recoverable-password');
});
