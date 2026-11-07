# NPTEL Feature Verification Report

**Audit date:** 2026-11-07
**Project:** NPTEL Practice Platform
**Firebase project:** `nptel-88452`
**Production changes:** none. Firestore rules, Functions, frontend deployment, and production data were not modified.

## Final matrix

| Feature | Implemented | Functional test | Firebase verified | Security verified | Status |
|---|---|---|---|---|---|
| CSV validation preview | Yes | Source-path audit, build, and import guards verified; browser import workflow not fully automated | Draft-only writes and atomic bulk service verified in emulator | Admin claim required; draft-only and 450-row limits enforced | **IMPLEMENTED BUT NOT FULLY TESTED** |
| Question inventory tools | Yes | Search, difficulty/status filters, duplicate flags, duplication, archive flow verified by source and build | Content writes and ownership validated by service/rules tests | Admin-only content writes and archival protections verified | **IMPLEMENTED BUT NOT FULLY TESTED** |
| Draft-review-publish workflow | Partial | Local review modal and publication gates verified; no submit-for-review or reject state exists | Publication ancestry/content validation verified in emulator | Unauthorized writes denied; trusted admin claim required | **PARTIALLY IMPLEMENTED** |
| Trusted audit log | Partial | Firestore subscription, retry, search, and CSV export verified; actor display was corrected | Append-only admin access and actor binding pass emulator tests | Admin-only reads/creates; client update/delete denied | **IMPLEMENTED BUT NOT FULLY TESTED** |
| Versioned JSON backups | Partial | Version-2 export, validation, preview, ID conflicts, and draft restore inspected | Admin writes are protected and restore records remain drafts | No production data touched; emulator rules protect writes | **PARTIALLY IMPLEMENTED** |
| Offline progress queue | Partial | Local queue persistence and retry paths inspected; no dedicated automated queue suite exists | Own-user progress and exact immutable retry rules pass emulator tests | Ownership isolation and changed-attempt denial verified | **IMPLEMENTED BUT NOT FULLY TESTED** |
| Accessibility/mobile quiz UX | Yes | TypeScript/build, 1440px/390px browser smoke, keyboard handlers and status announcements inspected | Not applicable beyond authenticated app behavior | No new rules surface | **IMPLEMENTED BUT NOT FULLY TESTED** |
| Full regression release gate | Partial | TypeScript, formatting of audited files, build, rules 11/11, content-service 2/2, browser smoke pass | Emulator only; no production verification performed | Emulator security suite passes | **IMPLEMENTED BUT NOT FULLY TESTED** |

## Evidence and source map

### 1. CSV validation preview

- UI entry: `src/pages/admin/ContentPanels.tsx`, `BulkUpload`.
- Parser: `src/pages/admin/ui.tsx`, `parseCsv`.
- Persistence: `src/lib/cloud-content.ts`, `saveQuestions`; `functions/content-service.mjs`, `saveQuestions`.
- Behavior verified in source:
  - UTF-8 BOM is removed from the first header.
  - CSV-only extension, 5 MB limit, and 450 data-row limit are enforced.
  - Headers are now required in the documented exact order:
    `questionText, options, correctAnswer, explanation, difficulty, topic`.
  - Missing text, empty option segments, 2–6 option count, duplicate options,
    invalid answer indexes, duplicate questions, and invalid difficulty produce
    row diagnostics.
  - Valid/rejected previews and downloadable error CSV are present.
  - Bulk writes use one Firestore transaction and reject duplicate/existing IDs
    without partial writes.
- Limitation: the CSV format has no input ID column, so “duplicate IDs in CSV”
  is enforced by the persistence layer, not by the CSV preview itself. A real
  browser file-upload test was not available in the configured suite.

### 2. Question inventory tools

- UI entry: `QuestionList` in `src/pages/admin/ContentPanels.tsx`.
- Data flow: `subscribeToContent` → `adminQuestions` → local filters/flags →
  `saveQuestion`, `archiveQuestion`, and `saveQuestions`.
- Implemented: text/topic search, difficulty/status filters, accurate filtered
  counts, duplicate question and option flags, missing-explanation flags,
  stable-ID duplication as draft, selection and archive confirmation, learner
  preview.
- Service/rules validation prevents moving a question to another parent,
  bypassing course ownership, or archiving the last complete published question.
- Limitation: no dedicated component/E2E test currently exercises every filter
  and archive interaction.

### 3. Draft-review-publish workflow

- UI entry: `getPublishReview` and “Review before publishing” modal.
- Trusted path: client validation → `saveQuestion`/`saveWeek`/`savePaper` →
  Firestore rules and `functions/content-service.mjs`.
- Verified: incomplete questions, duplicate text, and duplicate options block
  question publication; explanations/topic/difficulty are warnings; published
  parents require a published course and at least one complete question;
  learners only receive published/content-ready records.
- Defect/limitation: the requested Draft → Review → Publish workflow is not
  fully implemented. The data model has only `draft`, `published`, and
  `archived`; there is no review-ready state, submit-for-review action,
  reviewer approval action, or rejection reason. “Review” is a pre-publish
  modal, not a workflow state.

