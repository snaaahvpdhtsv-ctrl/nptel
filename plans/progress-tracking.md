# Real progress tracking (browser storage now, backend-ready)

## Goal

Turn quiz activity into real, saved progress for each learner:

- Replace the placeholder **Quiz History**, **Review Mistakes** and **Analytics** pages with working ones.
- Replace the hardcoded **day streak**, **weeks done**, **week progress rings**, **Up next** and **Weakest Weeks** with values computed from recorded quiz attempts.
- Save **bookmarks** so they survive reloads.
- Make **Sync now** meaningful: progress made while signed out moves into the learner's account when they sign in.

Everything is stored in the browser for now. All persistence lives in one module so the planned backend can replace it without touching the pages.

## Confirmed decisions

| Topic | Decision |
| --- | --- |
| Storage | `localStorage` now; backend later. Only `src/lib/progress-storage.ts` touches storage. |
| Whose data | The signed-in user's id, or `guest` when signed out. The admin account gets its own bucket like anyone else. |
| Sign-in merge | When a **learner** signs in or signs up, guest attempts and guest-added bookmarks are merged into the account automatically. The guest copy is then deleted, and a toast says `Synced N quiz attempts to your account` (only when N > 0). The admin account never receives guest data. |
| Week progress | Only the **latest answer** to each question counts. Ring % = questions whose latest answer is correct ÷ the week's practisable questions. A latest-wrong answer is a "mistake to fix". A week is **done** when it has practisable questions and all are currently correct. |
| More page | Remove its direct **Admin** link, since admin sign-in should only be reachable through the Admin button on the sign-in page. |
| What gets recorded | Only quizzes that reach the results screen. A mid-quiz Retry, or leaving the page, records nothing. Going from results to Review and back never records a second time. |
| Streak | Shared across courses. Counts consecutive local calendar days with at least one finished quiz, and stays alive if the last quiz was today or yesterday. |
| Bookmarks seed | A new bucket starts with today's sample bookmarks (all sample question ids), so Saved Questions stays populated in the preview. |
| Dependencies | None added. Charts are plain CSS/SVG. |

## Out of scope

- Backend and cross-device sync (planned next).
- Tracking PYQ practice: PYQ runs are still placeholders because the papers' question text isn't in the preview.
- Exam mode, leaderboards, and wiring the admin "high failure rate" flag to attempt data.

## Data model (`src/lib/progress.ts`)

```ts
export type QuizKind = "practice" | "mistakes"

export interface AttemptAnswer {
  questionId: string
  weekId: string
  /** Original option index the learner chose. */
  chosenIndex: number
  correct: boolean
}

export interface QuizAttempt {
  id: string
  courseId: string
  kind: QuizKind
  weekIds: string[]
  startedAt: string // ISO 8601
  completedAt: string // ISO 8601
  durationSeconds: number
  shuffleQuestions: boolean
  shuffleOptions: boolean
  answers: AttemptAnswer[] // in the order they were shown
}

export type NewQuizAttempt = Omit<QuizAttempt, "id" | "completedAt">

export interface ProgressData {
  version: 1
  attempts: QuizAttempt[] // newest first, every course
  savedIds: string[]
}
```

Totals and scores are always derived from `answers`, never stored separately.

## New modules

### 1. `src/lib/question-bank.ts`: where question content comes from

This is the content seam that a backend will replace. It is built once from `savedByWeek`.

- `weekQuestions(weekId): Question[]`: the week's practisable questions (`[]` if none).
- `findQuestion(questionId): { question: Question; weekId: string } | undefined`
- `SAMPLE_SAVED_IDS: string[]`: every sample question id (the bookmark seed).

Existing direct `savedByWeek` reads in `SavedPage` and `WeekStudyPage` stay as they are. New code and `PracticeQuizPage` use the bank.

### 2. `src/lib/progress.ts`: types and pure functions (no React, no storage)

- `latestAnswers(attempts)`: `Map<questionId, { correct, chosenIndex, weekId, answeredAt }>`, taking each question's answer from the most recent attempt that included it.
- `buildCourseProgress(attempts, courseId, publishedWeeks)` returns `CourseProgress` (described below).
- `currentStreak(attempts, now)`, `dailyActivity(attempts, now, days = 14)`, `recentAccuracy(attempts, count = 10)`.
- `attemptScore(attempt)` returns `{ correct, total, accuracy }`.
- `attemptTitle(attempt, courseWeeks)`:
  - "Mistakes review" for the mistakes kind;
  - "Week N Practice" for one week;
  - "Mixed Practice · K weeks" for several;
  - "Practice" when the week is unknown.
