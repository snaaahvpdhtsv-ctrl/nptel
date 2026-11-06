import type { Question, Week } from "./data"
import {
  findQuestion,
  SAMPLE_SAVED_IDS,
  weekQuestions,
  type QuestionBank,
} from "./question-bank"

export type QuizKind = "practice" | "mistakes"

export interface AttemptAnswer {
  questionId: string
  weekId: string
  /** Original index of the option the learner chose. */
  chosenIndex: number
  correct: boolean
  /** Immutable attempt snapshot so history remains readable if the question is archived. */
  questionText?: string
  options?: string[]
  correctAnswerIndex?: number
}

export interface QuizAttempt {
  id: string
  courseId: string
  kind: QuizKind
  weekIds: string[]
  /** ISO 8601 timestamps. */
  startedAt: string
  completedAt: string
  durationSeconds: number
  shuffleQuestions: boolean
  shuffleOptions: boolean
  /** In the order the questions were shown. */
  answers: AttemptAnswer[]
}

export type NewQuizAttempt = Omit<QuizAttempt, "id" | "completedAt">

export interface ProgressData {
  version: 1
  /** Newest first, across every course. */
  attempts: QuizAttempt[]
  savedIds: string[]
}

/** Oldest attempts are dropped beyond this many per learner. */
export const MAX_ATTEMPTS = 300

export interface LatestAnswer {
  correct: boolean
  chosenIndex: number
  answeredAt: string
}

export interface WeekProgress {
  week: Week
  /** Practisable questions in this week. */
  available: number
  /** Questions whose latest answer is correct. */
  mastered: number
  /** 0–100; 0 when the week has no practisable questions. */
  percent: number
  /** Questions whose latest answer is wrong, in their original order. */
  mistakeIds: string[]
  /** Every recorded answer for this week, across attempts. */
  answered: number
  correct: number
  /** Null until the week has been practised. */
  accuracy: number | null
  done: boolean
}

export interface Mistake {
  question: Question
  weekId: string
  chosenIndex: number
  answeredAt: string
}

export interface CourseProgress {
  /** This course's attempts, newest first. */
  attempts: QuizAttempt[]
  /** Published weeks, by week number. */
  weeks: WeekProgress[]
  byWeek: Record<string, WeekProgress>
  /** Ordered by week number, then question order. */
  mistakes: Mistake[]
  /** Weeks with mistakes: most mistakes first, then lowest accuracy, then week number. */
  rankedWeakWeeks: WeekProgress[]
  weeksDone: number
  /** Over every answer in this course. */
  accuracy: number | null
  answered: number
  totalSeconds: number
  lastAttemptAt: string | null
}

export const percentOf = (part: number, whole: number) =>
  whole ? Math.round((part / whole) * 100) : 0

/** Same thresholds as ProgressRing: green from 80%, amber from 50%, red below. */
export const accuracyTone = (accuracy: number) =>
  accuracy >= 80 ? "good" : accuracy >= 50 ? "fair" : "low"

export function sortAttempts(attempts: QuizAttempt[]) {
  return [...attempts].sort(
    (a, b) => Date.parse(b.completedAt) - Date.parse(a.completedAt),
  )
}

export function attemptScore(attempt: QuizAttempt) {
  const total = attempt.answers.length
  const correct = attempt.answers.filter((answer) => answer.correct).length
  return { correct, total, accuracy: percentOf(correct, total) }
}

export function attemptTitle(attempt: QuizAttempt, weeks: Week[]) {
  if (attempt.kind === "mistakes") return "Mistakes review"
  if (attempt.weekIds.length > 1)
    return `Mixed Practice · ${attempt.weekIds.length} weeks`
  const week = weeks.find((item) => item.id === attempt.weekIds[0])
  return week ? `Week ${week.weekNumber} Practice` : "Practice"
}

