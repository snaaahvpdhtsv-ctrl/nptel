# Open NPTEL 24/7 — mobile learner redesign

## Goal and approved direction

Redesign the existing learner experience on viewports **below 768 CSS pixels** to follow the six supplied mobile screenshots, without losing existing functionality or changing the desktop/tablet experience.

The user has selected:

- **All learner mobile screens**, not only the six pictured screens.
- **Matching dark and light themes**.
- **A compact course Home**, with detailed progress, account controls, and other extras in **More**.

This is a presentation and navigation project. Keep the existing React/Vite application, course URLs, browser-only preview authentication, and local progress implementation. Do not connect a backend or implement real OAuth, cloud sync, new persistence, or new course content.

## Existing implementation to preserve

- `src/App.tsx` defines the Courses entry page, course-scoped learner routes, legacy redirects, sign-in, and the guarded admin dashboard.
- `CourseLayout` resolves published courses, supplies `useCourse()`, remembers the last course, and keys learner content by course.
- `Navbar` currently supplies the desktop links, smaller-screen hamburger, account controls, theme toggle, accessibility panel, and course-switch strip.
- `useCourseProgress()` supplies the existing question totals, completion, mastery, accuracy, mistakes, and weakest-week ranking. `useProgress()` supplies bookmarks, attempts, and the cross-course streak.
- Authentication and progress providers already handle account/guest separation, guest-to-account merging, and completed-attempt recording. Mastery is based on the latest answer.
- The local visual system consists of `common.tsx`, `WeekCard`, `QuestionCard`, `SelectSetup`, the `.btn-*`, `.card`, and `.input` classes, Tailwind tokens, Lucide icons, and already-wired Inter/Sora fonts. There is no external component kit to introduce or replace.
- Feedback and content administration remain the existing browser preview. Some weeks and PYQ papers intentionally lack full question text; preserve their honest preview notices.

## Scope boundaries

### Included

- Courses entry and last-course continuation.
- Course Home and More.
- Answer Key lists and week study pages.
- Practice selection, quiz options, active quiz, results, and answer review.
- All PYQ landing, answer, selection, and preview-notice screens.
- Saved Questions, populated and empty.
- Requests & Feedback and visible admin replies.
- History, mistake review, and analytics.
- Learner sign-in, sign-up, signed-in account view, and learner-facing not-found/empty states.

### Unchanged

- All layouts and navigation at **768px and above**, including the existing 768–1023px hamburger experience.
- Admin dashboard screens and the **admin sign-in view**, including their current smaller-screen behavior.
- Provider contracts, storage keys and formats, scoring, question order, option shuffling, timers, sound preferences, completion recording, account merging, and course visibility rules.
- Existing URLs, query parameters, legacy redirects, and admin guards.
- Existing brand text and assets; this is not a branding change.
- Existing quiz departure behavior: tabs remain available, just as navigation is today. This project does not add resumable unfinished quizzes, automatic submission, or new leave-confirmation behavior.

## Reference interpretation

The six latest screenshots are the visual references, not the older attachments. Their application content is the target; do not reproduce phone status bars, gesture bars, browser chrome, or screenshot dimensions.

| Reference attachment | Screen |
| --- | --- |
| `81712d1c-b813-4597-bf9f-1a6fdf7f83e4` | Compact Study dashboard / course Home |
| `7a925e0c-f80e-4859-b3c1-64a7da9600bc` | Answer Key week list |
| `b8b9ac15-171d-4462-b42d-8c477c4764af` | Practice selection and quiz options |
| `454b1506-922a-4e82-95aa-3233dc38a850` | Saved Questions empty state |
| `41924bf3-5ddc-4aca-b7d7-9d3902cff892` | Feedback form and replies |
| `770203f9-f999-4940-806a-88f0b381a628` | More and settings |

Carry over the compact brand/theme header, flat near-black dark surfaces, quiet outlines, readable neutral text, restrained purple accents, simple rows, and persistent five-tab navigation.

**Explicit exception:** do not reproduce the reference's Admin shortcut in More. Learners and guests access admin sign-in only through the existing **Admin button on the sign-in page**.

## Mobile visual system