- `retakeSubpath(attempt)`, using the same URL format as Practice Zone:
  - practice: `/practice/run?weeks=a,b&shuffle=1|0&shuffleOptions=1|0`;
  - mistakes: `/practice/run?mode=mistakes&questions=id1,id2`.
- `mergeProgress(account, guest)` returns `{ data, added }`:
  - attempts are combined without duplicate ids, sorted newest first, and capped at `MAX_ATTEMPTS`;
  - `savedIds = account.savedIds ∪ (guest.savedIds − SAMPLE_SAVED_IDS)`, so seed bookmarks the account removed don't come back.
- Date and time helpers:
  - `localDayKey(date)` returns `YYYY-MM-DD` in local time;
  - `dayLabel(key, now)` returns "Today", "Yesterday" or "12 Oct 2026";
  - `formatClock(seconds)` returns `mm:ss`; it replaces `PracticeQuizPage`'s local `formatTime`;
  - `formatTotalTime(seconds)` returns "1h 05m", "12m" or "45s".

`CourseProgress`:

```ts
interface WeekProgress {
  week: Week
  available: number // practisable questions in this week
  mastered: number // latest answer correct
  percent: number // 0–100; 0 when available is 0
  mistakeIds: string[] // latest answer wrong, in bank order
  answered: number // every recorded answer for this week, across attempts
  correct: number
  accuracy: number | null // null if never answered
  done: boolean // available > 0 && mastered === available
}
interface Mistake { question: Question; weekId: string; chosenIndex: number; answeredAt: string }
interface CourseProgress {
  attempts: QuizAttempt[] // this course, newest first
  weeks: WeekProgress[] // published weeks, by week number
  byWeek: Record<string, WeekProgress>
  mistakes: Mistake[] // ordered by week number, then bank order
  rankedWeakWeeks: WeekProgress[] // mistakes > 0, by mistakes desc, then accuracy asc (null last), then week number
  weeksDone: number
  accuracy: number | null // over every answer in this course
  answered: number
  totalSeconds: number
  lastAttemptAt: string | null
}
```

Questions that are not in the bank, and weeks that are not published, are left out of week stats and mistakes.

### 3. `src/lib/progress-storage.ts`: the only module that touches storage (the backend seam)

- `GUEST_OWNER = "guest"`. Each bucket is stored under the key `nptel-progress:<ownerId>` as `{ version: 1, attempts, savedIds }`.
- `MAX_ATTEMPTS = 300` per bucket; the oldest attempts are dropped first.
- `emptyProgress()` returns `{ version: 1, attempts: [], savedIds: [...SAMPLE_SAVED_IDS] }`.
- `readProgress(ownerId)`:
  - returns `null` if the key is missing, the JSON is invalid, the version isn't 1, or storage is unavailable;
  - drops malformed attempts and answers: bad types, unparseable dates, or no valid answers;
  - removes duplicate `savedIds`.
- `writeProgress(ownerId, data)` caps attempts and wraps the write in try/catch. If the quota is full or storage is unavailable, it does nothing and the app keeps working from memory.
- `removeProgress(ownerId)`.

### 4. `src/lib/progress-context.ts` and `src/lib/progress-state.tsx`

These follow the existing pattern of keeping context and provider in separate files, for hot-reload stability.

```ts
export interface ProgressState {
  isGuest: boolean
  attempts: QuizAttempt[] // newest first, every course
  savedIds: string[]
  streak: number
  toggleSaved: (questionId: string) => void
  recordAttempt: (attempt: NewQuizAttempt) => void
  clearHistory: (courseId: string) => void // this course's attempts only; bookmarks untouched
}
export const ProgressContext = createContext<ProgressState | null>(null)
export function useProgress(): ProgressState // throws outside ProgressProvider
```

How `ProgressProvider` behaves:

