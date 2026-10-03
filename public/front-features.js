/* Front-only flows. All outbound actions remain explicitly labelled local drafts. */
(function () {
  const service = () => window.SototunaBackend.service;
  const files = () => window.SototunaBackend.files;
  const localNote = '<p class="front-note">運営へ送信します。架空の情報で試してください。</p>';
  const status = () => '<p class="front-status" id="frontStatus" role="status" aria-live="polite"></p>';
  const dateLabel = value => new Date(value).toLocaleDateString('ja-JP');
  async function act(button, task) { if(button) button.disabled=true; try { await task(); } catch(error) { const target=$('#frontStatus'); if(target) target.textContent='保存・読み込みができませんでした。'+(error.message||'ブラウザの保存設定を確認してください。'); else toast('読み込みができませんでした。ブラウザの保存設定を確認してください。'); } finally { if(button?.isConnected) button.disabled=false; } }
  function dialog(title,body) { openUtility(title,body+status()); }
  function closeGo(href) {utilityDialog.close();go(href);}
  const originalMe=renderMe;
  renderMe=function () {
    originalMe();
    $('#meRules').closest('.card').insertAdjacentHTML('beforebegin',`<section class="card front-panel"><h2>あなたへのお知らせ・記録</h2><div class="front-links"><button id="frontNotices">お知らせ <span>→</span></button><button id="frontPreferences">通知の設定 <span>→</span></button><button id="frontVisits">今日のつながりスタンプ <span>→</span></button><button id="frontDrafts">連絡・通報の履歴 <span>→</span></button><button id="frontTree">ありがとうの木の育ち方 <span>→</span></button></div></section>`);
    $('#frontNotices').onclick=()=>act(null,()=>openNotices());
    $('#frontPreferences').onclick=()=>act(null,openPreferences);
    $('#frontVisits').onclick=()=>act(null,openVisits);
    $('#frontDrafts').onclick=()=>act(null,openDrafts);
    $('#frontTree').onclick=()=>openTree(0);
  };
  async function openVisits() {
    const data=await service().snapshot(),today=new Date().toLocaleDateString('sv-SE'),done=data.visits.includes(today);
    dialog('今日のつながりスタンプ',`<p>訪れた日を、ひとつずつ記録します。</p><div class="front-stamps">${Array.from({length:7},(_,i)=>`<span class="${i<Math.min(data.visits.length,7)?'filled':''}">${i+1}</span>`).join('')}</div><p>これまで ${data.visits.length} 日</p><button class="btn-main" id="claimVisit" ${done?'disabled':''}>${done?'今日は記録しました':'今日のスタンプを記録'}</button><p class="front-note">1日1回、あなたのアカウントに記録します。特典との交換はありません。</p>`);
    $('#claimVisit').onclick=e=>act(e.currentTarget,async()=>{await service().claimVisit();await openVisits();$('#frontStatus').textContent='今日のスタンプを記録しました';});
  }
  async function openPreferences() {
    const {preferences:p}=await service().snapshot();
    dialog('通知の設定',`<form class="front-form" id="preferencesForm"><p class="front-note">アプリ内通知の表示を設定できます。架空メールには送信しません。</p><h3>メール</h3><p class="front-note">登録メール：${esc(store.profile.email||'未登録')}</p><label class="front-setting">イベントのお知らせ（ベータ版では送信しません）<input type="checkbox" name="emailEvents" disabled ${p.emailEvents?'checked':''}></label><h3>アプリ内のお知らせ</h3>${[['replies','自分の質問への回答'],['thanks','受け取ったありがとう'],['mentions','自分へのメンション']].map(([key,label])=>`<label class="front-setting">${label}<input type="checkbox" name="${key}" ${p[key]?'checked':''}></label>`).join('')}<div class="front-actions"><button class="btn-main" type="submit">設定を保存する</button></div></form>`);
    $('#preferencesForm').onsubmit=e=>{e.preventDefault();act(e.submitter,async()=>{const form=e.target;await service().savePreferences(Object.fromEntries(['emailEvents','replies','thanks','mentions'].map(key=>[key,form.elements[key].checked])));$('#frontStatus').textContent='通知の設定を保存しました。';});};
  }
  async function openNotices(unread=false) {
    const data=await service().snapshot(),all=data.notifications.filter(n=>data.preferences[n.kind]!==false),list=all.filter(n=>!unread||!n.read);
    dialog('お知らせ',`<p class="front-note">回答・ありがとう・メンション・協力申し込み・連絡がここに届きます。</p><div class="front-actions"><button class="chip" id="noticeAll">すべて</button><button class="chip" id="noticeUnread">未読 ${all.filter(n=>!n.read).length}</button><button class="chip" id="noticeReadAll" ${all.some(n=>!n.read)?'':'disabled'}>すべて既読に</button></div>${list.length?`<ul class="front-list">${list.map(n=>`<li><small>${dateLabel(n.createdAt)} · ${n.read?'既読':'未読'}</small><p>${esc(n.text)}</p><button class="chip" data-notice="${n.id}">内容を確認する</button></li>`).join('')}</ul>`:'<p class="front-empty">まだお知らせはありません。</p>'}`);
    $('#noticeAll').onclick=()=>act(null,()=>openNotices(false));$('#noticeUnread').onclick=()=>act(null,()=>openNotices(true));
    $('#noticeReadAll').onclick=e=>act(e.currentTarget,async()=>{await service().readNotifications(all.map(n=>n.id));await openNotices(unread);});
    utilityDialog.querySelectorAll('[data-notice]').forEach(b=>b.onclick=()=>act(b,async()=>{const n=all.find(n=>n.id===b.dataset.notice);await service().readNotifications([n.id]);closeGo(n.href);}));
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
    $('#reportForm').onsubmit=e=>{e.preventDefault();const value={questionId,reason:$('#reportReason').value,detail:$('#reportDetail').value.trim()};if(value.reason==='other'&&!value.detail){$('#frontStatus').textContent='補足を入力してください';return;}dialog('通報内容を確認',`${localNote}<p>${esc(reasons[value.reason])}</p><div class="front-preview">${esc(value.detail||'補足なし')}</div><div class="front-actions"><button class="chip" id="reportBack">修正する</button><button class="btn-main" id="reportSave">運営に通報を送信</button></div>`);$('#reportBack').onclick=()=>openReport(questionId,value);$('#reportSave').onclick=e=>act(e.currentTarget,async()=>{await service().saveReport(value);await openDrafts();$('#frontStatus').textContent='運営に通報を送信しました。';});};
  }
  const originalBoardDetail=renderBoardDetail;
  renderBoardDetail=function(id){
    originalBoardDetail(id);
    const r=allRecruits().find(r=>r.id===id);if(!r)return;
    $('#view-boarddetail .board-detail-head').insertAdjacentHTML('afterend',`<section class="card front-panel"><h2>${r.mine?'協力者・連絡先':'連絡先共有を試す'}</h2><p>${r.mine?'協力してくれる方と、共有に同意されたメールアドレスを確認できます。':'協力するときに、募集者へのメールアドレス共有を確認します。連絡はメールでやりとりします。'}</p><button class="chip" id="frontContact">${r.mine?'協力者・連絡先を見る':store.myHelps.includes(id)?'協力内容・メールアドレスを確認':'連絡先の共有に同意して協力する'}</button><p class="front-note">同意した連絡先を募集者に共有します。ベータ版の架空アドレスにはメールは届きません。</p></section>`);
    $('#frontContact').onclick=()=>r.mine?openCollaborators(id):openCooperation(id);
    if(!r.mine&&store.myHelps.includes(id)){ $('#frontContact').insertAdjacentHTML('afterend','<button class="chip" id="frontPrivateMessage">募集者にアプリ内で連絡する</button>');$('#frontPrivateMessage').onclick=()=>act(null,()=>window.SototunaBackend.openConversation(id,r.userId,r.owner.name)); }
  };
  function openCollaborators(id) { window.SototunaBackend?.openContacts(id); }
  async function openDrafts() {
    const data=await service().snapshot();
    dialog('連絡・通報の履歴',`<h3>連絡 ${data.messages.length}件</h3>${data.messages.length?`<ul class="front-list">${data.messages.map(m=>`<li><span class="front-label">送信済み</span><p>${esc(m.body)}</p></li>`).join('')}</ul>`:'<p>協力した募集の詳細から、募集者と連絡できます。</p>'}<h3>運営への通報 ${data.reports.length}件</h3>${data.reports.length?`<ul class="front-list">${data.reports.map(r=>`<li><span class="front-label">送信済み</span>${esc(reasons[r.reason])}<p>${esc(r.detail||'補足なし')}</p></li>`).join('')}</ul>`:'<p>まだ通報はありません。</p>'}`);
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
  eventBodyTouron=function(){return originalTouron().replace(/<button class="tr-cta" data-toast="発表資料[^]*?<\/button>/g,'')+`<section class="card front-panel"><h2>討論会の発表資料</h2><p>レジュメをPDFで準備できます。資料はOBOG・先生・職員向けで、現役生の閲覧画面には表示しません。</p><button class="chip" data-front-resumes>資料を準備・確認する</button><p class="front-note">PDFは参加者の所属区分に応じて共有します。現役生はPDFをダウンロードできません。</p></section>`;};
  document.addEventListener('click',e=>{if(e.target.closest('[data-front-resumes]'))act(null,openResumes);});
  async function openResumes() {
    const current=viewerAttr()==='current',seminar=store.profile.seminar,list=await files().list();
    const visible=current?list.filter(f=>f.seminar===seminar):list;
    dialog('討論会の発表資料',`<p class="front-note">提出した資料はOBOG・先生・職員に共有します。現役生には自分のゼミの資料情報だけを表示します。1ファイル5MB、1人合計10MBまで。</p>${current&&!seminar?'<p class="front-empty">資料の準備には、プロフィールのゼミ登録が必要です。</p>':`<form class="front-form" id="resumeForm">${current?`<p>登録ゼミ：${esc(seminar)}</p>`:`<label for="resumeSeminar">資料のゼミ</label><select id="resumeSeminar">${TOURON_POSTS.map(p=>`<option>${esc(p.seminar)}</option>`).join('')}</select>`}<label for="resumeTitle">資料タイトル</label><input id="resumeTitle" required maxlength="100" placeholder="発表レジュメ 第1稿"><label for="resumeFile">PDF（5MBまで）</label><input id="resumeFile" type="file" accept="application/pdf,.pdf" required><button class="btn-main" type="submit">資料を提出</button></form>`}<h3>提出した資料 ${visible.length}件</h3>${visible.length?`<ul class="front-list">${visible.map(f=>`<li><span class="front-label">提出済み</span>${esc(f.seminar)}<p>${esc(f.title)}</p><small>${esc(f.name)} · ${Math.ceil(f.size/1024)}KB · ${dateLabel(f.createdAt)}</small><div class="front-actions">${!current?`<button class="chip" data-download-resume="${f.id}">PDFをダウンロード</button>`:''}${f.mine?`<button class="chip" data-remove-resume="${f.id}">削除する</button>`:''}</div></li>`).join('')}</ul>`:'<p class="front-empty">まだ提出した資料はありません。</p>'}${current?'<p class="front-note">現役生には、PDFを開くボタンは表示されません。</p>':''}`);
    $('#resumeForm')?.addEventListener('submit',e=>{e.preventDefault();const file=$('#resumeFile').files[0],title=$('#resumeTitle').value,selected=current?seminar:$('#resumeSeminar').value;act(e.submitter,async()=>{await files().save({seminar:selected,title,file});await openResumes();$('#frontStatus').textContent='資料を提出しました。OBOG・先生・職員に共有されます。';});});
    utilityDialog.querySelectorAll('[data-remove-resume]').forEach(b=>b.onclick=()=>act(b,async()=>{await files().remove(b.dataset.removeResume);await openResumes();$('#frontStatus').textContent='資料を削除しました';}));
    utilityDialog.querySelectorAll('[data-download-resume]').forEach(b=>b.onclick=()=>act(b,async()=>{const record=visible.find(f=>f.id===b.dataset.downloadResume),url=URL.createObjectURL(await files().load(record.id));const a=document.createElement('a');a.href=url;a.download=record.name;a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);}));
  }
  if(store.profile) renderRoute();
})();
