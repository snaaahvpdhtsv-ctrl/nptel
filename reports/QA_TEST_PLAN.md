# QA Test Plan

## Scope

This plan covers the current React/Vite learner and admin application, Firebase
Auth/Firestore integration, Functions source, local persistence, offline queue,
security rules, responsive behavior, accessibility, and release checks.

Production writes, migrations, deployments, role changes, and destructive data
operations are excluded.

## Test environments

| Environment | Use |
|---|---|
| Local Vite server | Route, browser, interaction, responsive and console checks |
| Firebase Emulator Suite | Firestore rules and content-service authorization/integrity |
| Production URL | Read-only route/content smoke checks only |

## Test IDs

| ID range | Area |
|---|---|
| ROUTE-* | Route and deep-link behavior |
| UI-* | Learner/admin interactions |
| CSV-* | Bulk upload |
| CONTENT-* | Content inventory and publication |
| AUTH-* | Authentication and authorization |
| DATA-* | Persistence and synchronization |
| SEC-* | Firestore security |
| A11Y-* | Accessibility |
| RESP-* | Responsive behavior |
| REG-* | Regression and release gate |

## Execution policy

Every result records its actual evidence. Emulator passes are not treated as
production passes. Unavailable browser/auth flows are recorded as blocked rather
than inferred.
