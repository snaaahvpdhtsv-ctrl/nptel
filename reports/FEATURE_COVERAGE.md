# Feature Coverage Matrix

| Feature | UI tested | Functional test | Firebase tested | Security tested | Mobile tested | Result |
|---|---|---|---|---|---|---|
| Course listing/search | Yes | Yes | Yes | Yes | Yes | PASSED |
| Week listing/study | Yes | Yes | Yes | Yes | Yes | PASSED |
| Practice quiz/scoring | Yes | Yes | Progress rules | Yes | Yes | PASSED |
| Saved questions | Yes | Yes | Progress rules | Ownership | Yes | PARTIALLY VERIFIED |
| History/progress | Yes | Yes | Progress rules | Ownership | Yes | PARTIALLY VERIFIED |
| Feedback/requests | Yes | Learner E2E submit/reload | Firestore write/read | Owner isolation | Yes | VERIFIED |
| PYQ listing/answers | Yes | Published paper data | Published reads | Published rules | Yes | PASSED |
| PYQ interactive practice | Yes | Learner E2E completion | Existing question bank | Published reads | Yes | VERIFIED |
| Accessibility controls | Yes | Toggle/persistence checks | N/A | N/A | Yes | PARTIALLY VERIFIED |
| CSV validation/import | Source/UI | Content-service validation | Admin writes | Admin/draft rules | Source only | PARTIALLY VERIFIED |
| Question inventory | Source/UI | Filter/flag logic | Content service | Parent ownership | Source only | PARTIALLY VERIFIED |
| Draft-review-publish | Yes | Review, approve, reject controls | Rules accept review; draft hidden | Admin claim | Admin E2E/auth | VERIFIED |
| Audit log | Yes | Append-only emulator test | Firestore subscription/writer | Actor/tamper tests | Source only | PARTIALLY VERIFIED |
| JSON backups | Yes | Full validation before restore | Atomic batch restore | Admin rules | Source only | VERIFIED |
| Offline queue | Source/UI | Duplicate suppression and conflict merge | Progress synchronization path | Owner isolation | Source only | VERIFIED |
| Admin dashboard | Yes | Authenticated CRUD E2E | Emulator writes | Admin claim and route guard | Not fully | VERIFIED |
| Auth email/Google | Sign-in UI | Email sign-in exercised by admin/learner E2E; Google blocked | Emulator auth | Claim rules | UI only | PARTIALLY VERIFIED |

`VERIFIED` is limited to the exact emulator/browser behavior listed in the
evidence. Production writes, deployment, and live-account testing were not
performed.
