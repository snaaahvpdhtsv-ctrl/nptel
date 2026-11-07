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
  sortAttempts,
  type NewQuizAttempt,
  type ProgressData,
} from "./progress"
import { ProgressContext, type ProgressState } from "./progress-context"
import {
  emptyProgress,
  GUEST_OWNER,
  enqueueProgressSync,
  progressKey,
  readProgress,
  removeProgress,
  writeProgress,
} from "./progress-storage"
import { loadCloudProgress, saveCloudProgress } from "./cloud-progress"
import { syncQueuedProgress } from "./cloud-progress"
import { useOfflineState } from "./offline"

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
  const { online } = useOfflineState()
  const owner = user?.id ?? GUEST_OWNER
  const [syncStatus, setSyncStatus] =
    useState<"idle" | "syncing" | "synced" | "offline" | "error">("idle")
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

  const commit = useCallback(
    (data: ProgressData) => {
      const previous = latest.current
      const next = { owner: previous.owner, data }
      writeProgress(next.owner, data)
      latest.current = next
      setStore(next)
      if (next.owner !== GUEST_OWNER) {
        enqueueProgressSync(next.owner, previous.data, data)
        if (!online) setSyncStatus("offline")
        else
          void syncQueuedProgress(next.owner)
            .then(({ conflicts }) => {
              setSyncStatus("synced")
              if (conflicts > 0)
                toast(
                  "Progress synced while preserving changes made on another device",
                )
            })
            .catch(() => {
              setSyncStatus("error")
              toast(
                "Your progress is saved on this device but couldn't sync to your account",
              )
            })
      }
    },
    [online, toast],
  )

  const syncPending = useCallback(async () => {
    if (!user?.id) return
    if (!online) {
      setSyncStatus("offline")
      return
    }
    setSyncStatus("syncing")
    try {
      const result = await syncQueuedProgress(user.id)
      setSyncStatus("synced")
      if (result.conflicts > 0)
        toast("Progress synced while preserving changes made on another device")
    } catch {
      setSyncStatus("error")
    }
  }, [online, user?.id])

  useEffect(() => {
    if (!user?.id) {
      setSyncStatus("idle")
      return
    }
    if (!online) {
      setSyncStatus("offline")
      return
    }
    void syncPending()
  }, [online, syncPending, user?.id])

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

  // Progress made while signed out moves into the authenticated account. Running it
  // twice (StrictMode, or another tab) is harmless: the guest copy is gone.
  const userId = user?.id
  useEffect(() => {
    if (!userId) return
    let active = true
    void (async () => {
      try {
        const cloud = await loadCloudProgress(userId)
        if (!active) return
        const local =
          latest.current.owner === userId ? latest.current.data : load(userId)
        const byId = new Map(
          [...cloud.attempts, ...local.attempts].map((attempt) => [
            attempt.id,
            attempt,
          ]),
        )
        let data: ProgressData = {
          version: 1,
          attempts: sortAttempts([...byId.values()]).slice(0, MAX_ATTEMPTS),
          savedIds: [...new Set([...cloud.savedIds, ...local.savedIds])],
        }
        const guest = readProgress(GUEST_OWNER)
        const addedFromGuest = guest ? mergeProgress(data, guest).added : 0
        if (guest) data = mergeProgress(data, guest).data
        writeProgress(userId, data)
        latest.current = { owner: userId, data }
        setStore({ owner: userId, data })
        await saveCloudProgress(userId, cloud, data)
        if (!active) return
        if (guest) removeProgress(GUEST_OWNER)
        if (addedFromGuest > 0)
          toast(
            `Synced ${addedFromGuest} quiz attempt${
              addedFromGuest === 1 ? "" : "s"
            } to your account`,
          )
      } catch {
        if (active)
          toast(
            "Your account progress couldn't be loaded. Check your connection and try again",
          )
      }
    })()
    return () => {
      active = false
    }
  }, [userId, toast])

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
      syncStatus,
      retrySync: () => void syncPending(),
      toggleSaved,
      recordAttempt,
      clearHistory,
    }),
    [
      isGuest,
      attempts,
      savedIds,
      streak,
      syncStatus,
      syncPending,
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
