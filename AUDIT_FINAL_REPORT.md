# NPTEL Website Audit Report

**Audit date:** 2026-11-02 · **Project:** NPTEL Practice Platform · **Production URL:** https://nptel-three-murex.vercel.app/ · **Firebase project:** `nptel-88452`
**Overall status:** **PARTIALLY VERIFIED** — source and emulator checks are complete for the accessible scope. Production Firebase administration, the authoritative course material, and deployment controls were not available, so the complete production state cannot be certified.

## A. Audit coverage

| Area | Coverage and status |
|---|---|
| Repository | 92 tracked files inventoried; 58 source files reviewed; Firebase, routes, data, admin, auth, progress and deployment surfaces inspected. |
| Pages and components | 23 page modules and 12 shared components inventoried. The route table defines 33 route patterns; prior browser work exercised 25 runtime routes and the bundled course/week/paper details. |
| Visible text | Prior runtime snapshots covered 309 unique visible-text lines and 949 route-line occurrences across 25 routes. Conditional and admin states were supplemented by source review and the current emulator/browser checks; this is not a literal accounting of every possible runtime string. |
| Accessibility | axe-core checked five public screens and seven admin sections at 1440px and 390px (24 screen/viewport combinations). No WCAG 2.1 A/AA violations were reported after entrance animations settled. |
| Courses and content | All five bundled course records, all 12 week metadata records, all 13 PYQ paper metadata records, 13 full question objects and 20 incomplete admin question summaries were reviewed. |
| Firebase production | Local configuration and public deployment references checked. **Zero production collections/documents were inspected** because Firebase access was denied. |
| Emulator security | Seven Firestore rules test cases with 41 allow/deny assertions passed against the Firestore emulator. |
| Browser workflows | Emulator-backed email registration, refresh/session restoration, Google popup sign-in, ordinary-user admin denial, custom-claim admin access, quiz/results/history, bookmarks, guest-to-account progress migration, and an announcement edit/refresh were exercised. |
| Rendered UI | Landing page rendered at 1440×900 and 390×844. No mobile horizontal overflow or browser console errors; desktop document width matched the viewport. |

## B. Findings and corrections