- **Owner:** `user?.id ?? GUEST_OWNER`, from `useAuth()`.
- **State:** `{ owner, data }`, initialised from `readProgress(owner) ?? emptyProgress()`.
  - When the owner changes, reset during render (React's "adjust state when a value changes" pattern), so a previous owner's data is never shown, not even for one frame.
- **Changes, StrictMode-safe:** each change computes the next data from a `dataRef`, calls `writeProgress`, then calls `setState` with that computed value.
  - IDs come from `crypto.randomUUID()` with a fallback.
  - `completedAt` is `new Date().toISOString()`.
  - Neither is generated inside a setState updater, because StrictMode runs updaters twice.
  - Only these changes write to storage, so a guest bucket that was never used is never saved.
- **Merge effect** (dependencies: `user?.id`, `user?.role`):
  - Only runs for learners.
  - If a guest bucket exists: merge it into `readProgress(user.id) ?? emptyProgress()`, write the account, remove the guest bucket, update state, and toast when `added > 0`.
  - It is safe to run twice (StrictMode) and safe when another tab runs it too, because after the first run there is no guest bucket left.
- **Cross-tab:** a `storage` listener reloads when `event.key` is the current owner's key or `null`.
- **Streak:** memoised `currentStreak(attempts, new Date())`.

### 5. `src/lib/course-progress.ts`

`useCourseProgress(): CourseProgress` memoises `buildCourseProgress(useProgress().attempts, course.id, publishedWeeks)` using `useCourse()`. It is only usable inside a course.

## Page and component changes

### `src/App.tsx`

- Wrap the app in `<ProgressProvider>` inside `<AuthProvider>`, so it can read the user and use toasts.
- Import `HistoryPage`, `ReviewPage` and `AnalyticsPage` from their new files instead of `PreviewPages`. The routes don't change.

### `src/lib/app-context.ts`, `src/lib/app-state.tsx`, `src/lib/data.ts`

- Remove `savedIds` and `toggleSaved` from `AppState`/`AppProvider`, and the `savedByWeek` import if it becomes unused.
- Delete `STREAK`, `progress` and `weakEntries` from `data.ts` once nothing uses them.

### `src/pages/PracticeQuizPage.tsx`

- **Parsing the URL:**
  - When `mode=mistakes` is present, the quiz is built from the question ids in `questions`. It keeps only ids that `findQuestion` resolves to a published week of this course, in URL order. Its weeks are those questions' weeks, in week order. Its kind is `"mistakes"`.
  - Otherwise the quiz is built from `weeks` as today, but via `weekQuestions()`.
- **`QuizRunner`** gets new props `kind` and `backTo: { to, label }`: Practice Zone for practice, or Review Mistakes (`path("/review")`) for mistakes.
- **Mistakes mode:**
  - The badge reads "Mistakes" and the title "Mistakes review · N question(s)".
  - The breadcrumb, Back link and results back button use `backTo`.
  - The "preview includes X of Y questions" line is hidden.
- **Recording:**
  - `startedAtRef` holds the start time. It is reset by `retry()`.
  - In `advance()`, when `isLast && phase === "quiz"`, call `recordAttempt({...})` once and then show results.
  - Each answer's `weekId` comes from `findQuestion(id)`.
  - `chosenIndex` is `answers[position]`. Every question is answered before results can be reached.
- **Bookmarks** use `useProgress()` instead of `useApp()`. `toast` still comes from `useApp()`.
- **`ResultsPanel`:**
  - New props: `heading` ("Practice complete" or "Mistakes review complete"), `backTo`, `historyPath` and `isGuest`.
  - Under the stats, add a one-line save note:
    - signed in: check icon, "Saved to your Quiz History.", and a **View history** link;
    - guest: "Saved on this browser.", a **Sign in to keep it with your account** link to `/signin` with `state={{ from: { pathname: historyPath } }}`, and **View history**.
- **Empty state:** if a mistakes URL resolves to no questions, show the existing notice titled "These mistakes aren't available to practise", with a "Back to Review Mistakes" button.

### `src/pages/HistoryPage.tsx` (new; replaces the placeholder)

- **Header:** `BackLink` to Practice Zone. `PageHeader` (RotateCcwClock) titled "Quiz History", with subtitle "N attempts · last practised <day label>".
- **Attempt cards:** newest first, grouped under day headings (`dayLabel`). Each card shows:
  - the `attemptTitle`;
  - a score badge `3/4 · 75%`, coloured green at 80% or more, amber at 50% or more, red otherwise (the same thresholds as `ProgressRing`);
  - the time of day, the duration (`formatClock`), and chips for Jumbled/In order and Shuffled/Original options;
  - **Show answers** (`aria-expanded`/`aria-controls`), which lists each question with a check or cross icon, the question text (clamped to 2 lines), "Your answer: B · text", and "Correct: C · text" when wrong. A missing question shows "This question is no longer available";
  - **Retake**, which links to `path(retakeSubpath(attempt))`.
- **Paging:** 20 cards first, then **Show more** adds 20.
- **Clear history:** a ghost button with a Trash2 icon opens the existing `ConfirmDialog` from `./admin/ui`:
  - title "Clear quiz history?";
  - body "This removes all N quiz attempts for <course>. Bookmarks aren't affected. This can't be undone.";
  - confirm "Clear history";
  - on confirm: `clearHistory(course.id)` and the toast "Quiz history cleared".
- **Empty state:** `EmptyState` "No quiz attempts yet", with a **Start practising** link to Practice Zone.

### `src/pages/ReviewPage.tsx` (new; replaces the placeholder)

- **Header:** `BackLink` to Home. `PageHeader` (Target) titled "Review Mistakes", with subtitle "N questions to fix across M weeks".
- **Week filter:** `?week=<weekId>` filters by week; an invalid value means all weeks. The filter chips are "All (n)" plus one per week with mistakes ("Week 4 (2)"), with `aria-pressed`. Changing the filter replaces the URL entry.
- **Main button:** **Practise these N** goes to `path("/practice/run?mode=mistakes&questions=" + filteredIds)`.
- **List:** grouped by week under headings "Week N · title (count)". Each mistake is a `QuestionCard` with `showAnswer`, the new `chosenIndex`, and the bookmark toggle.
- **Empty states:**
  - no attempts: "Mistakes from your quizzes will appear here" with **Start practising**;
  - attempts but no mistakes: "No mistakes to fix. Nice work!" with **Practise more**.

### `src/pages/AnalyticsPage.tsx` (new; replaces the placeholder)

- **Header:** `BackLink` to Home. `PageHeader` (ChartColumn) titled "Analytics", with subtitle "<course> · <formatTotalTime> practised".
- **Tiles:** Day streak, Quizzes taken, Accuracy, Weeks done (`x/y`). Two columns on mobile, four on desktop, styled like the results stats.
- **Last 14 days:** a bar chart of questions answered per day, from `dailyActivity`.
  - Today's bar is highlighted. Zero days show a muted stub. Each bar has a `title` such as "14 Oct: 6 questions".
  - The chart is `role="img"`, with an `aria-label` summary of the total and the busiest day.
- **Recent accuracy:** bars for the last 10 attempts, oldest to newest, using the same colour thresholds. It also has `role="img"` and an `aria-label` listing the values.
- **By week:** each published week shows:
  - a mastery bar labelled "2/4 mastered";
  - accuracy, or "Not practised";
  - a "2 to fix" link to `/review?week=`;
  - for weeks with `available === 0`, the muted text "No sample questions in this preview".
- **Footer:** links to Quiz History and Review Mistakes.
- **Empty state:** when the course has no attempts, show `EmptyState` with **Start practising**.

### `src/pages/HomePage.tsx`

- **Stats:**
  - Day streak comes from `useProgress().streak`.
  - Weeks done comes from `weeksDone`.
  - Questions (the course's question total) is unchanged.
- **Up next · fix mistakes:** shows the first week in `rankedWeakWeeks`. The text reads "N mistake(s) to fix", and the button goes to `path("/review?week=<id>")`. The card is hidden when there are no mistakes.
- **Weakest Weeks:** the top 6 of `rankedWeakWeeks`, each linking to `/review?week=<id>`. The visual design is unchanged, and the section stays hidden when the list is empty.
- **New "Your progress" section:** sits between the feature cards and Weakest Weeks, and is hidden when the course has no published weeks. It has three link cards:
  - Quiz History: "N attempts · last <day>", or "No attempts yet";
  - Review Mistakes: "N to fix", or "Nothing to fix";
  - Analytics: "X% accuracy", or "Take a quiz to see stats".
- **`SyncPrompt`:**
  - It only renders when signed out.
  - **Not now** stays dismissed for the browser session (sessionStorage `nptel-sync-dismissed`, inside try/catch).
  - **Sync now** keeps its current `/signin` link.

### Smaller changes

- `src/components/WeekCard.tsx`: add a `percent?: number` prop (default 0) and remove the `progress` import. `HomePage` and `src/pages/StudyPage.tsx` pass `byWeek[week.id]?.percent ?? 0`.
- `src/components/Navbar.tsx`: replace `STREAK` with `useProgress().streak`. The flame still only shows when the streak is above 0.
- `src/pages/PracticePage.tsx`: next to **History**, add a **Mistakes (n)** link (Target icon) to `/review`, shown only when n > 0.
- `src/pages/SavedPage.tsx`: get `savedIds`/`toggleSaved` from `useProgress()`.
- `src/components/QuestionCard.tsx`: add an optional `chosenIndex`.
  - When it is wrong, that option gets red styling, a CircleX icon and a small "Your answer" tag.
  - When it is correct, the green option gets the "Your answer" tag.
  - Existing callers are unaffected.
- `src/pages/PreviewPages.tsx`:
  - Remove the placeholder `HistoryPage`, `ReviewPage` and `AnalyticsPage`, and the now-unused icon imports.
  - In `MorePage`, the links become Saved Questions, Requests & Feedback, Quiz History, Review Mistakes, Analytics and All courses. The **Admin** link is removed.

**Design:** reuse `card`, `card-hover`, the `btn-*` classes, `PageHeader`, `EmptyState`, `BackLink` and lucide icons. Follow existing light and dark styling, and make every new page responsive down to 390px.

## Edge cases and failure modes

- **Weeks without sample questions:** 0%, never done, never in mistakes. Analytics labels them.
- **Admin hides or archives a week during the session:** it is left out of stats and mistakes. History still lists past attempts, with titles taken from all course weeks.
- **Unknown question ids:** skipped in stats; History shows "no longer available"; dropped from mistakes URLs.
- **Storage unavailable, full or corrupt:** the app keeps working from memory, and corrupt data counts as no data. Nothing crashes.
- **Many attempts:** capped at 300 per bucket.
- **Merging:** never copies data into the admin account, and runs only once even across StrictMode reruns and multiple tabs. Signing out shows the guest bucket; the learner's data comes back at their next sign-in.
- **Results to Review and back:** never records twice. A mid-quiz Retry and abandoned quizzes are never recorded.
- **Midnight:** the streak is recalculated on the next render.

## Verification

**Static checks:**

- `pnpm format <changed files>`, then `pnpm exec oxfmt --check <changed files>`.
- `pnpm exec tsc --noEmit -p tsconfig.json`.
- `pnpm build`.

**Browser checks:** a headless Chromium DevTools script against the already-running dev server (never start another), with `--disable-dev-shm-usage`. Report console errors.

1. **Fresh guest:** streak 0, weeks done 0, no Up next or Weakest Weeks, zero-state progress cards, Sync prompt visible. **Not now** keeps it hidden after navigating.
2. **First quiz:** a Week 4 quiz (4 questions) with 2 right and 2 wrong.
   - Results show the guest save note.
   - History shows 2/4 · 50%, and Show answers works.
   - Review shows 2 mistakes, with the chosen answers in red.
   - Home shows Up next Week 4, Weakest Weeks, a 50% ring, streak 1, and the navbar flame at 1.
3. **Fixing mistakes:** **Practise these 2** from Review, answered correctly.
   - Review shows "No mistakes to fix".
   - The ring is 100% and weeks done is 1.
   - History lists "Mistakes review".
4. **No double recording:** results to Review to results leaves the History count unchanged, and a mid-quiz Retry records nothing.
5. **Bookmarks:** a bookmark change survives a reload.
6. **Merge:**
   - Signing up shows "Synced 2 quiz attempts to your account", History shows both attempts, and the guest key is gone.
   - After signing out, the guest history is empty.
   - Signing back in restores the account's data.
7. **Streak:** with attempts injected into storage for yesterday and today, the streak is 2. With only an attempt from 2 days ago, it is 0.
8. **Clear history:** the confirm dialog clears this course's attempts and leaves bookmarks intact.
9. **Analytics:** tiles and charts render with data, and a sample course shows the empty state.
10. **Corrupt data:** with corrupt `nptel-progress:guest` JSON, the app loads with empty progress.
11. **More page:** no Admin link; Review Mistakes and Analytics links present.

**Screenshots:** History, Review, Analytics and Home, in desktop light and dark plus 390px mobile, reviewed visually.

## Files

- **New:**
  - `src/lib/question-bank.ts`, `src/lib/progress.ts`, `src/lib/progress-storage.ts`
  - `src/lib/progress-context.ts`, `src/lib/progress-state.tsx`, `src/lib/course-progress.ts`
  - `src/pages/HistoryPage.tsx`, `src/pages/ReviewPage.tsx`, `src/pages/AnalyticsPage.tsx`
- **Modified:**
  - `src/App.tsx`, `src/lib/app-context.ts`, `src/lib/app-state.tsx`, `src/lib/data.ts`
  - `src/pages/PracticeQuizPage.tsx`, `src/pages/HomePage.tsx`, `src/pages/PracticePage.tsx`, `src/pages/SavedPage.tsx`, `src/pages/StudyPage.tsx`, `src/pages/PreviewPages.tsx`
  - `src/components/WeekCard.tsx`, `src/components/Navbar.tsx`, `src/components/QuestionCard.tsx`

## When the backend arrives

- **Storage:** replace `progress-storage.ts` with API calls, for example Payload `quiz-attempts` and `bookmarks` collections keyed by user. Run `mergeProgress` on the server at sign-in.
- **Loading:** `ProgressProvider` becomes asynchronous, with a loading state. Its public `useProgress()` API, the pure stats in `progress.ts`, and every page stay the same.
- **Content:** `question-bank.ts` switches to fetched course content, so week denominators become the real question counts.
