import { useState } from "react"
import { Link, useLocation } from "react-router"
import { CloudUpload, X } from "lucide-react"
import { useAuth } from "../lib/auth-context"

const SYNC_DISMISSED_KEY = "nptel-sync-dismissed"

function readSyncDismissed() {
  try {
    return sessionStorage.getItem(SYNC_DISMISSED_KEY) === "1"
  } catch {
    return false
  }
}

export function SyncPrompt({ compact = false }: { compact?: boolean }) {
  const location = useLocation()
  const { user } = useAuth()
  const [visible, setVisible] = useState(() => !readSyncDismissed())
  if (user || !visible) return null

  const dismiss = () => {
    setVisible(false)
    try {
      sessionStorage.setItem(SYNC_DISMISSED_KEY, "1")
    } catch {
      // Storage unavailable: stays hidden until the page reloads.
    }
  }

  if (compact) {
    return (
      <div
        className="mobile-local-note"
        role="region"
        aria-label="About your progress"
      >
        <p>
          Your progress stays on this browser. Sign in to keep guest progress
          with an account here.
        </p>
        <button
          type="button"
          onClick={dismiss}
          className="mobile-icon-button"
          aria-label="Not now — dismiss progress reminder"
        >
          <X size={16} />
        </button>
      </div>
    )
  }

  return (
    <div
      className="card mb-8 flex flex-wrap items-center gap-4 p-5 border-l-4 border-l-emerald-500"
      role="region"
      aria-label="Sync your progress"
    >
      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md shrink-0">
        <CloudUpload size={20} />
      </span>
      <div className="flex-1 min-w-48">
        <p className="font-bold font-display text-gray-800 dark:text-white">
          Sync your progress
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Back up bookmarks, history, and streaks to your account.
        </p>
      </div>
      <div className="flex gap-2">
        <button onClick={dismiss} className="btn-ghost px-4 py-2 text-sm">
          Not now
        </button>
        <Link
          to="/signin"
          state={{ from: location }}
          className="btn-primary px-4 py-2 text-sm"
        >
          Sync now
        </Link>
      </div>
    </div>
  )
}