| ID | Severity | Finding and root cause | Location | Fix/status | Verification |
|---|---|---|---|---|---|
| UX-01 | Medium | New guest progress started with 13 sample bookmarks, making an empty first-use state impossible. | `src/lib/progress-storage.ts` | **FIXED AND VERIFIED** — new guest progress starts with an empty saved-ID list. Existing browser data is not migrated or deleted; previously stored seeded IDs may remain. | Browser check: new guest showed zero saved questions; saving two questions persisted them across refresh. |
| UX-02 | Low | Saved-question difficulty options and filters compared inconsistent stored casing literally. | `src/pages/SavedPage.tsx` | **FIXED AND VERIFIED** — values are normalized for options and matching. | Browser check: options were `All`, `Easy`, `Medium`; each difficulty returned one matching question. |
| SYNC-01 | Medium | A repeated initial sync could write an already-created quiz attempt as an update; rules rejected all attempt updates, surfacing a sync failure and leaving guest progress unmigrated. | `src/lib/progress-state.tsx` (uncommitted sync implementation), `firestore.rules` | **FIXED AND VERIFIED IN EMULATOR** — permit only an exact equality update for the same owner, preserving attempt immutability while making identical retries idempotent. | Emulator denies changed attempt data and accepts an identical repeat. Browser test confirmed guest attempt/bookmark moved to account documents, guest state was cleared, no sync error appeared, and account progress survived refresh. Production rules/app sync remain unverified. |
| TXT-01 | Low | “PYQ's” terminology, a reply typo, and a malformed sample announcement were inconsistent. | `Navbar.tsx`, course and PYQ pages, `src/lib/data.ts` | **FIXED AND VERIFIED** in source; no remaining `PYQ's`, `W'll`, or old malformed announcement strings were found in `src`. | Source search and TypeScript/build checks. |
| META-01 | Medium | The app title was generic in the original site metadata. | `.figma/make/site.json` | **FIXED AND DEPLOYED** — metadata now names “NPTEL Practice Platform”; `noindex` remains unchanged. | Local build emits the expected title; after push, public production serves the updated title and a newer hashed JS asset. Homepage, `/courses`, and that asset returned HTTP 200. |
| SEC-01 | Medium | `validReport()` allowed malformed nested report references and answer indexes because it checked only a subset of nested fields. | `firestore.rules` | **FIXED IN WORKTREE; PRODUCTION UNVERIFIED** — validate nonempty bounded week IDs, optional question ID/text types and lengths, numeric bounds, and answer indexes 0–7. | Added emulator denials for malformed week ID and out-of-range answer index; all seven rules tests pass. The rules have not been deployed to Firebase. |
| DATA-01 | High | Only one course has content metadata; four other records are explicitly empty sample placeholders. The populated course declares 119 weekly and 166 PYQ questions but the bundle contains only 13 complete question objects. | `src/lib/data.ts`, `src/lib/question-bank.ts` | **REQUIRES MANUAL ACTION** — no questions or answers were invented. | Source inventory; full course/PYQ text is not present to verify. |
| DATA-02 | High | Twenty admin question summaries (10 under week 6 and 10 under PYQ paper 1) have question text, option count and answer index, but no actual option text or explanations. Most declared paper/week content is absent or not fully mapped. | `src/lib/data.ts` | **REQUIRES AUTHORITATIVE NPTEL MATERIAL** — preserve current data; verify answers and mappings before filling gaps. | Source inspection. Academic answer correctness was not independently verified. |
| FIRE-01 | High | Vercel environment configuration, production auth providers/domains/OAuth settings, live rules/indexes, user documents and custom claims could not be inspected. | Firebase/Vercel project settings | **BLOCKED** — Firebase CLI received HTTP 403 listing Firestore databases; the target project was not listed. Vercel CLI was unauthenticated and this checkout has no linked Vercel project. | Read-only access attempts only. Local `.env.local` has all six expected client config keys and its project ID is `nptel-88452`; `.env.example` contains placeholders. |
| FEATURE-01 | High | Feedback and problem reports update React context only; refresh loses them. | `FeedbackPage.tsx`, `ReportProblem.tsx`, `src/lib/app-state.tsx` | **UNVERIFIED FOR PRODUCTION / KNOWN PREVIEW LIMITATION** — source confirms in-memory state. Connecting this safely requires production schema/rule verification and a complete admin read/reply path. | Source review; no production writes were attempted. |
| FEATURE-02 | High | Admin course/week/paper/question edits, request replies/notes/assignment, announcements and audit entries are preview state, not durable Firestore records. | `src/pages/admin/*`, `src/lib/app-state.tsx` | **PARTIALLY VERIFIED** — dashboard labels itself “Preview workspace · changes stay in this browser session.” No backend conversion was made without production schema access. | Emulator admin claim opened dashboard; an announcement edit worked in-session but did not survive refresh. |
| FEATURE-03 | Medium | Audit history, internal notes, and assignment indicators are session/component state and are not durable audit records. | `AuditPanel.tsx`, `RequestsPanel.tsx`, `AdminPage.tsx` | **PARTIALLY VERIFIED / PREVIEW** — retained as preview behavior; not represented as a production audit log. | Source inspection and emulator browser pass. |
| SEO-01 | Medium | Search indexing is disabled and `robots.txt` disallows all crawlers. | `.figma/make/site.json`, generated `robots.txt` | **UNVERIFIED INTENT; PRESERVED** — source explicitly sets `robots.index: false`, so it appears deliberate. Public discoverability is an owner decision; no change was made. | Production `/robots.txt` returns `Disallow: /`; production HTML contains `noindex, nofollow`. |
| SEO-02 | Low | `/sitemap.xml` returns the SPA HTML shell instead of a sitemap. | Vercel SPA rewrite / absent sitemap | **OPEN** — with indexing disabled, no sitemap was introduced. Revisit only if public indexing is intended. | Production request returned HTTP 200 with `text/html`, not XML. |
| PERF-01 | Low | The main JavaScript chunk is about 1,240.70 kB minified (368.10 kB gzip), above Vite’s 500 kB warning threshold. | Vite build output | **OPEN** — no code splitting was added because routes, admin, authentication and preview flows lack a full regression suite; do this as a separately verified performance change. | Current production build succeeds and emits the chunk warning. |

## C. Firebase results

- **Local config:** all six `VITE_FIREBASE_*` values are present locally; project ID matches `nptel-88452`. No raw values are included in this report. `.env.local` and service-account/credential JSON files are not tracked by Git.
- **Production bundle:** contains the expected Firebase project ID and auth domain. This verifies only the public client bundle, not server-side Vercel variables or Firebase Console settings.
- **Production access:** Firebase CLI could not list the target Firestore database (403) or Firebase apps. Production providers, authorized domains, Google OAuth setup, rules, indexes, profile documents, progress documents and custom claims are **UNVERIFIED**.
- **Application schema surface:** auth profile creation uses `users/{uid}`; account progress uses `users/{uid}/attempts/{attemptId}` and `users/{uid}/bookmarks/{questionId}`. The app does not fetch course/question content or durable admin content in the inspected source; those remain bundled/in-memory.
- **Emulator auth:** email signup, session restoration after refresh, Google popup completion, normal learner rejection from admin sign-in, and custom-claim admin dashboard access passed in the Auth emulator. This is **not production authentication verification**.
- **Rules:** 11 document-match patterns are present in the checked-in rules. Emulator tests cover published-content ancestry, owner isolation, profile role restrictions, custom-claim admin writes, announcement reads, constrained feedback/report writes, and idempotent attempt retries. Production rules were not read or deployed.
- **Indexes:** no `firestore.indexes.json` is present; live index configuration is inaccessible. No application compound content query was identified in the inspected Firestore client code.

