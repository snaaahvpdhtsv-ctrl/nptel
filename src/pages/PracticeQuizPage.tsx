import { useEffect, useRef, useState, type ReactNode } from "react"
import { Link, useSearchParams } from "react-router"
import { AnimatePresence, motion } from "motion/react"
import {
  ArrowLeft,
  ArrowRight,
  Bookmark,
  BookmarkCheck,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  CircleX,
  Info,
  Layers,
  Lightbulb,
  RefreshCw,
  Target,
  Timer,
  Trophy,
  Volume2,
  VolumeX,
  Zap,
} from "lucide-react"
import {
  BackLink,
  NoticeCard,
  PageHeader,
  difficultyClass,
  type BackLinkProps,
} from "../components/common"
import { useApp } from "../lib/app-context"
import { useCourse } from "../lib/course-context"
import type { Question, Week } from "../lib/data"
import { formatClock, type QuizKind } from "../lib/progress"
import { useProgress } from "../lib/progress-context"
import { findQuestion, weekQuestions } from "../lib/question-bank"

/** localStorage key for the answer-sound preference. */
const SOUND_KEY = "nptel-quiz-sound"

interface QuizItem {
  question: Question
  /** Original option indexes, in the order they are shown. */
  order: number[]
}

type Phase = "quiz" | "results" | "review"
type OptionTone = "idle" | "correct" | "wrong" | "muted"

const optionTone: Record<OptionTone, string> = {
  idle: "border-gray-200 bg-white/70 text-gray-800 enabled:hover:border-primary-400 enabled:hover:bg-primary-50/60 dark:border-gray-700/70 dark:bg-white/[0.03] dark:text-gray-100 dark:enabled:hover:border-primary-500/60 dark:enabled:hover:bg-primary-500/[0.06]",
  correct:
    "border-green-400 bg-green-50 text-green-900 dark:border-green-500/70 dark:bg-green-500/10 dark:text-green-100",
  wrong:
    "border-red-400 bg-red-50 text-red-900 dark:border-red-500/70 dark:bg-red-500/10 dark:text-red-100",
  muted:
    "border-gray-200 bg-white/40 text-gray-500 dark:border-gray-700/50 dark:bg-white/[0.02] dark:text-gray-400",
}

const letterTone: Record<OptionTone, string> = {
  idle: "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-200",
  correct: "bg-green-500 text-white",
  wrong: "bg-red-500 text-white",
  muted: "bg-gray-100 text-gray-400 dark:bg-gray-700/60 dark:text-gray-500",
}

function shuffle<T>(list: T[]): T[] {
  const next = [...list]
  for (let i = next.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[next[i], next[j]] = [next[j], next[i]]
  }
  return next
}

function buildItems(
  questions: Question[],
  shuffleQuestions: boolean,
  shuffleOptions: boolean,
): QuizItem[] {
  return (shuffleQuestions ? shuffle(questions) : questions).map((question) => {
    const order = question.options.map((_, index) => index)
    return { question, order: shuffleOptions ? shuffle(order) : order }
  })
}

const letter = (position: number) => String.fromCharCode(65 + position)

/** Sample data mixes "easy" and "Easy"; normalise so the badge colour matches. */
const difficultyLabel = (difficulty?: string) =>
  difficulty
    ? difficulty.charAt(0).toUpperCase() + difficulty.slice(1).toLowerCase()
    : undefined

const quizTitle = (weeks: Week[]) =>
  weeks.length === 1
    ? `Week ${weeks[0].weekNumber} Practice`
    : `Mixed Practice · ${weeks.length} weeks`

const quizBadge = (weeks: Week[]) =>
  weeks.length === 1
    ? `Week ${weeks[0].weekNumber}`
    : `Mixed · ${weeks.length} weeks`

const listWeeks = (weeks: Week[]) => {
  const numbers = weeks.map((week) => week.weekNumber)
  return numbers.length === 1
    ? `Week ${numbers[0]}`
    : `Weeks ${numbers.slice(0, -1).join(", ")} and ${numbers[numbers.length - 1]}`
}