- Reuse the existing fonts and icons; use Inter for compact mobile text/headings and keep existing desktop font treatments intact.
- Default mobile page gutters: spacing-4; section gaps: spacing-6; list gaps: spacing-2.
- Use a compact header approximately spacing-14 tall, with appropriate safe-area padding.
- Use text-2xl page titles, text-base section titles, text-sm row titles/body copy, and text-xs secondary metadata/tab labels. Allow titles to wrap rather than forcing fixed-height truncation.
- Replace mobile rainbow gradients, aurora decoration, oversized icon tiles, progress rings on week rows, strong shadows, and hover lifts with outlined surfaces and modest radii. Keep a small brand tile and restrained purple primary actions.
- Define a small, reusable set of **mobile-only semantic tokens** for page background, card/input surface, selected surface, border, primary text, secondary text, and accent. Match the dark references; derive the light theme using light neutral backgrounds, white surfaces, gray borders, dark text, and the existing purple palette.
- Reserve green/red/amber for meaningful answer, reply, difficulty, and performance states; do not flatten semantic feedback into purple.
- Style both themes using the existing `dark` state and saved theme preference. The More appearance description must show the actual current theme.
- All new mobile component styles live in the appropriate Tailwind layers and are scoped to learner surfaces below 768px. Do not rewrite unrelated global/unlayered CSS.
- Reuse local components and tokens, adding only small local variants/primitives where needed. Do not install a UI kit, fonts, imagery, or a second styling system.

## Shared shell and navigation

### Surface scoping

Add a small router-aware shell inside the existing providers to identify:

1. Learner/global surfaces.
2. A valid published course route, where course tabs are available.
3. Admin surfaces: `/admin` and its descendants, plus `/signin?view=admin`.

Expose route-derived learner/course-tab markers on the document root with cleanup, following the existing theme/accessibility class pattern. These markers let mobile backgrounds, aurora visibility, content offsets, and the toast viewport share one scope without changing provider data contracts. Do not store this derived navigation state in localStorage.

Keep CSS responsive; do not render different app trees using a one-time `window.innerWidth` check.

### Header

- On mobile learner screens, show the existing brand linked to Courses and an accessible theme toggle.
- Remove the hamburger and secondary course-switch strip from **mobile course screens**; the five tabs and More replace them.
- Put course identity in the compact Home subtitle and the Current course section of More.
- On global Courses, provide a small Sign in/account action because there is no course More tab yet.
- Keep the existing navbar and course strip unchanged at 768px and above. Keep the current admin navbar behavior at every width.

### Bottom tabs

Create `src/components/MobileBottomNav.tsx`, rendered once inside the valid `CourseLayout`:

| Label | Destination relative to course | Active routes |
| --- | --- | --- |
| Home | Course root | Exact course root only |
| Study | `/study` | `/study` and its descendants |
| Practice | `/practice` | `/practice` and its descendants, including mistake quiz runs |
| Saved | `/saved` | `/saved` |
| More | `/more` | `/more`, all `/pyq` routes, `/feedback`, `/history`, `/review`, `/analytics`, and course-scoped not-found screens |

- Use five equal-width links with Lucide icons and visible labels.
- Use muted inactive icons/text and a purple active icon/label with a small top indicator, as in the references.
- Derive selection from the URL, not independent tab state. Use `aria-current="page"` on the active link and an accessible navigation label.
- Use `useCourse().path()` for destinations; never silently switch to the default course.
- Keep tabs fixed to the viewport bottom on every valid course learner screen, including quiz/results screens.
- Do not show course tabs on Courses, sign-in/sign-up, invalid/hidden course pages, or admin screens. Do not invent a course to populate them.
- Use a shared spacing-16 tab-height token plus `env(safe-area-inset-bottom, 0px)`. Reserve the corresponding content space so the final row/action is fully scrollable above the tabs.
- Give header, tabs, toasts, and dialogs deliberate stacking: dialogs above navigation; toasts above the tab boundary, not over tab labels.
- Add only a positioning hook to the existing toast viewport if necessary; keep toast state, timing, messages, and APIs unchanged.

## Screen specifications

### 1. Courses entry

- Replace the mobile marketing-style hero with a compact “Choose your course” heading and short supporting text.
- Keep the last-course Continue action, course search, published course count, descriptions, sample indicators, content counts, and coming-soon states.
- Present courses as outlined, single-column cards without large gradient banners.
- Preserve published-only filtering and the current last-course URL behavior.