/** Course-relative URL that starts the same quiz again. */
export function retakeSubpath(attempt: QuizAttempt) {
  const settings = `shuffle=${
    attempt.shuffleQuestions ? 1 : 0
  }&shuffleOptions=${attempt.shuffleOptions ? 1 : 0}`
  if (attempt.kind === "mistakes")
    return `${mistakesSubpath(attempt.answers.map((answer) => answer.questionId))}&${settings}`
  return `/practice/run?weeks=${attempt.weekIds.join(",")}&${settings}`
}

/** Course-relative URL for a quiz made of specific questions. */
export const mistakesSubpath = (questionIds: string[]) =>
  `/practice/run?mode=mistakes&questions=${questionIds
    .map(encodeURIComponent)
    .join(",")}`

/** Each question's most recent answer. `attempts` must be newest first. */
export function latestAnswers(attempts: QuizAttempt[]) {
  const latest = new Map<string, LatestAnswer>()
  for (const attempt of attempts) {
    for (const answer of attempt.answers) {
      if (latest.has(answer.questionId)) continue
      latest.set(answer.questionId, {
        correct: answer.correct,
        chosenIndex: answer.chosenIndex,
        answeredAt: attempt.completedAt,
      })
    }
  }
  return latest
}

export function buildCourseProgress(
  allAttempts: QuizAttempt[],
  courseId: string,
  publishedWeeks: Week[],
  questionBank: QuestionBank,
): CourseProgress {
  const attempts = allAttempts.filter(
    (attempt) => attempt.courseId === courseId,
  )
  const latest = latestAnswers(attempts)

  // Week totals only count questions that still exist in the question bank.
  const totals = new Map<string, Pick<WeekProgress, "answered" | "correct">>()
  let answered = 0
  let correct = 0
  let totalSeconds = 0
  for (const attempt of attempts) {
    totalSeconds += attempt.durationSeconds
    for (const answer of attempt.answers) {
      answered += 1
      if (answer.correct) correct += 1
      const weekId = findQuestion(answer.questionId, questionBank)?.weekId
      if (!weekId) continue
      const entry = totals.get(weekId) ?? { answered: 0, correct: 0 }
      entry.answered += 1
      if (answer.correct) entry.correct += 1
      totals.set(weekId, entry)
    }
  }

  const mistakes: Mistake[] = []
  const weeks = [...publishedWeeks]
    .sort((a, b) => a.weekNumber - b.weekNumber)
    .map((week): WeekProgress => {
      const questions = weekQuestions(week.id, questionBank)
      const mistakeIds: string[] = []
      let mastered = 0
      for (const question of questions) {
        const answer = latest.get(question.id)
        if (!answer) continue
        if (answer.correct) {
          mastered += 1
        } else {
          mistakeIds.push(question.id)
          mistakes.push({
            question,
            weekId: week.id,
            chosenIndex: answer.chosenIndex,
            answeredAt: answer.answeredAt,
          })
        }
      }
      const total = totals.get(week.id) ?? { answered: 0, correct: 0 }
      return {
        week,
        available: questions.length,
        mastered,
        percent: percentOf(mastered, questions.length),
        mistakeIds,
        answered: total.answered,
        correct: total.correct,
        accuracy: total.answered
          ? percentOf(total.correct, total.answered)
          : null,
        done: questions.length > 0 && mastered === questions.length,
      }
    })

  const rankedWeakWeeks = weeks
    .filter((entry) => entry.mistakeIds.length > 0)
    .sort(
      (a, b) =>
        b.mistakeIds.length - a.mistakeIds.length ||
        (a.accuracy ?? 101) - (b.accuracy ?? 101) ||
        a.week.weekNumber - b.week.weekNumber,
    )

  return {
    attempts,
    weeks,
    byWeek: Object.fromEntries(weeks.map((entry) => [entry.week.id, entry])),
    mistakes,
    rankedWeakWeeks,
    weeksDone: weeks.filter((entry) => entry.done).length,
    accuracy: answered ? percentOf(correct, answered) : null,
    answered,
    totalSeconds,
    lastAttemptAt: attempts[0]?.completedAt ?? null,
  }
}

