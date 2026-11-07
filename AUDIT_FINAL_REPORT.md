# NPTEL Exhaustive QA Audit

**Audit date:** 2026-11-07
**Project:** NPTEL Practice Platform
**Production:** `https://nptel-three-murex.vercel.app/`
**Firebase project:** `nptel-88452`

## Executive result

**Overall status: PARTIALLY VERIFIED — NOT READY TO CLAIM COMPLETE END-TO-END
FUNCTIONALITY.**

The local application was exercised through its discovered learner routes,
real Firestore-backed course/quiz flows, responsive viewport checks, Firestore
emulator security tests, content-service tests, TypeScript, formatting, and
production build. No production writes, deployments, migrations, role changes,
or destructive operations were performed.

The most important reproducible defect is **BUG-001**: learner feedback reports
show a success message but are stored only in React context and disappear after
refresh. Additional incomplete capabilities are documented for review/publish,
backup rollback, offline conflict handling, and PYQ interactive practice.

## Feature matrix

| Feature | UI tested | Functional test | Firebase tested | Security tested | Mobile tested | Result |
|---|---|---|---|---|---|---|
| Course listing/search | Yes | Yes | Read path | Yes | Yes | PASSED |
| Week listing/study | Yes | Yes | Read path | Yes | Yes | PASSED |
| Practice quiz/scoring | Yes | Full quiz | Local progress | Attempt rules | Yes | PASSED |
| Saved questions | Yes | Bookmark/saved page | Local + source path | Ownership | Yes | PARTIALLY VERIFIED |
| History/progress | Yes | Attempt/refresh | Local + source path | Ownership | Yes | PARTIALLY VERIFIED |
| Feedback/requests | Yes | Reproduced refresh loss | No client write | Rules only | Yes | FAILED |
| PYQ answers | Yes | Empty-state route | Read path | Published rules | Yes | PARTIALLY VERIFIED |
| PYQ interactive practice | Yes | Limitation state | N/A | N/A | Yes | NOT IMPLEMENTED |
| CSV validation/import | Source/UI | Service tests | Emulator service | Admin/draft/atomic | Source only | PARTIALLY VERIFIED |
| Question inventory | Source/UI | Logic inspected | Emulator service | Parent ownership | Source only | PARTIALLY VERIFIED |
| Draft-review-publish | Source/UI | Publish gates | Rules/service | Admin claim | Source only | PARTIALLY IMPLEMENTED |
| Trusted audit log | UI/persistence | Emulator append-only | Firestore | Actor/tamper | Source only | PARTIALLY VERIFIED |
| JSON backups | Source/UI | Validation inspected | Protected writes | Admin rules | Source only | PARTIALLY IMPLEMENTED |
| Offline progress queue | Source | Rules/path inspected | Emulator progress | Ownership | Source only | PARTIALLY VERIFIED |
| Auth flows | Sign-in UI | Dedicated E2E unavailable | Source only | Claim rules | UI only | BLOCKED |
| Admin dashboard | Signed-out guard | Auth admin E2E unavailable | Rules/service | Claim rules | Not full | PARTIALLY VERIFIED |

## Defects and gaps

### BUG-001 — Feedback submissions are not durable (High)

`/courses/mental-health/feedback`: submit a message, observe “Submitted!”, then
refresh. The request disappears and no Firestore write is issued. The page uses
React context state only. See `reports/BUG_REPORT.md`.

### BUG-002 — Review workflow is not a workflow (High)

The implementation provides a pre-publish validation modal, but no review-ready
status, submit-for-review action, approval, rejection, or rejection reason.

### BUG-003 — Backup restore is not atomic (High)

Restore writes weeks and questions sequentially. A later failure can leave
earlier records restored. No rollback test exists.

### BUG-004 — Offline synchronization lacks locking/conflict policy (Medium)

Multiple retry triggers can overlap, and divergent local/cloud progress is
merged without explicit conflict reporting.

### BUG-005 — PYQ interactive practice is not implemented (Medium)

The route intentionally displays “Interactive PYQ practice is not available
yet.”

## Executed validation

| Check | Result |
|---|---|
| `npm run test:rules` | PASS — 11/11 emulator tests |
| `npm run test:content-service` | PASS — 2/2 tests |
| TypeScript | PASS |
| Audited-file formatting | PASS |
| Production build | PASS; existing large chunk warning remains |
| Route matrix | PASS for discovered routes and invalid/deep-link cases |
| Learner journey | PASS for course → study → practice → quiz → results → history |
| Bookmark journey | PASS through local storage and Saved Questions |
| Feedback persistence | FAIL — BUG-001 |
| Responsive matrix | PASS for sampled routes and 9 viewports |
| Console/network smoke | PASS for tested local routes |

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

1. Persist feedback/reports in Firestore and load them in learner/admin views.
2. Implement explicit review/approval/rejection states.
3. Make backup restore atomic or compensating-rollback safe.
4. Add offline single-flight synchronization and conflict handling.
5. Add configured Playwright, axe, unit/component, and Functions test suites.
6. Re-run the complete authenticated admin and production-read-only matrix.
