import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {parseResume,validateResume,resumeHTML,resumeText,documentCSS} from '../dist/resume-model.js';

const source=`ALEX MORGAN
Austin, TX | 512-555-0101 | alex@example.com
Analyst with SQL reporting experience.
TECHNICAL SKILLS
- Reporting: Power BI, Excel
PROFESSIONAL EXPERIENCE
Data Analyst | Example Corp Aug 2021 - Jul 2024
- Built SQL pipelines that reduced manual work 30%.
- Gathered stakeholder requirements.
Graduate Assistant | Example University May 2025 - May 2026
- Built a document retrieval assistant.
SELECTED PROJECTS
Reporting Project | Client engagement
- Developed an executive dashboard.
EDUCATION
M.S., Analytics | Example University May 2026
Coursework: Statistical Inference, NLP`;
export {source};
test('plain-text parsing retains section structure, role dates and all source bullets',()=>{
  const r=validateResume(parseResume(source));assert.equal(r.basics.fullName,'ALEX MORGAN');assert.equal(r.basics.email,'alex@example.com');assert.equal(r.experience.length,2);assert.equal(r.experience[0].company,'Example Corp');assert.equal(r.experience[0].startDate,'Aug 2021');assert.equal(r.experience[0].endDate,'Jul 2024');assert.equal(r.projects.length,1);assert.equal(r.education[0].endDate,'May 2026');assert.equal(r.skills[0].keywords[0],'Power BI');assert.ok(resumeText(r).includes('reduced manual work 30%'));
});
test('template escapes imported HTML and respects reordered/hidden sections',()=>{
  const r=parseResume(source);r.basics.fullName='<img src=x onerror=alert(1)>';r.hiddenSections=['summary'];r.sectionOrder=['skills','experience','education','projects','summary','additional'];const html=resumeHTML(r);assert.ok(html.includes('&lt;img'));assert.ok(!html.includes('<img'));assert.ok(!html.includes('Analyst with SQL'));assert.ok(html.indexOf('Technical skills')<html.indexOf('Professional experience'));assert.ok(documentCSS({fontSize:99}).includes('font:12pt'));assert.ok(!documentCSS({fontSize:'url(evil)'}).includes('evil'));
});
test('duplicate IDs and invalid section orders are rejected',()=>{
  const r=parseResume(source);r.experience[1].id=r.experience[0].id;assert.throws(()=>validateResume(r));const s=parseResume(source);s.sectionOrder=['summary'];assert.throws(()=>validateResume(s));
});
test('provided local resume parses without dropping experience/project bullets when present',async t=>{
  let text;try{text=await readFile(new URL('../resume.txt',import.meta.url),'utf8')}catch{return t.skip('Local personal resume is not checked into Git.')}
  const r=validateResume(parseResume(text));assert.equal(r.experience.length,2);assert.equal(r.projects.length,3);assert.equal(r.experience.reduce((n,x)=>n+x.bullets.length,0),9);assert.equal(r.projects.reduce((n,x)=>n+x.bullets.length,0),5);assert.equal(r.education.length,1);assert.ok(resumeText(r).includes('92% recall'));assert.ok(resumeText(r).includes('GPA 3.92/4.0'));
});
