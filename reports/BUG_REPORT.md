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

## Remaining limitations

The repository does not define an axe, component-test, Functions-emulator, or
production-authentication test runner. Those areas remain explicitly
unverified rather than being reported as passed.
