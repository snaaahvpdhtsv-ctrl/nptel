import { useState } from "react"
import {
  CircleCheck,
  CircleX,
  Clock,
  Eye,
  EyeOff,
  Flag,
  GraduationCap,
  Layers,
  Reply,
  Search,
  Trash,
} from "lucide-react"
import { useApp } from "../../lib/app-context"
import type { QuestionReport, RequestItem } from "../../lib/data"
import { findQuestion } from "../../lib/question-bank"
import { optionLetter, reportHeadline } from "../../lib/reports"
import { requestTypeMeta } from "../FeedbackPage"
import { dangerOutline, Panel, smallOutline, type ConfirmState } from "./ui"

const statusMeta = {
  pending: {
    label: "Pending",
    icon: Clock,
    className:
      "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300",
  },
  replied: {
    label: "Replied",
    icon: CircleCheck,
    className:
      "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300",
  },
  invalid: {
    label: "Invalid",
    icon: CircleX,
    className: "bg-red-100 text-red-700 dark:bg-red-900/60 dark:text-red-300",
  },
}

type Filter = "all" | RequestItem["status"]

/** Filter value for requests without a course (older requests, or deleted courses). */
const NO_COURSE = "__none"

/** Where a learner's error report points, with the answer they expected. */
function ReportDetails({
  report,
  onOpenWeek,
}: {
  report: QuestionReport
  onOpenWeek?: () => void
}) {
  const { questionBank } = useApp()
  const options = report.questionId
    ? findQuestion(report.questionId, questionBank)?.question.options
    : undefined
  const answer = (index?: number) =>
    index === undefined
      ? null
      : [optionLetter(index), options?.[index]].filter(Boolean).join(" · ")
  const marked = answer(report.markedAnswer)
  const suggested = answer(report.suggestedAnswer)

  return (
    <div className="mt-2 rounded-lg border border-red-200 bg-red-50/70 p-3 dark:border-red-500/25 dark:bg-red-500/[0.06]">
      <p className="flex items-start gap-1.5 text-sm font-semibold text-gray-800 dark:text-gray-100">
        <Flag
          size={14}
          className="mt-0.5 shrink-0 text-red-600 dark:text-red-300"
          aria-hidden="true"
        />
        {reportHeadline(report)}
      </p>
      {report.questionText && (
        <p className="mt-1.5 text-sm text-gray-700 dark:text-gray-300">
          “{report.questionText}”
        </p>
      )}
      {(marked || suggested) && (
        <dl className="mt-2 grid gap-2 text-xs sm:grid-cols-2">
          {marked && (
            <div>
              <dt className="font-semibold text-gray-600 dark:text-gray-400">
                Marked answer
              </dt>
              <dd className="mt-0.5 text-gray-800 dark:text-gray-200">
                {marked}
              </dd>
            </div>
          )}
          {suggested && (
            <div>
              <dt className="font-semibold text-gray-600 dark:text-gray-400">
                Learner suggests
              </dt>
              <dd className="mt-0.5 text-gray-800 dark:text-gray-200">
                {suggested}
              </dd>
            </div>
          )}
        </dl>
      )}
      {report.details && (
        <p className="mt-2 whitespace-pre-wrap text-sm text-gray-800 dark:text-gray-100">
          {report.details}
        </p>
      )}
      {onOpenWeek && (
        <button
          type="button"
          onClick={onOpenWeek}
          className={`${smallOutline} mt-3`}
        >
          <Layers size={14} aria-hidden="true" />
          Open Week {report.weekNumber} questions
        </button>
      )}
    </div>
  )
}

