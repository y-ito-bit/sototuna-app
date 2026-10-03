const required=['VITE_SUPABASE_URL','VITE_SUPABASE_PUBLISHABLE_KEY'];
const missing=required.filter(key=>!process.env[key]||/REPLACE_ME|YOUR_PROJECT_REF/.test(process.env[key]));
if(missing.length){console.error('未設定: '+missing.join(', '));process.exitCode=1;}
else if(!process.env.VITE_SUPABASE_PUBLISHABLE_KEY.startsWith('sb_publishable_')){console.error('publishable keyを指定してください。secret/service_roleは使用できません。');process.exitCode=1;}
else{console.log('公開用Supabase設定を確認しました（キーは表示しません）。');}
