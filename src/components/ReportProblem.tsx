import { useEffect, useId, useRef, useState, type FormEvent } from "react"
import { Flag, Send, X } from "lucide-react"
import { useApp } from "../lib/app-context"
import type { Question, QuestionReport, ReportIssue, Week } from "../lib/data"
import { optionLetter, reportIssues, reportMessage } from "../lib/reports"

interface Draft {
  /** Question number as text: "" until chosen, "0" for the whole week. */
  question: string
  issue: ReportIssue
  suggested: number | null
  details: string
  contact: string
}

const emptyDraft: Draft = {
  question: "",
  issue: "answer",
  suggested: null,
  details: "",
  contact: "",
}

const issueEntries = Object.entries(
  reportIssues,
) as [ReportIssue, typeof reportIssues[ReportIssue]][]

const clip = (text: string, length = 60) =>
  text.length > length ? `${text.slice(0, length - 1).trimEnd()}…` : text

const choiceClass = (checked: boolean) =>
  `flex gap-3 rounded-xl border p-3 transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-primary-500 ${
    checked
      ? "border-primary-500 bg-primary-50 dark:border-primary-400 dark:bg-primary-500/15"
      : "border-gray-200 dark:border-white/10"
  }`

const optional = (
  <span className="font-normal text-gray-500 dark:text-gray-400">
    (optional)
  </span>
)

