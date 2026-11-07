import {
  collection,
  doc,
  getDocs,
  writeBatch,
  type DocumentReference,
} from "firebase/firestore"
import type { ProgressData, QuizAttempt } from "./progress"
import { firestore } from "./firebase"
import {
  parseProgressData,
  readProgressSyncQueue,
  removeProgressSyncJob,
} from "./progress-storage"

type CloudChange = {
  ref: DocumentReference
  data?: Record<string, unknown>
  remove?: true
}

export async function loadCloudProgress(userId: string): Promise<ProgressData> {
  if (!firestore) throw new Error("Firebase Firestore is not configured.")
  const [attemptSnapshot, bookmarkSnapshot] = await Promise.all([
    getDocs(collection(firestore, "users", userId, "attempts")),
    getDocs(collection(firestore, "users", userId, "bookmarks")),
  ])
  const attempts = attemptSnapshot.docs.map(
    (attempt) => ({ ...attempt.data(), id: attempt.id }) as QuizAttempt,
  )
  const savedIds = bookmarkSnapshot.docs.map(
    (bookmark) =>
      bookmark.data().questionId as string | undefined ?? bookmark.id,
  )
  return (
    parseProgressData({ version: 1, attempts, savedIds }) ?? {
      version: 1,
      attempts: [],
      savedIds: [],
    }
  )
}

export async function saveCloudProgress(
  userId: string,
  previous: ProgressData,
  next: ProgressData,
) {
  if (!firestore) throw new Error("Firebase Firestore is not configured.")

  const changes: CloudChange[] = []
  const beforeAttempts = new Map(
    previous.attempts.map((attempt) => [attempt.id, attempt]),
  )
  const afterAttempts = new Map(
    next.attempts.map((attempt) => [attempt.id, attempt]),
  )

  for (const [id, attempt] of afterAttempts) {
    if (JSON.stringify(beforeAttempts.get(id)) === JSON.stringify(attempt))
      continue
    changes.push({
      ref: doc(firestore, "users", userId, "attempts", id),
      data: { ...attempt },
    })
  }
  for (const id of beforeAttempts.keys()) {
    if (!afterAttempts.has(id))
      changes.push({
        ref: doc(firestore, "users", userId, "attempts", id),
        remove: true,
      })
  }

  const beforeSaved = new Set(previous.savedIds)
  const afterSaved = new Set(next.savedIds)
  for (const questionId of afterSaved) {
    if (beforeSaved.has(questionId)) continue
    changes.push({
      ref: doc(firestore, "users", userId, "bookmarks", questionId),
      data: { questionId },
    })
  }
  for (const questionId of beforeSaved) {
    if (!afterSaved.has(questionId))
      changes.push({
        ref: doc(firestore, "users", userId, "bookmarks", questionId),
        remove: true,
      })
  }

  for (let index = 0; index < changes.length; index += 400) {
    const batch = writeBatch(firestore)
    for (const change of changes.slice(index, index + 400)) {
      if (change.remove) batch.delete(change.ref)
      else if (change.data) batch.set(change.ref, change.data)
    }
    await batch.commit()
  }
}

export async function syncQueuedProgress(userId: string) {
  const queue = readProgressSyncQueue(userId)
  for (const job of queue) {
    await saveCloudProgress(userId, job.previous, job.next)
    removeProgressSyncJob(userId, job.id)
  }
}
