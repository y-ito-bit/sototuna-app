import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {fixture} from './fixture.mjs';
const owner='00000000-0000-0000-0000-000000000001',helper='00000000-0000-0000-0000-000000000002';
async function setup(){const ctx=await fixture();await ctx.db.exec(await readFile(new URL('../../supabase/migrations/20261003004000_community.sql',import.meta.url),'utf8'));await ctx.db.exec(await readFile(new URL('../../supabase/migrations/20261015000000_member_feedback.sql',import.meta.url),'utf8'));await ctx.db.exec(await readFile(new URL('../../supabase/migrations/20261015001000_beta_operations.sql',import.meta.url),'utf8'));await ctx.db.exec(await readFile(new URL('../../supabase/migrations/20261027000000_board_thanks_anonymous_answers.sql',import.meta.url),'utf8'));await ctx.db.exec(await readFile(new URL('../../supabase/migrations/20261027010000_answer_replies.sql',import.meta.url),'utf8'));return ctx;}
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

test('member feedback: attachments and owner edits persist, remain protected, and reject invalid input',async()=>{
 const {db,as}=await setup();try{
 const rid='10000000-0000-0000-0000-000000000001';
 const image={name:'photo.png',content:'data:image/png;base64,aGVsbG8='};
 await as('owner');
 const b=await insert(db,'book',{title:'本',author:'著者',comment:'紹介',tag:'医療・福祉'});
 await db.query("update community_records set payload=payload||'{\"comment\":\"更新した紹介\"}'::jsonb where id=$1",[b]);
 const r=await insert(db,'board_reply',{text:'https://example.com',attachment:image},rid);
 await db.query('update recruitments set title=$1,attachment=$2 where id=$3',['改訂した募集',JSON.stringify({name:'flyer.pdf',content:'data:application/pdf;base64,JVBERi0xLjQK'}),rid]);
 const t=await insert(db,'touron',{title:'進捗',text:'初回'},'中森ゼミ');
 await db.query("update community_records set payload=payload||'{\"text\":\"改訂した進捗\"}'::jsonb where id=$1",[t]);
 await as('helper');
 const feed=(await db.query('select community_feed() as feed')).rows[0].feed.records;
 assert.equal(feed.find(x=>x.id===r).data.attachment.content,image.content);
 assert.equal(feed.find(x=>x.id===b).data.comment,'更新した紹介');
 assert.equal(feed.find(x=>x.id===t).data.text,'改訂した進捗');
 assert.equal((await db.query("update recruitments set title='他人の編集' where id=$1 returning id",[rid])).rows.length,0);
 assert.equal((await db.query("update community_records set payload='{}' where id=$1 returning id",[b])).rows.length,0);
 await assert.rejects(insert(db,'board_reply',{text:'不正',attachment:{name:'script',content:'javascript:alert(1)'}},rid));
 await assert.rejects(insert(db,'board_reply',{text:'不正',attachment:{}},rid));
 await assert.rejects(insert(db,'board_reply',{text:'PDF不可',attachment:{name:'a.pdf',content:'data:application/pdf;base64,JVBERi0xLjQK'}},rid));
 await as('owner');await assert.rejects(db.query("update recruitments set attachment='{}' where id=$1",[rid]));
 }finally{await db.close();}
});

test('anonymous answers hide the answerer from others but keep owner controls',async()=>{
 const {db,as}=await setup();try{
 await as('owner');const q=await insert(db,'question',{text:'質問',category:'work',anonymous:false});
 await as('helper');const hidden=await insert(db,'answer',{text:'匿名で回答',anonymous:true},q);const named=await insert(db,'answer',{text:'名前で回答'},q);
 const own=(await db.query('select community_feed() as feed')).rows[0].feed.records.find(r=>r.id===hidden);
 assert.equal(own.mine,true);assert.equal(own.data.anonymous,true);
 await as('owner');const feed=(await db.query('select community_feed() as feed')).rows[0].feed.records;
 const anon=feed.find(r=>r.id===hidden),open=feed.find(r=>r.id===named);
 assert.equal(anon.ownerId,null);assert.equal(anon.author,null);assert.equal(anon.data.anonymous,true);
 assert.equal(open.author.name,'helper');assert.equal(open.data.anonymous,false);
 await insert(db,'thanks',{},hidden);
 await as('helper');assert.equal((await db.query("select * from community_notifications where kind='thanks'")).rows.length,1);
 await db.query('update community_records set payload=$1 where id=$2',[JSON.stringify({text:'直しました',anonymous:true}),hidden]);
 await db.query('delete from community_records where id=$1',[hidden]);
 }finally{await db.close();}
});

