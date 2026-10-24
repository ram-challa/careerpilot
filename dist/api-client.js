import {isCompatibleOpenAIStatus} from './ai-provider.js';
let basePromise;
export async function discoverOpenAIEndpoint({hostname=location.hostname,port=location.port,fetchImpl=fetch}={}) {
  const candidates=[''];
  if(['localhost','127.0.0.1'].includes(hostname)&&port==='4173')candidates.push(`http://${hostname}:4175`);
  for(const base of candidates){try{const res=await fetchImpl(base+'/api/status',{cache:'no-store',signal:AbortSignal.timeout(2500)});if(res.ok&&(res.headers.get('content-type')||'').includes('application/json')){const status=await res.json();if(isCompatibleOpenAIStatus(status))return base}}catch{}}
  throw Error('The OpenAI server is not running at this address. Run start-careerpilot.cmd from the updated project, or restart node server.mjs, then reload.');
}
export async function api(path,data) {
  if(!basePromise)basePromise=discoverOpenAIEndpoint().catch(e=>{basePromise=null;throw e});
  const base=await basePromise;
  let response;
  try{response=await fetch(base+path,{method:data===undefined?'GET':'POST',headers:data===undefined?{}:{'Content-Type':'application/json','X-CareerPilot':'1'},body:data===undefined?undefined:JSON.stringify(data),cache:'no-store',signal:AbortSignal.timeout(path==='/api/personalize'?330000:10000)});}catch{throw Error('The local AI server could not be reached. Your draft is unchanged.');}
  let result;try{result=await response.json()}catch{throw Error('The local API is unavailable. Restart node server.mjs and reload.');}
  if(!response.ok)throw Object.assign(Error(result.error||'Request failed.'),{code:result.code});
  return result;
}
