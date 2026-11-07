# NPTEL Exhaustive QA Audit

**Audit date:** 2026-11-07
**Project:** NPTEL Practice Platform
**Production:** `https://nptel-three-murex.vercel.app/`
**Firebase project:** `nptel-88452`

## Executive result

**Overall status: PARTIALLY VERIFIED — six previously open remediation defects
are fixed and verified; broader unsupported test infrastructure remains
explicitly limited.**

The local application was exercised through its discovered learner routes,
real Firestore-backed course/quiz flows, responsive viewport checks, Firestore
emulator security tests, content-service tests, TypeScript, formatting, and
production build. No production writes, deployments, migrations, role changes,
or destructive operations were performed.

The six defects from audit commit `1131f3f` were remediated with emulator-backed
and Playwright evidence. A further optional-field serialization defect found
during browser verification was fixed in the shared request writer. Regression
testing also fixed duplicate learner rendering and false-success admin
moderation feedback in Requests & Feedback. The first planned expansion slice, the admin content-quality dashboard, is
implemented and independently tested. Its tested local status is **VERIFIED**:
core diagnostics, calculations, filters, access control, responsive rendering,
axe accessibility, keyboard navigation, and 1,000-record browser performance
coverage pass. Manual screen-reader/zoom checks and production verification
remain outside scope. The detailed findings are in
`reports/CONTENT_QUALITY_DASHBOARD_QA.md`.

## Feature matrix

| Feature | UI tested | Functional test | Firebase tested | Security tested | Mobile tested | Result |
|---|---|---|---|---|---|---|
| Course listing/search | Yes | Yes | Read path | Yes | Yes | PASSED |
| Week listing/study | Yes | Yes | Read path | Yes | Yes | PASSED |
| Practice quiz/scoring | Yes | Full quiz | Local progress | Attempt rules | Yes | PASSED |
| Saved questions | Yes | Bookmark/saved page | Local + source path | Ownership | Yes | PARTIALLY VERIFIED |
| History/progress | Yes | Attempt/refresh | Local + source path | Ownership | Yes | PARTIALLY VERIFIED |
| Feedback/requests | Yes | Submit/reload and admin reply E2E | Firestore write/read/update | Owner isolation and admin moderation | Yes | VERIFIED |
| PYQ answers | Yes | Published paper question | Read path | Published rules | Yes | PASSED |
| PYQ interactive practice | Yes | Interactive learner E2E | Existing question bank | Published rules | Yes | VERIFIED |
| CSV validation/import | Source/UI | Service tests | Emulator service | Admin/draft/atomic | Source only | PARTIALLY VERIFIED |
| Question inventory | Source/UI | Logic inspected | Emulator service | Parent ownership | Source only | PARTIALLY VERIFIED |
| Draft-review-publish | UI | Review/approve/reject flow | Rules/service | Admin claim | Admin E2E | VERIFIED |
| Trusted audit log | UI/persistence | Emulator append-only | Firestore | Actor/tamper | Source only | PARTIALLY VERIFIED |
| JSON backups | UI/source | Full preflight + atomic batch | Protected writes | Admin rules | Source only | VERIFIED |
| Offline progress queue | Source/UI | Duplicate/conflict handling | Emulator progress | Ownership | Source only | VERIFIED |
| Auth flows | Sign-in UI | Dedicated E2E unavailable | Source only | Claim rules | UI only | BLOCKED |
| Admin dashboard | Authenticated E2E | Course/week CRUD and guard | Emulator writes | Claim rules | Not full | VERIFIED |
| Content quality dashboard | Yes | Diagnostics 6/6; admin E2E; accessibility; 100/500/1000 browser benchmark | Emulator-backed admin snapshots; 11 observed emulator requests | Claim-only access and signed-out guard | 390px rendered audit | VERIFIED |
| Bulk content management | JSON/CSV preview, selection, operation history UI | Parser 3/3; callable 1/1; browser callable workflow; content service 3/3; rules 12/12 | Trusted callable service and admin-only operation records | Parent ownership, draft isolation, operation write denial | Publication visibility and multi-batch retry journeys pending | PARTIALLY VERIFIED |

## Defects and gaps

### Remediated defects

BUG-001 through BUG-006 are **FIXED AND VERIFIED**. Detailed evidence and the
remaining test-infrastructure limitations are recorded in
`reports/BUG_REPORT.md`.

## Executed validation

