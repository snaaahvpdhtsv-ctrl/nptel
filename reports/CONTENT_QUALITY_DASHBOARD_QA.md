# Admin Content Quality Dashboard — Independent QA

**Audit commit:** `a7965e2`  
**Audit date:** 2026-11-07  
**Environment:** Local Vite app with Firebase Auth and Firestore emulators  
**Production safety:** No production reads, writes, claims, deployments, rules, Functions, or environment changes were performed.

## Verdict

**VERIFIED for the tested local scope.** Core diagnostics, calculations,
filters, search, deep-link navigation, custom-claim access, learner isolation,
empty states, responsive rendering, axe accessibility, keyboard navigation,
and large-dataset browser behavior were exercised. Production behavior remains
outside scope.

## Expected behaviour

- Inspect all admin-loaded courses, weeks, papers, and active question records.
- Detect normalized duplicate question text, duplicate options, missing explanations,
  missing difficulty, incomplete records, broken parent references, orphaned
  question collections, and published records without readiness markers.
- Exclude archived questions from active quality and difficulty metrics.
- Calculate issue counts, severity/category counts, difficulty counts/percentages,
  and a deterministic readiness score.
- Filter by severity/category and search by issue text, IDs, question text,
  course, week, or paper metadata.
- Open the owning content editor, preserve admin-only access, and never write
  content during inspection.

## Detection scenarios

| Scenario | Expected | Result |
|---|---|---|
| Exact duplicate question text | Two duplicate findings | PASS |
| Case/whitespace-only duplicate | Two normalized duplicate findings | PASS |
| Semantically different text | No duplicate finding | PASS |
| Duplicate options, including reordered values | Duplicate-option finding | PASS |
| Missing explanation/difficulty | Warning findings | PASS |
| Missing text/options/empty option/invalid answer index | Completeness finding | PASS |
| Broken course/week/paper ownership | Reference finding | PASS |
| Orphaned question owner collection | Reference finding | PASS |
| Published question without readiness marker | Critical publication finding | PASS |
| Archived question | Excluded from active metrics/findings | PASS |
| Empty dataset | Clear empty-state path in component logic | PASS |

Evidence: `npm run test:content-quality` — **6/6 passed**, including a
1,000-question pure diagnostic run. The run measured `buildQualityReport`
without applying an arbitrary pass/fail performance threshold.

## Accessibility verification

| Check | Result | Evidence |
|---|---|---|
| Axe WCAG 2A/2AA scan | VERIFIED — 0 violations across 23 rules | `npm run test:accessibility` |
| Keyboard-only tab walk | VERIFIED — search control reachable; focus outline observed | `npm run test:accessibility` |
| Accessible names/labels | VERIFIED by axe and labelled Playwright controls | `npm run test:accessibility` |
| Heading/landmark structure | VERIFIED by axe | `npm run test:accessibility` |
| Filter result interaction | VERIFIED — search and clear-filter controls operate by keyboard-capable controls | `npm run test:accessibility` |
| 390px responsive/zoom proxy | VERIFIED — document width remained 390px with no overflow | `npm run test:accessibility` |
| Console/page errors | VERIFIED — zero captured errors | `npm run test:accessibility` |

No violations were suppressed. The scan used `wcag2a` and `wcag2aa`; manual
screen-reader output and browser zoom beyond responsive viewport checks were
not automated.

## Large-dataset browser performance

The isolated Playwright benchmark seeds complete records in Firestore emulator
batches and exercises the real admin subscription, dashboard rendering,
question-ID search, warning filtering, and scrolling. It measures elapsed
browser interaction times without imposing arbitrary thresholds.

| Dataset | Initial dashboard update | Search interaction | Filter interaction | Scroll script |
|---:|---:|---:|---:|---:|
| 100 | 51.67 ms | 10.39 ms | 3.84 ms | 0.20 ms |
| 500 | 115.66 ms | 98.52 ms | 4.56 ms | 0.20 ms |
| 1,000 | 356.58 ms | 222.49 ms | 4.80 ms | 0.20 ms |

The 1,000-record dataset was complete: all records were loaded into the
client-side report, all difficulty/quality findings remained visible, and the
run observed 11 Firestore emulator requests. Chromium reported 86.4 MB `usedJSHeapSize` and 139 MB `totalJSHeapSize` at the end of the run. The
dashboard currently performs full-dataset client-side calculations; it does not
paginate quality findings.

Evidence: `npm run test:performance`.

## UI and journey scenarios

| Scenario | Result | Evidence |
|---|---|---|
| Admin claim signs in and opens dashboard | PASS | `npm run test:e2e:admin` |
| Seeded duplicate and incomplete records render | PASS | `npm run test:e2e:admin` |
| Search by question ID | PASS | Updated admin E2E |
| Clear all filters | PASS | Updated admin E2E |
| Open content deep link | PASS | Updated admin E2E; URL enters `section=weeks` |
| Signed-out dashboard access | PASS | Admin E2E redirects to admin sign-in |
| Desktop render at 1440×900 | PASS | `/tmp/content-quality-desktop.png`; no console errors |
| Mobile render at 390×844 | PASS after responsive fix | `/tmp/content-quality-mobile.png`; no console errors |
| Browser console/page errors | PASS | Captured during rendered audit |

The dashboard reports active question inventory, severity counts, category
counts, difficulty distribution, percentages, findings, and readiness score.
The score is `max(0, 100 - severity penalties)` with critical=15,
warning=5, and info=1 per finding.

## Security and integrity

- Firestore rules tests verify only trusted custom-claim admins can read/write
  admin content; ordinary and unauthenticated users cannot access drafts.
- Existing learner E2E verifies the learner path does not expose admin dashboard
  content.
- Dashboard computation is pure and does not mutate Firestore.
- No production data was touched.

Evidence: `npm run test:rules` — **11/11 passed**.

## Defects found and fixed

1. **Published readiness was hidden by admin parsing.** Published records with
   `contentReady: false` were converted to `draft` before diagnostics ran.
   The parser now preserves the stored status/readiness state.
2. **Empty answer options were missed.** Completeness now rejects blank option
   strings and validates the answer index against the actual option array.
3. **Archived questions polluted active metrics.** Archived questions are now
   excluded from findings and difficulty counts.
4. **Search omitted IDs and parent metadata.** Search now includes question,
   owner, course, and question text metadata.
5. **Mobile finding rows cramped details.** Finding details become a full-width
   row on narrow screens so action controls do not reduce text to a narrow
   column.

## Remaining limitations

- Manual screen-reader output and browser zoom beyond responsive viewport
  checks were not automated.
- Search/filter state is component-local rather than URL-addressable.
- The dashboard deep link opens the owning week/paper editor, not a specific
  question row.
