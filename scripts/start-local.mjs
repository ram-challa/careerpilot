import {execFile,spawn} from 'node:child_process';
import {promisify} from 'node:util';
import {mkdir,access} from 'node:fs/promises';
import {openSync,closeSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {AI_BUILD,isCompatibleOpenAIStatus} from '../dist/ai-provider.js';

const run=promisify(execFile);
const projectRoot=fileURLToPath(new URL('../',import.meta.url));
const serverPath=path.join(projectRoot,'server.mjs');
const expectedBuild=AI_BUILD;
const portArg=process.argv.find(x=>x.startsWith('--port='));
const port=portArg?Number(portArg.slice(7)):4173;
if(!Number.isInteger(port)||port<1024||port>65535)throw Error('Use a valid local port between 1024 and 65535.');
const address=`http://127.0.0.1:${port}`;
const setupURL=`${address}/ai-setup.html?v=${expectedBuild}`;
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function status(){try{const r=await fetch(address+'/api/status',{signal:AbortSignal.timeout(2000)});return r.ok?await r.json():null}catch{return null}}
function openSetup(){if(process.argv.includes('--no-browser'))return;const child=spawn('rundll32.exe',['url.dll,FileProtocolHandler',setupURL],{detached:true,stdio:'ignore',windowsHide:true});child.on('error',()=>console.log('Open this address in your browser: '+setupURL));child.unref();}

try{
  await access(serverPath);
  const current=await status();
  if(isCompatibleOpenAIStatus(current)){console.log('OpenAI CareerPilot is already running: '+address);console.log('AI setup: '+setupURL);openSetup();}
  else if(process.argv.includes('--check')){console.log(`Port ${port}: ${current?.build||'updated AI server not detected'}`);console.log('Project source: '+projectRoot);}
  else{
    const {stdout}=await run('netstat.exe',['-ano'],{windowsHide:true});
    const listener=stdout.split(/\r?\n/).find(line=>new RegExp(`^\\s*TCP\\s+127\\.0\\.0\\.1:${port}\\s+\\S+\\s+LISTENING\\s+\\d+\\s*$`).test(line));
    if(listener){
      const processId=Number(listener.trim().split(/\s+/).at(-1));
      const tasks=await run('tasklist.exe',['/FI',`PID eq ${processId}`,'/FO','CSV','/NH'],{windowsHide:true});
      const page=await fetch(address+'/',{signal:AbortSignal.timeout(3000)}).then(r=>r.text());
      if(!/^"node\.exe",/im.test(tasks.stdout)||!page.includes('<title>CareerPilot'))throw Error(`Port ${port} belongs to another application. It was left running.`);
      console.log(`Restarting the older CareerPilot server on port ${port}. Saved browser data stays on this address.`);
      try{await run('taskkill.exe',['/PID',String(processId),'/F'],{windowsHide:true});}catch{throw Error('Windows could not stop the old server. Press Ctrl+C in its terminal, then run this launcher again.');}
      await sleep(600);
    }
    const logs=path.join(projectRoot,'tmp');await mkdir(logs,{recursive:true});
    const out=openSync(path.join(logs,'local-server.log'),'a');const err=openSync(path.join(logs,'local-server-error.log'),'a');
    const child=spawn(process.execPath,[serverPath],{cwd:projectRoot,env:{...process.env,PORT:String(port)},detached:true,stdio:['ignore',out,err],windowsHide:true});
    let startError;child.once('error',error=>{startError=error});child.unref();closeSync(out);closeSync(err);
    let ready=false;for(let attempt=0;attempt<12;attempt++){await sleep(500);if(startError)throw startError;if((await status())?.build===expectedBuild){ready=true;break;}}
    if(!ready)throw Error('The updated server did not become ready. Check tmp/local-server-error.log.');
    console.log('CareerPilot ready: '+address);console.log('AI setup: '+setupURL);openSetup();
  }
}catch(error){console.error(error.message);process.exitCode=1;}
