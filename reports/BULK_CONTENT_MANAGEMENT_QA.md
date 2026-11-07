# Bulk Content Management QA

## Result

**PARTIALLY VERIFIED** for the local emulator-tested scope.

## Automated evidence

| Area | Result |
|---|---|
| JSON arrays and versioned envelopes | 3/3 parser tests passed |
| Duplicate normalization and unknown-field warnings | Passed |
| Malformed JSON rejection | Passed |
| Trusted import operation | Passed |
| Publish readiness enforcement | Passed |
| Idempotent rollback | Passed |
| Firestore draft/learner/admin rules | 12/12 passed |
| Admin browser regression | Passed |
| Learner browser regression | Passed |
| Accessibility scan | 23 rules, 0 violations |
| Large-dataset browser benchmark | 100/500/1,000 records passed |
| Production build | Passed |
| Callable Functions integration | 1/1 passed |
| Functions browser E2E | Passed |
| TypeScript | Passed |

Commands:

```text
npm run test:bulk-content
npm run test:content-service
npm run test:rules
npm run test:functions-callable
npm run test:e2e:admin
npm run test:e2e:learner
npm run test:e2e:functions-bulk
npx tsc --noEmit
npm run test:accessibility
npm run test:performance
npm run build
```

## Verified behavior

- Preview performs no writes.
- CSV and JSON imports remain draft-only.
- Existing IDs and normalized duplicate text are blocked.
- Empty options, invalid answer indexes, incomplete records, and unsupported
  envelopes are rejected.
- Unknown JSON fields are visible as warnings.
- Bulk publishing rejects incomplete and unreviewed questions.
- Bulk operation history is admin-readable and client-write protected.
- Rollback is idempotent and only removes operation-owned question records.
- Learners and unauthenticated users cannot read operation history.
- Bulk difficulty editing offers explicit Easy, Medium, and Hard actions.

The broader browser and accessibility/performance checks pass for the existing
application scope, but they do not yet exercise the callable bulk workflows
end to end.

## Functions emulator integration

The isolated browser harness starts Auth on `127.0.0.1:9099`, Firestore on
`127.0.0.1:8080`, Functions on `127.0.0.1:5001`, and Vite on a test-only
port. It sets `VITE_FIREBASE_FUNCTIONS_EMULATOR_HOST` only for that process;
production Firebase configuration is unchanged. Functions dependencies must be
installed with `npm install --prefix functions`.

Callable contracts:

| Callable | Request | Authorization | Side effects |
|---|---|---|---|
| `importQuestionOperation` | `{ owner, questions, metadata }` | Authenticated custom claim `admin: true` | Creates draft questions and one `bulkOperations` import record |
| `updateQuestionOperation` | `{ owner, questionIds, patch }` | Authenticated custom claim `admin: true` | Validates ownership/readiness, updates questions, records an edit/publish operation |
| `rollbackImportOperationContent` | `{ operationId }` | Authenticated custom claim `admin: true` | Deletes unchanged operation-owned imports or records conflicts without deleting newer content |

Unauthenticated and learner callers are rejected with
`functions/permission-denied`. Invalid ownership, duplicate IDs, incomplete
publication, and stale rollback records fail without unauthorized writes.

The callable unit/integration test verifies authorization, draft persistence,
operation history, bulk editing, conflict-preserving rollback, and
idempotent repeated rollback. The browser test verifies JSON preview with a
blocking row, callable-backed import, refresh-visible draft content, bulk
difficulty editing, operation history, row results, and rollback conflict
preservation.

## Retry and partial failure policy

The supported operation is one bounded Firestore transaction of at most 450
rows. It therefore fails atomically rather than producing partial row
successes. Retryable per-row failures, network interruption recovery, and
multi-batch resume are **NOT VERIFIED / NOT IMPLEMENTED** for this bounded
transaction model; no successful row can be duplicated by retrying the same
operation because the operation either commits once or fails before commit.

Cleanup is automatic in the browser and callable tests. For an interrupted
run, stop emulator processes and remove only isolated `demo-nptel` emulator
data; never point these commands at a production project.

## Remaining verification gaps

- Full Playwright journeys for JSON import, bulk edit, publish/unpublish,
  operation history, rollback conflict handling, and mobile layouts are not
  yet automated.
- The callable Functions path requires a local Functions emulator or deployed
  Functions configuration; the existing browser harness starts Auth and
  Firestore only.
- Per-row retryable failures and partial multi-batch execution are covered by
  the final Functions emulator regression described below.
## Final publication and recovery verification

The Functions emulator now exposes `previewQuestionPublication` and
`retryImportQuestionOperation`. Publication preview is server-authoritative:
it checks parent ownership, review/published state, completeness, and returns
row-level blocking errors and warnings. The publish mutation repeats those
checks and writes a trusted `auditLogs` record. The admin application requests
the preview before publishing, while the callable remains the final
authorization and validation boundary.

Operation imports use 200-row Firestore batches (maximum 1,000 rows) and
persist `pending`, `processing`, `partially_completed`, `completed`, and
`failed` states with per-row results. A deterministic `failAfterBatch` hook is
accepted only by the Functions emulator for recovery tests. Retry requests
reuse the original operation ID, skip rows already tagged with that operation,
and never duplicate successful records. Rollback marks
`rollback_in_progress`, removes only unchanged operation-owned records, and
preserves conflicts. Multi-batch imports are therefore recoverable but not
atomic across batches.

The callable regression runner verifies admin publication preview, blocked
draft publication, learner-visible published content, guest visibility after
unpublish, trusted publication audit records, a 401-row two-plus-batch import,
deterministic partial failure, retry, repeated retry idempotency, and rollback.
