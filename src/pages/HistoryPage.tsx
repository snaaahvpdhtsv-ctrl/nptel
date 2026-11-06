import { useState } from "react"
import { Link } from "react-router"
import { motion } from "motion/react"
import {
  ChevronDown,
  CircleCheck,
  CircleX,
  RefreshCw,
  RotateCcwClock,
  Timer,
  Trash2,
  Zap,
} from "lucide-react"
import { BackLink, EmptyState, PageHeader } from "../components/common"
import { useApp } from "../lib/app-context"
import { useCourse } from "../lib/course-context"
import { useCourseProgress } from "../lib/course-progress"
import {
  accuracyTone,
  attemptScore,
  attemptTitle,
  dayLabel,
  formatClock,
  localDayKey,
  relativeDay,
  retakeSubpath,
  type AttemptAnswer,
  type QuizAttempt,
} from "../lib/progress"
import { useProgress } from "../lib/progress-context"
import { findQuestion } from "../lib/question-bank"
import { ConfirmDialog, type ConfirmState } from "./admin/ui"

const PAGE_SIZE = 20

const timeFormat = new Intl.DateTimeFormat(undefined, {
  hour: "numeric",
  minute: "2-digit",
})

const scoreTone = {
  good: "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-300",
  fair: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  low: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300",
}

const chip =
  "rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600 dark:bg-white/[0.06] dark:text-gray-300"

interface DayGroup {
  key: string
  label: string
  attempts: QuizAttempt[]
}

function AnswerRow({
  answer,
  position,
}: {
  answer: AttemptAnswer
  position: number
}) {
  const { questionBank } = useApp()
  const liveQuestion = findQuestion(answer.questionId, questionBank)?.question
  const question =
    answer.questionText &&
    answer.options &&
    Number.isInteger(answer.correctAnswerIndex)
      ? {
          id: answer.questionId,
          questionText: answer.questionText,
          options: answer.options,
          correctAnswerIndex: answer.correctAnswerIndex ?? -1,
        }
      : liveQuestion
  const Icon = answer.correct ? CircleCheck : CircleX
  return (
    <li className="history-answer flex gap-3 rounded-xl bg-gray-50 px-3 py-2.5 text-sm dark:bg-white/[0.035]">
      <Icon
        size={18}
        aria-hidden="true"
        className={`mt-0.5 shrink-0 ${
          answer.correct ? "text-green-500" : "text-red-500"
        }`}
      />
      <div className="min-w-0 flex-1">
        <span className="sr-only">
          {answer.correct ? "Correct." : "Incorrect."}
        </span>
        {question ? (
          <>
            {!liveQuestion && (
              <p className="mb-1 text-xs text-gray-500 dark:text-gray-400">
                Question content archived; showing the saved attempt version.
              </p>
            )}
            <p className="line-clamp-2 text-gray-800 dark:text-gray-100">
              <span className="font-semibold">Q{position + 1}.</span>{" "}
              {question.questionText}
            </p>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Your answer:{" "}
              {question.options[answer.chosenIndex] ?? "Unavailable"}
            </p>
            {!answer.correct && (
              <p className="mt-0.5 text-xs font-medium text-green-700 dark:text-green-400">
                Correct answer: {question.options[question.correctAnswerIndex]}
              </p>
            )}
          </>
        ) : (
          <p className="italic text-gray-500 dark:text-gray-400">
            Q{position + 1}. This question is no longer available
          </p>
        )}
      </div>
    </li>
  )
}