/**
 * Adds a guest's progress to an account. Guest bookmarks only bring questions
 * beyond the sample set, so seeds the account removed don't come back.
 */
export function mergeProgress(account: ProgressData, guest: ProgressData) {
  const known = new Set(account.attempts.map((attempt) => attempt.id))
  const incoming = guest.attempts.filter((attempt) => !known.has(attempt.id))
  const seeded = new Set(SAMPLE_SAVED_IDS)
  const data: ProgressData = {
    version: 1,
    attempts: sortAttempts([...account.attempts, ...incoming]).slice(
      0,
      MAX_ATTEMPTS,
    ),
    savedIds: [
      ...new Set([
        ...account.savedIds,
        ...guest.savedIds.filter((id) => !seeded.has(id)),
      ]),
    ],
  }
  return { data, added: incoming.length }
}

const pad = (value: number) => String(value).padStart(2, "0")

/** Local calendar day, e.g. "2026-10-31". */
export const localDayKey = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`

function addDays(date: Date, days: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

/** Consecutive local days with a finished quiz, ending today or yesterday. */
export function currentStreak(attempts: QuizAttempt[], now = new Date()) {
  const days = new Set(
    attempts.map((attempt) => localDayKey(new Date(attempt.completedAt))),
  )
  let cursor = days.has(localDayKey(now)) ? now : addDays(now, -1)
  let streak = 0
  while (days.has(localDayKey(cursor))) {
    streak += 1
    cursor = addDays(cursor, -1)
  }
  return streak
}

export interface DayActivity {
  key: string
  date: Date
  answered: number
  quizzes: number
}

/** Questions answered per local day, oldest first, ending today. */
export function dailyActivity(
  attempts: QuizAttempt[],
  now = new Date(),
  days = 14,
): DayActivity[] {
  const byDay = new Map<string, Pick<DayActivity, "answered" | "quizzes">>()
  for (const attempt of attempts) {
    const key = localDayKey(new Date(attempt.completedAt))
    const entry = byDay.get(key) ?? { answered: 0, quizzes: 0 }
    entry.answered += attempt.answers.length
    entry.quizzes += 1
    byDay.set(key, entry)
  }
  return Array.from({ length: days }, (_, index) => {
    const date = addDays(now, index - (days - 1))
    const key = localDayKey(date)
    return { key, date, ...(byDay.get(key) ?? { answered: 0, quizzes: 0 }) }
  })
}

/** The latest attempts, oldest first, with their scores. */
export function recentAccuracy(attempts: QuizAttempt[], count = 10) {
  return attempts
    .slice(0, count)
    .reverse()
    .map((attempt) => ({ attempt, ...attemptScore(attempt) }))
}

const dateFormat = new Intl.DateTimeFormat(undefined, {
  day: "numeric",
  month: "short",
  year: "numeric",
})

/** "Today", "Yesterday" or a short date. */
export function dayLabel(date: Date, now = new Date()) {
  const key = localDayKey(date)
  if (key === localDayKey(now)) return "Today"
  if (key === localDayKey(addDays(now, -1))) return "Yesterday"
  return dateFormat.format(date)
}

/** For use mid-sentence: "today", "yesterday" or "on 12 Oct 2026". */
export function relativeDay(date: Date, now = new Date()) {
  const label = dayLabel(date, now)
  return label === "Today" || label === "Yesterday"
    ? label.toLowerCase()
    : `on ${label}`
}

/** Elapsed time as mm:ss. */
export const formatClock = (seconds: number) =>
  [Math.floor(seconds / 60), seconds % 60]
    .map((part) => String(part).padStart(2, "0"))
    .join(":")

/** Total practice time, e.g. "1h 05m", "12m" or "45s". */
export function formatTotalTime(seconds: number) {
  const total = Math.max(0, Math.round(seconds))
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  if (hours > 0) return `${hours}h ${pad(minutes)}m`
  if (minutes > 0) return `${minutes}m`
  return `${total}s`
}
