# Editable resume and OpenAI integration

## Restored configuration

The NVIDIA NIM experiment has been reverted at the user's request. The active implementation uses:
- Endpoint: https://api.openai.com/v1/responses
- Default model: gpt-6.1-sol, overridable with OPENAI_MODEL
- Key: OPENAI_API_KEY or the key-only AI setup form
- Provider: openai
- Build: resume-studio-v4-openai

The setup no longer includes an NVIDIA key field, model catalog or manual NIM model picker. NVIDIA/NIM environment settings are ignored. There is no NVIDIA API transport or provider fallback in the restored implementation.

Keys remain in local server memory until restart unless supplied through the environment. Existing .env files and account keys are not altered. The client accepts the restored current build and the known earlier resume-studio-v2 OpenAI server, allowing reuse of its already-configured key without reading or transferring that secret. NIM backends are rejected before credentials can be posted.

## Resume workflow

The structured field editor, Classic Sans template, master/per-job documents, autosave, layout controls, TXT/JSON export and iframe-based browser PDF printing remain available.

Personalization performs two Responses API calls using strict JSON Schema, medium reasoning and store: false. The first drafts; the second critically reviews and revises against the original source resume and selected job. Responses are also validated locally.

AI patches cannot change identity, employers, dates, education or degrees directly. Included bullets cite original indices and preserve their numerical claims. Lower-relevance bullets may be omitted with a visible review trail, while source text remains intact. Skills must come from the original skill groups. Generated qualitative claims still require human review.

A proposal is never applied automatically. Refused, incomplete, malformed or invalid responses leave the current draft unchanged. Model/account/rate failures produce visible OpenAI-specific errors. There is no automatic provider fallback or invented ATS score.

## Verification

Run node --test tests/*.test.mjs. All 23 automated tests pass:
- Original text parsing, template escaping, section ordering/visibility.
- Metadata preservation, numeric/skill validation and omission trails.
- Two-pass mocked OpenAI Responses contracts and strict schema request format.
- Refusal, incomplete, malformed and unexpected-field handling.
- OpenAI authentication/error handling with no NVIDIA fallback.
- Client reuse of the configured previous OpenAI server without reading its key.
- Client refusal to send OpenAI credentials to a NIM backend.
- OpenAI-only environment/key validation and secret-free status responses.
- Local API restrictions, setup/module delivery and launcher reuse.

HTTP checks confirm that port 4173 serves the restored OpenAI setup form without a NIM model picker. The previous OpenAI server reports model gpt-6.1-sol and configured=true. This establishes configured local state, not a successful live model call. No paid generation was performed to test the rollback.

The separate NIM server started for the experiment was stopped. Browser visual automation remains unverified because of the previously observed Windows/Chrome process restrictions. The optional browser acceptance harness is not evidence of a successful visual or PDF-render check.

## Local launch and data

Refresh the existing page to load the restored client:
http://127.0.0.1:4173/ai-setup.html?v=resume-studio-v4-openai

start-careerpilot.cmd launches from this project folder. It reuses a compatible original or current OpenAI server rather than restarting it and clearing its in-memory key. If no compatible server is running, it starts the restored source.

The browser data key remains careerpilot-v1 and structured documents remain version 2. Saved jobs, profile data and drafts are not migrated to a different origin. Different ports still have different browser storage.

The Node server binds only to 127.0.0.1, validates Host/Origin, rejects cross-site requests, requires an explicit JSON mutation marker, limits request sizes and permits one personalization request at a time. API keys are never returned in status/config responses. Public deployment would require a separate authenticated multi-user architecture.

## References and test job

- https://developers.openai.com/api/docs/guides/structured-outputs?api-mode=responses
- https://developers.openai.com/api/docs/models/gpt-6.1-sol
- Template: https://flowcv.com/resume-template/professional-classic-sans-serif-template

The HigherEdJobs job supplied earlier was blocked by Incapsula. tests/job-fixture.json is a short summary from a matching-title UCF employer posting, not an export of the user's browser-saved job. Real personalization uses the saved job selected in the browser. The job fixture is for contract testing, not a substitute for checking the complete posting.
