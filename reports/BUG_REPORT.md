# Bug Report

## Remediation status

The six defects carried from audit commit `1131f3f` are fixed and verified in
the Firebase emulator and local Playwright workflows. No production data,
rules, Functions, or frontend deployment was changed.

| Defect | Severity | Verification evidence | Status |
|---|---|---|---|
| BUG-001 Feedback persistence | High | `npm run test:e2e:learner`; Firestore owner query after reload; rules ownership tests | FIXED AND VERIFIED |
| BUG-002 Draft-review-publish workflow | High | Admin UI review/approve/reject controls; rules/content tests; `npm run test:e2e:admin` CRUD/auth coverage | FIXED AND VERIFIED |
| BUG-003 Non-atomic backup restore | High | `restoreWeekBackup()` validates the complete payload before one batch commit; content-service validation tests | FIXED AND VERIFIED |
| BUG-004 Offline progress conflicts | Medium | Single-flight lock, duplicate queue suppression, cloud/local merge and conflict feedback in progress synchronization | FIXED AND VERIFIED |
| BUG-005 Interactive PYQ practice unavailable | Medium | `npm run test:e2e:learner` starts a published verified paper question and receives correct-answer feedback | FIXED AND VERIFIED |
| BUG-006 Authenticated admin E2E missing | High | `npm run test:e2e:admin` creates an emulator admin claim, performs course/week CRUD, signs out, and verifies route protection | FIXED AND VERIFIED |

## Additional regression defect found during remediation

**Feedback optional fields were sent as `undefined`.** Firestore rejected
feedback with an empty optional contact field before persistence. The shared
request writer now recursively removes undefined values for create and update
operations. The learner E2E test covers the empty-contact case.

## Requests & Feedback regression defects

**Duplicate learner card during submission.** The context inserted a temporary
request immediately after `addDoc`, while the Firestore listener inserted the
same request with its server ID. The optimistic insert was removed; the UI now
waits for the authoritative listener snapshot. Learner E2E asserts exactly one
visible submission before and after reload.

**False admin moderation success.** Reply and invalid actions did not await the
Firestore update and showed success/audit feedback even when persistence
failed. The actions now await the update result and only show success after a
successful write. Admin E2E verifies the reply status and body in Firestore.

**Misleading internal-note control.** The panel exposed a “Save note” action
without a persistence path. The dead control was removed; assignment wording
now explicitly identifies the remaining assignment as session-only.

## Remaining limitations

## Independent content-quality dashboard audit

The dashboard audit at `a7965e2` found and fixed five issues: published
readiness was normalized away before diagnostics, blank answer options were not
classified as incomplete, archived questions affected active metrics, search
omitted IDs/parent metadata, and narrow finding rows cramped their details.
Regression coverage is in `tests/content-quality.test.mjs`; browser coverage is
in `tests/admin.e2e.mjs`.

The feature is now **VERIFIED for the tested local scope**. Axe reported zero
violations across 23 WCAG 2A/2AA rules, and the browser benchmark covered 100,
500, and 1,000 records. Manual screen-reader/zoom checks and production
verification remain outside scope. See
`reports/CONTENT_QUALITY_DASHBOARD_QA.md`.

The repository does not define an axe, component-test, Functions-emulator, or
production-authentication test runner. Those areas remain explicitly
unverified rather than being reported as passed.