/** Lets a learner tell the admins about a wrong answer or a mistake in one of a week's questions. */
export function ReportProblemDialog({
  week,
  questions,
  open,
  onClose,
  /** The questions shown on the week page, in their displayed order. */
}: {
  week: Week
  questions: Question[]
  open: boolean
  onClose: () => void
}) {
  const { setRequests, toast } = useApp()
  const id = useId()
  const dialog = useRef<HTMLDialogElement>(null)
  const questionField = useRef<HTMLSelectElement>(null)
  const detailsField = useRef<HTMLTextAreaElement>(null)
  const returnFocus = useRef<HTMLElement | null>(null)
  const [draft, setDraft] = useState(emptyDraft)
  const [error, setError] = useState<"question" | "details" | null>(null)

  // The native modal dialog keeps focus inside and makes the page behind it inert.
  useEffect(() => {
    const element = dialog.current
    if (!element) return
    if (open && !element.open) {
      returnFocus.current = (document.activeElement as HTMLElement | null)
      element.showModal()
      questionField.current?.focus()
    } else if (!open && element.open) element.close()
  }, [open])

  const total = Math.max(week.questionCount, questions.length)
  const number = draft.question === "" ? null : Number(draft.question)
  const question = number ? questions[number - 1] : undefined
  const needsDetails = draft.issue !== "answer" || number === 0

  const change = (patch: Partial<Draft>) => {
    setDraft((current) => ({ ...current, ...patch }))
    setError(null)
  }

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (number === null) {
      setError("question")
      questionField.current?.focus()
      return
    }
    const details = draft.details.trim()
    if (needsDetails && !details) {
      setError("details")
      detailsField.current?.focus()
      return
    }
    const answered = draft.issue === "answer" ? question : undefined
    const report: QuestionReport = {
      weekId: week.id,
      weekNumber: week.weekNumber,
      questionNumber: number,
      questionId: question?.id,
      questionText: question?.questionText,
      issue: draft.issue,
      markedAnswer: answered?.correctAnswerIndex,
      suggestedAnswer:
        answered && draft.suggested !== null ? draft.suggested : undefined,
      details,
    }
    setRequests((current) => [
      {
        id: `req-${Date.now()}`,
        courseId: week.courseId,
        type: "report",
        status: "pending",
        message: reportMessage(report),
        contact: draft.contact.trim() || undefined,
        createdAt: new Date().toLocaleDateString(undefined, {
          day: "numeric",
          month: "short",
          year: "numeric",
        }),
        age: "0h old",
        report,
      },
      ...current,
    ])
    setDraft(emptyDraft)
    toast("Report sent. Thanks for helping fix the answer key!")
    onClose()
  }

  return (
    <dialog
      ref={dialog}
      aria-labelledby={`${id}-title`}
      aria-describedby={`${id}-week`}
      onClose={() => {
        onClose()
        returnFocus.current?.focus()
      }}
      // A click on the dialog element itself lands on the backdrop around the panel.
      onClick={(event) => event.target === event.currentTarget && onClose()}
      className="report-dialog m-auto max-h-[min(88dvh,48rem)] w-[calc(100%-2rem)] max-w-lg overflow-hidden rounded-2xl border border-gray-200 bg-white p-0 text-gray-800 shadow-2xl backdrop:bg-black/60 backdrop:backdrop-blur-sm dark:border-white/10 dark:bg-[#111a2e] dark:text-gray-100 max-sm:mb-0 max-sm:w-full max-sm:max-w-none max-sm:rounded-b-none max-sm:border-x-0 max-sm:border-b-0"
    >
      <form onSubmit={submit} className="flex max-h-[inherit] flex-col">
        <div className="flex items-start gap-3 border-b border-gray-200 px-5 py-4 dark:border-white/10">
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-300"
            aria-hidden="true"
          >
            <Flag size={18} />
          </span>
          <div className="min-w-0 flex-1">
            <h2
              id={`${id}-title`}
              className="font-display text-lg font-bold text-gray-900 dark:text-white"
            >
              Report a problem
            </h2>
            <p
              id={`${id}-week`}
              className="mt-0.5 text-sm text-gray-600 dark:text-gray-400"
            >
              Week {week.weekNumber} · {week.title}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-mr-2 -mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/10"
          >
            <X size={18} />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain px-5 py-5">
          <div>
            <label htmlFor={`${id}-question`} className="label">
              Which question?
            </label>
            <select
              id={`${id}-question`}
              ref={questionField}
              value={draft.question}
              onChange={(event) =>
                change({ question: event.target.value, suggested: null })
              }
              aria-invalid={error === "question" || undefined}
              aria-describedby={
                error === "question" ? `${id}-question-error` : undefined
              }
              className="input"
            >
              <option value="" disabled>
                Choose a question
              </option>
              {Array.from({ length: total }, (_, index) => (
                <option key={index} value={index + 1}>
                  {questions[index]
                    ? `Question ${index + 1} — ${clip(questions[index].questionText)}`
                    : `Question ${index + 1}`}
                </option>
              ))}
              <option value="0">Not about one question</option>
            </select>
            {error === "question" && (
              <p
                id={`${id}-question-error`}
                className="mt-1.5 text-sm text-red-600 dark:text-red-400"
              >
                Choose the question this is about.
              </p>
            )}
            {question && (
              <p className="mt-2 text-xs text-gray-600 dark:text-gray-400">
                Marked answer:{" "}
                <span className="font-semibold text-gray-800 dark:text-gray-200">
                  {optionLetter(question.correctAnswerIndex)} ·{" "}
                  {question.options[question.correctAnswerIndex]}
                </span>
              </p>
            )}
          </div>

          <fieldset>
            <legend className="label">What's wrong?</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {issueEntries.map(([key, issue]) => (
                <label
                  key={key}
                  className={`${choiceClass(draft.issue === key)} cursor-pointer`}
                >
                  <input
                    type="radio"
                    name={`${id}-issue`}
                    value={key}
                    checked={draft.issue === key}
                    onChange={() => change({ issue: key })}
                    className="mt-0.5 h-4 w-4 shrink-0 accent-primary-600"
                  />
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-gray-800 dark:text-gray-100">
                      {issue.label}
                    </span>
                    <span className="block text-xs text-gray-600 dark:text-gray-400">
                      {issue.hint}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          {draft.issue === "answer" && question && (
            <fieldset>
              <legend className="label">
                Which answer is correct? {optional}
              </legend>
              <div className="space-y-2">
                {question.options.map((option, index) => {
                  const marked = index === question.correctAnswerIndex
                  return (
                    <label
                      key={index}
                      className={`${choiceClass(draft.suggested === index)} items-center ${
                        marked ? "cursor-not-allowed" : "cursor-pointer"
                      }`}
                    >
                      <input
                        type="radio"
                        name={`${id}-answer`}
                        checked={draft.suggested === index}
                        disabled={marked}
                        onChange={() => change({ suggested: index })}
                        className="h-4 w-4 shrink-0 accent-primary-600"
                      />
                      <span className="w-4 shrink-0 text-sm font-bold text-gray-600 dark:text-gray-300">
                        {optionLetter(index)}
                      </span>
                      <span className="min-w-0 flex-1 text-sm text-gray-800 dark:text-gray-100">
                        {option}
                      </span>
                      {marked && (
                        <span className="shrink-0 rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-semibold text-green-800 dark:bg-green-500/15 dark:text-green-300">
                          Marked now
                        </span>
                      )}
                    </label>
                  )
                })}
              </div>
            </fieldset>
          )}

          <div>
            <label htmlFor={`${id}-details`} className="label">
              Details {!needsDetails && optional}
            </label>
            <textarea
              id={`${id}-details`}
              ref={detailsField}
              rows={3}
              value={draft.details}
              onChange={(event) => change({ details: event.target.value })}
              placeholder={
                number === 0 && draft.issue === "answer"
                  ? "Which questions have the wrong answer?"
                  : reportIssues[draft.issue].placeholder
              }
              aria-invalid={error === "details" || undefined}
              aria-describedby={
                error === "details" ? `${id}-details-error` : undefined
              }
              className="input"
            />
            {error === "details" && (
              <p
                id={`${id}-details-error`}
                className="mt-1.5 text-sm text-red-600 dark:text-red-400"
              >
                Tell us what's wrong so it can be fixed.
              </p>
            )}
          </div>

          <div>
            <label htmlFor={`${id}-contact`} className="label">
              Contact email {optional}
            </label>
            <input
              id={`${id}-contact`}
              type="email"
              inputMode="email"
              autoComplete="email"
              value={draft.contact}
              onChange={(event) => change({ contact: event.target.value })}
              placeholder="So we can tell you when it's fixed"
              className="input"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-gray-200 px-5 py-3 dark:border-white/10 max-sm:pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={onClose}
            className="btn-ghost px-4 py-2 text-sm"
          >
            Cancel
          </button>
          <button type="submit" className="btn-primary px-4 py-2 text-sm">
            <Send size={15} aria-hidden="true" />
            Send report
          </button>
        </div>
      </form>
    </dialog>
  )
}

/** Compact trigger for a week page's header. */
export function ReportButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-haspopup="dialog"
      className="btn-outline px-3.5 py-2 text-sm"
    >
      <Flag size={15} aria-hidden="true" />
      <span className="hidden sm:inline">Report a problem</span>
      <span className="sm:hidden">Report</span>
    </button>
  )
}

/** Closing prompt under a week's questions, where learners finish checking answers. */
export function ReportPrompt({ onReport }: { onReport: () => void }) {
  return (
    <div className="card mt-8 flex flex-wrap items-center gap-4 p-5">
      <span
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-300"
        aria-hidden="true"
      >
        <Flag size={19} />
      </span>
      <div className="min-w-48 flex-1">
        <p className="font-semibold font-display text-gray-800 dark:text-white">
          Spotted a mistake?
        </p>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          If a question or its marked answer looks wrong, report it and the
          admins will check.
        </p>
      </div>
      <button
        type="button"
        onClick={onReport}
        aria-haspopup="dialog"
        className="btn-outline px-4 py-2 text-sm"
      >
        <Flag size={15} aria-hidden="true" />
        Report a problem
      </button>
    </div>
  )
}
