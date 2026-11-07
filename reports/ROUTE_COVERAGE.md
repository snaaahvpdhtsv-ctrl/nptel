# Route Coverage

Route discovery was taken from `src/App.tsx`. Direct navigation was tested with
Playwright against the local Vite server at mobile width; real-course routes
were additionally tested with the available Firestore-backed course.

| Route | Tested | Result |
|---|---:|---|
| `/` | Yes | PASS |
| `/courses` | Yes | PASS — redirects to `/` |
| `/courses/:courseId` | Yes | PASS with `mental-health`; missing ID shows not-found |
| `/courses/:courseId/study` | Yes | PASS |
| `/courses/:courseId/study/:weekId` | Yes | PASS with real week |
| `/courses/:courseId/practice` | Yes | PASS |
| `/courses/:courseId/practice/run` | Yes | PASS; quiz completed |
| `/courses/:courseId/practice/:weekId` | Yes | Redirect path source verified |
| `/courses/:courseId/pyq` | Yes | PASS; empty paper state |
| `/courses/:courseId/pyq/answers` | Yes | PASS |
| `/courses/:courseId/pyq/answers/:paperId` | Yes | Missing paper not-found behavior tested |
| `/courses/:courseId/pyq/practice` | Yes | PASS; limitation disclosed |
| `/courses/:courseId/pyq/practice/run` | Yes | PASS; unavailable notice disclosed |
| `/courses/:courseId/saved` | Yes | PASS |
| `/courses/:courseId/feedback` | Yes | FAIL persistence — BUG-001 |
| `/courses/:courseId/history` | Yes | PASS empty and populated local history |
| `/courses/:courseId/review` | Yes | PASS empty state |
| `/courses/:courseId/analytics` | Yes | PASS empty state |
| `/courses/:courseId/more` | Yes | PASS |
| `/signin` | Yes | PASS |
| `/admin` | Yes | PASS redirect to admin sign-in |
| `/admin/dashboard` | Yes | PASS guard redirect signed out; authenticated-admin workflow blocked |
| Legacy paths in `legacyPaths` | Source only | Redirect definitions inspected; full per-path browser replay not run |
| `*` not-found routes | Yes | PASS |

## Coverage limitation

The admin dashboard requires a trusted emulator custom-claim account, but no
configured end-to-end auth harness exists in this checkout. Admin source,
Firestore rules, and content-service behavior were tested separately; the full
authenticated browser admin journey remains PARTIALLY VERIFIED.