| Check | Result |
|---|---|
| `npm run test:rules` | PASS — 13/13 emulator tests |
| `npm run test:functions-callable` | PASS — trusted callable integration, including audit creation |
| `npm run test:e2e:audit-history` | PASS — authenticated Firestore audit retrieval, search, refresh |
| `npm run test:content-service` | PASS — 3/3 tests |
| `npm run test:bulk-content` | PASS — 3/3 parser tests |
| `npm run test:e2e:admin` | PASS — authenticated admin CRUD and guard |
| `npm run test:e2e:learner` | PASS — PYQ practice and feedback persistence |
| TypeScript | PASS |
| Audited-file formatting | PASS |
| Production build | PASS; existing large chunk warning remains |
| Route matrix | PASS for discovered routes and invalid/deep-link cases |
| Learner journey | PASS for course → study → practice → quiz → results → history |
| Bookmark journey | PASS through local storage and Saved Questions |
| Feedback persistence | PASS — learner E2E and owner query |
| Responsive matrix | PASS for sampled routes and 9 viewports |
| Console/network smoke | PASS for tested local routes |
| `npm run test:accessibility` | PASS — 23 axe rules, 0 violations; keyboard/focus/mobile checks |
| `npm run test:performance` | PASS — 100, 500, and 1,000 record browser runs; complete dataset and timing output |

## Admin audit-history remediation

**Root cause:** `Content health check` was inserted optimistically into the
admin state with a `local-*` identifier before persistence. It could therefore
remain visible when the Firestore `auditLogs` listener failed. Persisted admin
sessions could also hold an ID token without the newly provisioned `admin`
claim until refresh.

**Correction:** Audit creation now goes through the trusted
`writeAuditEntry` callable in `functions/index.mjs`, which ignores
browser-supplied actor identity and writes the authenticated UID/email. Client
creation is disabled in `firestore.rules`; admin reads remain limited to
`auditLogs`, and updates/deletes remain denied. `auth-state.tsx` forces an ID
token refresh before claim-dependent listeners start. `AuditPanel.tsx` now
distinguishes loading, empty, successful Firestore results, and query errors.

**Collection and query:** `auditLogs`, ordered by `createdAt` descending and
limited to 100 records. The current schema has no course identifier, so
course-specific history filtering is not implemented.

**Evidence:** Firestore rules **13/13 pass**; trusted Functions callable
integration passes; the dedicated authenticated Playwright audit-history test
passes using Auth, Firestore, Functions, and Vite emulators. The browser test
seeds an actual `auditLogs` document, retrieves it through the admin UI,
searches it, refreshes it, and confirms no permission error is rendered.
No production claims, data, rules, Functions, environment variables, or
deployments were changed.

## Critical production audit-history investigation

The deployed frontend was inspected read-only and embeds Firebase project
`nptel-88452`, matching the intended project. Its reader is the top-level
`auditLogs` collection, ordered by `createdAt desc` and limited to 100. Trusted
callable writers also write to `auditLogs`; there is no writer/reader path
mismatch.

The active Firestore release was then inspected through the Firebase Rules API.
`projects/nptel-88452/releases/cloud.firestore` points to ruleset
`d4d1a9cb-a267-4df6-a4d8-7c64f0c64260`, created on 2026-11-06. The deployed
ruleset has no `match /auditLogs/{entryId}` rule. Its catch-all deny therefore
rejects the exact admin query with `Missing or insufficient permissions`.
The local rules include the intended narrow admin-only read rule and deny all
client writes.

The current administrator's refreshed token and `admin: true` claim cannot be
verified from this terminal because no administrator browser session or token
was provided; no token was requested or exposed. The production bundle's
project ID was verified without exposing Firebase credentials. A read-only
unauthenticated REST request to `auditLogs` returned HTTP 403, consistent with
the deployed catch-all deny.

**Classification: PARTIALLY FIXED.** The smallest safe production correction is
to deploy the already-reviewed local `firestore.rules` file through an
explicitly approved Firebase rules deployment. That deployment was deliberately
not performed under the task's production-safety restriction.

## Firebase and production boundary

The emulator verifies guest published-content reads, draft denial, admin claim
authorization, owner-isolated progress, constrained reports/feedback, and
append-only audit logs. `functions/index.mjs` contains callable content
functions, but the current frontend uses direct Firestore writes in
`src/lib/cloud-content.ts`; the callables are not wired into the browser path.

No production data was created, modified, deleted, migrated, or overwritten.
No rules, Functions, or frontend deployment was performed. Production
verification remains limited to safe read-only checks and previously recorded
inventory evidence.

## Detailed artifacts

- `reports/QA_TEST_PLAN.md`
- `reports/QA_TEST_RESULTS.md`
- `reports/BUG_REPORT.md`
- `reports/ROUTE_COVERAGE.md`
- `reports/FEATURE_COVERAGE.md`
- `reports/SECURITY_TEST_RESULTS.md`
- `reports/ACCESSIBILITY_RESULTS.md`
- `reports/RESPONSIVE_TEST_RESULTS.md`

## Required next fixes before full acceptance

1. Add component and mobile-specific suites.
2. Expand authenticated browser coverage to the remaining admin panels.
3. Perform separately authorized production read-only verification.

### Final Bulk Content Management verification

Callable publication preview, publication authorization, trusted audit
logging, guest learner visibility, bulk unpublishing, multi-batch partial
failure recovery, retry idempotency, and partial-operation rollback are
verified against the Auth, Firestore, and Functions emulators. The import
workflow is intentionally recoverable rather than globally atomic: each
200-row batch commits independently and operation history records progress.
