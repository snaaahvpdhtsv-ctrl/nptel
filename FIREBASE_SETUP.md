# Firebase setup

## Current integration boundary

Email/password and Google Authentication use Firebase Auth. Courses, weeks,
papers, and questions now load from Firestore. Admin changes to those records
are written to Firestore; learners subscribe to the same records and only read
published, complete content. Question totals are derived from valid published
question documents, not the legacy bundled metadata.

The legacy arrays in `src/lib/data.ts` are retained as migration/reference
material only. They are not an application fallback and are not automatically
uploaded. Their historical counts must not be used as evidence that those
questions exist in Firestore. No production inventory, backup, migration, or
rules deployment has been run.

Signed-in quiz attempts and bookmarks use the user's Firestore subcollections.
Announcements, feedback/report submissions, and their admin moderation remain
local preview state; do not treat those dashboard sections as durable.

## Web configuration

Copy `.env.example` to `.env.local` and fill in the Firebase Web App values for
project `nptel-88452`. These are public client configuration values; never put
Firebase Admin SDK credentials in a `VITE_` variable or the frontend.

For local emulator testing, set
`VITE_FIREBASE_AUTH_EMULATOR_URL=http://127.0.0.1:9099` and
`VITE_FIREBASE_FIRESTORE_EMULATOR_HOST=127.0.0.1:8080` in a local-only
environment file. Enable Email/Password and Google under Firebase
Authentication → Sign-in method. GitHub Pages must receive the six web config
values as build-time environment variables in its Actions workflow; register
the Pages domain (and any custom domain) under Authentication → Settings →
Authorized domains. Never commit production credentials or deploy secrets.

## Firestore schema

| Collection/path | Purpose |
| --- | --- |
| `courses/{courseId}` | Course metadata, `status`, and `contentReady` |
| `weeks/{weekId}` | Stable `courseId`, week number/title, `status`, and `contentReady` |
| `papers/{paperId}` | Stable `courseId`, title/year/session, `status`, and `contentReady` |
| `questions/{questionId}` | Question/options/answer/explanation, one parent ID, `status`, and `contentReady` |
| `announcements/{announcementId}` | Announcement content and `draft` flag |
| `users/{uid}` | Learner profile; role is never stored or trusted here |
| `users/{uid}/bookmarks/{questionId}` | Owner-only bookmarks |
| `users/{uid}/attempts/{attemptId}` | Owner-only quiz history |
| `feedback/{feedbackId}` | Validated feedback/request submissions |
| `reports/{reportId}` | Validated answer/question reports |

`contentReady` must be `true` exactly when status is `published`. Question IDs
are Firestore document IDs and are preserved during edits; deleting a question
archives it to keep bookmarks and attempts referentially safe. Published
questions require non-empty text, 2–6 non-empty options, and an in-range answer.
Question records must reference an existing week or paper in the same course.
The admin UI refuses to publish a week or paper with no complete published
question and prevents removing the last complete question while its parent is
published. Security Rules cannot count child documents, so those parent/child
count checks are enforced by the application, not by Firestore Rules against a
direct administrator SDK write.

`firestore.rules` denies unmatched access. Only the `admin: true` Firebase Auth
custom claim can write content or moderate submissions. Learner reads require
published parents and content. The rules are exercised by
`firebase emulators:exec --only firestore --project demo-nptel "node --test tests/firestore.rules.test.mjs"`;
this does not deploy rules to the live project.

Do not deploy rules or migrate production content until the production
inventory, backup, and rollout have been reviewed and authorized:

```sh
firebase deploy --only firestore:rules --project nptel-88452
```

## Provision the first administrator

Create the admin account through the normal sign-up flow first. Then run the
provisioning script from a trusted machine/account with Firebase Admin
Application Default Credentials authorized for `nptel-88452`:

```sh
gcloud auth application-default login
export FIREBASE_PROJECT_ID=nptel-88452
node scripts/provision-admin.mjs admin@example.com
```

The script grants only the custom claim and revokes refresh tokens. The user
must sign in again to receive the claim. Never run this script in the browser or
expose its credentials in Vercel frontend variables.

## Safe content migration and rollback plan

1. In a read-only production audit, export and inventory the existing `courses`,
   `weeks`, `papers`, and `questions` documents. Record document IDs, parent
   references, publication state, and valid-question counts; do not copy private
   learner data into reports.
2. Before any write, create a Firestore export in a controlled Cloud Storage
   bucket and verify that it can be read. Keep the export immutable.
3. Compare the inventory with the legacy bundled arrays and admin records.
   Resolve conflicting IDs and content manually. Do not copy metadata counts,
   samples, or incomplete questions as if they were real question documents.
4. Trial a stable-ID, idempotent migration against a staging/emulator database.
   It must create only absent records, report conflicts, and never replace
   existing production records implicitly.
5. After approval, migrate with an explicit allowlist, verify counts and
   representative question text/answers, then deploy the compatible rules and
   GitHub Pages build in a controlled rollout.
6. If verification fails, roll the app back first. Restore production only from
   the verified pre-migration export under an approved recovery plan; do not
   run a destructive reset or overwrite concurrent learner progress.

## Verification still required before production rollout

- Production Firestore content inventory and verified backup; neither has been
  performed.
- Emulator and browser integration tests for separate admin/learner sessions,
  bulk import, page refresh, bookmarks, and attempt history.
- Add the six web config values to the GitHub Pages build and verify actual
  Firebase Auth (including Google sign-in and authorized domain).
- Review and authorize production rules deployment, content migration, and
  GitHub Pages deployment. None has occurred in this work.
