import {
  MAX_ATTEMPTS,
  sortAttempts,
  type AttemptAnswer,
  type ProgressData,
  type QuizAttempt,
} from "./progress"

// The only module that reads or writes saved progress. Replace it with API
// calls when a backend is added; pages only talk to ProgressProvider.

/** Progress owner while signed out. */
export const GUEST_OWNER = "guest"

export const progressKey = (ownerId: string) => `nptel-progress:${ownerId}`

export function emptyProgress(): ProgressData {
  return { version: 1, attempts: [], savedIds: [] }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

const isTimestamp = (value: unknown): value is string =>
  typeof value === "string" && !Number.isNaN(Date.parse(value))

function parseAnswer(value: unknown): AttemptAnswer | null {
  if (!isRecord(value)) return null
  const { questionId, weekId, chosenIndex, correct } = value
  if (
    typeof questionId !== "string" ||
    typeof weekId !== "string" ||
    typeof correct !== "boolean" ||
    typeof chosenIndex !== "number" ||
    !Number.isInteger(chosenIndex) ||
    chosenIndex < 0
  )
    return null
  return { questionId, weekId, chosenIndex, correct }
}

function parseAttempt(value: unknown): QuizAttempt | null {
  if (!isRecord(value)) return null
  const { id, courseId, startedAt, completedAt, durationSeconds } = value
  if (
    typeof id !== "string" ||
    typeof courseId !== "string" ||
    !isTimestamp(startedAt) ||
    !isTimestamp(completedAt) ||
    !Array.isArray(value.answers)
  )
    return null
  const answers = value.answers
    .map(parseAnswer)
    .filter((answer): answer is AttemptAnswer => answer !== null)
  if (answers.length === 0) return null
  return {
    id,
    courseId,
    kind: value.kind === "mistakes" ? "mistakes" : "practice",
    weekIds: Array.isArray(value.weekIds)
      ? value.weekIds.filter((item): item is string => typeof item === "string")
      : [],
    startedAt,
    completedAt,
    durationSeconds:
      typeof durationSeconds === "number" &&
      Number.isFinite(durationSeconds) &&
      durationSeconds >= 0
        ? Math.round(durationSeconds)
        : 0,
    shuffleQuestions: value.shuffleQuestions === true,
    shuffleOptions: value.shuffleOptions === true,
    answers,
  }
}

/** Saved progress for an owner, or null when there is none or it can't be read. */
export function readProgress(ownerId: string): ProgressData | null {
  let raw: string | null
  try {
    raw = localStorage.getItem(progressKey(ownerId))
  } catch {
    return null
  }
  if (raw === null) return null
  try {
    const value: unknown = JSON.parse(raw)
    if (!isRecord(value) || value.version !== 1) return null
    const seen = new Set<string>()
    const attempts: QuizAttempt[] = []
    for (const item of Array.isArray(value.attempts) ? value.attempts : []) {
      const attempt = parseAttempt(item)
      if (!attempt || seen.has(attempt.id)) continue
      seen.add(attempt.id)
      attempts.push(attempt)
    }
    const savedIds = Array.isArray(value.savedIds)
      ? value.savedIds.filter((id): id is string => typeof id === "string")
      : []
    return {
      version: 1,
      attempts: sortAttempts(attempts).slice(0, MAX_ATTEMPTS),
      savedIds: [...new Set(savedIds)],
    }
  } catch {
    return null
  }
}

export function writeProgress(ownerId: string, data: ProgressData) {
  try {
    localStorage.setItem(
      progressKey(ownerId),
      JSON.stringify({
        ...data,
        attempts: data.attempts.slice(0, MAX_ATTEMPTS),
      }),
    )
  } catch {
    // Storage is full or unavailable: progress stays in memory for this tab.
  }
}

export function removeProgress(ownerId: string) {
  try {
    localStorage.removeItem(progressKey(ownerId))
  } catch {
    // Storage unavailable; nothing to remove.
  }
}
