export const CONTACT_CONSENT_VERSION = 1;

function unwrap(result) {
  if (result.error) throw result.error;
  return result.data;
}
export function createApi(client) {
  async function user() {
    const data = unwrap(await client.auth.getUser());
    if (!data.user) throw new Error('ログインしてください。');
    return data.user;
  }
  return {
    async signInBeta(id, password) {
      const normalized = id.trim().toLowerCase();
      if (!/^beta[0-9]{3,6}$/.test(normalized)) throw new Error('発行されたテストIDを入力してください。');
      return unwrap(await client.auth.signInWithPassword({email:normalized+'@beta.sototuna.invalid',password}));
    },
    // Invite-only initial rollout: users must already exist in Supabase Auth.
    async requestCode(email) {
      unwrap(await client.auth.signInWithOtp({ email: email.trim(), options: { shouldCreateUser: false } }));
    },
    async verifyCode(email, token) {
      return unwrap(await client.auth.verifyOtp({ email: email.trim(), token: token.trim(), type: 'email' }));
    },
    async signOut() { unwrap(await client.auth.signOut()); },
    async currentUser() { return user(); },
    async membership() {
      const current = await user();
      return unwrap(await client.from('memberships').select('user_id,approved_at').eq('user_id', current.id).maybeSingle());
    },
    async saveProfile({ displayName, affiliation, generation = null, seminar = null }) {
      const current = await user();
      return unwrap(await client.from('profiles').upsert({user_id:current.id, display_name:displayName.trim(), affiliation, generation, seminar}).select().single());
    },
    async listRecruitments() {
      return unwrap(await client.from('recruitments').select('*,owner:profiles!owner_id(display_name)').order('created_at', {ascending:false}));
    },
    async createRecruitment({ kind, title, body, deadline }) {
      const current = await user();
      return unwrap(await client.from('recruitments').insert({owner_id:current.id, kind, title:title.trim(), body:body.trim(), deadline}).select().single());
    },
    async cooperate({ recruitmentId, email, consent }) {
      if (consent !== true) throw new Error('メールアドレス共有への同意が必要です。');
      const current = await user();
      return unwrap(await client.from('cooperations').upsert({recruitment_id:recruitmentId, helper_id:current.id, contact_email:email.trim(), consent_version:CONTACT_CONSENT_VERSION}, {onConflict:'recruitment_id,helper_id'}).select().single());
    },
    async myCooperation(recruitmentId) {
      const current = await user();
      return unwrap(await client.from('cooperations').select('*').eq('recruitment_id',recruitmentId).eq('helper_id',current.id).maybeSingle());
    },
    async withdraw(recruitmentId) {
      const current = await user();
      unwrap(await client.from('cooperations').delete().eq('recruitment_id',recruitmentId).eq('helper_id',current.id));
    },
    async collaborators(recruitmentId) {
      const current = await user();
      const recruitment = unwrap(await client.from('recruitments').select('id,owner_id').eq('id',recruitmentId).single());
      if (recruitment.owner_id !== current.id) throw new Error('この募集の募集者だけが連絡先を確認できます。');
      return unwrap(await client.from('cooperations').select('helper_id,contact_email,consent_at,helper:profiles!helper_id(display_name)').eq('recruitment_id',recruitmentId).order('consent_at'));
    },
    async counts() { return unwrap(await client.rpc('recruitment_counts')); },
  };
}
