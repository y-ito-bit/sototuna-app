import {backendConfig} from './config.js';
import {createBackend} from './client.js';
import {createApi} from './api.js';
const $=selector=>document.querySelector(selector);
let api, current, application;
const status=message=>{$('#status').textContent=message;};
async function action(button,task){button.disabled=true;try{await task();}catch(error){status(error.message||'処理できませんでした。');if($('#apply').open)$('#applyStatus').textContent=error.message;}finally{button.disabled=false;}}
function node(tag,text){const element=document.createElement(tag);element.textContent=text;return element;}
function button(text,task){const element=node('button',text);element.onclick=()=>action(element,task);return element;}
async function signedIn(){
  current=await api.currentUser();$('#auth').hidden=true;$('#profile').hidden=false;
  const member=await api.membership();$('#newRecruit').hidden=!member;$('#recruitList').hidden=!member;
  status(member?'認証済み・会員承認済みです。':'会員承認が必要です。');
  if(member)await list();
}
async function list(){
  const rows=await api.listRecruitments();$('#recruitments').replaceChildren();
  if(!rows.length)$('#recruitments').append(node('p','まだ募集がありません。'));
  for(const row of rows){
    const card=node('article','');card.append(node('h3',row.title),node('p',row.body),node('small',`募集者：${row.owner?.display_name||'未設定'} ／ 締切：${row.deadline}`));
    if(row.owner_id===current.id){
      card.append(button('協力者・連絡先を見る',async()=>{
        const people=await api.collaborators(row.id);let area=card.querySelector('.contacts');if(!area){area=node('div','');area.className='contacts';card.append(area);}area.replaceChildren();
        area.append(node('p',`協力者 ${people.length}人`));
        for(const person of people){const entry=node('p',`${person.helper?.display_name||'協力者'}：`);const link=node('span',person.contact_email+'（テスト用・送信不可）');entry.append(link);area.append(entry);}
      }));
    }else{
      const mine=await api.myCooperation(row.id);
      if(row.status==='open')card.append(button(mine?'協力内容を変更':'協力する',async()=>{
        application=row;$('#applyTitle').textContent=`${row.title} ／ 募集者：${row.owner?.display_name||'募集者'}`;
        $('#contactEmail').value=mine?.contact_email||current.email||'';$('#consent').checked=false;$('#applyStatus').textContent='';$('#apply').showModal();
      }));
      if(mine)card.append(button('協力を取り消す',async()=>{await api.withdraw(row.id);await list();status('協力申込と連絡先を削除しました。');}));
    }
    $('#recruitments').append(card);
  }
}
$('#betaLogin').onsubmit=e=>{e.preventDefault();action(e.submitter,async()=>{await api.signInBeta($('#betaId').value,$('#betaPassword').value);$('#betaPassword').value='';await signedIn();});};
$('#profileForm').onsubmit=e=>{e.preventDefault();action(e.submitter,async()=>{await api.saveProfile({displayName:$('#displayName').value,affiliation:$('#affiliation').value});status('プロフィールを保存しました。');});};
$('#recruitForm').onsubmit=e=>{e.preventDefault();action(e.submitter,async()=>{await api.createRecruitment({kind:'survey',title:$('#title').value,body:$('#body').value,deadline:$('#deadline').value});e.target.reset();await list();status('募集を保存しました。');});};
$('#reload').onclick=e=>action(e.currentTarget,list);
$('#logout').onclick=e=>action(e.currentTarget,async()=>{await api.signOut();location.reload();});
$('#applyClose').onclick=()=>$('#apply').close();
$('#applyForm').onsubmit=e=>{e.preventDefault();action(e.submitter,async()=>{await api.cooperate({recruitmentId:application.id,email:$('#contactEmail').value,consent:$('#consent').checked});$('#apply').close();await list();status('協力申込を保存しました。募集者が連絡先を確認できます。');});};
async function start(){
try{
  const client=createBackend(backendConfig);api=createApi(client);
  const {data,error}=await client.auth.getSession();if(error)throw error;
  if(data.session)await signedIn();else{$('#auth').hidden=false;status('運営から受け取ったテストIDでログインしてください。');}
}catch(error){status(error.message+' 接続設定後にこの画面を再ビルドしてください。');}

}
start();