function AttemptCard({
  attempt,
  title,
  retakeTo,
}: {
  attempt: QuizAttempt
  title: string
  retakeTo: string
}) {
  const [open, setOpen] = useState(false)
  const { correct, total, accuracy } = attemptScore(attempt)
  const panelId = `attempt-${attempt.id}-answers`

  return (
    <article className="history-attempt-card card p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-semibold font-display text-gray-800 dark:text-white">
            {title}
          </h3>
          <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1.5 text-xs text-gray-500 dark:text-gray-400">
            <time dateTime={attempt.completedAt}>
              {timeFormat.format(new Date(attempt.completedAt))}
            </time>
            <span aria-hidden="true">·</span>
            <span className="inline-flex items-center gap-1">
              <Timer size={12} aria-hidden="true" />
              <span className="sr-only">Time taken</span>
              {formatClock(attempt.durationSeconds)}
            </span>
            <span className={chip}>
              {attempt.shuffleQuestions ? "Jumbled" : "In order"}
            </span>
            <span className={chip}>
              {attempt.shuffleOptions ? "Shuffled options" : "Original options"}
            </span>
          </p>
        </div>
        <p
          className={`shrink-0 rounded-full px-3 py-1 text-sm font-bold tabular-nums ${scoreTone[accuracyTone(accuracy)]}`}
        >
          {correct}/{total}
          <span className="font-semibold opacity-80"> · {accuracy}%</span>
        </p>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          aria-controls={panelId}
          className="btn-ghost px-3 py-1.5 text-sm"
        >
          <ChevronDown
            size={15}
            className={`transition-transform ${open ? "rotate-180" : ""}`}
          />
          {open ? "Hide answers" : "Show answers"}
        </button>
        <Link to={retakeTo} className="btn-outline px-3 py-1.5 text-sm">
          <RefreshCw size={14} />
          Retake
        </Link>
      </div>

      <ol
        id={panelId}
        hidden={!open}
        className="mt-3 space-y-2 border-t border-gray-200 pt-3 dark:border-white/10"
      >
        {attempt.answers.map((answer, position) => (
          <AnswerRow
            key={`${answer.questionId}-${position}`}
            answer={answer}
            position={position}
          />
        ))}
      </ol>
    </article>
  )
}

export default function HistoryPage() {
  // Every course week (hidden ones included) so older attempts keep their titles.
  const { course, path, weeks } = useCourse()
  const { attempts } = useCourseProgress()
  const { clearHistory } = useProgress()
  const { toast } = useApp()
  const [limit, setLimit] = useState(PAGE_SIZE)
  const [confirm, setConfirm] = useState<ConfirmState>(null)

  const now = new Date()
  const count = attempts.length
  const groups: DayGroup[] = []
  for (const attempt of attempts.slice(0, limit)) {
    const date = new Date(attempt.completedAt)
    const key = localDayKey(date)
    const last = groups[groups.length - 1]
    if (last?.key === key) last.attempts.push(attempt)
    else groups.push({ key, label: dayLabel(date, now), attempts: [attempt] })
  }

  const askToClear = () =>
    setConfirm({
      title: "Clear quiz history?",
      body: `This removes all ${count} quiz attempt${
        count === 1 ? "" : "s"
      } for ${course.title}. Bookmarks aren't affected. This can't be undone.`,
      confirmLabel: "Clear history",
      onConfirm: () => {
        clearHistory(course.id)
        setLimit(PAGE_SIZE)
        toast("Quiz history cleared")
      },
    })

  return (
    <div className="learner-page history-page mx-auto max-w-4xl px-4 py-8">
      <BackLink to={path("/practice")} label="Practice Zone" />
      <PageHeader
        icon={RotateCcwClock}
        title="Quiz History"
        subtitle={
          count
            ? `${count} attempt${
                count === 1 ? "" : "s"
              } · last practised ${relativeDay(new Date(attempts[0].completedAt), now)}`
            : "Every quiz you finish is saved here"
        }
        action={
          count > 0 && (
            <button
              type="button"
              onClick={askToClear}
              className="btn-ghost px-4 py-2 text-sm"
            >
              <Trash2 size={15} />
              Clear history
            </button>
          )
        }
      />

      {count === 0 ? (
        <EmptyState icon={RotateCcwClock} title="No quiz attempts yet">
          <p className="mx-auto mt-2 max-w-sm text-sm text-gray-500 dark:text-gray-400">
            Finish a practice quiz and it appears here with your score, time and
            answers.
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
        <>
          <div className="space-y-8">
            {groups.map((group) => (
              <section key={group.key} aria-labelledby={`history-${group.key}`}>
                <h2
                  id={`history-${group.key}`}
                  className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400"
                >
                  {group.label}
                </h2>
                <motion.ul
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-3"
                >
                  {group.attempts.map((attempt) => (
                    <li key={attempt.id}>
                      <AttemptCard
                        attempt={attempt}
                        title={attemptTitle(attempt, weeks)}
                        retakeTo={path(retakeSubpath(attempt))}
                      />
                    </li>
                  ))}
                </motion.ul>
              </section>
            ))}
          </div>
          {count > limit && (
            <div className="mt-8 text-center">
              <button
                type="button"
                onClick={() => setLimit((current) => current + PAGE_SIZE)}
                className="btn-outline px-5 py-2.5 text-sm"
              >
                Show more ({count - limit} older)
              </button>
            </div>
          )}
        </>
      )}

      <ConfirmDialog state={confirm} onClose={() => setConfirm(null)} />
    </div>
  )
}
