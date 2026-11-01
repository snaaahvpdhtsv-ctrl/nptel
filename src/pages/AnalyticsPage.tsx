import { Link } from "react-router"
import { motion } from "motion/react"
import {
  ChartColumn,
  Flame,
  ListChecks,
  RotateCcwClock,
  Target,
  Trophy,
  Zap,
  type LucideIcon,
} from "lucide-react"
import { BackLink, EmptyState, PageHeader } from "../components/common"
import { useCourse } from "../lib/course-context"
import { useCourseProgress } from "../lib/course-progress"
import {
  accuracyTone,
  dailyActivity,
  formatTotalTime,
  recentAccuracy,
  type DayActivity,
  type WeekProgress,
} from "../lib/progress"
import { useProgress } from "../lib/progress-context"

const shortDate = new Intl.DateTimeFormat(undefined, {
  day: "numeric",
  month: "short",
})

const barTone = {
  good: "bg-green-500",
  fair: "bg-amber-500",
  low: "bg-red-500",
}

const plural = (count: number, word: string, many = `${word}s`) =>
  `${count} ${count === 1 ? word : many}`

function StatTile({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: LucideIcon
  label: string
  value: string | number
  tone: string
}) {
  return (
    <div className="analytics-stat card flex items-center gap-3 p-4">
      <span
        className={`analytics-stat-icon flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-gradient-to-br from-white to-gray-50 shadow-sm dark:border-gray-600 dark:from-gray-700 dark:to-gray-800 ${tone}`}
      >
        <Icon size={18} />
      </span>
      <div className="min-w-0">
        <p className="font-display text-2xl font-bold leading-none tabular-nums text-gray-800 dark:text-white">
          {value}
        </p>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{label}</p>
      </div>
    </div>
  )
}

function ActivityChart({ days }: { days: DayActivity[] }) {
  const max = Math.max(1, ...days.map((day) => day.answered))
  const total = days.reduce((sum, day) => sum + day.answered, 0)
  const busiest = days.reduce(
    (best, day) => (day.answered > best.answered ? day : best),
    days[0],
  )
  const summary = total
    ? `Questions answered in the last ${days.length} days: ${total} in total, most on ${shortDate.format(busiest.date)} (${busiest.answered}).`
    : `No questions answered in the last ${days.length} days.`

  return (
    <section className="card p-5" aria-labelledby="activity-heading">
      <div className="flex items-baseline justify-between gap-3">
        <h2
          id="activity-heading"
          className="font-display font-bold text-gray-800 dark:text-white"
        >
          Last {days.length} days
        </h2>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {plural(total, "question")} answered
        </p>
      </div>
      <div
        role="img"
        aria-label={summary}
        className="activity-chart mt-5 flex h-40 items-stretch gap-1 sm:gap-2"
      >
        {days.map((day, index) => {
          const today = index === days.length - 1
          return (
            <div
              key={day.key}
              title={`${shortDate.format(day.date)}: ${plural(day.answered, "question")}`}
              className="flex flex-1 flex-col items-center gap-1.5"
            >
              <div className="flex w-full flex-1 items-end">
                <div
                  data-today={today && day.answered > 0}
                  className={`w-full rounded-t-md ${
                    day.answered === 0
                      ? "bg-gray-200 dark:bg-gray-700/70"
                      : today
                        ? "bg-gradient-to-t from-primary-600 to-accent-400"
                        : "bg-primary-400/80 dark:bg-primary-500/70"
                  }`}
                  style={{
                    height: day.answered
                      ? `${Math.max(6, (day.answered / max) * 100)}%`
                      : "3px",
                  }}
                />
              </div>
              <span
                className={`text-[10px] tabular-nums ${
                  today
                    ? "font-bold text-primary-600 dark:text-primary-400"
                    : "text-gray-400 dark:text-gray-500"
                }`}
              >
                {day.date.getDate()}
              </span>
            </div>
          )
        })}
      </div>
    </section>
  )
}

function AccuracyChart({
  entries,
}: {
  entries: ReturnType<typeof recentAccuracy>
}) {
  const quizzes = plural(entries.length, "quiz", "quizzes")
  const summary = `Accuracy of your last ${quizzes}, oldest to newest: ${entries
    .map((entry) => `${entry.accuracy}%`)
    .join(", ")}.`

  return (
    <section className="card p-5" aria-labelledby="accuracy-heading">
      <div className="flex items-baseline justify-between gap-3">
        <h2
          id="accuracy-heading"
          className="font-display font-bold text-gray-800 dark:text-white"
        >
          Recent accuracy
        </h2>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Last {quizzes}
        </p>
      </div>
      <div
        role="img"
        aria-label={summary}
        className="accuracy-chart mt-5 flex h-40 items-stretch gap-2 sm:gap-3"
      >
        {entries.map(({ attempt, accuracy, correct, total }) => (
          <div
            key={attempt.id}
            title={`${shortDate.format(new Date(attempt.completedAt))}: ${correct}/${total} (${accuracy}%)`}
            className="accuracy-chart-entry flex flex-1 flex-col items-center gap-1.5"
          >
            <div className="flex w-full flex-1 items-end justify-center">
              <div
                className={`accuracy-chart-bar w-full max-w-10 rounded-t-md ${barTone[accuracyTone(accuracy)]}`}
                style={{ height: `${Math.max(3, accuracy)}%` }}
              />
            </div>
            <span className="text-[10px] font-semibold tabular-nums text-gray-500 dark:text-gray-400">
              {accuracy}%
            </span>
          </div>
        ))}
      </div>
    </section>
  )
}

