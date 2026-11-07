# Feature Coverage Matrix

| Feature | UI tested | Functional test | Firebase tested | Security tested | Mobile tested | Result |
|---|---|---|---|---|---|---|
| Course listing/search | Yes | Yes, real course | Read path exercised | Published query rules tested | Yes | PASSED |
| Week listing/study | Yes | Yes, 10-question week | Read path exercised | Parent visibility tested | Yes | PASSED |
| Practice quiz/scoring | Yes | Full 10-question completion | Local progress only | Attempt rules tested | Yes | PASSED |
| Saved questions | Yes | Bookmark and saved page | Local guest; account path source | Bookmark ownership rules pass | Yes | PARTIALLY VERIFIED |
| History/progress | Yes | Attempt and refresh | Local guest; account path source | Attempt ownership rules pass | Yes | PARTIALLY VERIFIED |
| Feedback/requests | Yes | Submit message | No durable client write | Rules exist but client path unused | Yes | FAILED |
| PYQ listing/answers | Yes | Empty-state route | Read path source | Published rules tested | Yes | PARTIALLY VERIFIED |
| PYQ interactive practice | Yes | Limitation state only | Not applicable | Not applicable | Yes | NOT IMPLEMENTED |
| Accessibility controls | Yes | Persist/toggle/source checks | Not applicable | Not applicable | Yes | PARTIALLY VERIFIED |
| CSV validation/import | Source/UI inspected | Emulator content service; browser file workflow incomplete | Admin write path tested | Admin/draft/atomic rules pass | Source only | PARTIALLY VERIFIED |
| Question inventory | Source/UI inspected | Filter/flag logic inspected | Content service tested | Parent ownership tested | Source only | PARTIALLY VERIFIED |
| Draft-review-publish | Source/UI inspected | Publish gates tested | Rules/service tested | Admin claim tested | Source only | PARTIALLY IMPLEMENTED |
| Audit log | UI and persistence inspected | Emulator append-only test | Firestore subscription/writer | Actor/tamper tests pass | Source only | PARTIALLY VERIFIED |
| JSON backups | UI/source inspected | Validation/conflict logic inspected | Restore writes protected | Admin write rules | Source only | PARTIALLY IMPLEMENTED |
| Offline queue | Source inspected | Emulator progress rules | Cloud diff source inspected | Owner isolation pass | Source only | PARTIALLY VERIFIED |
| Admin dashboard | Signed-out guard tested | No authenticated browser harness | Rules/service tests | Admin claim tests pass | Not fully | PARTIALLY VERIFIED |
| Auth email/Google | Sign-in UI | No dedicated auth E2E in current run | Auth source inspected | Role escalation rules tested | UI only | BLOCKED |
