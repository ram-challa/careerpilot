// Isolated Chrome acceptance checks for our own local app. No user profile is opened.
import {spawn} from 'node:child_process';
import {readFile,writeFile,mkdir,rm} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {parseResume,clone} from '../dist/resume-model.js';
import {normalizeJob} from '../dist/core.js';

const root=fileURLToPath(new URL('../',import.meta.url));
const profileDir=path.join(root,'tmp','chrome-studio-qa-'+Date.now());
await mkdir(profileDir,{recursive:true});
const chrome=spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',[
  '--headless=new','--disable-gpu','--no-first-run','--no-default-browser-check',
  '--remote-debugging-port=0',`--user-data-dir=${profileDir}`,'about:blank'
],{stdio:'ignore',windowsHide:true});
let ws,seq=0,pending=new Map(),errors=[];
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function until(fn,label,timeout=12000){const start=Date.now();while(Date.now()-start<timeout){try{const x=await fn();if(x)return x}catch{}await sleep(100)}throw Error('Timed out: '+label);}
function call(method,params={}){return new Promise((resolve,reject)=>{const id=++seq;const timer=setTimeout(()=>{pending.delete(id);reject(Error('CDP timed out: '+method))},12000);pending.set(id,{resolve:v=>{clearTimeout(timer);resolve(v)},reject:e=>{clearTimeout(timer);reject(e)}});ws.send(JSON.stringify({id,method,params}));});}
async function evaluate(expression){const r=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result?.value;}
const waitFor=selector=>until(()=>evaluate(`Boolean(document.querySelector(${JSON.stringify(selector)}))`),selector);
try{
  const active=await until(async()=>{const text=await readFile(path.join(profileDir,'DevToolsActivePort'),'utf8');return Number(text.split('\n')[0])},'Chrome DevTools endpoint');
  const targets=await (await fetch(`http://127.0.0.1:${active}/json/list`)).json();
  ws=new WebSocket(targets.find(x=>x.type==='page').webSocketDebuggerUrl);
  await new Promise((resolve,reject)=>{ws.onopen=resolve;ws.onerror=reject});
  ws.onclose=e=>{for(const p of pending.values())p.reject(Error('Chrome CDP closed: '+e.code+' '+e.reason));pending.clear();};
  ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id){const p=pending.get(m.id);if(p){pending.delete(m.id);m.error?p.reject(Error(m.error.message)):p.resolve(m.result)}}if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.exception?.description||m.params.exceptionDetails.text);};
  await call('Runtime.enable');await call('Page.enable');await call('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
  const origin=process.env.BROWSER_URL||'http://127.0.0.1:4175';
  await call('Page.navigate',{url:origin});await waitFor('#view h1');
  let raw;try{raw=await readFile(new URL('../resume.txt',import.meta.url),'utf8')}catch{raw='Alex Morgan\nAnalyst using SQL.\nTECHNICAL SKILLS\n- Reporting: SQL, Power BI\nPROFESSIONAL EXPERIENCE\nAnalyst | Example Jan 2021 - Dec 2024\n- Reduced reporting work 30%.\nEDUCATION\nM.S., Analytics | Example May 2025'}
  const fixture=JSON.parse(await readFile(new URL('./job-fixture.json',import.meta.url),'utf8'));
  const job=normalizeJob(fixture),parsed=parseResume(raw),seed={profile:{...parsed.basics,resume:raw},jobs:[job],resumes:{}};
  await evaluate(`localStorage.setItem('careerpilot-v1',${JSON.stringify(JSON.stringify(seed))});location.hash='resumes';location.reload();`);
  await waitFor('.resume-workbench');
  assert.equal(await evaluate(`document.querySelector('[data-path="basics.fullName"]').value`),parsed.basics.fullName);
  assert.equal(await evaluate(`document.querySelector('#resume-preview').querySelectorAll('[data-section="experience"] .cv-entry').length`),parsed.experience.length);
  await evaluate(`{const f=document.querySelector('[data-path="basics.headline"]');f.value='Data & Systems Analyst';f.dispatchEvent(new Event('input',{bubbles:true}));}`);
  await until(()=>evaluate(`JSON.parse(localStorage.getItem('careerpilot-v1')).resumes[${JSON.stringify(job.id)}]?.document?.basics?.headline==='Data & Systems Analyst'`),'field autosave');
  await evaluate(`document.querySelector('nav a[href="#tracker"]').click()`);await waitFor('.board');
  await evaluate(`document.querySelector('nav a[href="#resumes"]').click()`);await waitFor('.resume-workbench');
  assert.equal(await evaluate(`document.querySelector('[data-path="basics.headline"]').value`),'Data & Systems Analyst');
  await evaluate(`document.querySelector('[data-tab="design"]').click()`);
  await evaluate(`{const box=document.querySelector('[data-visible="skills"]');box.checked=false;box.dispatchEvent(new Event('change',{bubbles:true}));}`);
  assert.equal(await evaluate(`Boolean(document.querySelector('#resume-preview [data-section="skills"]'))`),false);
  await evaluate(`{const box=document.querySelector('[data-visible="skills"]');box.checked=true;box.dispatchEvent(new Event('change',{bubbles:true}));}`);
  await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false}).then(s=>writeFile(path.join(root,'tmp','resume-studio-desktop.png'),Buffer.from(s.data,'base64')));
  // Mock only the model result to test review/apply UI without consuming API credits.
  const candidate=clone(parsed);candidate.basics.headline='Data & Systems Analyst';candidate.summary='Test proposal: experience-led systems and data analysis.';
  const mock={resume:candidate,review:{critique:['Browser acceptance fixture, not a real model assessment.'],changes:['Summary revision for testing.'],matchedKeywords:['SQL'],missingKeywords:['LTI'],questions:['Can you document functional testing experience?']},changes:[{field:'Professional summary',before:parsed.summary,after:candidate.summary}],model:'acceptance-test-mock',passes:2,createdAt:new Date().toISOString()};
  await evaluate(`{const native=window.fetch.bind(window);window.fetch=(url,opts)=>String(url).endsWith('/api/personalize')?Promise.resolve(new Response(${JSON.stringify(JSON.stringify(mock))},{status:200,headers:{'Content-Type':'application/json'}})):native(url,opts);document.querySelector('#tailor').click();}`);
  await waitFor('#accept-proposal');
  assert.equal(await evaluate(`document.querySelector('#preview-proposed').hidden`),false);
  assert.equal(await evaluate(`JSON.parse(localStorage.getItem('careerpilot-v1')).resumes[${JSON.stringify(job.id)}].document.summary`),parsed.summary);
  await evaluate(`document.querySelector('#accept-proposal').click()`);
  assert.equal(await evaluate(`JSON.parse(localStorage.getItem('careerpilot-v1')).resumes[${JSON.stringify(job.id)}].document.summary`),candidate.summary);
  await evaluate(`document.querySelector('[data-tab="content"]').click()`);
  assert.equal(await evaluate(`document.querySelector('[data-path="summary"]').value`),candidate.summary);
  // Validate the actual iframe print document while suppressing the OS print dialog.
  await evaluate(`{const old=document.createElement.bind(document);document.createElement=function(tag,...args){const e=old(tag,...args);if(tag.toLowerCase()==='iframe'){const append=Node.prototype.appendChild;setTimeout(()=>{if(e.contentWindow)e.contentWindow.print=()=>{window.__printChecked=e.contentDocument.body.innerText.length>100&&e.contentDocument.querySelectorAll('.cv-entry').length>0}},0)}return e;};document.querySelector('#export-pdf').click();}`);
  await until(()=>evaluate('window.__printChecked===true'),'PDF print document');
  await call('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await sleep(300);
  assert.equal(await evaluate('document.documentElement.scrollWidth<=window.innerWidth+2'),true);
  await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false}).then(s=>writeFile(path.join(root,'tmp','resume-studio-mobile.png'),Buffer.from(s.data,'base64')));
  assert.deepEqual(errors,[]);
  console.log('PASS: field population, source parsing, live preview, autosave, navigation persistence, section visibility, proposal review, apply/edit, print document, mobile overflow and page-error checks.');
}finally{
  try{ws?.close()}catch{}chrome.kill();
  const checked=path.resolve(profileDir),scope=path.resolve(root,'tmp')+path.sep;
  if(!checked.startsWith(scope))throw Error('Refusing to remove a browser profile outside the test workspace.');
  try{await rm(checked,{recursive:true,force:true,maxRetries:4,retryDelay:200})}catch{}
}
