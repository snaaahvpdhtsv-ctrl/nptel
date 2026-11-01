import { Link, useSearchParams } from "react-router"
import { CircleCheck, Target, Zap } from "lucide-react"
import { BackLink, EmptyState, PageHeader } from "../components/common"
import { QuestionCard } from "../components/QuestionCard"
import { useApp } from "../lib/app-context"
import { useCourse } from "../lib/course-context"
import { useCourseProgress } from "../lib/course-progress"
import { mistakesSubpath } from "../lib/progress"
import { useProgress } from "../lib/progress-context"

const chipBase =
  "inline-flex min-h-9 items-center rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors"

const chipTone = {
  active:
    "border-primary-500 bg-primary-50 text-primary-700 dark:border-primary-400/70 dark:bg-primary-500/15 dark:text-primary-200",
  idle: "border-gray-200 bg-white/70 text-gray-600 hover:border-primary-300 hover:text-primary-700 dark:border-gray-700 dark:bg-white/[0.03] dark:text-gray-300 dark:hover:border-primary-500/60 dark:hover:text-primary-200",
}

export default function ReviewPage() {
  const { path } = useCourse()
  const { attempts, mistakes, weeks } = useCourseProgress()
  const { savedIds, toggleSaved } = useProgress()
  const { toast } = useApp()
  const [params, setParams] = useSearchParams()

  const weeksWithMistakes = weeks.filter((entry) => entry.mistakeIds.length > 0)
  // `?week=` narrows the list; a week without mistakes falls back to all weeks.
  const activeWeek =
    weeksWithMistakes.find((entry) => entry.week.id === params.get("week"))
      ?.week.id ?? null
  const shown = activeWeek
    ? mistakes.filter((mistake) => mistake.weekId === activeWeek)
    : mistakes
  const groups = weeksWithMistakes
    .filter((entry) => !activeWeek || entry.week.id === activeWeek)
    .map((entry) => ({
      entry,
      items: shown.filter((mistake) => mistake.weekId === entry.week.id),
    }))

  const selectWeek = (weekId: string | null) =>
    setParams(
      (current) => {
        const next = new URLSearchParams(current)
        if (weekId) next.set("week", weekId)
        else next.delete("week")
        return next
      },
      { replace: true },
    )

  const toggleBookmark = (questionId: string) => {
    const saved = savedIds.includes(questionId)
    toggleSaved(questionId)
    toast(saved ? "Removed from Saved Questions" : "Saved to Saved Questions")
  }

  const weekCount = weeksWithMistakes.length

  return (
    <div className="learner-page review-page mx-auto max-w-4xl px-4 py-8">
      <BackLink to={path()} label="Home" />
      <PageHeader
        icon={Target}
        title="Review Mistakes"
        gradient="orange"
        subtitle={
          mistakes.length
            ? `${mistakes.length} question${
                mistakes.length === 1 ? "" : "s"
              } to fix across ${weekCount} week${weekCount === 1 ? "" : "s"}`
            : "Questions whose latest answer was wrong"
        }
      />

      {attempts.length === 0 ? (
        <EmptyState
          icon={Target}
          title="Mistakes from your quizzes will appear here"
        >
          <p className="mx-auto mt-2 max-w-sm text-sm text-gray-500 dark:text-gray-400">
            A question you answer wrong in a practice quiz stays here until you
            get it right.
          </p>
          <Link
            to={path("/practice")}
            className="btn-primary mt-5 inline-flex px-5 py-2.5"
          >
            <Zap size={16} />
            Start practising
          </Link>
        </EmptyState>
      ) : mistakes.length === 0 ? (
        <EmptyState icon={CircleCheck} title="No mistakes to fix. Nice work!">
          <p className="mx-auto mt-2 max-w-sm text-sm text-gray-500 dark:text-gray-400">
            Every question you've practised is currently answered correctly.
          </p>
          <Link
            to={path("/practice")}
            className="btn-primary mt-5 inline-flex px-5 py-2.5"
          >
            <Zap size={16} />
            Practise more
          </Link>
        </EmptyState>
      ) : (
        <>
          <div className="review-filters card mb-8 flex flex-wrap items-center justify-between gap-4 p-4">
            <div
              role="group"
              aria-label="Filter by week"
              className="flex flex-wrap gap-2"
            >
              <button
                type="button"
                aria-pressed={!activeWeek}
                onClick={() => selectWeek(null)}
                className={`${chipBase} ${chipTone[activeWeek ? "idle" : "active"]}`}
              >
                All ({mistakes.length})
              </button>
              {weeksWithMistakes.map((entry) => {
                const active = activeWeek === entry.week.id
                return (
                  <button
                    key={entry.week.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => selectWeek(entry.week.id)}
                    className={`${chipBase} ${chipTone[active ? "active" : "idle"]}`}
                  >
                    Week {entry.week.weekNumber} ({entry.mistakeIds.length})
                  </button>
                )
              })}
            </div>
            <Link
              to={path(
                mistakesSubpath(shown.map((mistake) => mistake.question.id)),
              )}
              className="btn-primary px-5 py-2.5 text-sm"
            >
              <Zap size={16} />
              {shown.length === 1
                ? "Practise this question"
                : `Practise these ${shown.length}`}
            </Link>
          </div>

          <div className="space-y-10">
            {groups.map(({ entry, items }) => (
              <section
                key={entry.week.id}
                aria-labelledby={`review-week-${entry.week.id}`}
              >
                <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
                  <h2
                    id={`review-week-${entry.week.id}`}
                    className="font-display text-lg font-bold text-gray-800 dark:text-white"
                  >
                    Week {entry.week.weekNumber}
                    <span className="ml-2 text-sm font-normal text-gray-500 dark:text-gray-400">
                      {entry.week.title}
                    </span>
                  </h2>
                  <span className="text-xs font-semibold text-red-600 dark:text-red-400">
                    {items.length} to fix
                  </span>
                </div>
                <div className="space-y-4">
                  {items.map((mistake, index) => (
                    <QuestionCard
                      key={mistake.question.id}
                      question={mistake.question}
                      index={index}
                      showAnswer
                      chosenIndex={mistake.chosenIndex}
                      isBookmarked={savedIds.includes(mistake.question.id)}
                      onToggleBookmark={toggleBookmark}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
