import {test} from 'node:test';
import assert from 'node:assert/strict';
import worker, {rangeResponse} from '../worker/media-range.js';

const file = Uint8Array.from({length:1000},(_,i)=>i%256).buffer;
const full = {headers:new Headers({'Content-Type':'video/mp4','Content-Length':'1000'}), body:file};

test('動画は範囲指定に206で応える（iPhoneのSafariが最初に送る bytes=0-1 も）',()=>{
 const r=rangeResponse(full,'bytes=0-1');
 assert.equal(r.status,206);assert.equal(r.headers.get('Content-Range'),'bytes 0-1/1000');assert.equal(r.headers.get('Content-Length'),'2');assert.equal(r.body.byteLength,2);
 const mid=rangeResponse(full,'bytes=100-199');assert.deepEqual([...new Uint8Array(mid.body)].slice(0,3),[100,101,102]);
 assert.equal(rangeResponse(full,'bytes=990-').headers.get('Content-Range'),'bytes 990-999/1000');
 assert.equal(rangeResponse(full,'bytes=-10').headers.get('Content-Range'),'bytes 990-999/1000');
 assert.equal(rangeResponse(full,'bytes=900-5000').headers.get('Content-Range'),'bytes 900-999/1000');
});

test('範囲指定がないときは全体を返し、範囲外は416',()=>{
 const r=rangeResponse(full,null);assert.equal(r.status,200);assert.equal(r.body.byteLength,1000);assert.equal(r.headers.get('Accept-Ranges'),'bytes');
 assert.equal(rangeResponse(full,'bytes=1000-1001').status,416);
 assert.equal(rangeResponse(full,'items=0-1').status,200);
});

test('ファイルが見つからないときは、そのまま返す',async()=>{
 const env={ASSETS:{fetch:async()=>new Response('missing',{status:404})}};
 const res=await worker.fetch(new Request('https://example.com/assets/news/none.mp4',{headers:{Range:'bytes=0-1'}}),env);
 assert.equal(res.status,404);
 const ok={ASSETS:{fetch:async()=>new Response(file,{status:200,headers:{'Content-Type':'video/mp4'}})}};
 const part=await worker.fetch(new Request('https://example.com/assets/news/a.mp4',{headers:{Range:'bytes=0-1'}}),ok);
 assert.equal(part.status,206);assert.equal((await part.arrayBuffer()).byteLength,2);assert.equal(part.headers.get('Content-Type'),'video/mp4');
});
