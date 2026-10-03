import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {fixture} from './fixture.mjs';
const owner='00000000-0000-0000-0000-000000000001',helper='00000000-0000-0000-0000-000000000002';
async function setup(){const ctx=await fixture();await ctx.db.exec(await readFile(new URL('../../supabase/migrations/20261003004000_community.sql',import.meta.url),'utf8'));return ctx;}
async function insert(db,kind,payload={},target='-'){return (await db.query('insert into community_records(kind,payload,target_id) values($1,$2,$3) returning id',[kind,JSON.stringify(payload),target])).rows[0].id;}
test('anonymous questions hide identity, preserve owner controls, and notify on replies',async()=>{
 const {db,as}=await setup();try{
 await as('owner');const q=await insert(db,'question',{text:'匿名で質問',category:'life',anonymous:true});
 await as('helper');const feed=(await db.query('select community_feed() as feed')).rows[0].feed.records;
 assert.equal(feed[0].ownerId,null);assert.equal(feed[0].author,null);assert.equal(feed[0].mine,false);
 assert.equal((await db.query('select * from community_records where id=$1',[q])).rows.length,0);
 assert.equal((await db.query("update community_records set payload='{}' where id=$1 returning id",[q])).rows.length,0);
 const a=await insert(db,'answer',{text:'回答します'},q);await assert.rejects(insert(db,'thanks',{},a));
 await as('owner');assert.equal((await db.query('select * from community_notifications')).rows[0].kind,'replies');
 await insert(db,'thanks',{},a);await assert.rejects(insert(db,'thanks',{},a));
 await db.query('update community_records set payload=payload||$1::jsonb where id=$2',[JSON.stringify({bestAnswerId:a,solved:true}),q]);
 await as('helper');assert.equal((await db.query('select * from community_notifications')).rows[0].kind,'thanks');
 await db.query('delete from community_records where id=$1',[a]);
 await as('owner');const updated=(await db.query('select community_feed() as feed')).rows[0].feed.records.find(r=>r.id===q);assert.equal(updated.data.bestAnswerId,null);
 await db.query("update community_records set payload=payload||'{\"solved\":false}'::jsonb where id=$1",[q]);
 await as('owner');await db.query('delete from community_records where id=$1',[q]);
 await as('helper');assert.equal((await db.query('select * from community_records')).rows.length,0);
 await as('pending');assert.equal((await db.query('select community_feed() as feed')).rows[0].feed.records.length,0);
 await assert.rejects(insert(db,'question',{text:'未承認',category:'life'}));
 await as('anon');await assert.rejects(db.query('select community_feed()'));
 }finally{await db.close();}
});
test('preferences, visits and reports stay private; notifications cannot be forged or rerouted',async()=>{
 const {db,as}=await setup();try{
 await as('owner');const q=await insert(db,'question',{text:'質問',category:'life',anonymous:false});await insert(db,'preferences',{thanks:false},'preferences');
 await insert(db,'report',{reason:'privacy',detail:'確認をお願いします'},q);
 await assert.rejects(insert(db,'visit',{},'2000-01-01'));
 await as('helper');assert.equal((await db.query('select community_feed() as feed')).rows[0].feed.records.some(r=>r.kind==='report'),false);
 assert.equal((await db.query('select * from community_records')).rows.length,0);
 await assert.rejects(db.query("insert into community_notifications(recipient_id,kind,text,href) values($1,'thanks','偽通知','#/me')",[owner]));
 await insert(db,'answer',{text:'回答'},q);
 await as('owner');await assert.rejects(db.query('update community_notifications set recipient_id=$1',[helper]));
 assert.equal((await db.query('update community_notifications set read_at=now() returning id')).rows.length,1);
 }finally{await db.close();}
});
test('students cannot elevate roles, view another seminar or download PDFs through the API',async()=>{
 const {db,as}=await setup();try{
 await db.query("update profiles set affiliation='current',seminar='中森ゼミ' where user_id=$1",[helper]);
 await as('owner');await insert(db,'touron',{text:'進捗',title:'発表'},'石原ゼミ');
 const file=(await db.query("insert into community_files(seminar,title,name,content) values('石原ゼミ','レジュメ','test.pdf','JVBERi0xLjQK') returning id")).rows[0].id;
 await as('helper');await assert.rejects(db.query("update profiles set affiliation='staff' where user_id=$1",[helper]));
 const feed=(await db.query('select community_feed() as feed')).rows[0].feed;
 assert.equal(feed.records.some(r=>r.kind==='touron'),false);assert.equal(feed.files.length,0);
 assert.equal((await db.query('select content from community_files where id=$1',[file])).rows.length,0);
 await assert.rejects(db.query("insert into community_files(seminar,title,name,content) values('石原ゼミ','他ゼミ','test.pdf','JVBERi0xLjQK')"));
 await db.query("insert into community_files(seminar,title,name,content) values('中森ゼミ','自分の資料','test.pdf','JVBERi0xLjQK')");
 assert.equal((await db.query('select community_feed() as feed')).rows[0].feed.files.length,1);
 assert.equal((await db.query('select content from community_files')).rows.length,0);
 const ownFile=(await db.query('select community_feed() as feed')).rows[0].feed.files[0].id;
 await assert.rejects(db.query('select remove_community_file($1)',[file]));
 await db.query('select remove_community_file($1)',[ownFile]);
 await as('owner');assert.equal((await db.query('select content from community_files')).rows.length,1);
 }finally{await db.close();}
});
test('private messages require cooperation and stay hidden from third parties; deleting a recruitment clears its notices',async()=>{
 const {db,as}=await setup();try{
 const rid='10000000-0000-0000-0000-000000000001';
 await as('helper');await assert.rejects(insert(db,'message',{text:'権限外',recipientId:owner},rid));
 await db.query("insert into cooperations(recruitment_id,contact_email,consent_version) values($1,'helper@example.com',1)",[rid]);
 const message=await insert(db,'message',{text:'非公開の連絡',recipientId:owner,recipientName:'偽の名前'},rid);
 await as('owner');const rows=(await db.query('select community_feed() as feed')).rows[0].feed.records;
 assert.ok(rows.some(r=>r.id===message));assert.equal(rows.find(r=>r.id===message).data.recipientName,'owner');
 assert.ok((await db.query('select * from community_notifications')).rows.length>=2);
 await as('other');assert.equal((await db.query('select community_feed() as feed')).rows[0].feed.records.some(r=>r.id===message),false);
 await assert.rejects(insert(db,'message',{text:'第三者',recipientId:owner},rid));
 await as('owner');await db.query('delete from recruitments where id=$1',[rid]);
 assert.equal((await db.query('select * from community_notifications')).rows.length,0);
 }finally{await db.close();}
});