### 2. Compact course Home

Mobile content order:

1. **Study dashboard** heading.
2. Current course title in muted text, followed by the existing total question count and completed-week count.
3. Two-column outlined shortcut grid: **Study**, **Practice**, **PYQs**, **Saved**, **More**. More occupies the last left-hand cell, matching the reference.
4. One compact **Up next · fix mistakes** row, only when existing progress supplies a weakest week with mistakes. Link to the existing week-filtered Review Mistakes URL.
5. **Course weeks**, in published order, as simple full-width outlined rows.

Do not show the large hero, three stat cards, sync prompt, separate progress-card grid, or weakest-week grid on mobile Home. Preserve those on desktop.

Mobile week rows contain title, “Week N · X questions,” and a right chevron. Remove the circular progress visualization from this compact list; detailed live mastery remains available in Analytics through More. Do not hardcode reference counts or invent completed weeks.

Use the existing `useCourseProgress()` snapshot rather than creating a second progress calculation.

### 3. Answer Key and study detail

- Mobile list title: **Answer Key**, with the existing study-mode subtitle.
- Use the same compact outlined week-row treatment as Home; keep lists single-column throughout the entire mobile range, including 640–767px.
- Keep search functionality through a compact header Search action that expands the existing input. Opening focuses the input; closing clears the query and restores the complete list.
- Preserve no-content, no-results, and clear-search states.
- On week detail, retain back navigation, available-question notices, question text/options, correct-answer states, and explanations. Restyle existing controls without changing their functionality or available data.

### 4. Practice selection

- Mobile title/subtitle: **Practice** / “Pick weeks, then start your quiz.”
- Use compact full-width selectable rows with a leading circular selection affordance, week title, and “Week N · X questions.”
- Use neutral outlined/unselected surfaces; purple border, check, and subtle tint indicate selected rows. Do not use radio semantics because selection is multi-select.
- Retain Select all, Deselect all, Clear, selected counts, and total question counts. Keep the small selection toolbar wrapping cleanly at narrow widths.
- After the rows, show **Quiz options**, then two simple outlined checkbox rows for question jumbling and option jumbling, connected to the existing state.
- Put the selected summary and full-width **Start Practice** button in normal document flow below the options, not in a mobile sticky card competing with the bottom tabs.
- Keep Start disabled with zero selections and preserve existing query parameters.
- Show **Past attempts** below the action, linked to History; retain the existing mistake-review shortcut when applicable.
- Preserve the existing desktop selection cards, settings, and sticky start bar.

### 5. Active quiz, results, and review

- Keep the persistent tabs and compact site header.
- Condense the quiz breadcrumb/title/tool area without dropping Back, elapsed time, sound, Retry, question count, score, progress, or preview notices.
- Use outlined question/option surfaces, comfortably tappable answers, and wrapping text. Preserve original/chosen/correct option identification under shuffling.
- Keep instant feedback, answer locking, explanations, bookmarks, Previous/Next, results, review, and retry behavior.
- Let action rows wrap or stack above the reserved tab space; do not add a second fixed footer.
- Use the existing runner and completion guard. Styling and navigation must not remount the runner or record a finished attempt twice.

### 6. PYQs

- Keep PYQs accessible from the Home shortcut and a prominent More row; PYQs is **not** a sixth tab.
- Use two understated outlined entry cards for answers and practice.
- Apply compact row/search patterns to paper lists and the same multi-select/options/start patterns to paper selection.
- Keep year/session metadata, counts, course scoping, current query behavior, and missing-content notices.
- Keep More active throughout the PYQ route tree.

### 7. Saved Questions

- Empty state follows the reference: BookX icon, clear “No saved questions” heading, short explanation, generous quiet space, and Saved tab active.
- Keep the existing Browse answer key recovery action as a discreet secondary control.
- Populated state keeps search, difficulty/week filters, result counts, clear filters, expandable week groups, bookmark removal, correct answers, and explanations.
- Stack or wrap filters and long week labels; do not introduce sideways page scrolling.

### 8. Requests & Feedback

