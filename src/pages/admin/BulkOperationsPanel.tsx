import { useMemo, useState } from "react"
import { Download, RotateCcw, Search } from "lucide-react"
import type { BulkOperation } from "../../lib/cloud-content"
import { downloadFile, smallOutline, smallPrimary } from "./ui"

export function BulkOperationsPanel({
  operations,
  onRollback,
}: {
  operations: BulkOperation[]
  onRollback: (operation: BulkOperation) => Promise<void>
}) {
  const [query, setQuery] = useState("")
  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase()
    return operations.filter(
      (operation) =>
        !term ||
        `${operation.id} ${operation.fileName ?? ""} ${operation.type} ${operation.status}`
          .toLowerCase()
          .includes(term),
    )
  }, [operations, query])
  const downloadReport = (operation: BulkOperation) => {
    downloadFile(
      `bulk-operation-${operation.id}.json`,
      JSON.stringify(operation, null, 2),
      "application/json",
    )
  }
  return (
    <section className="card p-5 sm:p-6">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-bold text-gray-800 dark:text-white">
            Bulk operation history
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Trusted import and bulk-edit outcomes. Rollback only removes records
            created by the selected import.
          </p>
        </div>
        <div className="relative min-w-56">
          <Search
            size={15}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label="Search bulk operations"
            placeholder="Search operations"
            className="input py-2 pl-9"
          />
        </div>
      </div>
      {filtered.length === 0 ? (
        <p className="rounded-lg border border-dashed border-gray-300 px-4 py-8 text-center text-sm text-gray-500 dark:border-white/10 dark:text-gray-400">
          {operations.length === 0
            ? "No trusted bulk operations have been recorded yet."
            : "No operations match this search."}
        </p>
      ) : (
        <div className="space-y-2">
          {filtered.map((operation) => (
            <article
              key={operation.id}
              className="rounded-xl border border-gray-200 p-3 dark:border-white/10"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-gray-800 dark:text-white">
                    {operation.type} · {operation.fileName ?? operation.id}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {operation.succeeded}/{operation.total} successful ·{" "}
                    {operation.status} · {operation.createdAt}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className={smallOutline}
                    onClick={() => downloadReport(operation)}
                  >
                    <Download size={14} /> Report
                  </button>
                  {operation.type === "import" &&
                    operation.status === "completed" && (
                      <button
                        type="button"
                        className={smallPrimary}
                        onClick={() => void onRollback(operation)}
                      >
                        <RotateCcw size={14} /> Roll back
                      </button>
                    )}
                </div>
              </div>
              <details className="mt-2 text-xs text-gray-600 dark:text-gray-300">
                <summary className="cursor-pointer font-medium">
                  View row results ({operation.results.length})
                </summary>
                <ul className="mt-2 space-y-1">
                  {operation.results.map((result, index) => (
                    <li key={`${result.questionId ?? "row"}-${index}`}>
                      Row {result.row || "—"} · {result.questionId ?? "—"} ·{" "}
                      {result.status} · {result.reason}
                    </li>
                  ))}
                </ul>
              </details>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