### 4. Trusted audit log

- UI entry: `AdminPage` and `AuditPanel`.
- Persistence: `src/lib/cloud-audit.ts` writes `auditLogs`; subscriptions read
  the latest 100 entries ordered by ISO `createdAt`.
- Security: `firestore.rules` requires the trusted `admin == true` claim,
  binds `actorId` to `request.auth.uid`, allows only `outcome == "success"`,
  and denies update/delete. Emulator test:
  `audit logs are admin-readable, append-only, and actor-bound`.
- Correction made during this audit: Firestore actor ID/email were persisted
  but omitted from the audit UI and CSV export. `AuditPanel` now displays and
  exports `actorEmail` or `actorId`.
- Defect/limitation: audit records do not contain before/after values or
  failure events. The feature therefore does not meet the requested full
  before/after audit requirement.

### 5. Versioned JSON backups

- UI entry: `WeeksPanel` in `ContentPanels.tsx`.
- Export includes version `2`, timestamp, course identity, weeks, and questions.
- Restore validates version/course identity, week ownership, required IDs,
  duplicate IDs, and conflicts against existing records. New records are
  forced to drafts and existing IDs are not silently overwritten.
- Defect/limitation: restore performs `saveWeek` and `saveQuestions` in
  sequential transactions. A later question write failure can leave earlier
  weeks restored, so rollback/whole-backup atomicity is not implemented.
  There is also no automated round-trip/rollback test.
- No production records were read or changed by this audit.

### 6. Offline progress queue

- UI/data flow: `progress-state.tsx` → `progress-storage.ts` queue →
  `cloud-progress.ts` diff batches → Firestore user subcollections.
- Implemented: local snapshots, queued previous/next states, reconnect retry,
  visible idle/syncing/synced/offline/error states, retry action, guest-to-user
  migration, exact immutable attempt retry rule.
- Emulator coverage verifies own-user progress access, cross-user denial, and
  changed-attempt denial.
- Defects/limitations:
  - No dedicated automated tests cover queue persistence, refresh/restart,
    duplicate retry, or conflict handling.
  - Concurrent `syncQueuedProgress` calls can overlap because there is no
    per-user single-flight lock.
  - There is no explicit conflict-resolution policy when cloud and local
    snapshots diverge; the current merge is ID/set based.

### 7. Accessibility and mobile quiz UX

- UI entry: `MorePage`/`Navbar` accessibility controls and
  `PracticeQuizPage`.
- Implemented: persisted accessibility preferences, high-contrast focus
  styling, reduced-motion class, visible focus, arrow/letter keyboard handlers,
  live status announcement, option labels, and 44px option targets.
- Browser smoke evidence from the local Vite server:
  - Title: `NPTEL Practice Platform`.
  - 1440×900 screenshot captured at `/tmp/nptel-desktop.png`.
  - 390×844 screenshot captured at `/tmp/nptel-mobile.png`.
  - No console errors.
  - No mobile horizontal overflow.
  - Desktop decorative `.aurora-band-2` extends beyond the viewport bounds but
    does not increase document scroll width.
- Limitation: no full manual screen-reader audit or automated axe run was
  available in this verification pass.

### 8. Full regression release gate

Executed successfully:

```text
npm run test:rules              PASS — 11/11 emulator tests
npm run test:content-service    PASS — 2/2 emulator tests
tsc --noEmit                    PASS
oxfmt --check audited files     PASS
git diff --check                PASS
npm run build                   PASS
browser smoke                   PASS — no console errors, no mobile overflow
```

The build still emits the existing large JavaScript chunk warning
(approximately 1.27 MB minified). No Playwright test suite, axe command, ESLint
script, or dedicated component/unit test runner is configured in `package.json`.
An earlier whole-repository formatter check also reports a pre-existing format
issue in `scripts/provision-admin.mjs`; audited files are formatted.

## Firebase security verification

The checked-in emulator rules verify:

- Guest reads of published/content-ready courses, weeks, papers, and questions.
- Draft/unpublished parent and child content is denied to guests.
- Only `admin == true` custom-claim users can write content.
- User profiles cannot self-grant roles or change ownership.
- Attempts/bookmarks are owner-isolated.
- Audit logs are admin-readable, actor-bound, append-only.
- Feedback/report shapes and report answer indexes are constrained.

No rules were redeployed. No production documents were created, overwritten,
deleted, or migrated. Production verification remains outside this audit.

## Required follow-up before claiming full verification

1. Add a real review state plus submit/approve/reject actions and reviewer
   authorization.
2. Make backup restore atomic across weeks and questions, or add compensating
   rollback with emulator tests.
3. Add queue unit/integration tests, a per-user sync lock, and an explicit
   conflict policy.
4. Extend audit entries with actor, before/after snapshots or field diffs, and
   recorded failures where appropriate.
5. Add Playwright/axe coverage for CSV upload, admin workflows, mobile quiz
   interaction, and empty/loading/error states.
6. Perform production verification only with explicit authorization; this
   report does not imply production readiness.
