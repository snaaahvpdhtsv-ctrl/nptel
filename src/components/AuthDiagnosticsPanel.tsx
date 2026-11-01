import { useEffect, useState } from "react"
import {
  authDiagnosticsEnabled,
  clearAuthDiagnosticEvents,
  disableAuthDiagnostics,
  getAuthDiagnosticEvents,
} from "../lib/auth-diagnostics"

export function AuthDiagnosticsPanel() {
  const [enabled, setEnabled] = useState(authDiagnosticsEnabled)
  const [open, setOpen] = useState(false)
  const [events, setEvents] = useState(getAuthDiagnosticEvents)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!enabled || !open) return
    const timer = window.setInterval(
      () => setEvents(getAuthDiagnosticEvents()),
      500,
    )
    return () => window.clearInterval(timer)
  }, [enabled, open])

  if (!enabled) return null

  const copyEvents = async () => {
    const text = JSON.stringify(getAuthDiagnosticEvents(), null, 2)
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  return (
    <aside
      aria-label="Authentication diagnostics"
      className="fixed bottom-3 right-3 z-[100] w-[min(24rem,calc(100vw-1.5rem))]"
    >
      {open && (
        <div className="mb-2 rounded-xl border border-gray-300 bg-white p-3 shadow-xl dark:border-gray-600 dark:bg-gray-900">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold">
              Authentication diagnostics
            </h2>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  clearAuthDiagnosticEvents()
                  setEvents([])
                  setCopied(false)
                }}
                className="min-h-11 px-2 text-xs underline"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={() => void copyEvents()}
                className="min-h-11 px-2 text-xs underline"
              >
                {copied ? "Copied" : "Copy"}
              </button>
              <button
                type="button"
                onClick={() => {
                  disableAuthDiagnostics()
                  setEnabled(false)
                }}
                className="min-h-11 px-2 text-xs underline"
              >
                Stop
              </button>
            </div>
          </div>
          <p className="mb-2 text-xs text-gray-600 dark:text-gray-300">
            Contains event stages and error codes only. No account identifiers
            or authentication tokens are recorded.
          </p>
          <textarea
            aria-label="Authentication diagnostic events"
            readOnly
            value={JSON.stringify(events, null, 2)}
            onFocus={(event) => event.currentTarget.select()}
            className="h-48 w-full resize-y rounded border border-gray-300 bg-gray-50 p-2 font-mono text-[10px] text-gray-800 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
          />
          {!copied && (
            <p className="mt-1 text-[10px] text-gray-500">
              If Copy is unavailable, focus the log and copy it manually.
            </p>
          )}
        </div>
      )}
      <button
        type="button"
        aria-expanded={open}
        onClick={() => {
          setEvents(getAuthDiagnosticEvents())
          setOpen((value) => !value)
        }}
        className="ml-auto block min-h-11 rounded-full bg-gray-900 px-3 py-2 text-xs font-semibold text-white shadow-lg dark:bg-white dark:text-gray-900"
      >
        Auth diagnostics ({events.length})
      </button>
    </aside>
  )
}