test('replies to answers notify the answerer and asker, and never reveal an anonymous asker',async()=>{
 const {db,as}=await setup();try{
 await as('owner');const q=await insert(db,'question',{text:'匿名の質問',category:'life',anonymous:true});
 await as('helper');const a=await insert(db,'answer',{text:'回答です'},q);
 await assert.rejects(insert(db,'answer_reply',{text:'質問には返信できない'},q));
 await assert.rejects(insert(db,'answer_reply',{text:'あ'.repeat(301)},a));
 await as('owner');const byAsker=await insert(db,'answer_reply',{text:'ありがとうございます！',anonymous:false},a);
 const own=(await db.query('select payload from community_records where id=$1',[byAsker])).rows[0].payload;
 assert.equal(own.anonymous,true,'匿名で質問した人の返信は必ず匿名');assert.equal(own.byAsker,true);
 await as('helper');let feed=(await db.query('select community_feed() as feed')).rows[0].feed.records;
 const seen=feed.find(r=>r.id===byAsker);assert.equal(seen.author,null);assert.equal(seen.ownerId,null);assert.equal(seen.data.byAsker,true);
 assert.deepEqual((await db.query("select text,href from community_notifications where source_id=$1",[byAsker])).rows,[{text:'あなたの回答に返信が届きました',href:'#/qa/'+q}]);
 const back=await insert(db,'answer_reply',{text:'どういたしまして'},a);
 await as('owner');assert.deepEqual((await db.query("select text,href from community_notifications where source_id=$1",[back])).rows,[{text:'あなたの質問への回答に返信がつきました',href:'#/qa/'+q}]);
 await as('other');const third=await insert(db,'answer_reply',{text:'横から失礼します'},a);
 feed=(await db.query('select community_feed() as feed')).rows[0].feed.records;
 assert.equal(feed.find(r=>r.id===back).author.name,'helper');assert.equal(feed.find(r=>r.id===third).data.byAsker,false);
 await as('owner');assert.equal((await db.query("select * from community_notifications where source_id=$1",[third])).rows.length,1);
 await as('helper');assert.equal((await db.query("select * from community_notifications where source_id=$1",[third])).rows.length,1);
 await db.query('update community_records set payload=$1 where id=$2',[JSON.stringify({text:'直しました'}),back]);
 assert.equal((await db.query('select payload from community_records where id=$1',[back])).rows[0].payload.text,'直しました');
 }finally{await db.close();}
});

test('ひろば accepts one thanks per member on a recruitment or a comment and notifies the owner',async()=>{
 const {db,as}=await setup();const rid='10000000-0000-0000-0000-000000000001';try{
 await as('owner');await assert.rejects(insert(db,'thanks',{},rid));
 const reply=await insert(db,'board_reply',{text:'コメントです'},rid);await assert.rejects(insert(db,'thanks',{},reply));
 await as('helper');await insert(db,'thanks',{},rid);await assert.rejects(insert(db,'thanks',{},rid));
 await insert(db,'thanks',{},reply);
 await assert.rejects(insert(db,'thanks',{},'10000000-0000-0000-0000-00000000ffff'));
 await as('owner');const notices=(await db.query('select text,href from community_notifications order by text')).rows;
 assert.deepEqual(notices.map(n=>[n.text,n.href]),[['ひろばのコメントに「ありがとう」が届きました','#/board/'+rid],['募集に「ありがとう」が届きました','#/board/'+rid]]);
 const counted=(await db.query('select community_feed() as feed')).rows[0].feed.records.filter(r=>r.kind==='thanks').map(r=>r.targetId).sort();
 assert.deepEqual(counted,[rid,reply].sort());
 }finally{await db.close();}
});

test('books accept one thanks per member, notify the owner and reject self thanks',async()=>{
 const {db,as}=await setup();try{
 await as('owner');const b=await insert(db,'book',{title:'紹介',author:'著者',comment:'おすすめ',tag:'IT'});
 await assert.rejects(insert(db,'thanks',{},b));
 await as('helper');const thanks=await insert(db,'thanks',{},b);await assert.rejects(insert(db,'thanks',{},b));
 await as('owner');const notice=(await db.query('select text,href from community_notifications')).rows[0];
 assert.equal(notice.text,'本の紹介に「ありがとう」が届きました');assert.equal(notice.href,'#/events/ev_books');
 await as('helper');await db.query('delete from community_records where id=$1',[thanks]);
 assert.equal((await db.query('select * from community_records where id=$1',[thanks])).rows.length,0);
 await as('owner');assert.equal((await db.query('select * from community_notifications')).rows.length,0);
 }finally{await db.close();}
});
test('app usage records only an approved member and server day, with no member-readable usage table',async()=>{
 const {db,as}=await setup();try{
 await as('owner');await db.query('select record_app_visit()');await db.query('select record_app_visit()');
 await assert.rejects(db.query('select * from private.app_visits'));
 await assert.rejects(db.query("insert into private.app_visits values($1,'2020-01-01')",[helper]));
 await as('pending');await assert.rejects(db.query('select record_app_visit()'));
 await as('anon');await assert.rejects(db.query('select record_app_visit()'));
 await db.exec('reset role');const rows=(await db.query('select * from private.app_visits')).rows;
 assert.equal(rows.length,1);assert.equal(rows[0].user_id,owner);
 assert.deepEqual(rows[0].visited_on,(await db.query("select (now() at time zone 'Asia/Tokyo')::date as day")).rows[0].day);
 }finally{await db.close();}
});
