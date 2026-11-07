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
const syncQueueKey = (ownerId: string) => `nptel-progress-sync:${ownerId}`

export interface ProgressSyncJob {
  id: string
  ownerId: string
  previous: ProgressData
  next: ProgressData
  createdAt: string
}

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
  const questionText =
    typeof value.questionText === "string" ? value.questionText : undefined
  const options = Array.isArray(value.options)
    ? value.options.filter(
        (option): option is string => typeof option === "string",
      )
    : undefined
  const correctAnswerIndex =
    typeof value.correctAnswerIndex === "number" &&
    Number.isInteger(value.correctAnswerIndex) &&
    value.correctAnswerIndex >= 0
      ? value.correctAnswerIndex
      : undefined
  return {
    questionId,
    weekId,
    chosenIndex,
    correct,
    ...(questionText === undefined ? {} : { questionText }),
    ...(options === undefined ? {} : { options }),
    ...(correctAnswerIndex === undefined ? {} : { correctAnswerIndex }),
  }
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

export function parseProgressData(value: unknown): ProgressData | null {
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
    return parseProgressData(JSON.parse(raw))
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

export function readProgressSyncQueue(ownerId: string): ProgressSyncJob[] {
  try {
    const raw = localStorage.getItem(syncQueueKey(ownerId))
    if (!raw) return []
    const value = JSON.parse(raw)
    if (!Array.isArray(value)) return []
    return value.filter(
      (job): job is ProgressSyncJob =>
        isRecord(job) &&
        typeof job.id === "string" &&
        job.ownerId === ownerId &&
        typeof job.createdAt === "string" &&
        parseProgressData(job.previous) !== null &&
        parseProgressData(job.next) !== null,
    )
  } catch {
    return []
  }
}

export function enqueueProgressSync(
  ownerId: string,
  previous: ProgressData,
  next: ProgressData,
) {
  const queue = readProgressSyncQueue(ownerId)
  if (queue.some((job) => JSON.stringify(job.next) === JSON.stringify(next)))
    return
  queue.push({
    id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    ownerId,
    previous,
    next,
    createdAt: new Date().toISOString(),
  })
  try {
    localStorage.setItem(
      syncQueueKey(ownerId),
      JSON.stringify(queue.slice(-20)),
    )
  } catch {
    // The local progress snapshot remains available if the queue cannot be stored.
  }
}

export function removeProgressSyncJob(ownerId: string, jobId: string) {
  try {
    const next = readProgressSyncQueue(ownerId).filter(
      (job) => job.id !== jobId,
    )
    localStorage.setItem(syncQueueKey(ownerId), JSON.stringify(next))
  } catch {
    // Retry on the next online event if storage is unavailable.
  }
}
