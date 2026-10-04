import {backendConfig} from './config.js';
import { createBackend } from './client.js';
import { createApi } from './api.js';
import { createCommunity } from './community.js';
const app = window.SototunaApp;
const $ = selector => document.querySelector(selector);
let api, community, current, epoch = 0, loading = null;
function loginReady(message='') {
  $('#authContinue').disabled=false; $('#authContinue').textContent='ログイン'; $('#authStatus').textContent=message;
}
function clear() {
  epoch++; current=null; loading=null; app.reset();
  $('#authPassword').value='';
}
function report(error) { app.toast('保存・読み込みができませんでした。'+(error.message || '再度お試しください。')); }
async function refresh(force=false) {
  if (!current) throw new Error('ログインしてください。');
  if (loading) { const pending=loading; await pending; if(!force) return; if(!current) return; }
  const version=epoch, identity=current.id;
  const task=(async()=>{
    const member=await api.membership();
    if (!member?.approved_at) { clear(); await api.signOut(); throw new Error('利用の承認を確認できません。'); }
    const [rows, helps, counts,feed,own,notices]=await Promise.all([api.listRecruitments(),api.myCooperations(),api.counts(),api.communityFeed(),api.ownRecords(),api.notices()]);
    if (version!==epoch || current?.id!==identity) return;
    const totals=new Map(counts.map(c=>[c.recruitment_id,Number(c.helper_count)]));
    const recruits=rows.map(r=>({id:r.id,userId:r.owner_id,mine:r.owner_id===identity,type:r.kind,title:r.title,body:r.body,deadline:r.deadline,status:r.status,helpers:totals.get(r.id)||0,owner:{name:r.owner?.display_name||'参加者',attr:r.owner?.affiliation||'obog',gen:r.owner?.generation,avatar:'🌱'}}));
    app.snapshot(recruits,helps.map(c=>c.recruitment_id)); community.accept(feed,own,notices); app.render();
  })();
  loading=task;
  try { await task; } finally { if(loading===task) loading=null; }
}
async function enter(user) {
  if (!/^beta[0-9]{3,6}@beta\.sototuna\.invalid$/.test(user.email||'')) throw new Error('ベータ版では発行されたテストIDを使用してください。');
  const [member,profile]=await Promise.all([api.membership(),api.ownProfile()]);
  if(!member?.approved_at) throw new Error('利用の承認を確認できません。');
  current=user; epoch++; app.start(user,profile);
  await refresh();
  if (!current) return;
  app.reveal(); $('#authPassword').value='';
}
async function write(button, task, status) {
  if (!current) return;
  const version=epoch;
  if(button?.disabled) return;
  if(button) button.disabled=true;
  try { await task(version); } catch(error) {
    if(version!==epoch) return;
    if(status?.isConnected) status.textContent='処理できませんでした。'+(error.message||'再度お試しください。'); else report(error);
  } finally { if(version===epoch && button?.isConnected) button.disabled=false; }
}
function openCooperation(id) {
  const r=app.recruits.find(r=>r.id===id);
  if(!r || r.mine || !current) return;
  const version=epoch, email=current.email;
  const applied=app.store.myHelps.includes(id);
  app.openUtility(applied?'協力内容を確認':'同意して協力する',`<p class="front-preview">${app.esc(r.title)}</p><p>あなたのよびなと以下の架空メールアドレスを、募集者 <b>${app.esc(r.owner.name)}</b> さんだけに共有します。ベータ版ではメールは届きません。</p><form id="cooperationForm" class="front-form"><label for="cooperationEmail">連絡先（テスト用・変更できません）</label><input id="cooperationEmail" type="email" readonly value="${app.esc(email)}"><label class="cooperation-consent"><input id="cooperationConsent" type="checkbox" required><span>この募集の募集者に、よびなとメールアドレスを共有することに同意します。</span></label><button class="btn-main" id="cooperationSubmit" type="submit" disabled>同意して協力する</button>${applied?'<button class="delete-btn" id="cooperationWithdraw" type="button">協力を取り消す</button>':''}<p id="cooperationStatus" role="status"></p></form>`);
  const consent=$('#cooperationConsent'), button=$('#cooperationSubmit'), status=$('#cooperationStatus');
  consent.onchange=()=>{button.disabled=!consent.checked;};
  $('#cooperationForm').onsubmit=e=>{
    e.preventDefault(); if(!consent.checked || version!==epoch) return;
    write(button,async()=>{
      await api.cooperate({recruitmentId:id,email,consent:true});
      if(version!==epoch) return;
      app.dialog.close(); await refresh(true); if(version!==epoch)return; app.go('#/board/'+id); app.toast('同意した連絡先を募集者に共有しました。');
    },status);
  };
  $('#cooperationWithdraw')?.addEventListener('click',e=>write(e.currentTarget,async()=>{
    await api.withdraw(id); if(version!==epoch) return;
    app.dialog.close(); await refresh(true); if(version!==epoch)return; app.toast('協力を取り消し、共有した連絡先を削除しました。');
  },status));
}
async function openContacts(id) {
  const version=epoch;
  if(!current) return;
  app.openUtility('協力者・連絡先','<p id="contactsResult" role="status">読み込み中…</p>');
  const target=$('#contactsResult');
  try {
    const rows=await api.collaborators(id);
    if(version!==epoch || !target.isConnected) return;
    target.outerHTML=`<div><p class="front-note">この募集の募集者だけが確認できます。架空のアドレスにはメールは届きません。</p><h3>協力者 ${rows.length}人</h3>${rows.length?'<ul class="front-list">'+rows.map(c=>`<li><b>${app.esc(c.helper?.display_name||'参加者')}</b><p class="cooperation-email">${app.esc(c.contact_email)}</p><small>共有への同意：${app.esc(new Date(c.consent_at).toLocaleString('ja-JP'))}</small><button class="chip" data-contact-message="${c.helper_id}">アプリ内で連絡する</button></li>`).join('')+'</ul>':'<p>まだ協力者はいません。</p>'}</div>`;
    document.querySelectorAll('[data-contact-message]').forEach(b=>b.onclick=()=>{const c=rows.find(c=>c.helper_id===b.dataset.contactMessage);community.openConversation(id,c.helper_id,c.helper?.display_name||'参加者').catch(report);});
  } catch(error) { if(version===epoch && target.isConnected) target.textContent='読み込みできませんでした。'+(error.message||'再度お試しください。'); }
}
window.SototunaBackend={
  openCooperation, openContacts,
  createRecruitment() {
    write($('#recSubmit'),async version=>{
      const row=await api.createRecruitment({kind:app.state.recType,title:$('#recTitle').value,body:$('#recBody').value,deadline:$('#recDeadline').value});
      if(version!==epoch) return;
      $('#recruitOverlay').classList.remove('on'); await refresh(true); if(version!==epoch)return; app.go('#/board/'+row.id); app.toast('募集を公開しました。');
    });
  },
  deleteRecruitment(id) {
    write(null,async version=>{await api.deleteRecruitment(id); if(version!==epoch)return; await refresh(true);if(version!==epoch)return;app.go('#/board'); app.toast('募集を削除しました。');});
  },
  saveProfile() {
    write($('#profileSave'),async version=>{
      const name=$('#profileName').value.trim().slice(0,10); if(!name)throw new Error('よびなを入力してください。');
      const p=app.store.profile;
      const saved=await api.saveProfile({displayName:name,affiliation:p.attr,generation:p.gen,seminar:p.seminar,avatar:app.state.profileIcon,currentRole:$('#profileRole').value.trim().slice(0,40),bio:$('#profileBio').value.trim().slice(0,200)});
      if(version!==epoch) return;
      p.name=saved.display_name; p.avatar=app.state.profileIcon; p.currentRole=$('#profileRole').value.trim().slice(0,40);p.bio=$('#profileBio').value.trim().slice(0,200);
      app.saveLocal(); app.closeProfileEditor(); await refresh(true); if(version!==epoch)return; app.toast('プロフィールを更新しました。');
    });
  }
};
document.addEventListener('click',async e=>{
  const button=e.target.closest('[data-account-action]'); if(!button||!current)return;
  if(button.dataset.accountAction==='refresh'){write(button,()=>refresh(true));return;}
  if(button.dataset.accountAction!=='logout')return;
  clear();$('#authContinue').disabled=true;$('#authContinue').textContent='ログアウト中…';
  try { await api.signOut(); } catch { $('#authStatus').textContent='ログアウトの通信に失敗しました。再度ログインしてからログアウトしてください。'; } finally { loginReady($('#authStatus').textContent); }
});
window.addEventListener('hashchange',()=>{
  if(current) refresh().catch(report);
});
window.addEventListener('focus',()=>{if(current)refresh().catch(report);});
$('#betaLogin').onsubmit=async e=>{
  e.preventDefault(); $('#authContinue').disabled=true; $('#authContinue').textContent='確認中…';$('#authStatus').textContent='';
  try { const result=await api.signInBeta($('#authBetaId').value,$('#authPassword').value);await enter(result.user); }
  catch { clear(); if(api) await api.signOut().catch(()=>{}); loginReady('ログインできませんでした。ID・パスワードと接続状況を確認してください。'); }
  finally { loginReady($('#authStatus').textContent); }
};
async function start() {
  try {
    const client=createBackend(backendConfig);
    api=createApi(client);
    community=createCommunity({api,app,refresh,write,getUser:()=>current,getEpoch:()=>epoch});
    Object.assign(window.SototunaBackend,community);
    client.auth.onAuthStateChange(event=>{ if(event==='SIGNED_OUT') clear(); });
    const {data,error}=await client.auth.getSession();if(error)throw error;
    if(data.session) {const user=await api.currentUser(); await enter(user);}
    loginReady();
  } catch {clear();loginReady('接続を確認できませんでした。更新して再度お試しください。');}
}
start();