function RequestCard({
  item,
  courseTitle,
  onConfirm,
  audit,
  onOpenWeek,
  /** Present for error reports whose week still exists. */
}: {
  item: RequestItem
  courseTitle?: string
  onConfirm: (state: ConfirmState) => void
  audit: (action: string) => void
  onOpenWeek?: () => void
}) {
  const { updateRequest, deleteRequest, toast } = useApp()
  const [note, setNote] = useState("")
  const [reply, setReply] = useState("")
  const [assigned, setAssigned] = useState(false)
  const type = requestTypeMeta[item.type]
  const status = statusMeta[item.status]
  const StatusIcon = status.icon
  // Reports carry a multi-line message, so controls are named after the headline.
  const summary = item.report ? reportHeadline(item.report) : item.message
  const update = async (patch: Partial<RequestItem>) => {
    try {
      await updateRequest({ ...item, ...patch })
    } catch (error) {
      toast(
        error instanceof Error ? error.message : "Request could not be updated",
        "error",
      )
    }
  }
  const remove = () =>
    onConfirm({
      title: "Delete this request?",
      body: "This request will be permanently deleted. This cannot be undone.",
      confirmLabel: "Delete request",
      onConfirm: async () => {
        await deleteRequest(item)
        audit("Request deleted")
        toast("Request deleted")
      },
    })

  return (
    <article className="rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50/80 dark:bg-white/[0.03] p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-md bg-primary-100 px-2 py-0.5 text-xs font-medium text-primary-700 dark:bg-primary-900/40 dark:text-primary-200">
          {type.label}
        </span>
        <span
          className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium ${status.className}`}
        >
          <StatusIcon size={11} />
          {status.label}
        </span>
        <span className="inline-flex items-center gap-1 rounded-md bg-gray-200/70 px-2 py-0.5 text-xs font-medium text-gray-600 dark:bg-white/10 dark:text-gray-300">
          <GraduationCap size={11} />
          {courseTitle ?? "No course"}
        </span>
        {item.contact && (
          <span className="text-xs text-gray-500 dark:text-gray-400">
            Contact: {item.contact}
          </span>
        )}
        <span className="ml-auto text-xs text-gray-500 dark:text-gray-400">
          {item.createdAt}&nbsp;&nbsp;{item.age}
        </span>
      </div>
      {item.report ? (
        <ReportDetails report={item.report} onOpenWeek={onOpenWeek} />
      ) : (
        <p className="mt-2 text-sm text-gray-800 dark:text-gray-100 whitespace-pre-wrap">
          {item.message}
        </p>
      )}
      <div className="mt-2 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
        {assigned ? (
          "Assigned to you"
        ) : (
          <>
            Unassigned
            <button
              onClick={() => {
                setAssigned(true)
                toast("Request assigned to you")
              }}
              className="btn-outline rounded-lg px-2 py-1 text-xs"
            >
              Assign to me
            </button>
          </>
        )}
      </div>
      <div className="mt-3 flex gap-2">
        <input
          value={note}
          onChange={(event) => setNote(event.target.value)}
          aria-label={`Internal note for ${summary}`}
          placeholder="Internal note (not shown to learner)"
          className="input py-2"
        />
        <button
          onClick={() => {
            audit("Internal note saved")
            toast("Internal note saved")
          }}
          className={`${smallOutline} shrink-0`}
        >
          Save note
        </button>
      </div>

      {item.status === "replied" && item.reply && (
        <>
          <div className="mt-3 rounded-xl border border-green-200 bg-green-50 p-3 dark:border-green-800/70 dark:bg-green-950/40">
            <p className="text-xs font-semibold text-green-700 dark:text-green-300">
              Your reply · {item.replyAt}
            </p>
            <p className="mt-1 text-sm text-gray-700 dark:text-gray-100 whitespace-pre-wrap">
              {item.reply}
            </p>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              onClick={() => {
                const visible = item.replyVisible === false
                update({ replyVisible: visible })
                toast(
                  visible
                    ? "Reply is now visible to users"
                    : "Reply hidden from users",
                )
              }}
              className={`btn inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold ${
                item.replyVisible === false
                  ? "border-gray-300 text-gray-500 dark:border-white/15 dark:text-gray-400"
                  : "border-green-300 text-green-700 dark:border-green-800 dark:text-green-300"
              }`}
            >
              {item.replyVisible === false ? (
                <EyeOff size={14} />
              ) : (
                <Eye size={14} />
              )}
              {item.replyVisible === false
                ? "Hidden from users"
                : "Visible to users"}
            </button>
            <button onClick={remove} className={dangerOutline}>
              <Trash size={14} />
              Delete
            </button>
          </div>
        </>
      )}

      {item.status === "invalid" && (
        <button
          onClick={remove}
          className={`${dangerOutline} mt-3 px-4 py-2 text-sm`}
        >
          <Trash size={15} />
          Delete
        </button>
      )}

      {item.status === "pending" && (
        <div className="mt-3 space-y-2">
          <textarea
            rows={2}
            value={reply}
            onChange={(event) => setReply(event.target.value)}
            aria-label={`Reply to ${summary}`}
            placeholder="Write a reply to publish for this user..."
            className="input"
          />
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => {
                if (!reply.trim()) return toast("Please enter a reply", "error")
                update({
                  status: "replied",
                  reply: reply.trim(),
                  replyAt: new Date().toLocaleDateString(undefined, {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  }),
                  replyVisible: true,
                })
                audit("Reply published")
                toast("Reply published")
              }}
              className="btn-primary px-4 py-1.5 text-sm"
            >
              <Reply size={14} />
              Reply
            </button>
            <button
              onClick={() => {
                update({ status: "invalid" })
                audit("Marked as invalid")
                toast("Marked as invalid")
              }}
              className={smallOutline}
            >
              Mark invalid
            </button>
            <button onClick={remove} className={dangerOutline}>
              <Trash size={14} />
              Delete
            </button>
          </div>
        </div>
      )}
    </article>
  )
}

export function RequestsPanel({
  onConfirm,
  audit,
  onOpenWeek,
  /** Opens a course's week in Weeks & questions, for error reports. */
}: {
  onConfirm: (state: ConfirmState) => void
  audit: (action: string) => void
  onOpenWeek: (courseId: string, weekId: string) => void
}) {
  const { requests, courses, weeks } = useApp()
  const [query, setQuery] = useState("")
  const [type, setType] = useState("")
  const [contact, setContact] = useState("")
  const [courseFilter, setCourseFilter] = useState("")
  const [filter, setFilter] = useState<Filter>("all")
  const titleOf = (courseId?: string) =>
    courses.find((course) => course.id === courseId)?.title
  // A filtered course may have been deleted since; fall back to all courses.
  const course =
    courseFilter === NO_COURSE || titleOf(courseFilter) ? courseFilter : ""
  const term = query.trim().toLowerCase()
  const visible = requests.filter(
    (item) =>
      (filter === "all" || item.status === filter) &&
      (!type || item.type === type) &&
      (!course ||
        (course === NO_COURSE
          ? !titleOf(item.courseId)
          : item.courseId === course)) &&
      (!contact ||
        (contact === "with" ? Boolean(item.contact) : !item.contact)) &&
      (!term ||
        `${item.message} ${item.contact || ""} ${item.report?.questionText || ""}`
          .toLowerCase()
          .includes(term)),
  )
  const openWeekFor = (item: RequestItem) => {
    const { courseId, report } = item
    const exists = weeks.some(
      (week) => week.id === report?.weekId && week.courseId === courseId,
    )
    return courseId && report && exists
      ? () => onOpenWeek(courseId, report.weekId)
      : undefined
  }

  return (
    <Panel>
      <div className="mb-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div
            className="flex rounded-xl bg-gray-100 p-1 dark:bg-white/5"
            role="group"
            aria-label="Filter request status"
          >
            {(["all", "pending", "replied", "invalid"] as Filter[]).map(
              (key) => (
                <button
                  key={key}
                  onClick={() => setFilter(key)}
                  aria-pressed={filter === key}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                    filter === key
                      ? "bg-white text-gray-800 shadow-sm dark:bg-white/15 dark:text-white"
                      : "text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white"
                  }`}
                >
                  {key}
                </button>
              ),
            )}
          </div>
          <div className="relative w-full sm:w-64">
            <Search
              size={15}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              aria-label="Search requests"
              placeholder="Search message or contact..."
              className="input py-2 pl-9"
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            aria-label="Filter request type"
            value={type}
            onChange={(event) => setType(event.target.value)}
            className="input w-auto py-2"
          >
            <option value="">All types</option>
            {Object.entries(requestTypeMeta).map(([key, value]) => (
              <option key={key} value={key}>
                {value.label}
              </option>
            ))}
          </select>
          <select
            aria-label="Filter request course"
            value={course}
            onChange={(event) => setCourseFilter(event.target.value)}
            className="input w-auto max-w-full py-2 sm:max-w-52"
          >
            <option value="">All courses</option>
            {courses.map((item) => (
              <option key={item.id} value={item.id}>
                {item.title}
              </option>
            ))}
            <option value={NO_COURSE}>No course</option>
          </select>
          <select
            aria-label="Filter contact availability"
            value={contact}
            onChange={(event) => setContact(event.target.value)}
            className="input w-auto py-2"
          >
            <option value="">All contacts</option>
            <option value="with">With contact</option>
            <option value="without">No contact</option>
          </select>
        </div>
      </div>
      {visible.length === 0 ? (
        <p className="py-6 text-center text-sm text-gray-500 dark:text-gray-400">
          {requests.length === 0
            ? "No requests or feedback yet."
            : "No requests match these filters."}
        </p>
      ) : (
        <div className="space-y-3">
          {visible.map((item) => (
            <RequestCard
              key={item.id}
              item={item}
              courseTitle={titleOf(item.courseId)}
              onConfirm={onConfirm}
              audit={audit}
              onOpenWeek={openWeekFor(item)}
            />
          ))}
        </div>
      )}
    </Panel>
  )
}
