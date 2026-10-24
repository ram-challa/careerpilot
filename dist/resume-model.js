export const SECTION_LABELS = {
  summary: 'Professional summary', experience: 'Professional experience', education: 'Education',
  projects: 'Selected projects', skills: 'Technical skills', additional: 'Additional information'
};
export const SECTION_KEYS = Object.keys(SECTION_LABELS);
const id = () => globalThis.crypto.randomUUID();
export const clone = value => JSON.parse(JSON.stringify(value));
export const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function splitSkills(value) {
  const result=[];let depth=0,start=0;const text=String(value);
  for(let i=0;i<text.length;i++){if(text[i]==='(')depth++;if(text[i]===')')depth=Math.max(0,depth-1);if(text[i]===','&&depth===0){result.push(text.slice(start,i).trim());start=i+1;}}
  result.push(text.slice(start).trim());return result.filter(Boolean);
}
export function emptyResume() {
  return {
    version: 2,
    basics: { fullName: '', headline: '', email: '', phone: '', location: '', linkedin: '', website: '' },
    summary: '', experience: [], education: [], projects: [], skills: [], additional: [],
    sectionOrder: ['summary', 'experience', 'education', 'projects', 'skills', 'additional'],
    hiddenSections: [], design: { fontSize: 10, lineHeight: 1.35, margin: 0.55 }
  };
}
export function parseResume(text, profile = {}) {
  const r = emptyResume();
  const lines = String(text || '').split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const first = lines[0] || '';
  Object.keys(r.basics).forEach(k => { r.basics[k] = String(profile[k] || ''); });
  r.basics.fullName ||= first;
  const contact = lines.find(l => /[\w.+-]+@[\w.-]+\.[a-z]{2,}/i.test(l)) || '';
  r.basics.email ||= contact.match(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/i)?.[0] || '';
  r.basics.phone ||= contact.match(/(?:\+\d{1,3}[ .-]?)?\(?\d{3}\)?[ .-]\d{3}[ .-]\d{4}/)?.[0] || '';
  r.basics.location ||= contact.includes('|') ? contact.split('|')[0].trim() : '';
  const headings = {
    'SUMMARY':'summary', 'PROFESSIONAL SUMMARY':'summary', 'PROFILE':'summary',
    'TECHNICAL SKILLS':'skills', 'SKILLS':'skills', 'CORE COMPETENCIES':'skills',
    'PROFESSIONAL EXPERIENCE':'experience', 'WORK EXPERIENCE':'experience', 'EXPERIENCE':'experience',
    'EDUCATION':'education', 'SELECTED ANALYTICS & MACHINE LEARNING PROJECTS':'projects',
    'SELECTED PROJECTS':'projects', 'PROJECTS':'projects', 'ADDITIONAL INFORMATION':'additional',
    'CERTIFICATIONS':'additional', 'LANGUAGES':'additional'
  };
  let section = 'summary', current = null;
  const dates = /\s+((?:(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+)?\d{4})\s*[-–—]\s*(Present|Current|(?:(?:[A-Za-z]+)\s+)?\d{4})\s*$/i;
  for (let i=0;i<lines.length;i++) {
    const line = lines[i];
    if (i===0 || line===contact) continue;
    const key = headings[line.replace(/:$/, '').toUpperCase()];
    if (key) { section=key; current=null; continue; }
    const bullet = /^[-•▪●]\s+/.test(line);
    const clean = line.replace(/^[-•▪●]\s+/, '');
    if (section==='summary') { r.summary += (r.summary?' ':'')+line; continue; }
    if (section==='skills') {
      const colon=clean.indexOf(':');
      if (colon>0) r.skills.push({id:id(),name:clean.slice(0,colon),keywords:splitSkills(clean.slice(colon+1))});
      else if (!bullet && r.skills.length) r.skills.at(-1).keywords.push(clean);
      else r.skills.push({id:id(),name:'Skills',keywords:splitSkills(clean)});
      continue;
    }
    if (section==='experience') {
      if (!bullet && (line.includes('|') || !current)) {
        const match=line.match(dates), title=match?line.slice(0,match.index):line;
        const [role,...company]=title.split('|');
        current={id:id(),role:role.trim(),company:company.join('|').trim(),location:'',startDate:match?.[1]||'',endDate:match?.[2]||'',bullets:[]};
        r.experience.push(current);
      } else if(current) {
        if (!bullet && current.bullets.length) current.bullets[current.bullets.length-1]+=' '+clean;
        else current.bullets.push(clean);
      }
      continue;
    }
    if (section==='projects') {
      if (!bullet && (line.includes('|') || !current)) {
        const [name,...context]=line.split('|'); current={id:id(),name:name.trim(),context:context.join('|').trim(),bullets:[]};r.projects.push(current);
      } else if(current) {
        if (!bullet && current.bullets.length) current.bullets[current.bullets.length-1]+=' '+clean;
        else current.bullets.push(clean);
      }
      continue;
    }
    if (section==='education') {
      if (!bullet && !/^Coursework:|^GPA:/i.test(line) && (line.includes('|') || !current)) {
        const parts=line.split('|');const institution=parts.slice(1).join('|').trim();
        const end=institution.match(/\s+((?:[A-Za-z]+\s+)?\d{4})$/);
        const school=end?institution.slice(0,end.index):institution;
        const gpa=school.match(/\s+[-–—]\s+(GPA\s+.+)$/i);
        current={id:id(),degree:parts[0].trim(),institution:gpa?school.slice(0,gpa.index):school,location:'',startDate:'',endDate:end?.[1]||'',details:gpa?[gpa[1]]:[]};r.education.push(current);
      } else if(current)current.details.push(clean);
      continue;
    }
    r.additional.push(clean);
  }
  if (!r.skills.length && profile.skills) r.skills.push({id:id(),name:'Skills',keywords:splitSkills(profile.skills)});
  return r;
}
export function validateResume(r) {
  if(!r || r.version!==2 || !r.basics || typeof r.summary!=='string')throw Error('Invalid structured resume.');
  for(const k of Object.keys(emptyResume().basics)) if(typeof r.basics[k]!=='string')throw Error('Invalid contact field.');
  const layouts={experience:['id','role','company','location','startDate','endDate'],education:['id','degree','institution','location','startDate','endDate'],projects:['id','name','context'],skills:['id','name']};
  for(const [key,fields] of Object.entries(layouts)) {
    if(!Array.isArray(r[key])||r[key].length>50)throw Error('Invalid resume section.');
    const ids=new Set();
    for(const row of r[key]) {
      if(!row||fields.some(k=>typeof row[k]!=='string')||!row.id||ids.has(row.id))throw Error('Invalid resume entry.');ids.add(row.id);
      const list=row[key==='education'?'details':key==='skills'?'keywords':'bullets'];
      if(!Array.isArray(list)||list.length>100||list.some(s=>typeof s!=='string'||s.length>6000))throw Error('Invalid resume bullet.');
    }
  }
  if(!Array.isArray(r.additional)||r.additional.some(s=>typeof s!=='string'))throw Error('Invalid additional information.');
  if(!Array.isArray(r.sectionOrder)||r.sectionOrder.length!==SECTION_KEYS.length||new Set(r.sectionOrder).size!==SECTION_KEYS.length||r.sectionOrder.some(k=>!SECTION_KEYS.includes(k)))throw Error('Invalid section order.');
  if(!Array.isArray(r.hiddenSections)||r.hiddenSections.some(k=>!SECTION_KEYS.includes(k)))throw Error('Invalid section visibility.');
  if(JSON.stringify(r).length>150000)throw Error('Resume exceeds 150 KB.');
  return r;
}
export function resumeText(r) {
  const b=r.basics, chunks=[b.fullName,b.headline,[b.location,b.email,b.phone,b.linkedin,b.website].filter(Boolean).join(' | ')];
  for(const key of r.sectionOrder) {
    if(r.hiddenSections.includes(key))continue;
    let text='';
    if(key==='summary')text=r.summary;
    if(key==='experience')text=r.experience.map(x=>`${x.role} | ${x.company}${x.location?' | '+x.location:''}\n${[x.startDate,x.endDate].filter(Boolean).join(' - ')}\n${x.bullets.map(s=>'- '+s).join('\n')}`).join('\n\n');
    if(key==='education')text=r.education.map(x=>`${x.degree} | ${x.institution}\n${[x.startDate,x.endDate].filter(Boolean).join(' - ')}\n${x.details.join('\n')}`).join('\n\n');
    if(key==='projects')text=r.projects.map(x=>`${x.name}${x.context?' | '+x.context:''}\n${x.bullets.map(s=>'- '+s).join('\n')}`).join('\n\n');
    if(key==='skills')text=r.skills.map(x=>`${x.name}: ${x.keywords.join(', ')}`).join('\n');
    if(key==='additional')text=r.additional.join('\n');
    if(text.trim())chunks.push('\n'+SECTION_LABELS[key].toUpperCase()+'\n'+text);
  }
  return chunks.filter(Boolean).join('\n')+'\n';
}
const list=items=>items.length?`<ul>${items.map(s=>`<li>${esc(s)}</li>`).join('')}</ul>`:'';
export function resumeHTML(r) {
  const b=r.basics;
  let html=`<div class="cv-header"><h1>${esc(b.fullName||'Your name')}</h1>${b.headline?`<p class="cv-headline">${esc(b.headline)}</p>`:''}<p class="cv-contact">${[b.location,b.email,b.phone,b.linkedin,b.website].filter(Boolean).map(esc).join(' &nbsp;|&nbsp; ')}</p></div>`;
  const entry=(title,subtitle,dates,body)=>`<div class="cv-entry"><div class="cv-entry-top"><strong>${esc(title)}</strong><span>${esc(dates)}</span></div>${subtitle?`<div class="cv-subtitle">${esc(subtitle)}</div>`:''}${body}</div>`;
  for(const key of r.sectionOrder) {
    if(r.hiddenSections.includes(key))continue;
    let body='';
    if(key==='summary'&&r.summary.trim())body=`<p>${esc(r.summary)}</p>`;
    if(key==='experience')body=r.experience.map(x=>entry(x.role,[x.company,x.location].filter(Boolean).join(' · '),[x.startDate,x.endDate].filter(Boolean).join(' - '),list(x.bullets))).join('');
    if(key==='education')body=r.education.map(x=>entry(x.degree,[x.institution,x.location].filter(Boolean).join(' · '),[x.startDate,x.endDate].filter(Boolean).join(' - '),x.details.map(s=>`<p>${esc(s)}</p>`).join(''))).join('');
    if(key==='projects')body=r.projects.map(x=>entry(x.name,x.context,'',list(x.bullets))).join('');
    if(key==='skills')body=r.skills.map(x=>`<p><strong>${esc(x.name)}:</strong> ${esc(x.keywords.join(', '))}</p>`).join('');
    if(key==='additional')body=r.additional.map(s=>`<p>${esc(s)}</p>`).join('');
    if(body)html+=`<section class="cv-section" data-section="${key}"><h2>${esc(SECTION_LABELS[key])}</h2>${body}</section>`;
  }
  return html;
}
export function documentCSS(design={}) {
  const size=Math.min(12,Math.max(9,Number(design.fontSize)||10));
  const line=Math.min(1.6,Math.max(1.1,Number(design.lineHeight)||1.35));
  const margin=Math.min(0.9,Math.max(0.35,Number(design.margin)||0.55));
  return `.classic-resume{font:${size}pt/${line} Arial,Helvetica,sans-serif;color:#141414;background:#fff;width:8.5in;min-height:11in;padding:${margin}in;box-sizing:border-box;overflow-wrap:break-word}.classic-resume *{box-sizing:border-box}.cv-header{text-align:center;margin-bottom:15px}.classic-resume h1{font:700 20pt/1.1 Arial,Helvetica,sans-serif;letter-spacing:0;margin:0 0 5px;color:#000}.cv-headline{font-size:11pt;margin:0 0 5px}.cv-contact{font-size:8.5pt;margin:0;line-height:1.5}.classic-resume h2{font:bold ${size}pt/1.3 Arial,Helvetica,sans-serif;text-transform:uppercase;letter-spacing:.3px;border-bottom:1px solid #222;margin:16px 0 7px;padding-bottom:3px;break-after:avoid}.classic-resume p{margin:3px 0}.cv-entry{margin:0 0 10px}.cv-entry-top{display:flex;justify-content:space-between;align-items:baseline;gap:12px;break-after:avoid}.cv-entry-top>span{white-space:nowrap;flex-shrink:0;font-size:9pt}.cv-subtitle{margin:1px 0 3px;break-after:avoid}.classic-resume ul{list-style:disc;margin:3px 0 0;padding-left:15px}.classic-resume li{padding:0;margin:2px 0;orphans:2;widows:2;break-inside:avoid}.cv-section{margin:0}.cv-section>p{orphans:2;widows:2}@page{size:Letter;margin:${margin}in}@media print{html,body{margin:0;padding:0;background:#fff}.classic-resume{width:auto;min-height:0;padding:0;box-shadow:none}.cv-header{break-inside:avoid}.cv-entry{break-inside:auto}.cv-entry-top,.cv-subtitle{break-after:avoid}}`;
}
