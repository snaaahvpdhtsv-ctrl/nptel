# Plan: Courses page as the new entry point, with per-course learner pages

## Goal
Add a **Courses** page at `/` that lists the available courses. Picking a course opens that course's dashboard (today's Home page). Each course has its own Home, Answer Key, Practice Zone, PYQ's, Saved Questions and Requests & Feedback. Admin gets a course switcher and course management.

## Decisions (from discussion)
- **Five courses, c1–c5, all sample courses.** No course names or question data are invented:
  - **c1 = "Mental Health and Wellbeing"** (id `mental-health-wellbeing`). It keeps all existing content: 12 weeks, 13 PYQ papers, saved questions, admin Week 6 / PYQ 1 question lists, progress and weakest weeks.
  - **c2–c5 = "Sample Course 2" … "Sample Course 5"** (ids `sample-course-2` … `sample-course-5`). They have a "Sample" badge and start with no weeks, papers or questions; the UI shows "Content coming soon". Admins can rename them and add content in the session.
  - *Assumption to confirm in review:* c1 holds the Mental Health content and the course list has 5 cards, not 6.
- **The URL carries the course:** `/courses/:courseId/...`. Old paths redirect to c1.
- **Everything learner-facing is per course:** Answer Key, Practice Zone, PYQ's, Saved Questions and Requests & Feedback.
- **Admin** gets a course switcher plus course add/edit/hide/delete. It stays a local, session-only demo, as now.

## Routes (`src/App.tsx`)
| Path | Element |
|---|---|
| `/` | `CoursesPage` (new) |
| `/courses/:courseId` | `CourseLayout` (new, renders `<Outlet/>`), index → `HomePage` |
| `…/study`, `…/study/:weekId` | `StudyPage`, `WeekStudyPage` |
| `…/practice`, `…/practice/run`, `…/practice/:weekId` | `PracticePage`, `PracticeRunPage`, `PracticeWeekRedirect` |
| `…/pyq`, `…/pyq/answers`, `…/pyq/answers/:paperId`, `…/pyq/practice`, `…/pyq/practice/run` | existing PYQ pages |
| `…/saved`, `…/feedback`, `…/history`, `…/review`, `…/analytics`, `…/more` | existing pages |
| `/admin`, `/admin/dashboard` | unchanged paths; dashboard reads `?course=` |
| Legacy `/study*`, `/practice*`, `/pyq*`, `/saved`, `/feedback`, `/history`, `/review`, `/analytics`, `/more` | `LegacyRedirect` → `/courses/mental-health-wellbeing<same path><same search>` with `replace` |
| `*` | `NotFoundPage` |

`CourseLayout` looks the course up from `useApp().courses`:
- Unknown course, or a hidden (draft/archived) course: show a "Course not found" card with a "Back to courses" button.
- Otherwise:
  - Provide `CourseContext`.
  - Store the id in `localStorage` key `nptel-last-course`.
  - Set `document.title = "<course title> · NPTEL Practice Platform"` and restore the default on unmount.

## Data model (`src/lib/data.ts`)
Use `interface` (not one-line `type X = { … }`) for all new object types. oxfmt 0.2.0 strips separators from single-line type literals and leaves invalid TS.
- New `Course` interface:
  - `id` (URL slug, immutable after creation)
  - `title`
  - `description?`
  - `status: Status`
  - `sample: boolean`
- `initialCourses: Course[]` holds the 5 courses above, all `published`. Only c1 has a description: "Practice weekly assignments and previous-year questions." c2–c5 have no description.
- `DEFAULT_COURSE_ID = "mental-health-wellbeing"`.
- Add `courseId: string` to `Week` and `Paper`, and set it to c1 on all existing records. The existing optional `Paper.course` text field stays as the live-site "Course (optional)" label.
- Add `courseId?: string` to `RequestItem`. The 4 demo requests get c1.
- `savedByWeek`, `progress`, `weakEntries` and `adminWeekQuestions`/`adminPaperQuestions` stay keyed by the existing week/paper ids, which all belong to c1. `STREAK` stays global because it is per user.

