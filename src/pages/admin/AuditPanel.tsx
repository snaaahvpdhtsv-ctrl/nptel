import { useState } from "react"
import { Search } from "lucide-react"
import { csvCell, downloadFile, Panel, smallOutline } from "./ui"

export interface AuditEntry {
  id: number | string
  action: string
  resource: string
  actorId?: string
  actorEmail?: string | null
  at: Date
}

export function AuditPanel({
  entries,
  loading,
  error,
  onRetry,
}: {
  entries: AuditEntry[]
  loading: boolean
  error: string | null
  onRetry: () => void
}) {
  const [query, setQuery] = useState("")
  const term = query.trim().toLowerCase()
  const visible = entries.filter(
    (entry) =>
      !term || `${entry.action} ${entry.resource}`.toLowerCase().includes(term),
  )

  return (
    <Panel>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {loading
            ? "Loading recent admin changes…"
            : error
              ? "Audit history is unavailable"
              : `${entries.length} ${
                  entries.length === 1 ? "entry" : "entries"
                } from Firestore`}
        </p>
        <button onClick={onRetry} disabled={loading} className={smallOutline}>
          {loading ? "Loading…" : "Refresh"}
        </button>
      </div>
      {error && (
        <div
          role="alert"
          className="mb-3 rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300"
        >
          <p>{error}</p>
          <button type="button" onClick={onRetry} className="mt-2 underline">
            Try again
          </button>
        </div>
      )}
      {!loading &&
        !error &&
        (entries.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            No audit entries yet. Successful admin actions will appear here.
          </p>
        ) : (
          <>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <div className="relative min-w-48 flex-1">
                <Search
                  size={15}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  aria-label="Search audit history"
                  placeholder="Search changes..."
                  className="input py-2 pl-9"
                />
              </div>
              <button
                onClick={() =>
                  downloadFile(
                    "audit-history.csv",
                    [
                      ["time", "admin", "action", "resource"],
                      ...entries.map((entry) => [
                        entry.at.toISOString(),
                        entry.actorEmail ?? entry.actorId ?? "Admin",
                        entry.action,
                        entry.resource,
                      ]),
                    ]
                      .map((row) => row.map(csvCell).join(","))
                      .join("\n"),
                    "text/csv",
                  )
                }
                className={smallOutline}
              >
                Export CSV
              </button>
            </div>
            {visible.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No audit entries match this search. Try a different term.
              </p>
            ) : (
              <ul className="space-y-2">
                {visible.map((entry) => (
                  <li
                    key={entry.id}
                    className="flex flex-wrap items-center gap-2 rounded-xl bg-gray-50 px-3 py-2.5 text-sm dark:bg-white/[0.035]"
                  >
                    <span className="rounded-md bg-green-100 px-1.5 py-0.5 text-[11px] font-semibold text-green-700 dark:bg-green-900/40 dark:text-green-300">
                      Success
                    </span>
                    <span className="font-medium text-gray-800 dark:text-gray-100">
                      {entry.action}
                    </span>
                    <span className="text-xs text-gray-500">
                      {entry.resource}
                    </span>
                    <span className="text-xs text-gray-500">
                      {entry.actorEmail ?? entry.actorId ?? "Admin"}
                    </span>
                    <span className="ml-auto text-xs text-gray-500">
                      {entry.at.toLocaleString()}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </>
        ))}
    </Panel>
  )
}
