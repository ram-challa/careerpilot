import {parseResume,validateResume,resumeText,resumeHTML,documentCSS,SECTION_LABELS,esc,clone,splitSkills} from './resume-model.js';
import {api} from './api-client.js';
import {mountOpenAISetup} from './openai-setup.js';

export function studioShell(jobs) {
  return `<div class="page-heading studio-heading"><div><span class="eyebrow">YOUR EXPERIENCE. IN FOCUS.</span><h1>Resume studio</h1><p class="muted">One classic template. Your story, thoughtfully tailored.</p></div><div class="actions"><span id="draft-status" role="status">All changes saved</span><button id="ai-setup" class="secondary">AI setup</button><button id="export-pdf" class="primary">↓ Export PDF</button></div></div>
  <div class="studio-controls"><label>Resume version<select id="resume-job"><option value="master">Master resume</option>${jobs.map(j=>`<option value="${esc(j.id)}">${esc(j.title)} · ${esc(j.company)}</option>`).join('')}</select></label><div class="studio-control-actions"><button id="populate-resume" class="secondary">↻ Populate from profile</button><button id="tailor" class="primary">✧ Personalize with AI</button></div></div>
  <div id="ai-status-line" class="studio-status">Checking local AI connection…</div>
  <div class="resume-workbench"><section class="resume-editor"><div class="editor-tabs" role="tablist" aria-label="Resume editor"><button data-tab="content" class="active" role="tab" aria-selected="true">Content</button><button data-tab="design" role="tab" aria-selected="false">Layout</button><button data-tab="review" role="tab" aria-selected="false">AI review <span id="review-count"></span></button></div><div id="editor-fields"></div></section><section class="resume-preview-pane"><div class="preview-toolbar"><span>CLASSIC SANS · US LETTER</span><div><button id="preview-current" class="text-button active">Current draft</button><button id="preview-proposed" class="text-button" hidden>AI proposal</button></div></div><div class="preview-stage"><div id="preview-wrap"><article class="classic-resume" id="resume-preview" aria-label="Resume preview"></article></div></div><p class="preview-caption">Live preview · Editable fields on the left · PDF text stays selectable</p><div class="actions export-actions"><button id="export-text" class="secondary">↓ Resume.txt</button><button id="export-json" class="secondary">↓ Editable JSON</button><span id="template-notice">One template, built for clear reading.</span></div></section></div>
  <dialog id="ai-dialog"><form id="ai-config-form"><div class="dialog-heading"><div><span class="eyebrow">OPENAI CONNECTION</span><h2>Connect your API key</h2></div><button type="button" class="icon-button" data-close-ai aria-label="Close">×</button></div><p class="muted">The key is held in the local server’s memory until it restarts. It is never saved in this browser or included in exports.</p><p id="setup-message" data-openai-status role="status"></p><label>OpenAI API key<input id="openai-key" data-openai-key type="password" autocomplete="off" spellcheck="false" placeholder="sk-…" required></label><p class="note">Personalization sends your current resume and selected job description to OpenAI in two passes: draft, then critical review and revision.</p><button class="primary" data-openai-save disabled>Save key for this session</button></form></dialog>`;
}