let audio: AudioContext | null = null

/** Short answer tone made with Web Audio, so no sound files are needed. */
function playTone(correct: boolean) {
  try {
    audio ??= new AudioContext()
    const context = audio
    const notes = correct ? [660, 880] : [220, 165]
    notes.forEach((frequency, index) => {
      const at = context.currentTime + index * 0.1
      const oscillator = context.createOscillator()
      const gain = context.createGain()
      oscillator.type = correct ? "sine" : "triangle"
      oscillator.frequency.value = frequency
      gain.gain.setValueAtTime(0.0001, at)
      gain.gain.exponentialRampToValueAtTime(0.15, at + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.22)
      oscillator.connect(gain).connect(context.destination)
      oscillator.start(at)
      oscillator.stop(at + 0.25)
    })
  } catch {
    // Sound is optional; ignore browsers without Web Audio.
  }
}

interface QuizQuestionProps {
  item: QuizItem
  position: number
  total: number
  /** Per question: true if answered correctly, false if wrong, undefined if not answered yet. */
  outcomes: (boolean | undefined)[]
  /** Original index of the chosen option. */
  chosen: number | undefined
  locked: boolean
  saved: boolean
  /** Focus the question text on mount, after moving between questions. */
  autoFocus: boolean
  onChoose: (position: number) => void
  onToggleSaved: () => void
  footer: ReactNode
}

