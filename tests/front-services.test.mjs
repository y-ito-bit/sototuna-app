import test from 'node:test';
import assert from 'node:assert/strict';
import '../public/front-services.js';
const memory = () => { const values=new Map(); return {getItem:key=>values.get(key)||null,setItem:(key,value)=>values.set(key,value)}; };
const create = (options={}) => SototunaServices.create({userId:'a',storage:memory(),...options});
test('daily stamp is idempotent; next local day adds one; users remain separate',async()=>{
  const storage=memory();let date=new Date(2026,8,8,23,59);const a=create({storage,now:()=>date});
  assert.equal((await a.claimVisit()).count,1);assert.equal((await a.claimVisit()).count,1);
  date=new Date(2026,8,9,0,1);assert.equal((await a.claimVisit()).count,2);
  assert.equal((await create({storage,userId:'b'}).snapshot()).visits.length,0);
  assert.equal((await create({storage}).snapshot()).visits.length,2);
});
test('preferences whitelist and persist independently of samples; samples deduplicate and clear',async()=>{
  const s=create();await s.savePreferences({emailEvents:true,thanks:false,admin:true});
  await s.sampleNotifications();await s.sampleNotifications();let data=await s.snapshot();
  assert.equal(data.notifications.length,3);assert.equal(data.preferences.thanks,false);assert.equal(data.preferences.admin,undefined);
  await s.readNotifications([data.notifications[0].id]);assert.equal((await s.snapshot()).notifications.filter(n=>n.read).length,1);
  await s.clearSamples();assert.equal((await s.snapshot()).notifications.length,0);
});
test('messages stay drafts; edits update one record and reject whitespace',async()=>{
  const s=create();const m=await s.saveMessage({recruitmentId:'r1',recipientId:'u1',recipientName:'test',body:' hello '});
  await s.saveMessage({...m,draftId:m.id,body:'edited'});const data=await s.snapshot();assert.equal(data.messages.length,1);assert.equal(data.messages[0].status,'draft');assert.equal(data.messages[0].body,'edited');
  await assert.rejects(s.saveMessage({...m,body:'  '}));await s.removeDraft('messages',m.id);assert.equal((await s.snapshot()).messages.length,0);
});
test('reports require valid reason and explanation for other; never sent',async()=>{
  const s=create();await assert.rejects(s.saveReport({questionId:'q1',reason:'other',detail:''}));await assert.rejects(s.saveReport({questionId:'q1',reason:'invalid',detail:'x'}));
  const report=await s.saveReport({questionId:'q1',reason:'spam',detail:''});assert.equal(report.status,'draft');assert.equal((await s.snapshot()).reports.length,1);
});
test('quota failure does not report success or partially update data',async()=>{
  const storage=memory(),s=create({storage});await s.savePreferences({emailEvents:true});storage.setItem=()=>{throw new Error('quota');};await assert.rejects(s.savePreferences({emailEvents:false}));assert.equal((await s.snapshot()).preferences.emailEvents,true);
});
test('seminar shortlist toggles without duplicate entries',async()=>{const s=create();assert.deepEqual(await s.toggleSeminar('t1'),['t1']);assert.deepEqual(await s.toggleSeminar('t1'),[]);});
test('invalid PDF is rejected before accessing IndexedDB',async()=>{const s=SototunaServices.createFiles({userId:'a',indexedDB:null});await assert.rejects(s.save({seminar:'x',title:'x',file:new File(['fake'],'x.pdf',{type:'application/pdf'})}));});
