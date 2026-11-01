import { useState, type FormEvent } from "react"
import { motion } from "motion/react"
import {
  CircleQuestionMark,
  Flag,
  MessageCircle,
  MessageSquareText,
  Send,
  Wrench,
} from "lucide-react"
import { useApp } from "../lib/app-context"
import { useCourse } from "../lib/course-context"

export const requestTypes = {
  feedback: {
    label: "Feedback",
    icon: MessageCircle,
    color:
      "bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300",
  },
  question: {
    label: "Question",
    icon: CircleQuestionMark,
    color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  },
  request: {
    label: "Feature Request",
    icon: Wrench,
    color:
      "bg-accent-100 text-accent-700 dark:bg-accent-900/30 dark:text-accent-300",
  },
} as const

type RequestType = keyof typeof requestTypes

/** Display details for every request type, including error reports sent from week pages. */
export const requestTypeMeta = {
  ...requestTypes,
  report: {
    label: "Error report",
    icon: Flag,
    color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  },
} as const

export default function FeedbackPage() {
  const { requests, setRequests, toast } = useApp()
  const { course } = useCourse()
  const [form, setForm] = useState<{
    type: RequestType
    message: string
    contact: string
  }>({
    type: "feedback",
    message: "",
    contact: "",
  })
  const [submitting, setSubmitting] = useState(false)
  const replies = requests.filter(
    (item) =>
      item.courseId === course.id &&
      item.status === "replied" &&
      item.reply &&
      item.replyVisible !== false,
  )

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!form.message.trim()) {
      toast("Please enter a message", "error")
      return
    }
    setSubmitting(true)
    window.setTimeout(() => {
      setRequests((current) => [
        {
          id: `req-${Date.now()}`,
          courseId: course.id,
          type: form.type,
          status: "pending",
          message: form.message.trim(),
          contact: form.contact.trim() || undefined,
          createdAt: new Date().toLocaleDateString(undefined, {
            day: "numeric",
            month: "short",
            year: "numeric",
          }),
          age: "0h old",
        },
        ...current,
      ])
      setForm((current) => ({ ...current, message: "", contact: "" }))
      setSubmitting(false)
      toast("Submitted! It will appear here once admin replies")
    }, 600)
  }

  return (
    <div className="learner-page feedback-page max-w-3xl mx-auto px-4 py-8">
      <div className="feedback-header flex items-center gap-4 mb-6">
        <span className="feedback-header-icon relative flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-primary-600 to-accent-500 text-white shadow-lg shadow-primary-600/20 shrink-0">
          <span
            className="feedback-decoration absolute inset-0 rounded-2xl bg-white/25 blur-md"
            aria-hidden="true"
          />
          <MessageSquareText size={22} className="relative" />
        </span>
        <div>
          <h1 className="text-2xl font-bold font-display text-gray-800 dark:text-white tracking-tight">
            Requests &amp; Feedback
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Ask questions, report issues, or suggest improvements
          </p>
        </div>
      </div>

      <motion.form
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        onSubmit={submit}
        className="feedback-form card p-6 mb-8"
      >
        <div className="space-y-4">
          <div>
            <p id="request-type-label" className="label">
              Type
            </p>
            <div
              role="group"
              aria-labelledby="request-type-label"
              className="grid grid-cols-3 gap-2"
            >
              {(Object.entries(
                requestTypes,
              ) as [RequestType, typeof requestTypes[RequestType]][]).map(
                ([key, type]) => {
                  const Icon = type.icon
                  const active = form.type === key
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() =>
                        setForm((current) => ({ ...current, type: key }))
                      }
                      aria-pressed={active}
                      className={`feedback-type-button flex flex-col items-center gap-1.5 px-3 py-3 rounded-xl border text-sm font-medium transition-all ${
                        active
                          ? "border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 shadow-sm"
                          : "border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-primary-300 dark:hover:border-primary-700"
                      }`}
                    >
                      <Icon size={18} />
                      {type.label}
                    </button>
                  )
                },
              )}
            </div>
          </div>
          <div>
            <label htmlFor="request-message" className="label">
              Your message
            </label>
            <textarea
              id="request-message"
              rows={4}
              placeholder="Tell us what's on your mind..."
              value={form.message}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  message: event.target.value,
                }))
              }
              className="input"
              required
            />
          </div>
          <div>
            <label htmlFor="request-contact" className="label">
              Contact email (optional)
            </label>
            <input
              id="request-contact"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="Email so we can reach you if needed"
              value={form.contact}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  contact: event.target.value,
                }))
              }
              className="input"
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="btn-primary w-full sm:w-auto"
          >
            <Send size={16} />
            {submitting ? "Submitting..." : "Submit"}
          </button>
        </div>
      </motion.form>

      <div>
        <h2 className="text-lg font-bold font-display text-gray-800 dark:text-white mb-4">
          Admin replies
        </h2>
        {replies.length === 0 ? (
          <div className="card p-8 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No requests yet. Send feedback above to get started.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {replies.map((item) => {
              const type = requestTypeMeta[item.type] ?? requestTypes.feedback
              const Icon = type.icon
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="card p-5"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${type.color}`}
                    >
                      <Icon size={11} />
                      {type.label}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      Submitted {item.createdAt}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap">
                    {item.message}
                  </p>
                  <div className="mt-3 p-3 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                    <p className="text-xs font-semibold text-green-700 dark:text-green-300 mb-1">
                      Admin reply {item.replyAt ? `· ${item.replyAt}` : ""}
                    </p>
                    <p className="text-sm text-gray-700 dark:text-gray-200 whitespace-pre-wrap">
                      {item.reply}
                    </p>
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