- Follow the reference hierarchy: compact icon/title/subtitle, one outlined form, three type selectors, message, optional email, and a full-width Submit action.
- Retain form requirements, validation, pending/disabled state, submission toast, and course-specific request handling.
- Keep visible replies below the form, with metadata and a restrained green reply surface.
- Preserve current preview behavior; do not imply that submissions are sent to a new server or survive beyond the existing implementation.

### 9. More — mobile destination for extras

Use a compact heading and grouped outlined rows/cards in this order:

1. **Account**
   - Guest: explain that progress is local to this browser; offer Sign in/Create account with the current return destination.
   - Signed in: name/email and existing Sign out action.
   - Reuse the existing optional sign-in prompt/dismissal behavior where applicable. Copy must not claim real cloud backup or cross-device sync.
2. **Learning**
   - PYQs, Saved Questions, Quiz History, Review Mistakes, and Analytics.
   - Populate concise counts/details from the current providers where available.
3. **Weakest weeks**
   - Move the existing up-to-six ranked weak-week entries here, with mistake counts and existing filtered-review destinations.
   - Omit this section when there are no mistakes.
4. **Requests & Feedback** entry.
5. **Appearance** row connected to the same theme toggle as the header.
6. **Accessibility** card with Larger text, High contrast, Reduce motion, and Reading spacing in a wrapping two-column layout.
7. **Day streak**, using the existing cross-course streak and a useful zero-state description.
8. **Current course**, with course title and **All courses / Change course** link.

No Admin shortcut appears in this learner menu. An admin who needs the dashboard can continue to use the existing sign-in/admin flow; do not alter admin authorization.

Keep the current desktop More layout and desktop Home extras unchanged.

### 10. History, mistakes, and analytics

- Apply compact headers, neutral outlined cards, restrained purple controls, and mobile spacing.
- History retains date grouping, scores/timing, expandable recorded answers, retake actions, pagination, and its existing clear-history confirmation.
- Mistake review retains week filters, review-all actions, bookmarks, answer/explanation content, empty states, and latest-answer behavior.
- Analytics retains all current tiles, charts, per-week mastery, activity, and weakest-week data. Fit charts/labels within the viewport and keep empty/no-data states.
- Do not change formulas or remove less-prominent features to match the pictured Home.

### 11. Learner authentication and fallback screens

- Give learner sign-in/sign-up and signed-in views the same neutral mobile surfaces, compact spacing, full-width actions, and readable fields.
- Preserve required fields, error associations/focus, pending states, password controls, duplicate-account flow, simulated Google sign-in, return destinations, optional guest usage, and guest-progress merging.
- Keep the existing Admin button on the learner sign-in page.
- Exclude the admin sign-in view from the new mobile skin and preserve its functionality.
- Restyle learner empty/not-found/coming-soon notices consistently while keeping their recovery links and honest explanations.

## Implementation sequence and affected files

1. **Introduce scoped mobile foundations**
   - `src/App.tsx`: router-aware learner/admin/tab-presence markers and mobile decoration scoping; keep the route tree/providers intact.
   - `src/index.css`: semantic mobile tokens, scoped component variants, safe-area/tab offsets, and touch-friendly states.
   - `src/components/Navbar.tsx`: mobile learner header branch; preserve current desktop/admin markup and behavior.
   - `src/components/CourseLayout.tsx` and new `MobileBottomNav.tsx`: one course-bound tab bar and content clearance.
   - `src/lib/app-state.tsx`: toast viewport class/positioning hook only, if required.
2. **Implement the six reference surfaces**
   - `HomePage.tsx`, `StudyPage.tsx`, `PracticePage.tsx`, `SavedPage.tsx`, `FeedbackPage.tsx`, and `MorePage` in `PreviewPages.tsx`.
   - Add small mobile variants to `common.tsx`, `WeekCard.tsx`, and `SelectSetup.tsx`.
   - Keep existing desktop rendering intact; use dedicated mobile Home/More compositions where their information hierarchy differs substantially.
3. **Apply the same system to remaining learner pages**
   - `CoursesPage.tsx`, `PracticeQuizPage.tsx`, `PyqPages.tsx`, `PreviewPages.tsx`, `HistoryPage.tsx`, `ReviewPage.tsx`, `AnalyticsPage.tsx`, learner portions of `SignInPage.tsx`, and `QuestionCard.tsx`.
   - Reuse variants and live provider data rather than duplicating business logic.
