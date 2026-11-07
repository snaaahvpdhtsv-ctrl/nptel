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
moderation feedback in Requests & Feedback.

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

## Defects and gaps

### Remediated defects

BUG-001 through BUG-006 are **FIXED AND VERIFIED**. Detailed evidence and the
remaining test-infrastructure limitations are recorded in
`reports/BUG_REPORT.md`.

## Executed validation

| Check | Result |
|---|---|
| `npm run test:rules` | PASS — 11/11 emulator tests |
| `npm run test:content-service` | PASS — 2/2 tests |
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

1. Add dedicated axe, component, and Functions emulator suites.
2. Expand authenticated browser coverage to the remaining admin panels.
3. Perform separately authorized production read-only verification.
