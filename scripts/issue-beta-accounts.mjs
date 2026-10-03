import {randomBytes} from 'node:crypto';
import {open,readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';

export const BETA_IDS = Array.from({length:15},(_,i)=>`beta${String(i+1).padStart(3,'0')}`);
const domain = '@beta.sototuna.invalid';
const projectUrl = 'https://gdodurlehfyeilxtecoz.supabase.co';
export async function issueAccounts({request,record,password=()=>randomBytes(24).toString('base64url')}) {
  const users=[];
  for(let page=1;;page++) {
    const data=await request(`/auth/v1/admin/users?page=${page}&per_page=1000`);
    users.push(...data.users);
    if(data.users.length<1000)break;
  }
  const byEmail=new Map(users.map(user=>[user.email,user]));
  let created=0;
  for(const id of BETA_IDS) {
    const email=id+domain;
    let user=byEmail.get(email), secret='';
    if(!user) {
      secret=password();
      const data=await request('/auth/v1/admin/users',{method:'POST',body:{email,password:secret,email_confirm:true,app_metadata:{beta_test:true}}});
      user=data.user||data;
      if(!user.id)throw new Error('User creation did not return an ID');
      created++;
    }
    // Persist newly issued credentials before later writes so a failure does not lose them.
    await record({id,email,password:secret,existing:!secret});
    await request('/rest/v1/profiles?on_conflict=user_id',{method:'POST',body:{user_id:user.id,display_name:id,affiliation:'obog'},prefer:'resolution=ignore-duplicates'});
    await request('/rest/v1/memberships?on_conflict=user_id',{method:'POST',body:{user_id:user.id},prefer:'resolution=ignore-duplicates'});
  }
  return {total:BETA_IDS.length,created};
}
async function main() {
  const keyFile=process.env.SOTOTUNA_ADMIN_KEY_FILE;
  const outFile=process.env.SOTOTUNA_BETA_CREDENTIALS_FILE;
  if(!keyFile||!outFile)throw new Error('Set SOTOTUNA_ADMIN_KEY_FILE and SOTOTUNA_BETA_CREDENTIALS_FILE to local private temporary files.');
  if(!keyFile.startsWith('/tmp/')||!outFile.startsWith('/tmp/'))throw new Error('Credential files must remain outside the synced repository, under /tmp/.');
  const key=(await readFile(keyFile,'utf8')).trim();
  if(!key||key.startsWith('sb_publishable_'))throw new Error('A server-only administrative key is required.');
  // Exclusive creation protects a previous issuance list from accidental replacement.
  const output=await open(outFile,'wx',0o600);
  try {
    await output.write('ID,Test email,Password,Existing account\n');
    const request=async(path,{method='GET',body,prefer}={})=>{
      const headers={apikey:key,Authorization:`Bearer ${key}`,'Content-Type':'application/json'};
      if(prefer)headers.Prefer=prefer;
      const response=await fetch(projectUrl+path,{method,headers,body:body?JSON.stringify(body):undefined});
      if(!response.ok)throw new Error(`Supabase operation failed (${response.status}): ${path.split('?')[0]}. Credentials already issued remain in the private output file.`);
      const text=await response.text();return text?JSON.parse(text):{};
    };
    const result=await issueAccounts({request,record:async row=>{
      await output.write(`${row.id},${row.email},${row.password},${row.existing?'yes':'no'}\n`);await output.sync();
    }});
    console.log(`Ready: ${result.total} accounts; created: ${result.created}. Passwords were not printed.`);
  } finally {await output.close();}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)main().catch(error=>{console.error(error.message);process.exitCode=1;});
