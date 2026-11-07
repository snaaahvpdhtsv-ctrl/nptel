# Feature Coverage Matrix

| Feature | UI tested | Functional test | Firebase tested | Security tested | Mobile tested | Result |
|---|---|---|---|---|---|---|
| Course listing/search | Yes | Yes | Yes | Yes | Yes | PASSED |
| Week listing/study | Yes | Yes | Yes | Yes | Yes | PASSED |
| Practice quiz/scoring | Yes | Yes | Progress rules | Yes | Yes | PASSED |
| Saved questions | Yes | Yes | Progress rules | Ownership | Yes | PARTIALLY VERIFIED |
| History/progress | Yes | Yes | Progress rules | Ownership | Yes | PARTIALLY VERIFIED |
| Feedback/requests | Yes | Learner submit/reload; admin reply | Firestore write/read/update | Owner isolation and admin moderation | Yes | VERIFIED |
| PYQ listing/answers | Yes | Published paper data | Published reads | Published rules | Yes | PASSED |
| PYQ interactive practice | Yes | Learner E2E completion | Existing question bank | Published reads | Yes | VERIFIED |
| Accessibility controls | Yes | Toggle/persistence checks | N/A | N/A | Yes | PARTIALLY VERIFIED |
| CSV validation/import | UI preview/import | Content-service + parser tests | Admin writes | Admin/draft rules | Source only | VERIFIED local scope |
| JSON question import | UI row preview | Parser + callable integration + browser E2E | Admin callable path | Admin-only operation history | Draft learner isolation | VERIFIED local emulator scope |
| Bulk edit/publish/archive | UI selection/actions | Trusted service + callable/browser edit coverage | Admin callable path | Parent ownership and learner visibility | Publication journey pending | PARTIALLY VERIFIED |
| Operation history/rollback | UI history/report/rollback | Callable integration + browser history/conflict coverage | Admin-only operation records | Client writes denied | Idempotent conflict-preserving rollback | VERIFIED local emulator scope |
| Question inventory | Source/UI | Filter/flag logic | Content service | Parent ownership | Source only | PARTIALLY VERIFIED |
| Admin content quality dashboard | Yes | Diagnostics 6/6; filters/search/deep link E2E; axe; 100/500/1000 browser benchmark | Derived from Firestore content; rules 11/11; 11 observed emulator requests | Claim-only admin access; signed-out guard | 390px rendered audit | VERIFIED |
| Draft-review-publish | Yes | Review, approve, reject controls | Rules accept review; draft hidden | Admin claim | Admin E2E/auth | VERIFIED |
| Audit log | Yes | Append-only emulator test | Firestore subscription/writer | Actor/tamper tests | Source only | PARTIALLY VERIFIED |
| JSON backups | Yes | Full validation before restore | Atomic batch restore | Admin rules | Source only | VERIFIED |
| Offline queue | Source/UI | Duplicate suppression and conflict merge | Progress synchronization path | Owner isolation | Source only | VERIFIED |
| Admin dashboard | Yes | Authenticated CRUD E2E | Emulator writes | Admin claim and route guard | Not fully | VERIFIED |
| Auth email/Google | Sign-in UI | Email sign-in exercised by admin/learner E2E; Google blocked | Emulator auth | Claim rules | UI only | PARTIALLY VERIFIED |

| Callable publication preview and learner visibility | VERIFIED | Functions emulator test covers server readiness checks, guest Firestore visibility, unpublish isolation, and trusted audit logging |
| Multi-batch import recovery | VERIFIED | Functions emulator test covers 401 rows, deterministic post-batch failure, resumable retry, repeated retry, and rollback; consistency is recoverable, not atomic |

`VERIFIED` is limited to the exact emulator/browser behavior listed in the
evidence. Production writes, deployment, and live-account testing were not
performed.

## Admin audit history

| Workflow | UI tested | Firebase tested | Security tested | Result |
|---|---|---|---|---|
| Admin history retrieval | Authenticated Playwright load, search, refresh | `auditLogs` ordered history query | Trusted admin read; learner/client writes denied | VERIFIED local emulator scope |
| Trusted audit creation | Admin action boundary | `writeAuditEntry` callable | Callable identity is authoritative; direct client create/update/delete denied | VERIFIED local emulator scope |
| Error handling | Permission/error state hides results and persisted count | Retry re-subscribes to the real query | No local preview rows are presented as Firestore history | VERIFIED local browser scope |

Audit records are stored in the top-level `auditLogs` collection. The current
record shape does not contain a course identifier, so course-filtered audit
queries remain a documented limitation rather than an implied capability.
