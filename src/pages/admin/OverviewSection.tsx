import { useState } from "react"
import { motion } from "motion/react"
import {
  ChevronRight,
  CircleCheck,
  CircleQuestionMark,
  FileText,
  Flag,
  Layers,
  MessageSquareText,
  TriangleAlert,
} from "lucide-react"
import { useApp } from "../../lib/app-context"
import type { Course, Paper, RequestItem, Week } from "../../lib/data"
import { reportHeadline } from "../../lib/reports"
import type { SectionId } from "./AdminNav"
import { knownLists, questionFlags } from "./ContentPanels"
import {
  downloadFile,
  Panel,
  PanelTitle,
  smallOutline,
  Tile,
  type IconType,
} from "./ui"

interface HealthResult {
  courseId: string
  issues: string[]
}

type AttentionKind = "request" | "report" | "week" | "health"

interface AttentionItem {
  key: string
  kind: AttentionKind
  title: string
  detail: string
  target: SectionId
  weekId?: string
}

interface AttentionStyle {
  icon: IconType
  tone: string
}

const attentionStyles: Record<AttentionKind, AttentionStyle> = {
  request: {
    icon: MessageSquareText,
    tone: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
  },
  report: {
    icon: Flag,
    tone: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300",
  },
  week: {
    icon: Layers,
    tone: "bg-primary-100 text-primary-700 dark:bg-primary-500/15 dark:text-primary-300",
  },
  health: {
    icon: TriangleAlert,
    tone: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300",
  },
}

interface QueueCount {
  label: string
  value: number | string
}

const ATTENTION_LIMIT = 6

const plural = (count: number, word: string) =>
  `${count} ${word}${count === 1 ? "" : "s"}`

