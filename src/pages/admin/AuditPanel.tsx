import { useState } from "react"
import { Search } from "lucide-react"
import { csvCell, downloadFile, Panel, smallOutline } from "./ui"

export interface AuditEntry {
  id: number
  action: string
  resource: string
  at: Date
}

export function AuditPanel({ entries }: { entries: AuditEntry[] }) {
  const [state, setState] = useState<"idle" | "loading" | "loaded">("idle")
  const [query, setQuery] = useState("")
  const term = query.trim().toLowerCase()
  const visible = entries.filter(
    (entry) =>
      !term || `${entry.action} ${entry.resource}`.toLowerCase().includes(term),
  )

  return (
    <Panel>
      <div
        className={`flex flex-wrap items-center justify-between gap-3 ${
          state === "loaded" ? "mb-4" : ""
        }`}
      >
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {state === "loaded"
            ? `${entries.length} ${
                entries.length === 1 ? "entry" : "entries"
              } from this browser session`
            : "Load the history to review changes made in this browser session."}
        </p>
        <button
          onClick={() => {
            setState("loading")
            window.setTimeout(() => setState("loaded"), 450)
          }}
          disabled={state === "loading"}
          className={smallOutline}
        >
          {state === "loading"
            ? "Loading…"
            : state === "loaded"
              ? "Refresh"
              : "Load history"}
        </button>
      </div>
      {state === "loaded" &&
        (entries.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            No audit entries yet. Admin actions will appear here.
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
                        "Owner",
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
                No audit entries match these filters. Try clearing one or more
                filters.
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
                    <span className="ml-auto text-xs text-gray-500">
                      Owner ·{" "}
                      {entry.at.toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
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
