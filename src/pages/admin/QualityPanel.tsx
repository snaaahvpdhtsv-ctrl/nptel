import { useMemo, useState } from "react"
import {
  AlertTriangle,
  BarChart3,
  CircleCheck,
  CircleX,
  FileWarning,
  Search,
} from "lucide-react"
import {
  buildQualityReport,
  type QualityKind,
  type QualitySeverity,
} from "../../lib/content-quality"
import type { AdminQuestion, Course, Paper, Week } from "../../lib/data"
import { Panel, PanelTitle, smallOutline } from "./ui"

const severityMeta: Record<QualitySeverity, {
  label: string
  tone: string
  icon: typeof AlertTriangle
}> = {
  critical: {
    label: "Critical",
    tone: "border-red-200 bg-red-50 text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200",
    icon: CircleX,
  },
  warning: {
    label: "Warning",
    tone: "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200",
    icon: AlertTriangle,
  },
  info: {
    label: "Info",
    tone: "border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-200",
    icon: FileWarning,
  },
}

const kindLabels: Record<QualityKind, string> = {
  duplicate: "Duplicates",
  explanation: "Explanations",
  publication: "Publication",
  reference: "References",
  difficulty: "Difficulty",
  completeness: "Completeness",
}

export function QualityPanel({
  courses,
  weeks,
  papers,
  questions,
  onOpen,
}: {
  courses: Course[]
  weeks: Week[]
  papers: Paper[]
  questions: Record<string, AdminQuestion[]>
  onOpen: (ownerType: "week" | "paper", ownerId: string) => void
}) {
  const report = useMemo(
    () => buildQualityReport(courses, weeks, papers, questions),
    [courses, weeks, papers, questions],
  )
  const [severity, setSeverity] = useState<QualitySeverity | "all">("all")
  const [kind, setKind] = useState<QualityKind | "all">("all")
  const [query, setQuery] = useState("")
  const term = query.trim().toLowerCase()
  const visible = report.issues.filter(
    (item) =>
      (severity === "all" || item.severity === severity) &&
      (kind === "all" || item.kind === kind) &&
      (!term ||
        [
          item.title,
          item.detail,
          item.questionId,
          item.questionText,
          item.ownerId,
          item.ownerTitle,
          item.courseId,
          item.courseTitle,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(term)),
  )
  const counts = {
    critical: report.issues.filter((item) => item.severity === "critical")
      .length,
    warning: report.issues.filter((item) => item.severity === "warning").length,
  }
  const categoryCounts = Object.entries(kindLabels)
    .map(([value, label]) => ({
      value: value as QualityKind,
      label,
      count: report.issues.filter((item) => item.kind === value).length,
    }))
    .filter((item) => item.count > 0)

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Panel className="sm:col-span-1">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Publication readiness
              </p>
              <p className="mt-1 font-display text-4xl font-bold text-gray-900 dark:text-white">
                {report.score}
                <span className="text-lg text-gray-400">/100</span>
              </p>
            </div>
            {report.score >= 80 ? (
              <CircleCheck className="text-green-600" size={28} />
            ) : (
              <AlertTriangle className="text-amber-600" size={28} />
            )}
          </div>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Based on {report.checkedRecords} content records and{" "}
            {report.issues.length} findings.
          </p>
        </Panel>
        <Panel>
          <PanelTitle title="Needs attention" icon={AlertTriangle} />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="font-display text-2xl font-bold text-red-600">
                {counts.critical}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Critical
              </p>
            </div>
            <div>
              <p className="font-display text-2xl font-bold text-amber-600">
                {counts.warning}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Warnings
              </p>
            </div>
          </div>
        </Panel>
        <Panel>
          <PanelTitle title="Difficulty distribution" icon={BarChart3} />
          {report.difficulty.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No question difficulty data yet.
            </p>
          ) : (
            <div className="space-y-2">
              {report.difficulty.map((item) => (
                <div key={item.label}>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600 dark:text-gray-300">
                      {item.label}
                    </span>
                    <span className="font-semibold tabular-nums text-gray-800 dark:text-white">
                      {item.count} · {item.percentage}%
                    </span>
                  </div>
                  <div className="mt-1 h-2 rounded-full bg-gray-100 dark:bg-white/10">
                    <div
                      className="h-full rounded-full bg-primary-500"
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>
        <Panel>
          <PanelTitle title="Issue categories" icon={FileWarning} />
          {categoryCounts.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No issue categories detected.
            </p>
          ) : (
            <div className="space-y-1.5">
              {categoryCounts.map((item) => (
                <div
                  key={item.value}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="text-gray-600 dark:text-gray-300">
                    {item.label}
                  </span>
                  <span className="font-semibold tabular-nums text-gray-800 dark:text-white">
                    {item.count}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>

      <Panel>
        <PanelTitle
          title="Content quality findings"
          subtitle="Resolve critical issues before publishing content."
          icon={FileWarning}
        />
        <div className="mb-4 flex flex-wrap gap-2">
          <div className="relative min-w-56 flex-1">
            <Search
              size={15}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              aria-label="Search quality findings"
              placeholder="Search findings..."
              className="input py-2 pl-9"
            />
          </div>
          <select
            value={severity}
            onChange={(event) =>
              setSeverity(event.target.value as QualitySeverity | "all")
            }
            aria-label="Filter quality severity"
            className="input w-auto py-2"
          >
            <option value="all">All severities</option>
            <option value="critical">Critical</option>
            <option value="warning">Warning</option>
          </select>
          <select
            value={kind}
            onChange={(event) =>
              setKind(event.target.value as QualityKind | "all")
            }
            aria-label="Filter quality category"
            className="input w-auto py-2"
          >
            <option value="all">All categories</option>
            {Object.entries(kindLabels).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
          {(query || severity !== "all" || kind !== "all") && (
            <button
              type="button"
              className={smallOutline}
              onClick={() => {
                setQuery("")
                setSeverity("all")
                setKind("all")
              }}
            >
              Clear filters
            </button>
          )}
        </div>
        {visible.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 px-5 py-10 text-center dark:border-white/10">
            <CircleCheck className="mx-auto text-green-500" size={28} />
            <p className="mt-3 font-semibold text-gray-800 dark:text-white">
              {report.issues.length === 0
                ? "Content quality looks clear"
                : "No findings match these filters"}
            </p>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {report.issues.length === 0
                ? "There are no detected publication blockers or quality warnings."
                : "Try clearing the search or choosing a different category."}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {visible.map((item) => {
              const meta = severityMeta[item.severity]
              const Icon = meta.icon
              return (
                <div
                  key={item.id}
                  className={`flex flex-wrap items-center gap-3 rounded-xl border p-3 ${meta.tone}`}
                >
                  <Icon size={17} className="shrink-0" />
                  <div className="min-w-0 flex-1 basis-full sm:basis-auto">
                    <p className="font-semibold">{item.title}</p>
                    <p className="text-sm opacity-85">{item.detail}</p>
                  </div>
                  <span className="rounded-full bg-white/60 px-2 py-1 text-xs font-semibold dark:bg-black/10">
                    {kindLabels[item.kind]}
                  </span>
                  {item.ownerId && item.ownerType && (
                    <button
                      type="button"
                      className={smallOutline}
                      onClick={() => onOpen(item.ownerType!, item.ownerId!)}
                    >
                      Open content
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </Panel>
    </div>
  )
}
