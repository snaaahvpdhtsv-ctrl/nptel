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
| UI-005 | Feedback | Authenticated learner feedback form | Submit and persistence | Feedback is written to emulator Firestore and remains after reload | PASS | `npm run test:e2e:learner` |
| RESP-001 | Responsive | 5 routes × 9 viewports | No page overflow/errors | No mobile page overflow or console errors; decorative aurora elements extend bounds on desktop without document scroll width | PASS | Playwright viewport matrix |
| REG-001 | Rules | Firestore emulator | Security suite passes | 11/11 pass | PASS | `npm run test:rules` |
| REG-002 | Content service | Firestore emulator | Content integrity suite passes | 2/2 pass | PASS | `npm run test:content-service` |
| REG-003 | Type/build | Local | TypeScript/build pass | Pass; Vite emits existing large-chunk warning | PASS | `tsc --noEmit`, `npm run build` |
| REG-004 | Formatting | Local | Changed files formatted | Changed source and E2E files formatted | PASS | `npx oxfmt src/lib/cloud-requests.ts tests/learner.e2e.mjs` |
| E2E-001 | Authenticated admin | Emulator admin account | CRUD, authorization and protected route behavior | Course/week CRUD passed; signed-out admin route redirected | PASS | `npm run test:e2e:admin` |
| E2E-002 | Learner PYQ/feedback | Emulator learner account | Interactive PYQ and durable feedback | Correct answer feedback, Firestore persistence and reload passed | PASS | `npm run test:e2e:learner` |
| E2E-003 | Requests moderation | Emulator admin account and seeded feedback | Reply persists and status changes only after write | Admin reply persisted with `status=replied` and reply text | PASS | `npm run test:e2e:admin` |
| E2E-004 | Duplicate feedback rendering | Emulator learner account | One submission card per Firestore record | Exactly one feedback card before and after reload | PASS | `npm run test:e2e:learner` |

## Blocked or unavailable

- No configured axe suite, ESLint script, component test runner, or Functions
  emulator test script exists.
- Production authentication, admin claims, live rules, and database reads were
  not independently re-authorized during this run.
- No production writes or deployments were performed.
