# Security Test Results

## Emulator results

`npm run test:rules` passed **11/11** tests. `npm run test:content-service`
passed **2/2** tests.

Verified:

- Guest published/content-ready reads succeed.
- Draft and unpublished parent/child reads fail.
- Only custom-claim admins can write content.
- User profiles cannot grant roles or change ownership.
- Attempts and bookmarks are owner-isolated.
- Attempt mutations are denied unless exactly unchanged.
- Feedback/report shapes and bounded nested fields are enforced.
- Audit logs require admin claims, bind actor ID, and deny update/delete.
- Bulk imports reject empty lists, duplicates, and invalid parent ownership.

## Source-level findings

- `functions/index.mjs` defines App Check-protected callable content functions.
- The frontend currently writes directly through `src/lib/cloud-content.ts`;
  callable Functions are not invoked by the frontend. Firestore rules remain the
  effective client authorization boundary.
- Backup restore validates all records before an admin-only Firestore batch
  commit and rejects payloads larger than the atomic batch limit.
- Feedback writes include the authenticated owner ID and learner reads are
  owner-scoped; the learner E2E verifies the persisted owner record.

## Production boundary

No production writes, deployments, role changes, migrations, or destructive
operations were performed. Production rules were not redeployed.