export function mountStudio({state,persist,toast,download,initialJobId}) {
  const root=document.querySelector('.resume-workbench');
  if(!root)return ()=>{};
  const $=s=>document.querySelector(s);
  let selected=state.jobs.some(j=>j.id===initialJobId)?initialJobId:(state.jobs[0]?.id||'master');
  let tab='content',doc,proposal=null,report=null,proposedPreview=false,saveTimer,busy=false,dirty=false,disposed=false;
  const stamp=()=>new Date().toISOString();
  const key=()=>selected==='master'?null:selected;
  const currentJob=()=>state.jobs.find(j=>j.id===selected);
  function master(){return state.profile.structuredResume?clone(state.profile.structuredResume):parseResume(state.profile.resume||'',state.profile);}
  function load(){
    const saved=key()?state.resumes[selected]:null;
    if(saved?.text&&!saved.document&&!saved.legacyText)saved.legacyText=saved.text;
    try{doc=validateResume(saved?.document?clone(saved.document):master());}catch{doc=parseResume(state.profile.resume||'',state.profile);}
    proposal=saved?.proposal||null;report=saved?.report||null;proposedPreview=false;dirty=false;
    $('#resume-job').value=selected;$('#preview-proposed').hidden=!proposal;
    $('#tailor').disabled=busy||selected==='master';
    $('#draft-status').textContent=selected==='master'?'Editing master resume':'Job-specific version';
    drawFields();preview();snapshot();
  }
  function flush(){
    clearTimeout(saveTimer);if(!dirty||disposed)return true;
    try{validateResume(doc);}catch(e){toast(e.message);return false;}
    if(key())state.resumes[selected]={...state.resumes[selected],document:clone(doc),text:resumeText(doc),report,proposal,updatedAt:stamp()};
    else {state.profile.structuredResume=clone(doc);Object.assign(state.profile,doc.basics);state.profile.skills=doc.skills.flatMap(g=>g.keywords).join(', ');}
    const ok=persist();if(ok){dirty=false;$('#draft-status').textContent='All changes saved';}return ok;
  }
  function changed(){if(proposal){proposal=null;report=null;proposedPreview=false;$('#preview-proposed').hidden=true;toast('Pending AI proposal cleared because the source draft changed.');}dirty=true;$('#draft-status').textContent='Saving…';clearTimeout(saveTimer);saveTimer=setTimeout(flush,450);preview();}
  window.addEventListener('pagehide',flush);
  function snapshot(){api('/api/workspace',{jobs:state.jobs,selectedJobId:selected}).catch(()=>{});}
  function input(label,path,value,type='text',area=false){return `<label>${esc(label)}${area?`<textarea rows="${path==='summary'?5:3}" data-path="${esc(path)}">${esc(value)}</textarea>`:`<input type="${type}" data-path="${esc(path)}" value="${esc(value)}">`}</label>`;}
  function moveButtons(key,index,length){return `<div class="entry-buttons"><button type="button" data-entry="up" data-key="${key}" data-index="${index}" ${index===0?'disabled':''} aria-label="Move entry up">↑</button><button type="button" data-entry="down" data-key="${key}" data-index="${index}" ${index===length-1?'disabled':''} aria-label="Move entry down">↓</button><button type="button" data-entry="delete" data-key="${key}" data-index="${index}" aria-label="Remove entry">×</button></div>`;}
  function sectionEditor(section) {
    if(section==='summary')return input('Professional summary','summary',doc.summary,'text',true);
    if(section==='additional')return input('One item per line','additional',doc.additional.join('\n'),'text',true);
    const fields={experience:[['role','Job title'],['company','Employer'],['location','Location'],['startDate','Start date'],['endDate','End date']],education:[['degree','Degree / qualification'],['institution','Institution'],['location','Location'],['startDate','Start date'],['endDate','End date']],projects:[['name','Project name'],['context','Organization / technologies']],skills:[['name','Skill group']]}[section];
    return doc[section].map((row,i)=>`<div class="resume-entry-editor"><div class="entry-heading"><strong>${esc(row.role||row.degree||row.name||'New entry')}</strong>${moveButtons(section,i,doc[section].length)}</div><div class="resume-entry-grid">${fields.map(([k,label])=>input(label,`${section}.${i}.${k}`,row[k])).join('')}</div>${input(section==='skills'?'Skills, separated by commas':section==='education'?'Details, one per line':'Bullets, one per line',`${section}.${i}.${section==='skills'?'keywords':section==='education'?'details':'bullets'}`,row[section==='skills'?'keywords':section==='education'?'details':'bullets'].join(section==='skills'?', ':'\n'),'text',true)}</div>`).join('')+`<button class="secondary small-button" data-add="${section}">＋ Add ${section==='experience'?'experience':section==='education'?'education':section==='projects'?'project':'skill group'}</button>`;
  }
  function drawFields(){
    if(disposed)return;
    document.querySelectorAll('[data-tab]').forEach(b=>{b.classList.toggle('active',b.dataset.tab===tab);b.setAttribute('aria-selected',String(b.dataset.tab===tab));});
    $('#review-count').textContent=proposal?'•':'';
    const target=$('#editor-fields');
    if(tab==='content'){
      target.innerHTML=`<div class="editor-intro"><span class="eyebrow">${selected==='master'?'YOUR ORIGINAL STORY':'TAILORED FOR THIS OPPORTUNITY'}</span><p>${selected==='master'?'Your master is the starting point for new job versions.':'Edits here belong to this job. Your master stays separate.'}</p></div><details class="resume-section-editor" open><summary>Personal information</summary><div class="section-fields">${Object.entries({fullName:'Full name',headline:'Professional headline',email:'Email',phone:'Phone',location:'Location',linkedin:'LinkedIn URL',website:'Portfolio / website'}).map(([k,label])=>input(label,`basics.${k}`,doc.basics[k])).join('')}</div></details>${doc.sectionOrder.map(s=>`<details class="resume-section-editor" ${s==='summary'?'open':''}><summary>${SECTION_LABELS[s]} ${doc.hiddenSections.includes(s)?'<small>Hidden</small>':''}</summary><div class="section-fields">${sectionEditor(s)}</div></details>`).join('')}<div class="import-resume-box"><strong>Start with your existing resume</strong><p>Fields are populated from My profile. You can also load a plain-text resume.</p><label class="secondary file-label">Import .txt<input id="studio-import" type="file" accept=".txt,text/plain"></label><button class="ghost small-button" id="load-local-resume">Load local resume.txt</button></div>${state.resumes[selected]?.legacyText||state.resumes[selected]?.text&&!state.resumes[selected]?.document?'<details class="legacy-draft"><summary>Previous plain-text draft</summary><pre>'+esc(state.resumes[selected].legacyText||state.resumes[selected].text)+'</pre></details>':''}`;
    }else if(tab==='design'){
      target.innerHTML=`<div class="editor-intro"><span class="eyebrow">CLASSIC SANS</span><p>A single-column resume with clear headings, readable type and selectable text.</p></div><div class="layout-controls">${input('Font size (9–12 pt)','design.fontSize',doc.design?.fontSize||10,'number')}${input('Line spacing (1.1–1.6)','design.lineHeight',doc.design?.lineHeight||1.35,'number')}${input('Page margin (0.35–0.9 inches)','design.margin',doc.design?.margin||.55,'number')}<h3>Sections & order</h3><p class="muted">Hide a section or move it up and down.</p>${doc.sectionOrder.map((s,i)=>`<div class="section-order-row"><label><input type="checkbox" data-visible="${s}" ${doc.hiddenSections.includes(s)?'':'checked'}>${SECTION_LABELS[s]}</label><div><button data-section-move="up" data-index="${i}" ${i===0?'disabled':''} aria-label="Move ${SECTION_LABELS[s]} up">↑</button><button data-section-move="down" data-index="${i}" ${i===doc.sectionOrder.length-1?'disabled':''} aria-label="Move ${SECTION_LABELS[s]} down">↓</button></div></div>`).join('')}</div>`;
      target.querySelectorAll('input[type=number]').forEach(e=>{const rules=e.dataset.path.includes('fontSize')?[9,12,.5]:e.dataset.path.includes('lineHeight')?[1.1,1.6,.05]:[.35,.9,.05];[e.min,e.max,e.step]=rules.map(String)});
    }else{
      target.innerHTML=`<div class="editor-intro"><span class="eyebrow">CRITIQUE → REVISE → REVIEW</span><p>AI proposals stay separate until you apply them. The model checks relevance, clarity, keyword use and unsupported claims.</p></div>${proposal?`<div class="proposal-actions"><button class="primary" id="accept-proposal">Apply reviewed proposal</button><button class="secondary" id="discard-proposal">Discard proposal</button></div>`:''}${report?`<div class="review-report"><div class="review-meta">${esc(report.model)} · ${esc(report.passes)} passes · ${report.appliedAt?'Applied to draft':'Review before applying'}</div>${[['critique','Critical review'],['changes','What improved'],['matchedKeywords','Supported job keywords'],['missingKeywords','Gaps to address'],['questions','Questions for you']].map(([k,title])=>`<h3>${title}</h3>${report.review[k]?.length?`<ul>${report.review[k].map(s=>`<li>${esc(s)}</li>`).join('')}</ul>`:'<p class="muted">None reported.</p>'}`).join('')}<h3>Wording changes</h3>${report.changes.map(c=>`<details class="change-card"><summary>${esc(c.field)}</summary><small>BEFORE</small><p>${esc(c.before)}</p><small>PROPOSED</small><p>${esc(c.after)}</p></details>`).join('')||'<p class="muted">No wording changes.</p>'}<p class="note">These are model findings, not an ATS score or a guarantee. Check every claim before applying.</p></div>`:'<div class="review-empty"><span>✧</span><h3>A sharper story starts here.</h3><p>Select a job and personalize your resume. Your two-pass review will appear here.</p></div>'}`;
    }
  }
  function preview(){
    if(disposed)return;
    const shown=proposedPreview&&proposal?proposal:doc;
    let style=$('#cv-document-style');if(!style){style=document.createElement('style');style.id='cv-document-style';document.head.append(style);}style.textContent=documentCSS(shown.design);
    $('#resume-preview').innerHTML=resumeHTML(shown);
    $('#preview-current').classList.toggle('active',!proposedPreview);$('#preview-proposed').classList.toggle('active',proposedPreview);
    requestAnimationFrame(scale);
  }
  function scale(){if(disposed||!$('#resume-preview'))return;const sheet=$('#resume-preview'),wrap=$('#preview-wrap'),stage=$('.preview-stage');const available=stage.clientWidth-32;const factor=Math.min(1,available/816);sheet.style.transform=`scale(${factor})`;sheet.style.transformOrigin='top left';wrap.style.width=`${816*factor}px`;wrap.style.height=`${sheet.scrollHeight*factor}px`;}
  const observer=new ResizeObserver(scale);observer.observe($('.preview-stage'));
  function updatePath(path,value){const parts=path.split('.');let t=doc;for(const part of parts.slice(0,-1))t=t[part];const last=parts.at(-1);if(['bullets','details','additional'].includes(last))t[last]=value.split('\n').map(s=>s.replace(/^[-•]\s*/, '').trim()).filter(Boolean);else if(last==='keywords')t[last]=splitSkills(value);else if(parts[0]==='design')t[last]=Number(value);else t[last]=value;}
  $('#editor-fields').oninput=e=>{if(!e.target.dataset.path||busy)return;updatePath(e.target.dataset.path,e.target.value);if(proposal){proposal=null;report=null;$('#preview-proposed').hidden=true;proposedPreview=false;toast('The pending proposal was cleared because the source draft changed.');}changed();};
  $('#editor-fields').onchange=async e=>{
    if(e.target.dataset.visible){const s=e.target.dataset.visible;doc.hiddenSections=doc.hiddenSections.filter(k=>k!==s);if(!e.target.checked)doc.hiddenSections.push(s);changed();}
    if(e.target.id==='studio-import'){const file=e.target.files[0];if(!file)return;if(file.size>200000)return toast('Choose a .txt resume under 200 KB.');if(!confirm('Replace the current version with this imported resume?'))return;doc=parseResume(await file.text(),{});proposal=null;report=null;changed();drawFields();}
  };
  $('#editor-fields').onclick=async e=>{
    const button=e.target.closest('button');if(!button||busy)return;
    if(button.dataset.add){const k=button.dataset.add;const entry=k==='experience'?{id:crypto.randomUUID(),role:'',company:'',location:'',startDate:'',endDate:'',bullets:[]}:k==='education'?{id:crypto.randomUUID(),degree:'',institution:'',location:'',startDate:'',endDate:'',details:[]}:k==='projects'?{id:crypto.randomUUID(),name:'',context:'',bullets:[]}:{id:crypto.randomUUID(),name:'Skills',keywords:[]};doc[k].push(entry);changed();drawFields();return;}
    if(button.dataset.entry){const k=button.dataset.key,i=Number(button.dataset.index);if(button.dataset.entry==='delete'){if(!confirm('Remove this resume entry from this version?'))return;doc[k].splice(i,1);}else{const j=i+(button.dataset.entry==='up'?-1:1);[doc[k][i],doc[k][j]]=[doc[k][j],doc[k][i]];}changed();drawFields();return;}
    if(button.dataset.sectionMove){const i=Number(button.dataset.index),j=i+(button.dataset.sectionMove==='up'?-1:1);[doc.sectionOrder[i],doc.sectionOrder[j]]=[doc.sectionOrder[j],doc.sectionOrder[i]];changed();drawFields();return;}
    if(button.id==='load-local-resume'){try{const data=await api('/api/resume-source');if(doc.summary&&!confirm('Replace this version with the local resume.txt?'))return;doc=parseResume(data.text,{});if(selected==='master')state.profile.resume=data.text;proposal=null;report=null;changed();drawFields();toast('Resume fields populated. Review dates and section assignments.');}catch(e){toast(e.message)}return;}
    if(button.id==='accept-proposal'){if(!proposal)return;doc=clone(proposal);proposal=null;report.appliedAt=stamp();proposedPreview=false;$('#preview-proposed').hidden=true;dirty=true;flush();drawFields();preview();toast('AI revision applied. You can edit every field.');}
    if(button.id==='discard-proposal'){proposal=null;report=null;proposedPreview=false;$('#preview-proposed').hidden=true;dirty=true;flush();drawFields();preview();toast('Proposal discarded. Your draft is unchanged.');}
  };
  document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{tab=b.dataset.tab;drawFields()});
  $('#resume-job').onchange=e=>{if(busy){e.target.value=selected;return;}if(!flush()){e.target.value=selected;return;}selected=e.target.value;state.activeResumeJobId=selected;persist();load();};
  $('#populate-resume').onclick=()=>{if(busy)return;if(doc.summary&&!confirm('Repopulate this version from your profile? Your other versions will stay unchanged.'))return;doc=parseResume(state.profile.resume||'',state.profile);if(!state.profile.resume)toast('Import your resume in My profile or load local resume.txt below.');proposal=null;report=null;proposedPreview=false;$('#preview-proposed').hidden=true;changed();drawFields();};
  $('#preview-current').onclick=()=>{proposedPreview=false;preview()};$('#preview-proposed').onclick=()=>{proposedPreview=true;preview()};
  $('#tailor').onclick=async()=>{
    const job=currentJob();if(!job)return toast('Select a saved job first.');
    if(!doc.experience.length&&!doc.projects.length)return toast('Populate your resume experience before personalizing.');
    if(!flush())return;
    const requestKey=selected,source=clone(doc);busy=true;
    $('#tailor').disabled=true;$('#resume-job').disabled=true;$('#populate-resume').disabled=true;$('#editor-fields').inert=true;
    $('#ai-status-line').textContent='Personalizing with OpenAI: draft → critical review → final revision. This may take a few minutes…';
    try{
      const result=await api('/api/personalize',{resume:source,job});
      validateResume(result.resume);
      if(disposed){state.resumes[requestKey]={...state.resumes[requestKey],proposal:result.resume,report:result,document:source,text:resumeText(source)};persist();return;}
      proposal=result.resume;report=result;proposedPreview=true;$('#preview-proposed').hidden=false;tab='review';dirty=true;flush();drawFields();preview();toast('Two-pass revision ready. Review before applying.');
      $('#ai-status-line').textContent=`${result.model} · Two passes complete · Your current draft is unchanged until you apply the proposal.`;
    }catch(e){if(!disposed){toast(e.message);$('#ai-status-line').textContent=e.message;if(e.code==='key_missing')$('#ai-dialog').showModal();}}
    finally{busy=false;if(!disposed){$('#tailor').disabled=selected==='master';$('#resume-job').disabled=false;$('#populate-resume').disabled=false;$('#editor-fields').inert=false;}}
  };
  $('#ai-setup').onclick=()=>$('#ai-dialog').showModal();$('[data-close-ai]').onclick=()=>$('#ai-dialog').close();
  mountOpenAISetup($('#ai-config-form'),{onSaved:result=>{if(disposed)return;$('#ai-dialog').close();$('#ai-status-line').textContent=`OpenAI · ${result.model} · Two-pass review`;toast('OpenAI setup saved for this session. Select a job and personalize.');}});
  $('#export-text').onclick=()=>download('resume.txt',resumeText(doc),'text/plain');
  $('#export-json').onclick=()=>download('resume-editable.json',JSON.stringify(doc,null,2));
  $('#export-pdf').onclick=()=>{
    flush();const frame=document.createElement('iframe');frame.className='resume-print-frame';frame.title='Resume PDF print document';document.body.append(frame);
    const target=frame.contentDocument;target.open();target.write(`<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${esc(doc.basics.fullName||'Resume')} - Resume</title><style>${documentCSS(doc.design)}</style></head><body><article class="classic-resume">${resumeHTML(doc)}</article></body></html>`);target.close();
    setTimeout(()=>{frame.contentWindow.focus();frame.contentWindow.print();},200);
    setTimeout(()=>frame.remove(),120000);
  };
  api('/api/status').then(s=>{if(!disposed)$('#ai-status-line').textContent=`OpenAI · ${s.model||'gpt-6.1-sol'} · ${s.configured?'Ready for two-pass personalization':'Connect your OpenAI API key in AI setup'}`;}).catch(e=>{if(!disposed)$('#ai-status-line').textContent=e.message});
  load();
  return ()=>{flush();disposed=true;clearTimeout(saveTimer);observer.disconnect();window.removeEventListener('pagehide',flush);const dialog=$('#ai-dialog');if(dialog?.open)dialog.close();};
}