## State
- `src/lib/app-context.ts`: add `courses: Course[]` and `setCourses` to `AppState`.
- `src/lib/app-state.tsx`: `useState(initialCourses)`, included in the memo value and deps. This file keeps exporting only `AppProvider`, to stay a Fast Refresh boundary.
- New `src/lib/course-context.ts` (no components, so it can hold the context):
  - `CourseContext`
  - `useCourse()`, which returns `course`, `path(sub?: string)` → `/courses/${id}${sub ?? ""}`, `weeks` (this course's weeks, any status), `publishedWeeks` and `papers` / `publishedPapers`
  - It throws outside `CourseLayout`.
- New `src/components/CourseLayout.tsx` (component only): the provider described above.

## Courses page (`src/pages/CoursesPage.tsx`)
Same visual language as Home: aurora, centred hero, gradient cards.
- **Hero:**
  - Pill "Your weekly NPTEL companion"
  - Title "Choose your course" (gradient text, Sora)
  - Subtitle "Pick a course to open its answer key, practice zone, PYQ's and saved questions."
- **"Continue where you left off" card:** shown only when `nptel-last-course` points to a published course. It shows the course title and a "Continue" button.
- **Search** `Search courses...` (shared `SearchInput`) filtering title/description.
- **Grid** (`sm:2 / lg:3` columns), one card per published course, using a gradient from `paperGradients[index % n]`:
  - Title and description if present
  - Stats: "N weeks · N questions · N PYQ papers", computed from published weeks/papers for that course
  - "Sample" badge when `sample`
  - "Content coming soon" when the course has no published weeks and no papers
  - The whole card is a `Link` to `/courses/:id`, with an "Open" hover hint as on `FeatureCard`
- **Empty states:** "No courses match your search" with a Clear button, and "No courses are available yet" when none are published.

## Navbar (`src/components/Navbar.tsx`)
- Get the course with `useMatch("/courses/:courseId/*")` (Navbar sits outside the nested route) and look it up in `useApp().courses`.
- **Inside a course:**
  - Links Home (`/courses/:id`, exact-match active), Answer Key, Practice Zone, PYQ's, Saved Questions and Requests & Feedback, all prefixed with the course path
  - A course chip (truncated title, `BookOpen` icon) linking to `/` with aria-label "Change course"
  - The mobile menu shows the same links plus "All courses"
- **Outside a course** (`/`, admin, not found): a single "Courses" link (`/`). The streak badge, theme/accessibility controls and Admin button are unchanged.
- The brand link goes to `/`.

## Learner pages: scope to the course
Every hard-coded absolute link changes to `path("/…")` from `useCourse()`:
- **`HomePage`:**
  - Uses `publishedWeeks`.
  - Adds a `BackLink` "All courses" above the hero and shows the course title (`text-lg font-semibold`) between the hero title and the description.
  - Feature-card `to`, CTA links, "View all", WeekCard `to`, weakest weeks and Up next become course paths.
  - Weakest Weeks and Up next only list this course's weeks; the Weakest Weeks section is hidden when empty.
  - When there are no weeks, Course Weeks shows an empty card: "No weeks published for this course yet."
- **`StudyPage`:** `publishedWeeks`. BackLink → course Home. A separate empty state when the course has no weeks ("No weeks published for this course yet").
- **`PracticePage`:**
  - Uses this course's published weeks with questions.
  - `navigate(path("/practice/run?weeks=…"))`, and History → `path("/history")`.
  - With no weeks, hide the selection controls and show the empty state; the Start button stays disabled.
- **`PyqPages`:** `usePublishedPapers` scoped to the course; links and `navigate` use course paths; empty state "No PYQ papers for this course yet".
- **`SavedPage`:** only groups whose `weekId` is in this course's weeks; Browse link → `path("/study")`. Bookmark state stays local, as now.
- **`FeedbackPage`:** new requests get `courseId: course.id`; "Admin replies" only lists this course's requests.
- **`PreviewPages`:**
  - All BackLinks/links use course paths.
  - `WeekStudyPage` and `PyqPaperPage` reject ids from another course (show NotFound).
  - `PracticeWeekRedirect` → `path("/practice/run?weeks=…")`.
  - The `MorePage` links are prefixed, with an extra "All courses" link.
  - `NotFoundPage` keeps working outside courses.

## Admin
- **Course switcher** in the dashboard header: a `select` labelled "Course" listing all courses, with "(hidden)" or "(sample)" suffixes.
  - It is bound to `?course=` (`useSearchParams`, `replace`), defaulting to the first course.
  - An unknown value falls back to the first course.
  - Switching clears the selected week and paper.
- **Scoped to the selected course:**
  - Total Weeks / Total Questions
  - Next best actions (draft weeks) and the health check
  - Analytics "Inactive weeks" and "questions tracked"
  - Content review queues (questions from this course's week/paper lists)
  - `WeeksPanel`: list, add (sets `courseId`), week-number uniqueness per course, export/restore (restored weeks get the selected `courseId`; matching is by weekNumber within the course), recount
  - The Week question list
  - `PapersPanel`: list, add (sets `courseId`), duplicate check within the course, reorder within the course's subset (swap positions in the global array), recount
  - Pass `courseId` as a prop to these panels.
- **Requests panel:** a new "Filter course" select (All courses + each course); each card shows a course badge, or "No course" for legacy/orphaned requests. Pending counts stay global in the panel header.
- **Announcement** stays global.
- **Audit entries** have the course title prefixed to `resource`.
- **New "Courses" panel** (`src/pages/admin/CoursesPanel.tsx`), placed before the Announcement panel:
  - **Rows:** title, `StatusBadge`, "Sample" badge, "N weeks · N papers".
  - **Hide/show** toggles published/draft. Hidden courses vanish from the Courses page, and their learner URLs show "Course not found".
  - **Edit** lets you change title, description (optional), status and the sample flag. The id is never edited.
  - **Add Course:**
    - Title is required ("Please enter a course title").
    - The id is slugified from the title (lowercase, `[a-z0-9-]`), with `-2`, `-3`… added if taken.
    - New courses default to `draft` and `sample: false`.
    - Duplicate titles (case-insensitive) are rejected: "A course with this title already exists".
  - **Delete:** confirm "Delete “<title>”?" with body "This will permanently delete this course and its N weeks, N PYQ papers and their questions in this preview session. This cannot be undone." and button "Delete course".
    - Removes its weeks, papers and their `adminQuestions` lists. Requests keep their `courseId` and show "No course".
    - If it was the selected admin course, fall back to the first remaining course.
    - Deleting the last course is allowed. The dashboard then shows "No courses yet. Click "Add Course" to begin." and the content panels are hidden.
  - All actions show toasts and write audit entries ("Course added", "Course updated", "Course published", "Course hidden", "Course deleted").

## Edge cases
- Invalid `:courseId`, or a hidden course reached by URL → "Course not found" with "Back to courses".
- `nptel-last-course` pointing at a deleted/hidden course → no Continue card.
- Sample courses: every page shows an honest empty state, with no fake counts or questions.
- Legacy deep links (e.g. `/practice/run?weeks=week-1`) keep their query when redirected.
- A week/paper id from another course in the URL → NotFound.

## Files
- **New:** `src/lib/course-context.ts`, `src/components/CourseLayout.tsx`, `src/pages/CoursesPage.tsx`, `src/pages/admin/CoursesPanel.tsx`
- **Changed:** `src/App.tsx`, `src/lib/data.ts`, `src/lib/app-context.ts`, `src/lib/app-state.tsx`, `src/components/Navbar.tsx`, `src/pages/HomePage.tsx`, `StudyPage.tsx`, `PracticePage.tsx`, `PyqPages.tsx`, `SavedPage.tsx`, `FeedbackPage.tsx`, `PreviewPages.tsx`, `src/pages/admin/AdminPage.tsx`, `ContentPanels.tsx`, `RequestsPanel.tsx`
- No new dependencies. No backend. Everything stays local and session-only.

## Verification
1. `pnpm exec tsc --noEmit -p .`, then `pnpm format`, then `tsc` again (the formatter has broken type syntax before), then `pnpm build`. All must exit 0.
2. Check by reading the code and grepping, since there are no tests:
   - No remaining absolute learner links (`to="/study`, `"/practice`, `"/pyq`, `"/saved`, `"/feedback`, `"/history`) outside `LegacyRedirect`/Navbar's outside-course mode
   - Every `useEffect` has a block body
3. Manual preview walkthrough:
   - `/` lists 5 cards; c1 shows real counts and c2–c5 show Sample / Content coming soon
   - Open c1: Home matches the earlier screens, and the navbar links stay inside `/courses/mental-health-wellbeing`
   - Open Sample Course 2: empty states on all six pages
   - Submit feedback in c2: it doesn't appear in c1, and Admin can filter it by course
   - Admin: switch course, add a week to Sample Course 2, publish it; it appears on c2's Answer Key and the Courses card counts update
   - Hide a course: it disappears from `/` and its URL shows Course not found
   - The legacy `/practice` redirects to c1
   - Dark/light theme and mobile menu
