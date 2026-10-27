import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(new URL('../public/app-main.js',import.meta.url),'utf8');
test('公開スレッドのURLを安全なリンクとして表示する',()=>{
 const node={innerHTML:'',addEventListener(){}};
 const context={URL,window:{},document:{},state:{},store:{profile:{},myHelps:[],myThanks:{}},allRecruits:()=>[{id:'r1',type:'event',title:'募集',body:'案内',deadline:'2099-12-31',helpers:0,owner:{name:'投稿者'}}],communityRecords:[{id:'c1',kind:'board_reply',targetId:'r1',author:{name:'投稿者'},data:{text:'詳細 https://example.com/guide?a=1&b=2'}}],$:selector=>['#boardReplyForm','#boardQuotePreview'].includes(selector)?null:node,esc:s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;'),graduationLabel:()=>'',badge:()=>'',uiIcon:()=>'',RTYPES:{event:{label:'イベント'}},go(){}};
 const helper=new URL('../public/content-tools.js',import.meta.url);try{vm.runInNewContext(readFileSync(helper,'utf8'),context);context.content=context.window.SototunaContent;}catch(e){if(e.code!=='ENOENT')throw e;}
 vm.runInNewContext(source.slice(source.indexOf('function thanksFor('),source.indexOf('// 未回答の質問を')),context);
 vm.runInNewContext(source.slice(source.indexOf('function renderBoardDetail('),source.indexOf('/* =====================================================================\n   RENDER: 先生図鑑')),context);
 context.renderBoardDetail('r1');
 assert.match(node.innerHTML, /class="board-comment"/);
 assert.ok(!node.innerHTML.includes('class="thread-item"'),'公開コメントを36pxのアバター列へ配置しない');
 assert.match(node.innerHTML,/<a[^>]+href="https:\/\/example.com\/guide\?a=1&amp;b=2"/);
 assert.match(node.innerHTML,/data-react-thanks="c1"/);assert.match(node.innerHTML,/data-quote="c1"/);
});

test('引用は先頭の「> 」行だけを引用ブロックにし、本文と同じく安全に表示する',()=>{
 const context={window:{},URL};vm.runInNewContext(readFileSync(new URL('../public/content-tools.js',import.meta.url),'utf8'),context);
 const render=context.window.SototunaContent;
 const prefix=render.quote('ももこ','> 前の引用\n通知が<b>ほしい</b>\nです');
 assert.equal(prefix,'> ももこ：通知が<b>ほしい</b> です\n','引用の中の引用は外し、改行は詰める');
 const html=render.text(prefix+'わたしも https://example.com');
 assert.ok(html.startsWith('<span class="content-quote">ももこ：通知が&lt;b&gt;ほしい&lt;/b&gt; です</span>'));
 assert.ok(html.endsWith('わたしも <a class="content-link" href="https://example.com" target="_blank" rel="noopener noreferrer">https://example.com</a>'));
 assert.ok(!render.text('本文\n> 途中の記号').includes('content-quote'),'途中の「>」は引用にしない');
 assert.ok(render.quote('a','あ'.repeat(80)).endsWith('…\n'));
});

test('URL表示はHTMLを実行せず、危険なスキームをリンク化しない',()=>{
 const context={window:{},URL};vm.runInNewContext(readFileSync(new URL('../public/content-tools.js',import.meta.url),'utf8'),context);
 const render=context.window.SototunaContent;
 const html=render.text('<img src=x onerror=alert(1)> javascript:alert(1) https://example.com/path。');
 assert.ok(!html.includes('<img'));assert.ok(html.includes('&lt;img'));
 assert.ok(!html.includes('href="javascript:'));assert.ok(html.includes('href="https://example.com/path"'));
 assert.ok(html.endsWith('</a>。'));
 assert.equal(render.attachment({name:'x',content:'data:text/html;base64,aGVsbG8='}),'');
});
