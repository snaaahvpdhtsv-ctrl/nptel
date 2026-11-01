import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"
import { useApp } from "./app-context"
import { useAuth } from "./auth-context"
import {
  currentStreak,
  MAX_ATTEMPTS,
  mergeProgress,
  type NewQuizAttempt,
  type ProgressData,
} from "./progress"
import { ProgressContext, type ProgressState } from "./progress-context"
import {
  emptyProgress,
  GUEST_OWNER,
  progressKey,
  readProgress,
  removeProgress,
  writeProgress,
} from "./progress-storage"

interface Store {
  owner: string
  data: ProgressData
}

const load = (owner: string) => readProgress(owner) ?? emptyProgress()

function createId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function")
    return crypto.randomUUID()
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

export function ProgressProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const { toast } = useApp()
  const owner = user?.id ?? GUEST_OWNER
  const [store, setStore] = useState<Store>(() => ({
    owner,
    data: load(owner),
  }))

  // Signing in or out swaps in the new owner's progress during render, so the
  // previous owner's data is never shown, not even for a frame.
  let current = store
  if (store.owner !== owner) {
    current = { owner, data: load(owner) }
    setStore(current)
  }

  // Changes read and write through this ref, never inside state updaters:
  // StrictMode runs updaters twice, which would mint two different ids.
  const latest = useRef(current)
  useLayoutEffect(() => {
    latest.current = current
  })

  const commit = useCallback((data: ProgressData) => {
    const next = { owner: latest.current.owner, data }
    writeProgress(next.owner, data)
    latest.current = next
    setStore(next)
  }, [])

  const toggleSaved = useCallback(
    (questionId: string) => {
      const { data } = latest.current
      commit({
        ...data,
        savedIds: data.savedIds.includes(questionId)
          ? data.savedIds.filter((id) => id !== questionId)
          : [...data.savedIds, questionId],
      })
    },
    [commit],
  )

  const recordAttempt = useCallback(
    (attempt: NewQuizAttempt) => {
      const { data } = latest.current
      const entry = {
        ...attempt,
        id: createId(),
        completedAt: new Date().toISOString(),
      }
      commit({
        ...data,
        attempts: [entry, ...data.attempts].slice(0, MAX_ATTEMPTS),
      })
    },
    [commit],
  )

  const clearHistory = useCallback(
    (courseId: string) => {
      const { data } = latest.current
      commit({
        ...data,
        attempts: data.attempts.filter(
          (attempt) => attempt.courseId !== courseId,
        ),
      })
    },
    [commit],
  )

  // Progress made while signed out moves into a learner's account. Running it
  // twice (StrictMode, or another tab) is harmless: the guest copy is gone.
  const userId = user?.id
  const isLearner = user?.role === "learner"
  useEffect(() => {
    if (!userId || !isLearner) return
    const guest = readProgress(GUEST_OWNER)
    if (!guest) return
    const { data, added } = mergeProgress(load(userId), guest)
    writeProgress(userId, data)
    removeProgress(GUEST_OWNER)
    latest.current = { owner: userId, data }
    setStore({ owner: userId, data })
    if (added > 0)
      toast(
        `Synced ${added} quiz attempt${added === 1 ? "" : "s"} to your account`,
      )
  }, [userId, isLearner, toast])

  // Keep other tabs' changes in sync.
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== null && event.key !== progressKey(owner)) return
      const next = { owner, data: load(owner) }
      latest.current = next
      setStore(next)
    }
    window.addEventListener("storage", onStorage)
    return () => window.removeEventListener("storage", onStorage)
  }, [owner])

  const { attempts, savedIds } = current.data
  const isGuest = current.owner === GUEST_OWNER
  // Recomputed every render so it rolls over at midnight without new attempts.
  const streak = currentStreak(attempts)

  const value = useMemo<ProgressState>(
    () => ({
      isGuest,
      attempts,
      savedIds,
      streak,
      toggleSaved,
      recordAttempt,
      clearHistory,
    }),
    [
      isGuest,
      attempts,
      savedIds,
      streak,
      toggleSaved,
      recordAttempt,
      clearHistory,
    ],
  )

  return (
    <ProgressContext.Provider value={value}>
      {children}
    </ProgressContext.Provider>
  )
}