function WeekRow({
  entry,
  reviewTo,
}: {
  entry: WeekProgress
  reviewTo: string
}) {
  const { week } = entry
  return (
    <li className="analytics-week-row grid grid-cols-1 gap-2 py-3 sm:grid-cols-[minmax(0,15rem)_1fr_auto] sm:items-center sm:gap-5">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">
          Week {week.weekNumber}
        </p>
        <p className="truncate text-xs text-gray-500 dark:text-gray-400">
          {week.title}
        </p>
      </div>
      {entry.available === 0 ? (
        <p className="analytics-week-unavailable text-xs italic text-gray-400 dark:text-gray-500 sm:col-span-2">
          No sample questions in this preview
        </p>
      ) : (
        <>
          <div className="flex items-center gap-3">
            <div
              role="progressbar"
              aria-label={`Week ${week.weekNumber} mastered`}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={entry.percent}
              aria-valuetext={`${entry.mastered} of ${entry.available} mastered`}
              className="h-2 flex-1 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700/70"
            >
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary-500 to-accent-400"
                style={{ width: `${entry.percent}%` }}
              />
            </div>
            <span className="w-24 shrink-0 text-right text-xs tabular-nums text-gray-600 dark:text-gray-300">
              {entry.mastered}/{entry.available} mastered
            </span>
          </div>
          <div className="analytics-week-summary flex items-center justify-between gap-3 sm:justify-end">
            <span className="text-xs text-gray-500 dark:text-gray-400 sm:w-24 sm:text-right">
              {entry.accuracy === null
                ? "Not practised"
                : `${entry.accuracy}% accuracy`}
            </span>
            <span className="flex w-16 justify-end">
              {entry.mistakeIds.length > 0 ? (
                <Link
                  to={reviewTo}
                  aria-label={`Review ${plural(entry.mistakeIds.length, "mistake")} in week ${week.weekNumber}`}
                  className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold whitespace-nowrap text-red-700 transition-colors hover:bg-red-100 dark:bg-red-500/10 dark:text-red-300 dark:hover:bg-red-500/20"
                >
                  {entry.mistakeIds.length} to fix
                </Link>
              ) : entry.done ? (
                <span className="rounded-full bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-700 dark:bg-green-500/10 dark:text-green-300">
                  Done
                </span>
              ) : null}
            </span>
          </div>
        </>
      )}
    </li>
  )
}

export default function AnalyticsPage() {
  const { course, path } = useCourse()
  const { streak } = useProgress()
  const { attempts, weeks, weeksDone, accuracy, totalSeconds, mistakes } =
    useCourseProgress()

  return (
    <div className="learner-page analytics-page mx-auto max-w-5xl px-4 py-8">
      <BackLink to={path()} label="Home" />
      <PageHeader
        icon={ChartColumn}
        title="Analytics"
        gradient="purple"
        subtitle={
          attempts.length
            ? `${course.title} · ${formatTotalTime(totalSeconds)} practised`
            : course.title
        }
      />

      {attempts.length === 0 ? (
        <EmptyState icon={ChartColumn} title="No data yet">
          <p className="mx-auto mt-2 max-w-sm text-sm text-gray-500 dark:text-gray-400">
            Finish a practice quiz to see your streak, accuracy and weekly
            progress.
          </p>
          <Link
            to={path("/practice")}
            className="btn-primary mt-5 inline-flex px-5 py-2.5"
          >
            <Zap size={16} />
            Start practising
          </Link>
        </EmptyState>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatTile
              icon={Flame}
              label="Day streak"
              value={streak}
              tone="text-orange-500"
            />
            <StatTile
              icon={ListChecks}
              label="Quizzes taken"
              value={attempts.length}
              tone="text-primary-500"
            />
            <StatTile
              icon={Target}
              label="Accuracy"
              value={accuracy === null ? "—" : `${accuracy}%`}
              tone="text-emerald-500"
            />
            <StatTile
              icon={Trophy}
              label="Weeks done"
              value={`${weeksDone}/${weeks.length}`}
              tone="text-amber-500"
            />
          </div>

          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
            <ActivityChart days={dailyActivity(attempts)} />
            <AccuracyChart entries={recentAccuracy(attempts)} />
          </div>

          <section className="card mt-6 p-5" aria-labelledby="weeks-heading">
            <h2
              id="weeks-heading"
              className="font-display font-bold text-gray-800 dark:text-white"
            >
              By week
            </h2>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
              A question counts as mastered when your latest answer is correct.
            </p>
            <ul className="mt-3 divide-y divide-gray-200 dark:divide-white/10">
              {weeks.map((entry) => (
                <WeekRow
                  key={entry.week.id}
                  entry={entry}
                  reviewTo={path(`/review?week=${entry.week.id}`)}
                />
              ))}
            </ul>
          </section>

          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              to={path("/history")}
              className="btn-outline px-5 py-2.5 text-sm"
            >
              <RotateCcwClock size={16} />
              View quiz history
            </Link>
            <Link
              to={path("/review")}
              className="btn-outline px-5 py-2.5 text-sm"
            >
              <Target size={16} />
              Review mistakes
              {mistakes.length > 0 && ` (${mistakes.length})`}
            </Link>
          </div>
        </motion.div>
      )}
    </div>
  )
}
