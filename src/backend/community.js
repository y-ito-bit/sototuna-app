const $=selector=>document.querySelector(selector);
export function createCommunity({api,app,refresh,write,getUser,getEpoch}) {
 let own=[], notices=[], records=[], draftTimer, draftRequest=Promise.resolve();
 const esc=app.esc;
 const defaults={emailEvents:false,replies:true,thanks:true,mentions:true};
 async function mutate(button,task,success='保存しました。') {
  return write(button,async version=>{await task();if(version!==getEpoch())return;await refresh(true);if(version!==getEpoch())return;app.toast(success);},$('#frontStatus'));
 }
 function record(id){const r=records.find(r=>r.id===id);if(!r)throw new Error('投稿が見つかりません。更新してください。');return r;}
 function openText(title,fields,submit) {
  app.openUtility(title,`<form id="communityForm" class="front-form">${fields}<button class="btn-main" type="submit">送信する</button><p id="frontStatus" role="status"></p></form>`);
  $('#communityForm').onsubmit=e=>{e.preventDefault();mutate(e.submitter,async()=>{await submit();app.dialog.close();});};
 }
 const controller={
  accept(feed,rows,notifications) {
   records=feed.records;own=rows;notices=notifications;
   const count=(kind,target)=>records.filter(r=>r.kind===kind&&r.targetId===target).length;
   const mapped=r=>({id:r.id,...r.data,userId:r.ownerId,mine:r.mine,owner:r.author,createdAt:Date.parse(r.createdAt)});
   const q=records.filter(r=>r.kind==='question').map(r=>({...mapped(r),meToo:count('curious',r.id)}));
   const a=records.filter(r=>r.kind==='answer').map(r=>({...mapped(r),questionId:r.targetId,thanks:count('thanks',r.id)}));
   const b=records.filter(r=>r.kind==='book').map(mapped);
   app.community(q,a,b,records,feed.files,own);
  },
  ask() {
   clearTimeout(draftTimer);
   mutate($('#askSubmit'),async()=>{
    await draftRequest;
    const payload={text:$('#askText').value.trim(),category:app.state.askCat,anonymous:$('#anonToggle').classList.contains('on'),image:app.state.askImage};
    if(app.state.editQuestion)await api.updateRecord(app.state.editQuestion,{...record(app.state.editQuestion).data,...payload});
    else {await api.insertRecord('question',payload);const draft=(await api.ownRecords()).find(r=>r.kind==='draft');if(draft)await api.deleteRecord(draft.id);}
    clearTimeout(draftTimer);$('#askOverlay').classList.remove('on');app.state.editQuestion=null;
   },'質問を共有しました。');
  },
  updateQuestion(id,changes) {mutate(null,()=>api.updateRecord(id,{...record(id).data,...changes}),'質問を更新しました。');},
  answer(id){mutate($('#ansSubmit'),()=>api.insertRecord('answer',{text:$('#ansText').value.trim()},id),'回答を届けました。');},
  deletePost(id,kind){mutate(null,async()=>{await api.deleteRecord(id);if(kind==='question')app.go('#/qa');},'投稿を削除しました。');},
  reaction(kind,target,button){mutate(button,async()=>{
   const old=own.find(r=>r.kind===kind&&r.target_id===target);
   if(old)await api.deleteRecord(old.id);else await api.upsertRecord(kind,{},target);
  },'更新しました。');},
  book(button){mutate(button,async()=>{await api.insertRecord('book',{title:$('#bookTitle').value.trim(),author:$('#bookAuthor').value.trim(),comment:$('#bookComment').value.trim(),tag:$('#bookTag').value});app.dialog.close();},'本の紹介を共有しました。');},
  postBoardReply(id,button){mutate(button,async()=>{await api.insertRecord('board_reply',{text:$('#boardReplyText').value.trim()},id);$('#boardReplyText').value='';},'コメントを共有しました。');},
  saveDraft(value){clearTimeout(draftTimer);const version=getEpoch();draftTimer=setTimeout(()=>{if(getUser()&&version===getEpoch())draftRequest=api.upsertRecord('draft',value,'draft').catch(()=>app.toast('下書きの同期に失敗しました。この端末の下書きは残っています。'));},900);},
  eventRequest(){openText('イベントをリクエスト','<label for="communityText">企画してほしい内容（1,000字まで）</label><textarea id="communityText" required maxlength="1000"></textarea><p>運営に送信します。架空の情報で試してください。</p>',()=>api.insertRecord('event_request',{text:$('#communityText').value.trim()}));},
  hostsHTML(){
   const hosts=records.filter(r=>r.kind==='host');
   return `<p class="front-note">受付中のOBOGに、公開の質問を送れます。個人情報は書かないでください。</p>${app.store.profile.attr==='obog'?`<section class="card"><label>OB訪問をうけつける <button class="switch ${app.store.obHost?'on':''}" id="obHostToggle" role="switch" aria-checked="${app.store.obHost}" aria-label="OB訪問をうけつける"></button></label></section>`:''}<h2 class="ans-count-label">受付中の先輩 ${hosts.length}人</h2>${hosts.map(r=>`<article class="card"><b>${app.avatarHTML(r.author.avatar)} ${esc(r.author.name)}</b><p>${esc(r.author.currentRole||'')}</p><p>${esc(r.author.bio||'')}</p>${!r.mine?`<button class="chip" data-host-question="${esc(r.author.name)}">きいてみる</button>`:'<span>あなたの受付</span>'}</article>`).join('')||'<p class="screen-sub">まだ受付中の先輩はいません。</p>'}`;
  },
  touronHTML(){
   const mine=app.store.profile,sem=mine.seminar;
   const seminars=mine.attr==='current'?(sem?[sem]:[]):app.seminars;
   const posts=records.filter(r=>r.kind==='touron');
   return `<p class="front-note">現役生には自分のゼミの進捗だけを表示します。OBOG・先生・職員には全ゼミを表示します。</p>${seminars.length?'<button class="chip" data-touron-post>進捗を投稿する</button>':'<p>所属ゼミは運営に設定してもらってください。</p>'}${seminars.map(sem=>`<section class="card"><h2>${esc(sem)}</h2>${posts.filter(r=>r.targetId===sem).map(r=>`<article><h3>${esc(r.data.title)}</h3><p>${esc(r.data.text)}</p><small>${esc(r.author.name)} · ${esc(new Date(r.createdAt).toLocaleDateString('ja-JP'))}</small>${r.mine?`<button class="delete-btn" data-delete-community="${r.id}">進捗を削除</button>`:''}</article>`).join('')||'<p>まだ進捗の投稿はありません。</p>'}${records.filter(r=>r.kind==='touron_comment'&&r.targetId===sem).map(r=>`<div class="tr-comment"><b>${esc(r.author.name)}</b><p>${esc(r.data.text)}</p>${r.mine?`<button class="delete-btn" data-delete-community="${r.id}">意見を削除</button>`:''}</div>`).join('')}${mine.attr!=='current'?`<button class="chip" data-touron-comment="${esc(sem)}">意見を書く</button>`:''}</section>`).join('')}`;
  },
  async openConversation(recruitmentId,recipientId,recipientName){
   await refresh();const user=getUser();if(!user)return;
   const messages=records.filter(r=>r.kind==='message'&&r.targetId===recruitmentId&&((r.ownerId===user.id&&r.data.recipientId===recipientId)||(r.ownerId===recipientId&&r.data.recipientId===user.id))).slice().reverse();
   app.openUtility(`${recipientName}さんとの連絡`,`<p class="front-note">募集者と協力を申し込んだ方だけが読めるアプリ内の連絡です。架空メールにはメールを送りません。</p><ul class="front-list">${messages.map(r=>`<li><b>${esc(r.author.name)}</b><p>${esc(r.data.text)}</p><small>${esc(new Date(r.createdAt).toLocaleString('ja-JP'))}</small></li>`).join('')||'<li>まだ連絡はありません。</li>'}</ul><form id="conversationForm" class="front-form"><label for="conversationText">連絡内容（1,000字まで）</label><textarea id="conversationText" required maxlength="1000"></textarea><button class="btn-main" type="submit">送信する</button><p id="frontStatus" role="status"></p></form>`);
   $('#conversationForm').onsubmit=e=>{e.preventDefault();mutate(e.submitter,async()=>{await api.insertRecord('message',{text:$('#conversationText').value.trim(),recipientId,recipientName},recruitmentId);await controller.openConversation(recruitmentId,recipientId,recipientName);},'連絡を届けました。');};
  },
  service:{
   async snapshot(){await refresh();return {visits:own.filter(r=>r.kind==='visit').map(r=>r.target_id),preferences:{...defaults,...own.find(r=>r.kind==='preferences')?.payload},notifications:notices.filter(n=>!n.href.startsWith('#/board/')||app.recruits.some(r=>r.id===n.href.slice(8))).map(n=>({id:n.id,kind:n.kind,text:n.text,href:n.href,createdAt:n.created_at,read:!!n.read_at,sample:false})),messages:records.filter(r=>r.kind==='message').map(r=>({id:r.id,recipientName:r.data.recipientName,body:r.data.text,status:'sent'})),reports:own.filter(r=>r.kind==='report').map(r=>({id:r.id,questionId:r.target_id,...r.payload})),seminarChoices:own.filter(r=>r.kind==='seminar').map(r=>r.target_id)};},
   async claimVisit(){const day=new Date().toLocaleDateString('sv-SE',{timeZone:'Asia/Tokyo'});await api.upsertRecord('visit',{},day);await refresh(true);},
   async savePreferences(value){await api.upsertRecord('preferences',value,'preferences');await refresh(true);},
   async readNotifications(ids){if(ids.length)await api.readNotices(ids);await refresh(true);},
   async saveReport({questionId,reason,detail}){await api.insertRecord('report',{reason,detail},questionId);await refresh(true);},
   async removeDraft(kind,id){await api.deleteRecord(id);await refresh(true);},
   async toggleSeminar(id){const old=own.find(r=>r.kind==='seminar'&&r.target_id===id);if(old)await api.deleteRecord(old.id);else await api.upsertRecord('seminar',{},id);await refresh(true);return own.filter(r=>r.kind==='seminar').map(r=>r.target_id);}
  },
  files:{
   async list(){await refresh();return app.files;},
   async save({seminar,title,file}){
    if(!file||file.type!=='application/pdf'||file.size>5*1024*1024||new TextDecoder().decode(await file.slice(0,5).arrayBuffer())!=='%PDF-')throw new Error('5MB以下のPDFを選んでください。');
    const bytes=new Uint8Array(await file.arrayBuffer());let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));
    await api.saveFile({seminar,title:title.trim(),name:file.name,content:btoa(binary)});await refresh(true);
   },
   async load(id){const row=await api.loadFile(id);const bytes=Uint8Array.from(atob(row.content),c=>c.charCodeAt(0));return new Blob([bytes],{type:'application/pdf'});},
   async remove(id){await api.removeFile(id);await refresh(true);}
  }
 };
 document.addEventListener('click',e=>{
  const del=e.target.closest('[data-delete-community]');if(del){if(confirm('この投稿を削除しますか？'))controller.deletePost(del.dataset.deleteCommunity,'other');return;}
  const host=e.target.closest('[data-host-question]');if(host){app.openAsk('@'+host.dataset.hostQuestion+' さんに聞きたいです。','work');return;}
  const post=e.target.closest('[data-touron-post]'), comment=e.target.closest('[data-touron-comment]');
  if(post){const seminars=app.store.profile.attr==='current'?[app.store.profile.seminar]:app.seminars;openText('討論会の進捗を共有',`<label for="communitySeminar">ゼミ</label><select id="communitySeminar">${seminars.map(s=>`<option>${esc(s)}</option>`).join('')}</select><label for="communityTitle">タイトル</label><input id="communityTitle" required maxlength="100"><label for="communityText">内容</label><textarea id="communityText" required maxlength="1000"></textarea>`,()=>api.insertRecord('touron',{title:$('#communityTitle').value.trim(),text:$('#communityText').value.trim()},$('#communitySeminar').value));}
  if(comment)openText('ゼミの進捗に意見を書く','<label for="communityText">意見（1,000字まで）</label><textarea id="communityText" required maxlength="1000"></textarea>',()=>api.insertRecord('touron_comment',{text:$('#communityText').value.trim()},comment.dataset.touronComment));
 });
 return controller;
}
