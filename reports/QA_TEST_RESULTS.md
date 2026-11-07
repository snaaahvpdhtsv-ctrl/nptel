# QA Test Results

**Run date:** 2026-11-07

| Test ID | Feature | Route/precondition | Expected | Actual | Result | Evidence |
|---|---|---|---|---|---|---|
| ROUTE-001 | Public routing | `/` | Course picker renders | Renders with one Firestore course and no console errors | PASS | Playwright route run |
| ROUTE-002 | Redirect | `/courses` | Redirects to `/` | Redirected to `/` | PASS | Playwright route run |
| ROUTE-003 | Auth route | `/signin` | Sign-in UI renders | Renders email/password and Google controls | PASS | Playwright route run |
| ROUTE-004 | Admin guard | `/admin`, `/admin/dashboard` signed out | Admin sign-in, no dashboard | Redirected to `/signin?view=admin` | PASS | Playwright route run |
| ROUTE-005 | Invalid course | `/courses/missing/*` | Useful not-found state | Course not-found state rendered for all tested child paths | PASS | Playwright route run |
| ROUTE-006 | Invalid top-level route | `/does-not-exist` | Not-found state | Not-found state rendered | PASS | Playwright route run |
| UI-001 | Learner navigation | Real course `mental-health` | Home/study/practice/PYQ/saved/feedback/history/review/analytics/more render | All tested routes rendered without console errors | PASS | Playwright route run |
| UI-002 | Practice | Week 1 | Select week enables start | Start enabled after selecting week | PASS | Playwright interaction |
| UI-003 | Quiz | Week 1 | Answer, feedback, next, results, history | 10-question quiz completed; result and history persisted locally | PASS | Playwright interaction |
| UI-004 | Bookmark | Quiz question | Toggle and saved page update | Local progress stored; saved page showed one question | PASS | Playwright interaction/localStorage |
| UI-005 | Feedback | Guest feedback form | Submit and persistence | Submission message appears, but refresh loses request | FAIL | BUG-001 |
| RESP-001 | Responsive | 5 routes × 9 viewports | No page overflow/errors | No mobile page overflow or console errors; decorative aurora elements extend bounds on desktop without document scroll width | PASS | Playwright viewport matrix |
| REG-001 | Rules | Firestore emulator | Security suite passes | 11/11 pass | PASS | `npm run test:rules` |
| REG-002 | Content service | Firestore emulator | Content integrity suite passes | 2/2 pass | PASS | `npm run test:content-service` |
| REG-003 | Type/build | Local | TypeScript/build pass | Pass; Vite emits existing large-chunk warning | PASS | `tsc --noEmit`, `npm run build` |
| REG-004 | Formatting | Local | Audited files formatted | Audited files pass; whole-repository formatter reports `scripts/provision-admin.mjs` | PARTIAL | `oxfmt --check` |

## Blocked or unavailable

- No configured Playwright test suite, axe suite, ESLint script, component test
  runner, or Functions emulator test script exists.
- Production authentication, admin claims, live rules, and database reads were
  not independently re-authorized during this run.
- No production writes or deployments were performed.
