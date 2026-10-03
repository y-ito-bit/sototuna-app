import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createApi} from '../../src/backend/api.js';

test('contact submission requires explicit consent before authentication or storage',async()=>{
  const api=createApi({auth:{getUser(){throw new Error('Must not be called');}}});
  for (const consent of [false,undefined,'true',1]) await assert.rejects(api.cooperate({recruitmentId:'id',email:'test@example.com',consent}),/同意/);
});
test('OTP authentication does not create uninvited accounts',async()=>{
  let value;
  const api=createApi({auth:{async signInWithOtp(input){value=input;return {error:null};}}});
  await api.requestCode(' test@example.com ');
  assert.deepEqual(value,{email:'test@example.com',options:{shouldCreateUser:false}});
});
test('invalid sessions cannot write application data',async()=>{
  const api=createApi({auth:{async getUser(){return {data:{user:null},error:null};}}});
  await assert.rejects(api.cooperate({recruitmentId:'id',email:'test@example.com',consent:true}),/ログイン/);
});