4. **Verify and refine**
   - Compare the six reference states, exercise the regression matrix below, and correct layout/interaction issues within this scope.

No planned changes to `auth-state`, progress storage/selectors, the question bank, admin page implementations, package dependencies, or `.figma/make` setup/deployment scripts.

## Edge cases and accessibility

- Support narrow widths down to 320px, long course/week titles, long answer options, larger text, and reading spacing without clipped controls or horizontal page overflow.
- Keep actionable touch targets at least 44px, visible keyboard focus, meaningful icon labels, and non-color-only selected/answer states.
- Respect existing reduced-motion/high-contrast controls; avoid introducing animated decorative mobile effects.
- Ensure theme switching does not reset query, selection, bookmarks, or an in-progress quiz.
- Do not remount pages just to change responsive presentation. Course changes should retain the existing intentional course-key reset.
- Missing/hidden courses must not render course tabs or expose hidden content.
- No weeks, zero-question weeks, no papers, no attempts, no mistakes, and no saved questions retain clear empty states and recovery actions.
- Keep account progress isolated; signing out returns to guest data without overwriting the account.
- Account/appearance accessibility descriptions must reflect current state, not screenshot placeholder values.
- Mobile keyboards must not make the last input or Submit action unreachable. Content must scroll clear of both keyboard and fixed tabs.
- Dialog overlays remain above tabs and retain their existing focus/confirmation behavior.

## Verification and acceptance

### Before editing

- Recheck working-tree status and preserve unrelated work.
- Record representative desktop/tablet and admin appearance where preview tooling permits, so mobile-only scoping can be compared.

### Static checks after implementation

- Format only changed source files using the repository's `pnpm run format` entry point.
- Run `pnpm exec tsc --noEmit` for the cross-component TypeScript changes.
- Run the prescribed production build: `pnpm run build`.
- Review the final diff for unintended provider, storage, route, dependency, desktop, or admin changes.
- The repository has no test script or installed browser automation package. Do not invent a passing test result or add a testing dependency just for this redesign.

### Preview checks

Use the existing supervised development server; do not start another one.

1. **Visual/responsive:** inspect at 320, 360, 390, 430, 640, and 767px in both themes; compare the six pictured states. Verify the mobile treatment disappears at 768px and that 1024/1440px desktop layouts remain unchanged.
2. **Navigation:** exercise all five tabs and nested routes, direct URLs, browser Back, PYQs via Home/More, course switching, legacy redirects, invalid courses, and learner/admin boundaries.
3. **Practice:** select/clear/all weeks, toggle both jumble options, start a quiz, answer correctly/incorrectly, bookmark, advance, review, retry, and complete. Confirm one history record per completion and unchanged elapsed-time/sound behavior.
4. **Progress:** check History/Review/Analytics and Home counts after completion; correcting a previous mistake must update latest-answer mastery through the existing selector.
5. **Saved:** check empty and populated states, filters, expandable groups, explanations, and bookmark removal.
6. **Authentication:** check guest usage, learner sign-up/sign-in, simulated Google, return-to-course behavior, guest merge, account separation, sign-out, and access to admin only through the existing sign-in flow.
7. **Feedback/PYQ:** check submission validation and pending states, replies, paper search/selection, and unavailable-content notices.
8. **Clearance/accessibility:** inspect final list rows, quiz actions, feedback Submit, toasts, dialogs, safe-area padding, focus navigation, all four reading controls, and long-text states.
9. **Admin regression:** inspect admin sign-in and dashboard at mobile and desktop sizes; no learner tabs or new mobile skin should appear there.

### Done means

- All learner screens below 768px share the reference-led mobile language in dark and light modes.
- The five tabs are exactly **Home / Study / Practice / Saved / More** and remain course-correct.
- Mobile Home is compact; moved features remain reachable and functional in More.
- No existing learner capability, progress data, authentication behavior, desktop/tablet layout, or admin workflow is lost.
- Verification actually performed is reported accurately, along with any unavailable checks or out-of-scope failures.

## Planning status

Repository and six reference screenshots have been inspected. The three scope/theme/Home choices are resolved. This document is ready for review; **no application source changes or build/runtime verification have been performed in this planning step**.
