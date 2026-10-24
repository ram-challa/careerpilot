# CareerPilot — resume studio iteration

Original job-search workspace inspired by Jobright's public workflow. No proprietary Jobright code or branding is included.

Run `node server.mjs` in this directory and open the printed local URL (normally http://127.0.0.1:4173). If an older copy already owns port 4173, this server uses 4175. Stop the older server and restart this one on 4173 to retain the same browser storage origin. Run `npm test` for automated checks.

On Windows, double-click `start-careerpilot.cmd` in this project folder to start the correct copy and open AI setup directly. The launcher reuses a server that reports the current build; otherwise it only restarts a Node server verified to serve CareerPilot on port 4173. It leaves unrelated applications untouched. If Windows denies stopping the older process, stop it with Ctrl+C in its own terminal and run the launcher again.

AI setup also has a standalone page at `/ai-setup.html`, so it can be opened without mounting the resume editor. The app header includes a direct link. Port 4175's page is http://127.0.0.1:4175/ai-setup.html while a fallback server is running.

## Classic Sans editor and OpenAI personalization

1. Save your plain-text resume in My profile, or use Resume studio → Load local resume.txt.
2. Select Master resume or a saved job. Fields populate into contact information, summary, experience, education, projects and grouped skills. Each job keeps its own editable document.
3. Open AI setup and enter an OpenAI API key only if none is already configured. The restored UI reuses the original OpenAI server when it is still running, without reading or copying its key.
4. Alternatively configure OPENAI_API_KEY and OPENAI_MODEL in an ignored .env file. The previous default model, gpt-6.1-sol, is restored. NVIDIA_API_KEY, NIM_API_KEY and NIM_MODEL are ignored.
5. Personalize with AI runs two OpenAI Responses API calls: draft, then critical review and revision. Requests use medium reasoning, strict JSON Schema and store: false. OpenAI API usage charges apply.
6. Review the critique, gaps and wording changes before applying the proposal. Every field remains editable. The source profile, master and other job versions remain separate.
7. Export TXT, editable JSON or browser Print / Save as PDF. The Classic Sans template uses US Letter and print page-break rules. Direct server-generated PDF download and paginated screen preview are not included.

See [AI-EDITOR.md](AI-EDITOR.md) for implementation details, test status and known limits.

## Included

- Responsive opportunities dashboard, job search/status filters, manual job creation and captured-job JSON import.
- Profile and plain-text source resume, structured per-job resume documents, one Classic Sans template, field editing and OpenAI two-pass personalization with review before applying.
- Application tracker with Saved, Applied and Interview stages.
- Manifest V3 Chrome extension: capture current page, review extracted details, explicit profile/job synchronization with the workspace, preview/choose autofill fields, fill empty fields.
- Local browser storage. The AI integration uses your OpenAI API account. There is no CareerPilot billing, user account, database or cloud synchronization.

## Extension installation and use

1. Open chrome://extensions, enable Developer mode, and Load unpacked using `extension/` (or unzip `dist/careerpilot-extension.zip` and load that folder).
2. Save profile in the website. With the website active, click the extension then Sync workspace.
3. Open a job posting, click Capture this job, review details and save.
4. Return to the website tab, click extension → Sync workspace, and reload the page. Captured queue is cleared after a successful sync.
5. On an application, Preview autofill, uncheck unwanted mappings and Fill reviewed fields. Review the form, attach a resume manually, and submit yourself.

Uses only activeTab, scripting and storage permissions. No persistent host permissions, injected site listeners, credential access or automatic submission. Sync destinations are an exact allowlist in `extension/page-tools.js`; update it if the website origin changes.

Extension version 0.2.0 supports local ports 4173 and 4175. Reload the unpacked extension after updating its files.

## Limits and next sprint

Scraping means user-triggered capture of the open page, not crawling job boards. JSON-LD JobPosting and common selectors are supported; field extraction must be reviewed. Common standard DOM forms are supported. Cross-origin frames, shadow DOM, custom controls, work authorization, demographic questions, work-history repeaters and file upload are left manual. Site-specific ATS adapters require testing on actual target sites.

The new resume studio uses generative AI when configured; there is no simulated AI fallback or ATS acceptance guarantee. TXT import uses heuristics and requires checking section assignments, dates and names. PDF/DOCX ingestion, cloud persistence, backup restore and a universal ATS scorer are not included. No API key is shipped in the client. Local data is not encrypted and is scoped to the browser/origin; workspace backup exports profile, jobs and drafts.

See INVESTIGATION.md for reference evidence and boundaries.