function QuizQuestion({
  item,
  position,
  total,
  outcomes,
  chosen,
  locked,
  saved,
  autoFocus,
  onChoose,
  onToggleSaved,
  footer,
}: QuizQuestionProps) {
  const textRef = useRef<HTMLParagraphElement>(null)
  const { question } = item
  const difficulty = difficultyLabel(question.difficulty)
  const revealed = chosen !== undefined
  const correct = chosen === question.correctAnswerIndex
  const labelId = `quiz-question-${position}-label`
  const textId = `quiz-question-${position}-text`

  useEffect(() => {
    if (autoFocus) {
      textRef.current?.focus()
    }
  }, [autoFocus])

  return (
    <motion.section
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -24 }}
      transition={{ duration: 0.2 }}
      aria-labelledby={labelId}
      className="quiz-question card mt-5 p-5 sm:p-6"
    >
      <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-2">
        <p
          id={labelId}
          className="text-sm font-medium text-gray-500 dark:text-gray-400"
        >
          Question {position + 1} of {total}
        </p>
        <div className="ml-auto flex items-center gap-3">
          {total <= 30 && (
            <span
              className="quiz-question-dots hidden items-center gap-1 sm:flex"
              aria-hidden="true"
            >
              {outcomes.map((outcome, index) => (
                <span
                  key={index}
                  className={`h-1 rounded-full transition-all duration-300 ${
                    index === position
                      ? "w-5 bg-primary-500"
                      : `w-2.5 ${
                          outcome === undefined
                            ? "bg-gray-300 dark:bg-gray-600"
                            : outcome
                              ? "bg-green-500"
                              : "bg-red-500"
                        }`
                  }`}
                />
              ))}
            </span>
          )}
          {difficulty && (
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-semibold ${difficultyClass(difficulty)}`}
            >
              {difficulty}
            </span>
          )}
          <button
            type="button"
            onClick={onToggleSaved}
            aria-pressed={saved}
            aria-label="Save question"
            title={
              saved ? "Remove from Saved Questions" : "Save to Saved Questions"
            }
            className="quiz-bookmark inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-primary-600 dark:hover:bg-white/5 dark:hover:text-primary-300"
          >
            {saved ? (
              <BookmarkCheck
                size={17}
                className="text-primary-500 dark:text-primary-400"
              />
            ) : (
              <Bookmark size={17} />
            )}
          </button>
        </div>
      </div>

      <p
        ref={textRef}
        id={textId}
        tabIndex={-1}
        className="quiz-question-text text-lg leading-relaxed text-gray-800 outline-none dark:text-gray-100"
      >
        {question.questionText}
      </p>

      <div role="group" aria-labelledby={textId} className="mt-5 space-y-3">
        {item.order.map((optionIndex, optionPosition) => {
          const tone: OptionTone = !revealed
            ? "idle"
            : optionIndex === question.correctAnswerIndex
              ? "correct"
              : optionIndex === chosen
                ? "wrong"
                : "muted"
          return (
            <button
              key={optionIndex}
              type="button"
              disabled={locked}
              data-tone={tone}
              onClick={() => onChoose(optionPosition)}
              aria-keyshortcuts={letter(optionPosition)}
              aria-label={`Option ${letter(optionPosition)}: ${question.options[optionIndex]}`}
              className={`qcard-option flex min-h-11 w-full items-center gap-3 rounded-xl border px-4 py-3.5 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500 disabled:cursor-default ${optionTone[tone]}`}
            >
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold transition-colors ${letterTone[tone]}`}
              >
                {letter(optionPosition)}
              </span>
              <span className="flex-1 text-sm leading-relaxed sm:text-[15px]">
                {question.options[optionIndex]}
              </span>
              {tone === "correct" && (
                <>
                  <CircleCheck size={20} className="shrink-0 text-green-500" />
                  <span className="sr-only">(correct answer)</span>
                </>
              )}
              {tone === "wrong" && (
                <>
                  <CircleX size={20} className="shrink-0 text-red-500" />
                  <span className="sr-only">(your answer)</span>
                </>
              )}
            </button>
          )
        })}
      </div>

      {revealed && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className={`mt-5 rounded-xl border p-4 ${
            correct
              ? "border-green-200 bg-green-50/80 dark:border-green-800/60 dark:bg-green-900/15"
              : "border-red-200 bg-red-50/80 dark:border-red-800/60 dark:bg-red-900/15"
          }`}
        >
          <p
            className={`flex items-center gap-2 text-sm font-semibold ${
              correct
                ? "text-green-700 dark:text-green-300"
                : "text-red-700 dark:text-red-300"
            }`}
          >
            {correct ? <CircleCheck size={16} /> : <CircleX size={16} />}
            {correct
              ? "Correct!"
              : `Not quite — the correct answer is ${letter(item.order.indexOf(question.correctAnswerIndex))}.`}
          </p>
          {question.explanation && (
            <p className="mt-2 flex gap-2 text-sm leading-relaxed text-gray-600 dark:text-gray-300">
              <Lightbulb size={15} className="mt-0.5 shrink-0 text-amber-500" />
              <span>{question.explanation}</span>
            </p>
          )}
        </motion.div>
      )}

      {footer}
    </motion.section>
  )
}

interface ResultsPanelProps {
  items: QuizItem[]
  score: number
  seconds: number
  /** Positions of questions answered incorrectly. */
  missed: number[]
  heading: string
  backTo: BackLinkProps
  historyPath: string
  isGuest: boolean
  onReview: (position: number) => void
  onRetry: () => void
}