/** The managed course at a glance: key numbers, what needs attention, and content health. */
export function OverviewSection({
  course,
  weeks,
  papers,
  pending,
  audit,
  onOpen,
  /** This course's weeks and papers. */
  /** Pending learner requests from every course. */
}: {
  course: Course
  weeks: Week[]
  papers: Paper[]
  pending: RequestItem[]
  audit: (action: string, resource?: string) => void
  onOpen: (section: SectionId, weekId?: string) => void
}) {
  const { adminQuestions } = useApp()
  const [checking, setChecking] = useState(false)
  // Results are tagged with their course, so switching courses never shows another course's issues.
  const [health, setHealth] = useState<HealthResult | null>(null)
  const healthIssues = health?.courseId === course.id ? health.issues : null

  const totalQuestions = weeks.reduce(
    (sum, week) => sum + week.questionCount,
    0,
  )
  const publishedWeeks = weeks.filter((week) => week.status === "published")
  const draftWeeks = weeks.filter((week) => week.status === "draft")
  const paperQuestions = papers.reduce(
    (sum, paper) => sum + paper.questionCount,
    0,
  )
  const courseQuestions = [...weeks, ...papers].flatMap(
    (item) => adminQuestions[item.id] ?? [],
  )
  const texts = courseQuestions
    .map((question) => question.questionText.trim().toLowerCase())
    .filter(Boolean)
  const queues: QueueCount[] = [
    {
      label: "Missing answers",
      value: courseQuestions.filter(
        (question) =>
          question.correctAnswerIndex < 0 ||
          question.correctAnswerIndex >= question.optionCount,
      ).length,
    },
    { label: "Duplicate questions", value: texts.length - new Set(texts).size },
    {
      label: "Unreviewed imports",
      value: courseQuestions.filter(
        (question) =>
          question.id.startsWith("import-") && question.status === "draft",
      ).length,
    },
    // Needs learners' answers, which this preview doesn't collect.
    { label: "High failure rate", value: "—" },
    {
      label: "Reported errors",
      value: pending.filter(
        (item) => item.type === "report" && item.courseId === course.id,
      ).length,
    },
  ]
  const flagCount = healthIssues ? questionFlags(courseQuestions).length : 0

  const attention: AttentionItem[] = [
    ...pending.map(
      (item): AttentionItem =>
        item.report
          ? {
              key: `request-${item.id}`,
              kind: "report",
              title: "Check an error report",
              detail: reportHeadline(item.report),
              target: "requests",
            }
          : {
              key: `request-${item.id}`,
              kind: "request",
              title: "Reply to a learner request",
              detail: item.message,
              target: "requests",
            },
    ),
    ...draftWeeks.map(
      (week): AttentionItem => ({
        key: `week-${week.id}`,
        kind: "week",
        title: `Review Week ${week.weekNumber} (draft)`,
        detail: week.title,
        target: "weeks",
        weekId: week.id,
      }),
    ),
    ...(healthIssues ?? []).map(
      (issue, index): AttentionItem => ({
        key: `health-${index}`,
        kind: "health",
        title: "Fix a content issue",
        detail: issue,
        target: "weeks",
      }),
    ),
  ]

  const stats: {
    icon: IconType
    value: number
    label: string
    detail: string
    gradient: string
    target: SectionId
  }[] = [
    {
      icon: Layers,
      value: weeks.length,
      label: "Weeks",
      detail: `${publishedWeeks.length} published · ${draftWeeks.length} draft`,
      gradient: "from-violet-600 to-indigo-700",
      target: "weeks",
    },
    {
      icon: CircleQuestionMark,
      value: totalQuestions,
      label: "Questions",
      detail: `Across ${plural(weeks.length, "week")}`,
      gradient: "from-orange-700 to-pink-700",
      target: "weeks",
    },
    {
      icon: FileText,
      value: papers.length,
      label: "PYQ papers",
      detail: plural(paperQuestions, "question"),
      gradient: "from-emerald-700 to-teal-700",
      target: "papers",
    },
    {
      icon: MessageSquareText,
      value: pending.length,
      label: "Pending requests",
      detail: "From every course",
      gradient: "from-fuchsia-700 to-primary-700",
      target: "requests",
    },
  ]

  const runHealthCheck = () => {
    setChecking(true)
    window.setTimeout(() => {
      const issues: string[] = []
      for (const week of weeks) {
        const list = adminQuestions[week.id]
        if (week.status === "published" && week.questionCount === 0)
          issues.push(`Week ${week.weekNumber} is published with no questions.`)
        if (!week.title.trim())
          issues.push(`Week ${week.weekNumber} has no title.`)
        if (
          list &&
          knownLists.has(week.id) &&
          list.length !== week.questionCount
        )
          issues.push(`Week ${week.weekNumber}: question count is out of date.`)
        if (list?.some((question) => !question.questionText.trim()))
          issues.push(`Week ${week.weekNumber}: a question has no text.`)
      }
      setHealth({ courseId: course.id, issues })
      setChecking(false)
      audit("Content health check", "Content")
    }, 700)
  }

  const exportHealthReport = () =>
    downloadFile(
      "content-health-report.json",
      JSON.stringify(
        {
          course: course.title,
          checkedAt: new Date().toISOString(),
          issues: healthIssues,
        },
        null,
        2,
      ),
      "application/json",
    )

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {stats.map(
          ({ icon: Icon, value, label, detail, gradient, target }, index) => (
            <motion.button
              key={label}
              type="button"
              onClick={() => onOpen(target)}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`relative overflow-hidden rounded-2xl bg-gradient-to-br p-4 text-left text-white shadow-lg transition-shadow hover:shadow-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500 sm:p-5 ${gradient}`}
            >
              <Icon size={20} aria-hidden="true" />
              <span className="mt-2 block font-display text-2xl font-bold tabular-nums sm:text-3xl">
                {value}
              </span>
              <span className="block text-sm font-semibold">{label}</span>
              <span className="block truncate text-xs text-white/90">
                {detail}
              </span>
              <span
                className="pointer-events-none absolute -bottom-10 -right-6 h-28 w-28 rounded-full bg-white/10"
                aria-hidden="true"
              />
            </motion.button>
          ),
        )}
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-2">
        <Panel>
          <PanelTitle
            title="Needs attention"
            subtitle={
              attention.length
                ? `${plural(attention.length, "item")} waiting on you`
                : "Learner requests, draft weeks and content issues show up here."
            }
          />
          {attention.length === 0 ? (
            <p className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <CircleCheck
                size={16}
                className="shrink-0 text-green-600 dark:text-green-400"
                aria-hidden="true"
              />
              All caught up — nothing needs your attention.
            </p>
          ) : (
            <>
              <ul className="space-y-2">
                {attention.slice(0, ATTENTION_LIMIT).map((item) => {
                  const { icon: Icon, tone } = attentionStyles[item.kind]
                  return (
                    <li key={item.key}>
                      <button
                        type="button"
                        onClick={() => onOpen(item.target, item.weekId)}
                        className="group flex w-full items-center gap-3 rounded-xl bg-gray-50 px-3 py-2.5 text-left text-sm transition-colors hover:bg-gray-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500 dark:bg-white/[0.035] dark:hover:bg-white/5"
                      >
                        <span
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${tone}`}
                          aria-hidden="true"
                        >
                          <Icon size={16} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block font-medium text-gray-800 dark:text-gray-100">
                            {item.title}
                          </span>
                          <span className="block truncate text-xs text-gray-600 dark:text-gray-400">
                            {item.detail}
                          </span>
                        </span>
                        <ChevronRight
                          size={16}
                          className="shrink-0 text-gray-400 transition-colors group-hover:text-primary-600 dark:group-hover:text-primary-300"
                          aria-hidden="true"
                        />
                      </button>
                    </li>
                  )
                })}
              </ul>
              {attention.length > ATTENTION_LIMIT && (
                <p className="mt-2 text-xs text-gray-600 dark:text-gray-400">
                  +{attention.length - ATTENTION_LIMIT} more
                </p>
              )}
            </>
          )}
        </Panel>

        <Panel>
          <PanelTitle
            title="Content health"
            subtitle="Checks this course's weeks for structural and metadata problems."
            action={
              <>
                {healthIssues && (
                  <button onClick={exportHealthReport} className={smallOutline}>
                    Export report
                  </button>
                )}
                <button
                  onClick={runHealthCheck}
                  disabled={checking}
                  className={smallOutline}
                >
                  {checking
                    ? "Checking…"
                    : healthIssues
                      ? "Run again"
                      : "Run health check"}
                </button>
              </>
            }
          />
          <div role="status">
            {!healthIssues ? (
              <p className="text-sm text-gray-600 dark:text-gray-400">
                No check has run for this course yet.
              </p>
            ) : healthIssues.length === 0 ? (
              <p className="text-sm text-green-700 dark:text-green-400">
                No structural or metadata issues found.
              </p>
            ) : (
              <ul className="space-y-1.5 text-sm text-amber-800 dark:text-amber-300">
                {healthIssues.map((issue) => (
                  <li key={issue}>· {issue}</li>
                ))}
              </ul>
            )}
            {flagCount > 0 && (
              <p className="mt-2 text-xs text-gray-600 dark:text-gray-400">
                Question review adds {plural(flagCount, "metadata flag")}.
              </p>
            )}
          </div>
          <h3 className="mb-2 mt-5 text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400">
            Review queues
          </h3>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {queues.map((queue) => (
              <Tile key={queue.label} value={queue.value} label={queue.label} />
            ))}
          </div>
        </Panel>
      </div>

      <Panel>
        <PanelTitle
          title="Learner activity"
          subtitle="Quiz progress is saved on each learner's device in this preview, so these figures fill in once progress syncs to a server."
        />
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            "Active learners",
            "Quiz attempts",
            "Average accuracy",
            "Inactive learners",
          ].map((label) => (
            <Tile key={label} value="—" label={label} />
          ))}
        </div>
      </Panel>
    </div>
  )
}