## D. Content completeness

| Content | Bundled declaration | Complete content present | Result |
|---|---:|---:|---|
| Course records | 5 | 1 populated; 4 explicitly sample/empty | Incomplete for a five-course catalog. |
| Weeks | 12 | 12 metadata records | Week metadata exists only for the populated course. |
| Weekly questions | 119 declared | 13 full question objects across the bundle; 10 additional week-6 summary rows are incomplete | Counts/content cannot be reconciled reliably. |
| PYQ papers | 13 | 13 metadata records | Paper metadata exists; question text is largely absent. |
| PYQ questions | 166 declared | 10 paper-1 summary rows are incomplete; no complete paper question bank is supplied | PYQ answer/practice flows cannot provide the declared content. |
| Duplicate full-question IDs | 13 inspected | 0 duplicate IDs detected | Structural check only; not academic validation. |
| Answers/explanations | 13 full question objects | Included with those samples | Not checked against authoritative NPTEL sources; no answer correction was guessed. |

No authoritative course source or complete original source material was available in the checkout. Content additions and academic answer review require the course’s official NPTEL URL/material and manual verification.

## E. Feature-by-feature results

| Feature | Result |
|---|---|
| Guest course browsing and course routing | **PARTIALLY VERIFIED** — route and guest flows work; four displayed courses are empty placeholders. |
| Weekly answer key | **PARTIALLY VERIFIED** — bundled sample questions render; many declared questions are absent. |
| Practice selection, answer feedback, results, history | **VERIFIED LOCALLY** for the included sample questions. A working-tree account sync implementation persisted guest attempts/bookmarks to emulator Firestore and restored progress after refresh. That implementation remains uncommitted; production sync is unverified. |
| PYQ browsing/practice | **PARTIALLY VERIFIED** — paper metadata/routes work; most paper question text is explicitly unavailable. |
| Saved questions | **FIXED AND VERIFIED** — new guest state is empty, bookmarks can be toggled, filters work and local storage survives refresh. |
| Email/password auth | **PARTIALLY VERIFIED** — emulator signup and session restoration passed; previous audit also exercised login/logout and invalid password. Production provider configuration remains unverified. |
| Google auth | **PARTIALLY VERIFIED** — emulator popup completed and app navigated home; no production login was attempted. |
| Admin route authorization | **VERIFIED IN EMULATOR** — ordinary learner is denied; test admin with trusted emulator custom claim is admitted. Production claims are unverified. |
| Admin content editing and announcements | **PREVIEW ONLY** — editing works in the current browser session but resets after refresh. No durable production content operation was tested. |
| Feedback, problem reports, replies, notes, assignments | **PREVIEW ONLY** — state is in memory; no durable Firestore integration was verified. |
| Audit history | **PREVIEW ONLY** — explicitly scoped to the current browser session. |
| Offline/PWA | Manifest and assets load in production; full offline lifecycle was not re-tested in this continuation. |

## F. Security and accessibility

- No client-side admin role field is accepted by the user-profile create rules; admin writes use the trusted `admin` custom claim. Emulator tests deny a normal learner’s content/announcement write and reject profile self-elevation.
- Report nested values now receive stronger shape/range validation. This is a local rules change only; production behavior is unknown until the live rules are compared and a controlled deployment is authorized.
- No production user data was read or modified. No Firebase Admin credentials were put in frontend code or tracked.
- Repeated attempt writes are allowed only when the replacement document exactly equals the stored document; emulator tests verify actual attempt changes remain denied.
- axe-core reported zero WCAG 2.1 A/AA violations across the 24 sampled public/admin screen-width combinations after animations settled. This does not constitute a full manual keyboard or screen-reader audit.
- Current screenshot/browser evidence: first impression is a clearly identified NPTEL course picker with the course list as the primary action and a dark gradient/aurora visual direction. The 1440×900 screenshot had the decorative aurora extending beyond viewport bounds without increasing document scroll width; at 390×844, there was no horizontal overflow. No browser console errors were observed.

## G. SEO, performance and deployment

