/* Shared safe text and attachment rendering. No HTML supplied by members is executed. */
(function () {
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function linkify(input) {
  let out='',cursor=0;
  for(const match of input.matchAll(/https?:\/\/[^\s<>"'「」『』]+/g)){
   let url=match[0].replace(/[。、，．！？!?）)\]}]+$/u,'');
   out+=esc(input.slice(cursor,match.index));
   try {const parsed=new URL(url);if(!parsed.hostname)throw new Error();out+=`<a class="content-link" href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(url)}</a>`;}
   catch {out+=esc(url);}
   cursor=match.index+url.length;
  }
  return out+esc(input.slice(cursor));
 }
 // Leading "> " lines are a quote of an earlier comment. Rendered as a span because callers wrap the result in <p>.
 function text(value) {
  const input=String(value??''),lead=input.match(/^(?:>[^\n]*(?:\n|$))+/);
  if(!lead)return linkify(input);
  const quoted=lead[0].replace(/^> ?/gm,'').trim();
  return `<span class="content-quote">${linkify(quoted)}</span>`+linkify(input.slice(lead[0].length));
 }
 function quote(name,body) {
  const plain=String(body??'').replace(/^(?:>[^\n]*(?:\n|$))+/,'').replace(/\s+/g,' ').trim();
  return `> ${name}：${plain.length>60?plain.slice(0,60)+'…':plain}\n`;
 }
 const imagePattern=/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/;
 function attachment(file){
  if(!file||typeof file.content!=='string')return '';
  if(imagePattern.test(file.content))return `<a href="${file.content}" download="${esc(file.name||'image.jpg')}"><img class="question-image" src="${file.content}" alt="添付画像：${esc(file.name||'画像')}"></a>`;
  if(/^data:application\/pdf;base64,JVBERi0[A-Za-z0-9+/=]*$/.test(file.content))return `<a class="content-link attachment-file" href="${file.content}" download="${esc(file.name||'flyer.pdf')}">PDF：${esc(file.name||'チラシ')} をダウンロード</a>`;
  return '';
 }
 async function read(file,{pdf=false}={}) {
  if(!file)return null;
  if(file.size>5*1024*1024)throw new Error('5MB以下のファイルを選んでください。');
  if(pdf&&file.type==='application/pdf'){
   if(new TextDecoder().decode(await file.slice(0,5).arrayBuffer())!=='%PDF-')throw new Error('PDF形式を確認してください。');
   const bytes=new Uint8Array(await file.arrayBuffer());let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));
   return {name:file.name,content:'data:application/pdf;base64,'+btoa(binary)};
  }
  if(!['image/jpeg','image/png','image/webp'].includes(file.type))throw new Error(pdf?'JPEG・PNG・WebP・PDFを選んでください。':'JPEG・PNG・WebPを選んでください。');
  const bitmap=await createImageBitmap(file);const scale=Math.min(1,1200/Math.max(bitmap.width,bitmap.height));const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));
  const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();
  const content=canvas.toDataURL('image/jpeg',.78);if(content.length>2200000)throw new Error('画像が大きすぎます。小さい画像を選んでください。');
  return {name:file.name.replace(/\.[^.]+$/,'')+'.jpg',content};
 }
 // ブラウザ標準の「ファイルを選択」ボタンの代わりに、アプリの見た目の添付ボタンを出す。input は中に隠して残す。
 const pickIcon='<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="3"/><circle cx="9" cy="10" r="1.8"/><path d="M5 17l5-5 4 4 2-2 3 3"/></svg>';
 function filePick(id,{accept,text,required=false}) {return `<label class="file-pick"><input id="${id}" type="file" accept="${accept}" ${required?'required':''}>${pickIcon}<span class="file-pick-text" data-default="${esc(text)}">${esc(text)}</span></label>`;}
 function syncPick(input) {const label=input?.closest('.file-pick')?.querySelector('.file-pick-text');if(label)label.textContent=input.files?.[0]?.name||label.dataset.default;}
 function picker(id,{pdf=false}={}) {return `<label class="field-label">添付（任意・5MB以下の画像${pdf?'・PDF':''}）</label>${filePick(id,{accept:'image/jpeg,image/png,image/webp'+(pdf?',application/pdf':''),text:pdf?'画像・PDFをえらぶ':'画像をえらぶ'})}<div id="${id}Preview"></div>`;}
 function bind(id,initial=null,{pdf=false}={}) {
  const input=document.getElementById(id),preview=document.getElementById(id+'Preview');let value=initial,pending=false,version=0;
  const draw=()=>{preview.innerHTML=attachment(value)+(value?'<button class="chip" type="button">添付を外す</button>':'');preview.querySelector('button')?.addEventListener('click',()=>{version++;value=null;pending=false;input.value='';syncPick(input);draw();});};
  input.addEventListener('change',async()=>{const file=input.files[0],current=++version;if(!file)return;pending=true;try{const result=await read(file,{pdf});if(current===version)value=result;}catch(error){if(current===version){window.SototunaApp.toast(error.message);input.value='';}}finally{if(current===version){pending=false;draw();}}});draw();
  return ()=>{if(pending)throw new Error('添付の読み込みが終わるまでお待ちください。');return value;};
 }
 window.SototunaContent={text,quote,attachment,read,picker,bind,filePick,syncPick};
})();