function ResultsPanel({
  items,
  score,
  seconds,
  missed,
  heading,
  backTo,
  historyPath,
  isGuest,
  onReview,
  onRetry,
}: ResultsPanelProps) {
  const headingRef = useRef<HTMLHeadingElement>(null)
  const total = items.length
  const accuracy = Math.round((score / total) * 100)
  const message =
    accuracy === 100
      ? "Perfect score — brilliant work!"
      : accuracy >= 80
        ? "Excellent work!"
        : accuracy >= 50
          ? "Good effort. Review the misses and go again."
          : "Keep practising — every attempt helps."
  const stats = [
    {
      label: "Accuracy",
      value: `${accuracy}%`,
      tone: "text-primary-600 dark:text-primary-400",
    },
    {
      label: "Correct",
      value: score,
      tone: "text-green-600 dark:text-green-400",
    },
    {
      label: "Incorrect",
      value: total - score,
      tone: "text-red-500 dark:text-red-400",
    },
    {
      label: "Time",
      value: formatClock(seconds),
      tone: "text-gray-800 dark:text-white",
    },
  ]

  useEffect(() => {
    headingRef.current?.focus()
  }, [])

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.25 }}
      className="quiz-results card mt-5 overflow-hidden"
    >
      <div className="quiz-results-hero relative overflow-hidden bg-gradient-to-br from-primary-600 via-primary-500 to-accent-500 px-6 py-9 text-center text-white">
        <div
          className="quiz-results-decoration pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10"
          aria-hidden="true"
        />
        <div
          className="quiz-results-decoration pointer-events-none absolute -bottom-12 -left-8 h-36 w-36 rounded-full bg-white/10"
          aria-hidden="true"
        />
        <span className="relative mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 shadow-inner backdrop-blur-sm">
          <Trophy size={26} />
        </span>
        <h2
          ref={headingRef}
          tabIndex={-1}
          className="relative mt-4 text-sm font-semibold uppercase tracking-wide text-white/90 outline-none"
        >
          {heading}
        </h2>
        <p className="relative mt-1 font-display text-5xl font-extrabold tabular-nums">
          {score}
          <span className="text-2xl font-bold text-white/75">/{total}</span>
        </p>
        <p className="relative mt-2 text-sm text-white/90">{message}</p>
      </div>

      <dl className="quiz-results-stats grid grid-cols-2 gap-3 p-5 sm:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-gray-200/70 bg-gray-50 px-4 py-3 dark:border-white/[0.06] dark:bg-white/[0.04]"
          >
            <dt className="text-xs text-gray-500 dark:text-gray-400">
              {stat.label}
            </dt>
            <dd
              className={`mt-0.5 text-2xl font-bold font-display tabular-nums ${stat.tone}`}
            >
              {stat.value}
            </dd>
          </div>
        ))}
      </dl>

      <p className="-mt-1 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 px-5 pb-4 text-center text-sm text-gray-500 dark:text-gray-400">
        <CircleCheck size={15} className="shrink-0 text-green-500" />
        {isGuest ? "Saved on this browser." : "Saved to your Quiz History."}
        {isGuest && (
          <Link
            to="/signin"
            state={{ from: { pathname: historyPath } }}
            className="font-semibold text-primary-600 hover:underline dark:text-primary-400"
          >
            Sign in to keep it with your account
          </Link>
        )}
        <Link
          to={historyPath}
          className="font-semibold text-primary-600 hover:underline dark:text-primary-400"
        >
          View history
        </Link>
      </p>

      {missed.length > 0 && (
        <div className="border-t border-gray-200 px-5 py-4 dark:border-white/10">
          <h3 className="mb-3 text-sm font-semibold text-gray-800 dark:text-gray-100">
            Questions to revisit
          </h3>
          <ul className="space-y-2">
            {missed.map((position) => (
              <li key={position}>
                <button
                  type="button"
                  onClick={() => onReview(position)}
                  className="flex w-full items-center gap-3 rounded-xl bg-gray-50 px-3 py-2.5 text-left text-sm text-gray-700 transition-colors hover:bg-primary-50 dark:bg-white/[0.035] dark:text-gray-200 dark:hover:bg-primary-500/10"
                >
                  <span className="shrink-0 rounded-md bg-red-100 px-1.5 py-0.5 text-xs font-bold text-red-700 dark:bg-red-900/40 dark:text-red-300">
                    Q{position + 1}
                  </span>
                  <span className="line-clamp-1 flex-1">
                    {items[position].question.questionText}
                  </span>
                  <ArrowRight size={14} className="shrink-0 text-gray-400" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="quiz-results-actions flex flex-wrap justify-center gap-2 border-t border-gray-200 px-5 py-4 dark:border-white/10">
        <button
          type="button"
          onClick={() => onReview(0)}
          className="btn-outline px-5 py-2.5 text-sm"
        >
          Review answers
        </button>
        <button
          type="button"
          onClick={onRetry}
          className="btn-primary px-5 py-2.5 text-sm"
        >
          <RefreshCw size={15} />
          Try again
        </button>
        <Link to={backTo.to} className="btn-ghost px-5 py-2.5 text-sm">
          Back to {backTo.label}
        </Link>
      </div>
    </motion.section>
  )
}

interface QuizRunnerProps {
  kind: QuizKind
  /** Where Back, the breadcrumb and the results page lead. */
  backTo: BackLinkProps
  weeks: Week[]
  questions: Question[]
  shuffleQuestions: boolean
  shuffleOptions: boolean
}

function QuizRunner({
  kind,
  backTo,
  weeks,
  questions,
  shuffleQuestions,
  shuffleOptions,
}: QuizRunnerProps) {
  const { course, path } = useCourse()
  const { toast, questionBank } = useApp()
  const { savedIds, toggleSaved, recordAttempt, isGuest } = useProgress()
  const [items, setItems] = useState(() =>
    buildItems(questions, shuffleQuestions, shuffleOptions),
  )
  // Chosen option (original index) per question position.
  const [answers, setAnswers] = useState<Record<number, number>>({})
  const [index, setIndex] = useState(0)
  const [phase, setPhase] = useState<Phase>("quiz")
  const [seconds, setSeconds] = useState(0)
  const [run, setRun] = useState(0)
  const [navigated, setNavigated] = useState(false)
  const [announcement, setAnnouncement] = useState("")
  const [sound, setSound] = useState(
    () => localStorage.getItem(SOUND_KEY) !== "off",
  )
  const startedAt = useRef(new Date().toISOString())
  // Set once this run is saved. It's a ref so the outgoing question screen,
  // still clickable while it animates out, can't save the run a second time.
  const recorded = useRef(false)

  const total = items.length
  const item = items[index]
  const answered = answers[index] !== undefined
  const isLast = index === total - 1
  const outcomes = items.map((entry, position) =>
    answers[position] === undefined
      ? undefined
      : answers[position] === entry.question.correctAnswerIndex,
  )
  const score = outcomes.filter(Boolean).length
  const missed = outcomes.flatMap((outcome, position) =>
    outcome === false ? [position] : [],
  )
  const progress =
    phase === "results" ? 100 : Math.round(((index + 1) / total) * 100)
  const official = weeks.reduce((sum, week) => sum + week.questionCount, 0)
  const title =
    kind === "mistakes"
      ? `Mistakes review · ${total} question${total === 1 ? "" : "s"}`
      : quizTitle(weeks)
  const saved = savedIds.includes(item.question.id)

  // The clock only runs while answering; it pauses on the results and review screens.
  useEffect(() => {
    if (phase !== "quiz") return
    const timer = window.setInterval(() => {
      setSeconds((current) => current + 1)
    }, 1000)
    return () => {
      window.clearInterval(timer)
    }
  }, [phase, run])

  const choose = (position: number) => {
    if (phase !== "quiz" || answered) return
    const optionIndex = item.order[position]
    const correct = optionIndex === item.question.correctAnswerIndex
    setAnswers((current) => ({ ...current, [index]: optionIndex }))
    setAnnouncement(
      correct
        ? `Question ${index + 1}: correct.`
        : `Question ${index + 1}: incorrect. The correct answer is ${letter(item.order.indexOf(item.question.correctAnswerIndex))}.`,
    )
    if (sound) playTone(correct)
  }

  const goTo = (position: number) => {
    setNavigated(true)
    setIndex(position)
  }

  const advance = () => {
    if (!isLast) return goTo(index + 1)
    // Only the first arrival at the results counts; Review → results doesn't re-record.
    if (phase === "quiz" && !recorded.current) {
      recorded.current = true
      recordAttempt({
        courseId: course.id,
        kind,
        weekIds: weeks.map((week) => week.id),
        startedAt: startedAt.current,
        durationSeconds: seconds,
        shuffleQuestions,
        shuffleOptions,
        answers: items.flatMap((entry, position) => {
          const chosenIndex = answers[position]
          if (chosenIndex === undefined) return []
          return [
            {
              questionId: entry.question.id,
              weekId:
                findQuestion(entry.question.id, questionBank)?.weekId ?? "",
              chosenIndex,
              correct: chosenIndex === entry.question.correctAnswerIndex,
              questionText: entry.question.questionText,
              options: [...entry.question.options],
              correctAnswerIndex: entry.question.correctAnswerIndex,
            },
          ]
        }),
      })
    }
    setPhase("results")
  }

  const review = (position: number) => {
    setPhase("review")
    goTo(position)
  }

  const retry = () => {
    setItems(buildItems(questions, shuffleQuestions, shuffleOptions))
    setAnswers({})
    setIndex(0)
    setPhase("quiz")
    setSeconds(0)
    setNavigated(false)
    setAnnouncement("")
    setRun((current) => current + 1)
    startedAt.current = new Date().toISOString()
    recorded.current = false
  }

  const toggleSound = () => {
    const next = !sound
    setSound(next)
    localStorage.setItem(SOUND_KEY, next ? "on" : "off")
  }

  const toggleBookmark = () => {
    toggleSaved(item.question.id)
    toast(saved ? "Removed from Saved Questions" : "Saved to Saved Questions")
  }

  // A–D (or 1–4) answers; arrow keys move between questions. Rebound every
  // render so the handler always sees the current question.
  useEffect(() => {
    if (phase === "results") return
    const onKey = (event: KeyboardEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey || event.repeat) return
      const target = event.target as HTMLElement | null
      if (target?.closest?.("input, textarea, select, [contenteditable]"))
        return
      const key = event.key.toLowerCase()
      if (key === "arrowright" && (answered || phase === "review")) advance()
      else if (key === "arrowleft" && index > 0) goTo(index - 1)
      else if (/^[a-h1-8]$/.test(key)) {
        const position = /\d/.test(key)
          ? Number(key) - 1
          : key.charCodeAt(0) - 97
        if (position < item.order.length) choose(position)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => {
      window.removeEventListener("keydown", onKey)
    }
  })

  const footer = (answered || phase === "review" || index > 0) && (
    <div className="quiz-question-footer mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 pt-5 dark:border-white/10">
      <button
        type="button"
        onClick={() => goTo(index - 1)}
        disabled={index === 0}
        className="btn-ghost px-4 py-2 text-sm disabled:invisible"
      >
        <ArrowLeft size={16} />
        Previous
      </button>
      <div className="flex items-center gap-2">
        {phase === "review" && !isLast && (
          <button
            type="button"
            onClick={() => setPhase("results")}
            className="btn-ghost px-4 py-2 text-sm"
          >
            Results
          </button>
        )}
        {(answered || phase === "review") && (
          <button
            type="button"
            onClick={advance}
            className="btn-primary px-5 py-2.5 text-sm"
          >
            {isLast
              ? phase === "review"
                ? "Back to results"
                : "See results"
              : "Next question"}
            <ArrowRight size={16} />
          </button>
        )}
      </div>
    </div>
  )

  return (
    <div className="learner-page quiz-page mx-auto max-w-4xl px-4 py-8">
      <nav
        aria-label="Breadcrumb"
        className="quiz-breadcrumb mb-4 flex min-w-0 items-center gap-1.5 text-sm"
      >
        <Link
          to={backTo.to}
          className="inline-flex shrink-0 items-center gap-1 text-gray-500 transition-colors hover:text-primary-600 dark:text-gray-400 dark:hover:text-primary-400"
        >
          <ChevronLeft size={15} />
          {backTo.label}
        </Link>
        <ChevronRight
          size={14}
          className="shrink-0 text-gray-400 dark:text-gray-600"
          aria-hidden="true"
        />
        <span
          aria-current="page"
          className="truncate font-medium text-gray-800 dark:text-gray-100"
        >
          {title}
        </span>
      </nav>

      <div className="quiz-toolbar mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            to={backTo.to}
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 transition-colors hover:text-primary-600 dark:text-gray-400 dark:hover:text-primary-400"
          >
            <ArrowLeft size={16} />
            Back
          </Link>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary-300 bg-primary-50 px-2.5 py-0.5 text-xs font-semibold text-primary-700 dark:border-primary-500/60 dark:bg-primary-500/10 dark:text-primary-300">
            {kind === "mistakes" ? (
              <>
                <Target size={13} />
                Mistakes
              </>
            ) : (
              <>
                <Layers size={13} />
                {quizBadge(weeks)}
              </>
            )}
          </span>
        </div>
        <div className="quiz-toolbar-controls flex items-center gap-2">
          <span
            role="timer"
            aria-label={`Time elapsed ${formatClock(seconds)}`}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-primary-300 bg-primary-50/70 px-3 text-sm font-semibold tabular-nums text-gray-800 dark:border-primary-500/40 dark:bg-primary-500/10 dark:text-gray-100"
          >
            <Timer size={15} />
            {formatClock(seconds)}
          </span>
          <button
            type="button"
            onClick={toggleSound}
            aria-pressed={sound}
            aria-label="Answer sounds"
            title={sound ? "Mute answer sounds" : "Play answer sounds"}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary-50 text-primary-600 transition-colors hover:bg-primary-100 dark:bg-primary-500/15 dark:text-primary-300 dark:hover:bg-primary-500/25"
          >
            {sound ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </button>
          <button
            type="button"
            onClick={retry}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-gray-200 px-3 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600"
          >
            <RefreshCw size={15} />
            Retry
          </button>
        </div>
      </div>

      <h1 className="text-xl font-bold font-display tracking-tight text-gray-800 dark:text-white">
        {title}
      </h1>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        {total} question{total === 1 ? "" : "s"} ·{" "}
        {shuffleQuestions ? "Jumbled" : "In order"} ·{" "}
        {shuffleOptions ? "Shuffled options" : "Original options"}
      </p>
      {kind === "practice" && total < official && (
        <p className="mt-1.5 flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
          <Info size={13} className="shrink-0" />
          This preview includes {total} of {official} questions for{" "}
          {listWeeks(weeks)}.
        </p>
      )}

      <div className="card mt-5 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <p className="text-gray-600 dark:text-gray-300">
            {phase === "results" ? (
              "Completed"
            ) : (
              <>
                Question{" "}
                <strong className="font-bold text-gray-900 dark:text-white">
                  {index + 1}
                </strong>{" "}
                of {total}
              </>
            )}
          </p>
          <p className="flex items-center gap-2">
            <span className="font-semibold text-primary-600 dark:text-primary-400">
              Score: {score}/{total}
            </span>
            <span className="rounded-full border border-primary-200 bg-primary-50 px-2 py-0.5 text-xs font-bold text-primary-700 dark:border-primary-500/30 dark:bg-primary-500/15 dark:text-primary-200">
              {progress}%
            </span>
          </p>
        </div>
        <div
          role="progressbar"
          aria-label="Quiz progress"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progress}
          className="mt-3 h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700/70"
        >
          <motion.div
            initial={false}
            animate={{ width: `${progress}%` }}
            transition={{ type: "spring", stiffness: 140, damping: 24 }}
            className="h-full rounded-full bg-gradient-to-r from-primary-500 to-accent-400"
          />
        </div>
      </div>

      <p className="sr-only" role="status">
        {announcement}
      </p>

      <AnimatePresence mode="wait" initial={false}>
        {phase === "results" ? (
          <ResultsPanel
            key={`results-${run}`}
            items={items}
            score={score}
            seconds={seconds}
            missed={missed}
            heading={
              kind === "mistakes"
                ? "Mistakes review complete"
                : "Practice complete"
            }
            backTo={backTo}
            historyPath={path("/history")}
            isGuest={isGuest}
            onReview={review}
            onRetry={retry}
          />
        ) : (
          <QuizQuestion
            key={`${run}-${index}`}
            item={item}
            position={index}
            total={total}
            outcomes={outcomes}
            chosen={answers[index]}
            locked={answered || phase === "review"}
            saved={saved}
            autoFocus={navigated}
            onChoose={choose}
            onToggleSaved={toggleBookmark}
            footer={footer}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

export default function PracticeQuizPage() {
  const [params] = useSearchParams()
  const { path, publishedWeeks } = useCourse()
  const { questionBank } = useApp()
  const mistakesMode = params.get("mode") === "mistakes"
  const ids = (params.get(mistakesMode ? "questions" : "weeks") || "")
    .split(",")
    .filter(Boolean)

  let chosen: Week[]
  let questions: Question[]
  if (mistakesMode) {
    // Specific questions (from Review Mistakes), limited to this course's published weeks.
    const published = new Set(publishedWeeks.map((week) => week.id))
    const found = [...new Set(ids)]
      .map((id) => findQuestion(id, questionBank))
      .filter(
        (entry): entry is NonNullable<typeof entry> =>
          entry !== undefined && published.has(entry.weekId),
      )
    questions = found.map((entry) => entry.question)
    chosen = publishedWeeks.filter((week) =>
      found.some((entry) => entry.weekId === week.id),
    )
  } else {
    chosen = publishedWeeks.filter((week) => ids.includes(week.id))
    // Only questions whose full text and options are part of the preview data can be practised.
    questions = chosen.flatMap((week) => weekQuestions(week.id, questionBank))
  }

  const backTo: BackLinkProps = mistakesMode
    ? { to: path("/review"), label: "Review Mistakes" }
    : { to: path("/practice"), label: "Practice Zone" }

  if (questions.length === 0 && mistakesMode) {
    return (
      <div className="learner-page mx-auto max-w-4xl px-4 py-8">
        <BackLink to={backTo.to} label={backTo.label} />
        <PageHeader
          icon={Target}
          title="Mistakes review"
          subtitle="No questions to practise"
          gradient="orange"
        />
        <NoticeCard
          title="These mistakes aren't available to practise"
          action={
            <Link to={backTo.to} className="btn-primary px-5 py-2.5">
              Back to Review Mistakes
            </Link>
          }
        >
          They may belong to a week that's no longer published.
        </NoticeCard>
      </div>
    )
  }

  if (questions.length === 0) {
    const playable = publishedWeeks.filter(
      (week) => weekQuestions(week.id, questionBank).length > 0,
    )
    return (
      <div className="learner-page mx-auto max-w-4xl px-4 py-8">
        <BackLink to={path("/practice")} label="Practice Zone" />
        <PageHeader
          icon={Zap}
          title={chosen.length ? quizTitle(chosen) : "Practice quiz"}
          subtitle={chosen.length ? quizBadge(chosen) : "No weeks selected"}
          gradient="orange"
        />
        <NoticeCard
          title={
            chosen.length
              ? "Question text for these weeks isn't included in this preview"
              : "Choose at least one week to practise"
          }
          action={
            <Link to={path("/practice")} className="btn-primary px-5 py-2.5">
              Back to Practice Zone
            </Link>
          }
        >
          {playable.length > 0 &&
            `Sample questions are available for ${listWeeks(playable)}.`}
        </NoticeCard>
      </div>
    )
  }

  return (
    <QuizRunner
      // A different selection in the URL starts a fresh quiz.
      key={params.toString()}
      kind={mistakesMode ? "mistakes" : "practice"}
      backTo={backTo}
      weeks={chosen}
      questions={questions}
      shuffleQuestions={params.get("shuffle") !== "0"}
      shuffleOptions={params.get("shuffleOptions") === "1"}
    />
  )
}
