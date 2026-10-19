# Reference investigation — 19 October 2026

## Observed

Jobright public homepage: https://jobright.ai/ promotes job matching, application autofill, tailored resumes, insider connections and career copilot. Its autofill page (https://jobright.ai/job-autofill) describes install extension → set up profile → open application and autofill → submit. The resume builder page (https://jobright.ai/ai-resume-builder) describes upload → analysis → refinement → download. These are product claims, not independently tested capabilities.

REA capture_browser_scenario successfully launched installed Chrome 155, loaded https://jobright.ai/ in an empty temporary profile, waited 1000 ms and captured DOM/URL. Evidence: ev_f7af5310fee86e26df069c1da858e5d0a667d4990c4d45a8e3f298d924c84f1a. Provider reported complete capture and terminated its owned process. The response display was oversized; conclusions are limited to visible portions: Next.js __NEXT_DATA__, buildId MR4rnvx8Ie8JpVOzMpk-d, assetPrefix https://static.jobright.ai, Ant Design CSS and public feature links. No sign-in, application submission or account mutation occurred. No runtime internal API attribution is established.

## Unknown

The Chrome Web Store listing odcnpipkhjegpefkfplmedhmkmmhmoko could not be opened by the web reader, but a subsequent REA browser accessibility capture succeeded: ev_1d1ce529dc80695b9ec341d589221fc5a7a7bbbea679c4ed09524e2126931774. It showed version 1.24.1, updated October 14, 2026, size 2.72 MiB, and listing claims of one-click autofill, resume matching, AI resume building and job matching/tracking. Its privacy disclosure lists personally identifiable information, user activity and website content. These are listing disclosures, not source verification. No CRX package was acquired, so extension source, permissions, selectors, data model, backend endpoints and AI prompts have not been reverse engineered. Direct shell HTTPS downloads failed. Browser capture was independently successful.

## First-sprint verification

REA opened the local CareerPilot workspace in Chrome and captured accessibility and a desktop screenshot with no page-error events: ev_a7e1a8ebf085890fab82bf1bd37d48cee3605001b9663cf8a2cd5ffb68fa1f43. Unit tests verify job import validation, unsafe URL rejection, matching skill selection, relevant experience ordering and retention of original resume lines.

The complete profile → sample job → job detail → resume studio → tailoring → saved draft flow passed in Chrome after correcting selected-job loss during hash navigation: ev_3d1fbd3977b1920b4a16185a96348b18df5e5d495648a16669dac94fedd099b0. All eleven requested actions completed and the final accessibility capture showed the selected role, relevant Figma experience prioritized and “Resume draft saved”, with no page-error events.

The actual extension page function passed eight browser fixture assertions: structured job extraction, supported-field filtering, first/last name mapping, reviewed filling, correct email, existing-answer preservation, exclusion of company/school/password fields, and stale-plan protection. Evidence ev_5e0d3cebb04002d1f22dc3c468cfd9f3ab6c8126c8c7616806eee204fb1cc892. Reproduce with `node tests/fixture-server.mjs` and http://127.0.0.1:4174. This exercises the extension's injected logic in an ordinary browser; Chrome popup/storage/scripting integration and real ATS compatibility remain unverified.

## Delivery status

Sites created owner-private project appgprj_6ad5a387b69c8191999a7d3cd1bf166a, but no version was published. Its source helper first could not locate Git; an existing SSMS-bundled Git executable was found and used through process-local PATH. The subsequent push failed to connect to git.chatgpt-team.site:443. This is a network blocker, not a successful deployment. The local app, source archive and extension package are the deliverables. Preserve the project ID for a later deployment attempt.

## Design inference

The first sprint implements the public workflow with original code: explicit page capture, local profile, manual synchronization, local resume tailoring and reviewed autofill. This is a reconstruction of selected product behavior, not a claim of Jobright internal implementation or full parity. An authenticated reference walkthrough and extension artifact analysis remain future investigation tasks.

Mobile check: at 390 � 844, the sample-job capture showed a readable single-column card layout and responsive search/filter controls, with no page errors. Evidence ev_8a8ad93928a7ccb0dd8621d28476cbdecd6ad7c1196607a6591eec580b66bdc0.
