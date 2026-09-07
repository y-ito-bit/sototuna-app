/* Front-only flows. All outbound actions remain explicitly labelled local drafts. */
(function () {
  const service = () => SototunaServices.create({userId:store.profile?.email||store.profile?.name});
  const files = () => SototunaServices.createFiles({userId:store.profile?.email||store.profile?.name});
  const localNote = '<p class="front-note">この端末に保存します。相手や運営にはまだ送信されません。</p>';
  const status = () => '<p class="front-status" id="frontStatus" role="status" aria-live="polite"></p>';
  const dateLabel = value => new Date(value).toLocaleDateString('ja-JP');
  async function act(button, task) { if(button) button.disabled=true; try { await task(); } catch(error) { const target=$('#frontStatus'); if(target) target.textContent='保存・読み込みができませんでした。'+(error.message||'ブラウザの保存設定を確認してください。'); else toast('読み込みができませんでした。ブラウザの保存設定を確認してください。'); } finally { if(button?.isConnected) button.disabled=false; } }
  function dialog(title,body) { openUtility(title,body+status()); }
  function closeGo(href) {utilityDialog.close();go(href);}
  const originalMe=renderMe;
  renderMe=function () {
    originalMe();
    $('#meRules').closest('.card').insertAdjacentHTML('beforebegin',`<section class="card front-panel"><h2>あなたへのお知らせ・記録</h2><div class="front-links"><button id="frontNotices">お知らせ <span>→</span></button><button id="frontPreferences">通知の設定 <span>→</span></button><button id="frontVisits">今日のつながりスタンプ <span>→</span></button><button id="frontDrafts">連絡・通報の下書き <span>→</span></button><button id="frontTree">ありがとうの木の育ち方 <span>→</span></button></div></section>`);
    $('#frontNotices').onclick=()=>act(null,()=>openNotices());
    $('#frontPreferences').onclick=()=>act(null,openPreferences);
    $('#frontVisits').onclick=()=>act(null,openVisits);
    $('#frontDrafts').onclick=()=>act(null,openDrafts);
    $('#frontTree').onclick=()=>openTree(0);
  };
  async function openVisits() {
    const data=await service().snapshot(),today=new Date().toLocaleDateString('sv-SE'),done=data.visits.includes(today);
    dialog('今日のつながりスタンプ',`<p>訪れた日を、ひとつずつ記録します。</p><div class="front-stamps">${Array.from({length:7},(_,i)=>`<span class="${i<Math.min(data.visits.length,7)?'filled':''}">${i+1}</span>`).join('')}</div><p>これまで ${data.visits.length} 日</p><button class="btn-main" id="claimVisit" ${done?'disabled':''}>${done?'今日は記録しました':'今日のスタンプを記録'}</button><p class="front-note">1日1回、この端末に記録します。現在はお試しのスタンプで、特典との交換はありません。</p>`);
    $('#claimVisit').onclick=e=>act(e.currentTarget,async()=>{await service().claimVisit();await openVisits();$('#frontStatus').textContent='今日のスタンプを記録しました';});
  }
  async function openPreferences() {
    const {preferences:p}=await service().snapshot();
    dialog('通知の設定',`<form class="front-form" id="preferencesForm"><p class="front-note">通知の配信は準備中です。今は受け取り方の希望をこの端末に保存できます。</p><h3>メール</h3><p class="front-note">登録メール：${esc(store.profile.email||'未登録')}</p><label class="front-setting">イベントのお知らせ<input type="checkbox" name="emailEvents" ${p.emailEvents?'checked':''}></label><h3>アプリ内のお知らせ</h3>${[['replies','自分の質問への回答'],['thanks','受け取ったありがとう'],['mentions','自分へのメンション']].map(([key,label])=>`<label class="front-setting">${label}<input type="checkbox" name="${key}" ${p[key]?'checked':''}></label>`).join('')}<div class="front-actions"><button class="btn-main" type="submit">設定を保存する</button></div></form>`);
    $('#preferencesForm').onsubmit=e=>{e.preventDefault();act(e.submitter,async()=>{const form=e.target;await service().savePreferences(Object.fromEntries(['emailEvents','replies','thanks','mentions'].map(key=>[key,form.elements[key].checked])));$('#frontStatus').textContent='通知の希望を保存しました。配信はまだ開始されません。';});};
  }
  async function openNotices(unread=false) {
    const data=await service().snapshot(),all=data.notifications.filter(n=>data.preferences[n.kind]!==false),list=all.filter(n=>!unread||!n.read);
    dialog('お知らせ',`<p class="front-note">回答・ありがとう・メンションをまとめて確認できます。通知の受信は準備中です。</p><div class="front-actions"><button class="chip ${!unread?'on':''}" id="noticeAll">すべて</button><button class="chip ${unread?'on':''}" id="noticeUnread">未読 ${all.filter(n=>!n.read).length}</button><button class="chip" id="noticeReadAll" ${all.some(n=>!n.read)?'':'disabled'}>すべて既読に</button></div>${list.length?`<ul class="front-list">${list.map(n=>`<li><span class="front-label">${n.sample?'サンプル':''}${!n.read?'・未読':''}</span><small>${dateLabel(n.createdAt)}</small><p>${esc(n.text)}</p><button class="front-inline" data-notice="${n.id}">内容を確認する →</button></li>`).join('')}</ul>`:'<p class="front-empty">'+(unread?'未読のお知らせはありません。':'まだお知らせはありません。<br>届いたお知らせはここにたまります。')+'</p>'}<div class="front-actions"><button class="chip" id="noticeSample">サンプルで表示を確認</button>${data.notifications.some(n=>n.sample)?'<button class="chip" id="noticeClear">サンプルを消す</button>':''}</div>`);
    $('#noticeAll').onclick=()=>act(null,()=>openNotices(false));$('#noticeUnread').onclick=()=>act(null,()=>openNotices(true));
    $('#noticeReadAll').onclick=e=>act(e.currentTarget,async()=>{await service().readNotifications(all.map(n=>n.id));await openNotices(unread);});
    $('#noticeSample').onclick=e=>act(e.currentTarget,async()=>{await service().sampleNotifications();await openNotices();});
    $('#noticeClear')?.addEventListener('click',e=>act(e.currentTarget,async()=>{await service().clearSamples();await openNotices(unread);}));
    utilityDialog.querySelectorAll('[data-notice]').forEach(button=>button.onclick=()=>act(button,async()=>{const n=all.find(n=>n.id===button.dataset.notice);await service().readNotifications([n.id]);closeGo(n.href);}));
  }
  function openTree(count) {
    dialog('ありがとうの木の育ち方',`<p>もらった「ありがとう」で、芽が少しずつ育ちます。</p><div class="tree-card">${treeSVG(count)}<p>${count}個：${count<10?'芽':count<30?'若木':'大木'}</p></div><div class="front-actions">${[0,10,30].map(n=>`<button class="chip ${n===count?'on':''}" data-tree-count="${n}">${n}個の姿</button>`).join('')}</div><p class="front-note">成長イメージです。実際のありがとうの数は変わりません。</p>`);
    utilityDialog.querySelectorAll('[data-tree-count]').forEach(b=>b.onclick=()=>openTree(Number(b.dataset.treeCount)));
  }
  const originalDetail=renderDetail;
  renderDetail=function(qid){originalDetail(qid);if(!allQuestions().some(q=>q.id===qid))return;$('#view-detail article').insertAdjacentHTML('beforeend','<button class="front-inline" id="frontReport">この質問を通報する</button>');$('#frontReport').onclick=()=>openReport(qid);};
  const reasons={spam:'宣伝・勧誘・スパム',abuse:'攻撃的・差別的な内容',privacy:'個人情報・許可のない掲載',other:'その他'};
  function openReport(questionId,values={reason:'',detail:''}) {
    const q=allQuestions().find(q=>q.id===questionId);if(!q)return;
    dialog('この質問を通報する',`<p class="front-preview">${esc(q.text)}</p>${localNote}<form class="front-form" id="reportForm"><label for="reportReason">理由</label><select id="reportReason" required><option value="">選んでください</option>${Object.entries(reasons).map(([key,label])=>`<option value="${key}" ${values.reason===key?'selected':''}>${label}</option>`).join('')}</select><label for="reportDetail">補足（その他の場合は必須・1,000文字まで）</label><textarea id="reportDetail" maxlength="1000">${esc(values.detail)}</textarea><button class="btn-main" type="submit">内容を確認する</button></form>`);
    $('#reportForm').onsubmit=e=>{e.preventDefault();const value={questionId,reason:$('#reportReason').value,detail:$('#reportDetail').value.trim()};if(value.reason==='other'&&!value.detail){$('#frontStatus').textContent='補足を入力してください';return;}dialog('通報内容を確認',`${localNote}<p>${esc(reasons[value.reason])}</p><div class="front-preview">${esc(value.detail||'補足なし')}</div><div class="front-actions"><button class="chip" id="reportBack">修正する</button><button class="btn-main" id="reportSave">通報の下書きを保存</button></div>`);$('#reportBack').onclick=()=>openReport(questionId,value);$('#reportSave').onclick=e=>act(e.currentTarget,async()=>{await service().saveReport(value);await openDrafts();$('#frontStatus').textContent='通報の下書きを保存しました。運営には未送信です。';});};
  }
  const originalBoardDetail=renderBoardDetail;
  renderBoardDetail=function(id){originalBoardDetail(id);const r=allRecruits().find(r=>r.id===id);if(!r)return;$('#view-boarddetail .board-detail-head').insertAdjacentHTML('afterend',`<section class="card front-panel"><h2>協力の連絡</h2><p>参加できる日時や、お願いしたいことを個別にまとめられます。</p><button class="chip" id="frontContact">${r.mine?'協力者への連絡を準備':'募集者への連絡を準備'}</button><p class="front-note">連絡は下書きとして保存されます。まだ相手には届きません。</p></section>`);$('#frontContact').onclick=()=>act(null,()=>openContact(id));};
  async function openContact(recruitmentId) {
    const r=allRecruits().find(r=>r.id===recruitmentId);if(!r)return;
    if(!r.mine){const user=USERS[r.userId];return openMessage({recruitmentId,recipientId:r.userId,recipientName:user.name,body:''});}
    dialog('協力者への連絡',`<p>${esc(r.title)}</p><p class="front-empty">協力者の名簿はまだ同期されていません。<br>接続後は、協力を申し出た人をここから選べます。</p><button class="chip" id="contactSample">サンプルの宛先で試す</button>${localNote}`);
    $('#contactSample').onclick=()=>{
      dialog('協力者を選ぶ',`<p class="front-note">名簿の表示サンプルです。実際の協力者ではありません。</p><ul class="front-list">${['A','B'].map(name=>`<li>協力者${name}（サンプル）<div class="front-actions"><button class="chip" data-sample-helper="${name}">この人への連絡を準備</button></div></li>`).join('')}</ul>`);
      utilityDialog.querySelectorAll('[data-sample-helper]').forEach(b=>b.onclick=()=>openMessage({recruitmentId,recipientId:'sample-helper-'+b.dataset.sampleHelper,recipientName:'協力者'+b.dataset.sampleHelper+'（サンプル）',body:''}));
    };
  }
  function openMessage(draft) {
    dialog('連絡の下書き',`<p>宛先：${esc(draft.recipientName)}</p>${localNote}<form class="front-form" id="messageForm"><label for="messageBody">連絡したいこと（1,000文字まで）</label><textarea id="messageBody" required maxlength="1000" placeholder="参加できる日時や、確認したいことなど">${esc(draft.body)}</textarea><button class="btn-main" type="submit">内容を確認する</button></form>`);
    $('#messageForm').onsubmit=e=>{e.preventDefault();const value={...draft,body:$('#messageBody').value.trim()};if(!value.body){$('#frontStatus').textContent='連絡したいことを入力してください';return;}dialog('連絡内容を確認',`<p>宛先：${esc(value.recipientName)}</p><div class="front-preview">${esc(value.body)}</div>${localNote}<div class="front-actions"><button class="chip" id="messageBack">修正する</button><button class="btn-main" id="messageSave">連絡の下書きを保存</button></div>`);$('#messageBack').onclick=()=>openMessage(value);$('#messageSave').onclick=e=>act(e.currentTarget,async()=>{await service().saveMessage({...value,draftId:value.id});await openDrafts();$('#frontStatus').textContent='連絡の下書きを保存しました。相手には未送信です。';});};
  }
  async function openDrafts() {
    const data=await service().snapshot();
    dialog('連絡・通報の下書き',`${localNote}<h3>連絡 ${data.messages.length}件</h3>${data.messages.length?`<ul class="front-list">${data.messages.map(m=>`<li><span class="front-label">未送信</span>${esc(m.recipientName)}<p>${esc(m.body)}</p><div class="front-actions"><button class="chip" data-edit-message="${m.id}">編集する</button><button class="chip" data-remove-draft="${m.id}" data-kind="messages">削除する</button></div></li>`).join('')}</ul>`:'<p class="front-empty">ひろばの募集から、連絡を準備できます。</p>'}<h3>通報 ${data.reports.length}件</h3>${data.reports.length?`<ul class="front-list">${data.reports.map(r=>`<li><span class="front-label">未送信</span>${esc(reasons[r.reason])}<p>${esc(r.detail||'補足なし')}</p><div class="front-actions"><button class="chip" data-report-question="${esc(r.questionId)}">質問を確認</button><button class="chip" data-remove-draft="${r.id}" data-kind="reports">削除する</button></div></li>`).join('')}</ul>`:'<p class="front-empty">通報の下書きはありません。</p>'}`);
    utilityDialog.querySelectorAll('[data-edit-message]').forEach(b=>b.onclick=()=>openMessage(data.messages.find(m=>m.id===b.dataset.editMessage)));
    utilityDialog.querySelectorAll('[data-report-question]').forEach(b=>b.onclick=()=>closeGo('#/qa/'+b.dataset.reportQuestion));
    utilityDialog.querySelectorAll('[data-remove-draft]').forEach(b=>b.onclick=()=>act(b,async()=>{await service().removeDraft(b.dataset.kind,b.dataset.removeDraft);await openDrafts();$('#frontStatus').textContent='下書きを削除しました';}));
  }
  const originalTeachers=renderTeachers;
  renderTeachers=function(){originalTeachers();if(!$('#frontSeminarLaunch'))$('#teacherGrid').insertAdjacentHTML('beforebegin','<section class="card front-panel"><h2>ゼミ選びの準備</h2><p>先生の専門分野を見ながら、気になるゼミを比べてみましょう。</p><button class="chip" id="frontSeminarLaunch">選考情報・検討候補を見る</button></section>');$('#frontSeminarLaunch').onclick=()=>act(null,openSeminars);};
  async function openSeminars() {
    const data=await service().snapshot();
    dialog('ゼミ選びの準備',`<div class="front-preview">選考日程・募集要項は公開準備中です。<br>正式な案内が出るまでは、大学の案内を確認してください。</div><p>気になる先生を検討候補に保存できます。応募・申し込みにはなりません。</p><ul class="front-list">${TEACHERS.map(t=>`<li>${esc(t.name)}<p class="front-note">${esc(t.field)}</p><button class="chip ${data.seminarChoices.includes(t.id)?'on':''}" data-seminar="${t.id}" aria-pressed="${data.seminarChoices.includes(t.id)}">${data.seminarChoices.includes(t.id)?'検討候補に保存済み':'検討候補に保存'}</button></li>`).join('')}</ul>`);
    utilityDialog.querySelectorAll('[data-seminar]').forEach(b=>b.onclick=()=>act(b,async()=>{const choices=await service().toggleSeminar(b.dataset.seminar),saved=choices.includes(b.dataset.seminar);b.textContent=saved?'検討候補に保存済み':'検討候補に保存';b.classList.toggle('on',saved);b.setAttribute('aria-pressed',String(saved));$('#frontStatus').textContent=saved?'検討候補に保存しました':'検討候補から外しました';}));
  }
  // Only a student's registered seminar appears. File access controls here are a UI preview, not authorization.
  const originalTouron=eventBodyTouron;
  eventBodyTouron=function(){return originalTouron().replace(/<button class="tr-cta" data-toast="発表資料[^]*?<\/button>/g,'')+`<section class="card front-panel"><h2>討論会の発表資料</h2><p>レジュメをPDFで準備できます。資料はOBOG・先生・職員向けで、現役生の閲覧画面には表示しません。</p><button class="chip" data-front-resumes>資料を準備・確認する</button><p class="front-note">現在は端末内の動作確認です。共有と閲覧権限の管理は接続後に有効になります。</p></section>`;};
  document.addEventListener('click',e=>{if(e.target.closest('[data-front-resumes]'))act(null,openResumes);});
  async function openResumes() {
    const current=viewerAttr()==='current',seminar=store.profile.seminar,list=await files().list();
    const visible=current?list.filter(f=>f.seminar===seminar):list;
    dialog('討論会の発表資料',`<p class="front-note">この端末にだけ保存され、ほかの利用者には共有されません。実際の提出・権限管理は準備中です。</p>${current&&!seminar?'<p class="front-empty">資料の準備には、プロフィールのゼミ登録が必要です。</p>':`<form class="front-form" id="resumeForm">${current?`<p>登録ゼミ：${esc(seminar)}</p>`:`<label for="resumeSeminar">資料のゼミ</label><select id="resumeSeminar">${TOURON_POSTS.map(p=>`<option>${esc(p.seminar)}</option>`).join('')}</select>`}<label for="resumeTitle">資料タイトル</label><input id="resumeTitle" required maxlength="100" placeholder="発表レジュメ 第1稿"><label for="resumeFile">PDF（5MBまで）</label><input id="resumeFile" type="file" accept="application/pdf,.pdf" required><button class="btn-main" type="submit">資料を端末に保存</button></form>`}<h3>保存した資料 ${visible.length}件</h3>${visible.length?`<ul class="front-list">${visible.map(f=>`<li><span class="front-label">未提出</span>${esc(f.seminar)}<p>${esc(f.title)}</p><small>${esc(f.name)} · ${Math.ceil(f.size/1024)}KB · ${dateLabel(f.createdAt)}</small><div class="front-actions">${!current?`<button class="chip" data-download-resume="${f.id}">PDFをダウンロード</button>`:''}<button class="chip" data-remove-resume="${f.id}">削除する</button></div></li>`).join('')}</ul>`:'<p class="front-empty">まだ保存した資料はありません。</p>'}${current?'<p class="front-note">現役生には、PDFを開くボタンは表示されません。</p>':''}`);
    $('#resumeForm')?.addEventListener('submit',e=>{e.preventDefault();const file=$('#resumeFile').files[0],title=$('#resumeTitle').value,selected=current?seminar:$('#resumeSeminar').value;act(e.submitter,async()=>{await files().save({seminar:selected,title,file});await openResumes();$('#frontStatus').textContent='資料を端末に保存しました。まだ提出されていません。';});});
    utilityDialog.querySelectorAll('[data-remove-resume]').forEach(b=>b.onclick=()=>act(b,async()=>{await files().remove(b.dataset.removeResume);await openResumes();$('#frontStatus').textContent='資料を削除しました';}));
    utilityDialog.querySelectorAll('[data-download-resume]').forEach(b=>b.onclick=()=>{const record=visible.find(f=>f.id===b.dataset.downloadResume),url=URL.createObjectURL(record.file);const a=document.createElement('a');a.href=url;a.download=record.name;a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);});
  }
  if(store.profile) renderRoute();
})();
