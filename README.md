# CareerPilot — sprint one

Original job-search workspace inspired by Jobright's public workflow. No proprietary Jobright code or branding is included.

Run `node server.mjs` in this directory and open http://127.0.0.1:4173. Run `npm test` for data validation and resume tailoring checks.

## Included

- Responsive opportunities dashboard, job search/status filters, manual job creation and captured-job JSON import.
- Profile and plain-text base resume, deterministic skill-based resume tailoring, editable per-job drafts, TXT download and browser Print / Save as PDF.
- Application tracker with Saved, Applied and Interview stages.
- Manifest V3 Chrome extension: capture current page, review extracted details, explicit profile/job synchronization with the workspace, preview/choose autofill fields, fill empty fields.
- Local browser storage. No account, database, billing, cloud synchronization, background crawling or paid AI service.

## Extension installation and use

1. Open chrome://extensions, enable Developer mode, and Load unpacked using `extension/` (or unzip `dist/careerpilot-extension.zip` and load that folder).
2. Save profile in the website. With the website active, click the extension then Sync workspace.
3. Open a job posting, click Capture this job, review details and save.
4. Return to the website tab, click extension → Sync workspace, and reload the page. Captured queue is cleared after a successful sync.
5. On an application, Preview autofill, uncheck unwanted mappings and Fill reviewed fields. Review the form, attach a resume manually, and submit yourself.

Uses only activeTab, scripting and storage permissions. No persistent host permissions, injected site listeners, credential access or automatic submission. Sync destinations are an exact allowlist in `extension/page-tools.js`; update it if the website origin changes.

## Limits and next sprint

Scraping means user-triggered capture of the open page, not crawling job boards. JSON-LD JobPosting and common selectors are supported; field extraction must be reviewed. Common standard DOM forms are supported. Cross-origin frames, shadow DOM, custom controls, work authorization, demographic questions, work-history repeaters and file upload are left manual. Site-specific ATS adapters require testing on actual target sites.

Resume tailoring matches skills and reorders original lines; it is not generative AI, semantic scoring, or an ATS acceptance guarantee. Add a server-side model integration, structured resume sections and PDF/DOCX parsing in the next sprint. No API key is shipped in the client. Local data is not encrypted and is scoped to the browser/origin; workspace backup exports profile, jobs and drafts. Backup restore UI is not included yet.

See INVESTIGATION.md for reference evidence and boundaries.
