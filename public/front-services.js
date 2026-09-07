/* Replace create() with an authenticated API adapter when the server is connected. */
(function (root) {
  const copy = value => JSON.parse(JSON.stringify(value));
  const defaults = () => ({ version: 1, visits: [], preferences: { emailEvents: false, replies: true, thanks: true, mentions: true }, notifications: [], messages: [], reports: [], seminarChoices: [] });
  function create({ userId, storage = root.localStorage, now = () => new Date() }) {
    if (!userId) throw new Error('利用者を確認できません');
    const key = 'sototuna.front.v1:' + encodeURIComponent(userId);
    const read = () => { const raw = storage.getItem(key); return raw ? { ...defaults(), ...JSON.parse(raw) } : defaults(); };
    const update = fn => { const data = read(); const result = fn(data); storage.setItem(key, JSON.stringify(data)); return copy(result ?? data); };
    const id = () => root.crypto.randomUUID();
    return {
      mode: 'local',
      async snapshot() { return copy(read()); },
      async claimVisit() {
        const date = now(); const day = [date.getFullYear(), String(date.getMonth()+1).padStart(2,'0'), String(date.getDate()).padStart(2,'0')].join('-');
        return update(data => { if (!data.visits.includes(day)) data.visits.push(day); return { day, count: data.visits.length }; });
      },
      async savePreferences(value) { return update(data => { for (const key of Object.keys(data.preferences)) if (typeof value[key] === 'boolean') data.preferences[key] = value[key]; return data.preferences; }); },
      async sampleNotifications() { return update(data => { if (!data.notifications.some(n=>n.sample)) data.notifications.push(...[
        { kind:'thanks', text:'あなたの回答に「ありがとう」が届きました', href:'#/me' },
        { kind:'replies', text:'質問に新しい回答が届きました', href:'#/qa/q1' },
        { kind:'mentions', text:'やりとりであなたがメンションされました', href:'#/board' }
      ].map(n=>({...n,id:id(),sample:true,read:false,createdAt:now().toISOString()}))); }); },
      async readNotifications(ids) { return update(data => { data.notifications.forEach(n=>{if(ids.includes(n.id)) n.read=true;}); }); },
      async clearSamples() { return update(data => { data.notifications=data.notifications.filter(n=>!n.sample); }); },
      async saveMessage({ draftId, recruitmentId, recipientId, recipientName, body }) {
        if (!recruitmentId || !recipientId || !body.trim() || body.trim().length>1000) throw new Error('宛先と1〜1,000文字の本文を確認してください');
        return update(data => { const old = data.messages.find(m=>m.id===draftId); const message = { id:old?.id||id(), recruitmentId,recipientId,recipientName,body:body.trim(),status:'draft',updatedAt:now().toISOString() }; if(old) Object.assign(old,message); else data.messages.unshift(message); return message; });
      },
      async saveReport({ questionId, reason, detail }) {
        if (!questionId || !['spam','abuse','privacy','other'].includes(reason) || detail.length>1000 || (reason==='other'&&!detail.trim())) throw new Error('通報理由と内容を確認してください');
        return update(data => { const report={id:id(),questionId,reason,detail:detail.trim(),status:'draft',createdAt:now().toISOString()}; data.reports.unshift(report); return report; });
      },
      async removeDraft(kind, draftId) { if(!['messages','reports'].includes(kind)) throw new Error('対象が不正です'); return update(data=>{data[kind]=data[kind].filter(item=>item.id!==draftId);}); },
      async toggleSeminar(teacherId) { return update(data => { data.seminarChoices = data.seminarChoices.includes(teacherId) ? data.seminarChoices.filter(id=>id!==teacherId) : [...data.seminarChoices,teacherId]; return data.seminarChoices; }); }
    };
  }
  // PDFs use IndexedDB so they do not exhaust the text/settings localStorage quota.
  function createFiles({ userId, indexedDB = root.indexedDB }) {
    const db = () => new Promise((resolve,reject) => { const r=indexedDB.open('sototuna-files-v1',1); r.onupgradeneeded=()=>r.result.createObjectStore('resumes',{keyPath:'id'}); r.onsuccess=()=>resolve(r.result); r.onerror=()=>reject(r.error); });
    async function run(mode, action) { const database=await db(); return new Promise((resolve,reject)=>{const tx=database.transaction('resumes',mode); let result; const request=action(tx.objectStore('resumes')); request.onsuccess=()=>{result=request.result;}; tx.oncomplete=()=>{database.close();resolve(result);}; tx.onerror=tx.onabort=()=>{database.close();reject(tx.error||new Error('資料を保存できませんでした'));};}); }
    return {
      mode:'local',
      async list() { return (await run('readonly',s=>s.getAll())).filter(file=>file.userId===userId); },
      async save({ seminar, title, file }) {
        if (!seminar || !title.trim() || title.length>100 || file.size>5*1024*1024 || file.type!=='application/pdf' || new TextDecoder().decode(await file.slice(0,5).arrayBuffer())!=='%PDF-') throw new Error('タイトルと5MB以下のPDFを確認してください');
        const record={id:root.crypto.randomUUID(),userId,seminar,title:title.trim(),name:file.name,size:file.size,file,createdAt:new Date().toISOString(),status:'local'};
        await run('readwrite',s=>s.put(record)); return record;
      },
      async remove(id) { if(!(await this.list()).some(f=>f.id===id)) throw new Error('資料が見つかりません'); await run('readwrite',s=>s.delete(id)); }
    };
  }
  root.SototunaServices = { create, createFiles };
})(globalThis);