- After the audit commit was pushed, production began serving the title “NPTEL Practice Platform” and a newer hashed JS bundle. The homepage, `/courses` SPA route, and deployed JS asset returned HTTP 200. This is public-site verification of the frontend deployment, not access to Vercel build logs.
- Production robots policy is explicitly configured to block indexing. It was preserved because intent cannot be inferred safely.
- `/sitemap.xml` currently falls through the SPA rewrite.
- Production Vercel environment settings and deployment records could not be inspected; the CLI is logged out and no Vercel project link exists in the checkout. The updated public bundle confirms a deployment occurred, but the exact Vercel build record remains unverified. Firebase rules were not deployed.
- Build passes with the oversized-chunk warning noted above.
- **Audit commits:** `8d4a571442ac7f4677deab92f9f12f536c040016` (audit corrections), `c9265308ab38a363a6ac3f86ced6ee237ccf7947` (deployment evidence), and `c81759fdd4e1fe913bffc5dd2c75ea0601c65a02` (idempotent retry rules/test). Pushes to `origin/main` were verified with `git ls-remote`. **Frontend production deployment:** observed via the updated title and asset responses after the audit push. **Firebase rules deployment:** not performed. Vercel build logs/configuration remain unavailable.

## H. Changed files and preserved work

Audit corrections/tests in the worktree:

- `.figma/make/site.json` — app title metadata; indexing policy retained.
- `src/components/Navbar.tsx`, `src/pages/CoursesPage.tsx`, `HomePage.tsx`, `MorePage.tsx`, `PreviewPages.tsx`, `PyqPages.tsx` — consistent PYQ terminology.
- `src/lib/data.ts` — corrected sample feedback/announcement copy.
- `src/lib/progress-storage.ts` — empty first-use guest progress. This file also contains a separate pre-existing parser/cloud-progress change; do not stage that unrelated hunk with the guest-default fix.
- `src/pages/SavedPage.tsx` — difficulty normalization.
- `firebase.json` — emulator ports and Firestore rules path required to run the checked-in rules test command.
- `firestore.rules` — stricter nested report validation and exact-equality-only retry for immutable attempts.
- `tests/firestore.rules.test.mjs` — expanded Firestore emulator coverage, including idempotent retry and mutation denial.
- `AUDIT_FINAL_REPORT.md` — this report.

Pre-existing/uncommitted work was preserved and is not included in the audit change set: `src/lib/progress-state.tsx`, the cloud-progress parser/integration hunk in `src/lib/progress-storage.ts`, `src/pages/admin/OverviewSection.tsx`, `FIREBASE_SETUP.md`, `scripts/`, and `src/lib/cloud-progress.ts`. The in-progress progress sync code was exercised against the emulator to diagnose and verify the idempotent rules correction, but remains uncommitted and is not part of the production deployment. Any staging must remain file/hunk-specific.

## I. Test results

| Check | Result |
|---|---|
| `npm run build` | **PASS**; Vite 8.0.5 build completed. Main bundle warning remains. |
| `npx tsc --noEmit` | **PASS**. |
| `npx oxfmt --check ...` | **PASS** on the audited TypeScript/JSON/test files. |
| `git diff --check` | **PASS**. |
| `npm run test:rules` | **PASS** — 7 tests, 41 allow/deny assertions, 0 failures, Firestore emulator only. |
| Playwright Auth emulator | **PASS** — signup, refresh persistence, learner admin denial, admin custom-claim admission, Google popup. |
| Playwright preview behavior | **PASS as preview behavior** — announcement edit succeeds but does not survive refresh, confirming session-only state. |
| axe-core | **PASS** — 24 sampled public/admin viewport combinations, zero reported WCAG A/AA violations after animations settled. |
| Production Firebase/auth/rules | **NOT RUN** — console/API access unavailable; do not interpret emulator results as production validation. |
| Full application unit/component/E2E suites | **NOT AVAILABLE** — no dedicated configured test scripts/framework found; browser checks were direct Playwright runs. |

## J. Remaining work / manual action

1. Grant read-only access to the Firebase project or provide a supervised console session to inspect production providers, domains, rules, indexes, collections and schemas.
2. Provide the official NPTEL course source/material for content verification; do not fill missing academic data without it.
3. Decide whether the production site should be publicly indexed. If yes, authorize changing the noindex/robots policy and adding a real sitemap.
4. Decide and approve a schema-backed migration for durable feedback, reports, course content, admin edits, announcements and audit records. Protect all existing production data and use a backup/rollback plan.
5. Authenticate/link Vercel to inspect production environment configuration and deployment records; the public frontend update is verified, but the build record and environment settings are not.
6. After access and approval, verify production Google sign-in and the complete callback/session flow with a dedicated test account.
7. Address code splitting as a separate regression-tested performance change.

**Current recommendation:** do not certify the site as fully audited or production-complete. Source/emulator corrections are verified, but production Firebase, academic correctness, durable admin/feedback persistence and deployment remain unresolved.
