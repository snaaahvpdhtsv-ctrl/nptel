# Bug Report

## BUG-001 — Feedback submissions are not durable

| Field | Detail |
|---|---|
| Severity | High |
| Feature/route | Requests & Feedback — `/courses/mental-health/feedback` |
| Preconditions | Guest browser, empty local state |
| Steps | Enter a message; click Submit; wait for success; refresh |
| Expected | Submitted request remains available to the learner/admin through Firestore |
| Actual | “Submitted!” appears, then refresh shows “No requests yet”; no Firestore write occurs |
| Root cause | `FeedbackPage.tsx` updates `requests` React context only; no cloud feedback writer/subscriber is called |
| Status | Open; requires a durable feedback schema plus admin read/reply flow and emulator coverage |

## BUG-002 — Review workflow is a modal, not a workflow

| Field | Detail |
|---|---|
| Severity | High |
| Feature | Draft-review-publish |
| Evidence | `getPublishReview` and publish modal in `ContentPanels.tsx`; statuses are only draft/published/archived |
| Actual | No submit-for-review, reviewer approval, rejection state, or rejection reason exists |
| Status | Partially implemented; not safe to report as complete |

## BUG-003 — JSON restore is not atomic

| Field | Detail |
|---|---|
| Severity | High |
| Feature | Versioned JSON backup restore |
| Evidence | `WeeksPanel` restores each week and then its questions in separate sequential calls |
| Actual | A later write failure can leave earlier restored weeks in Firestore |
| Status | Open; use one transaction/batch or compensating rollback and test failure injection |

## BUG-004 — Offline queue has no single-flight or conflict policy

| Field | Detail |
|---|---|
| Severity | Medium |
| Feature | Offline progress |
| Evidence | `syncQueuedProgress` can be called from commit, reconnect effect, and retry without a per-user lock |
| Actual | Concurrent sync calls can overlap; cloud/local divergence is merged by IDs/sets without explicit conflict reporting |
| Status | Open; add a per-user mutex and documented conflict policy |

## BUG-005 — PYQ interactive practice is explicitly unavailable

| Field | Detail |
|---|---|
| Severity | Medium |
| Feature/route | `/courses/:courseId/pyq/practice/run` |
| Expected | Interactive PYQ quiz if listed as implemented |
| Actual | Notice says interactive PYQ practice is not available yet |
| Status | Known unimplemented feature; UI correctly discloses limitation |

## Fixed during the preceding audit

- CSV exact-header and empty-option validation.
- Audit actor identity display/export.
