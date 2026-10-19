# Sprint one — usable prototype

## Experience

CareerPilot uses a forest-green and sage palette, spacious job cards, a persistent workspace sidebar and a focused resume editor. Four primary destinations: Opportunities, Resume studio, Application tracker and My profile. The extension setup page explains installation and synchronization.

Primary loop: save profile → capture job in Chrome → review capture → sync into workspace → tailor and edit resume → download → preview application mappings → fill → review and submit manually.

## Implementation boundary

| Area | Delivered | Remaining |
| --- | --- | --- |
| Website | Responsive dashboard, profile editor, saved jobs, tracker and editable resume drafts | Accounts, durable server storage, cross-device sync |
| Job capture | Current-page JSON-LD and common DOM extraction with review | Scheduled discovery, board connectors, deduplication across sources |
| Resume | Local skill matching, original experience prioritization, TXT and Print/PDF | Generative AI integration, structured sections, DOCX/PDF ingestion |
| Extension | Manifest V3, user-triggered sync, reviewed field plan, empty-field autofill | Real Chrome integration acceptance test and per-ATS adapters |
| Deployment | Private Sites identity registered; local app packaged | Git server connectivity blocked publication |

## Next sprint acceptance criteria

1. Add server-side authentication/storage and a model endpoint; keep model credentials off the client.
2. Generate evidence-grounded resume revisions with an explicit changes review and preserve dates, employers and qualifications.
3. Select two ATS platforms, create fixtures from their actual supported forms, and pass capture/autofill tests including custom controls and pagination.
4. Verify unpacked extension installation, storage, synchronization and popup flows in Chrome; define privacy disclosure and store assets before store submission.
5. Add structured resume editing, PDF/DOCX import/export and backup restore.

This first sprint is a functional local prototype. It does not claim complete Jobright parity, a recovered proprietary backend, production readiness or universal ATS support.
