import {
  useEffect,
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react"
import {
  ArrowUp,
  ChevronDown,
  ChevronUp,
  Download,
  Eye,
  EyeOff,
  PenLine,
  Plus,
  Search,
  Trash,
  Upload,
  X,
} from "lucide-react"
import { StatusBadge, difficultyClass } from "../../components/common"
import { useApp } from "../../lib/app-context"
import { isValidQuestion } from "../../lib/cloud-content"
import {
  type AdminQuestion,
  type Course,
  type Status,
  type Week,
} from "../../lib/data"
import {
  csvCell,
  downloadFile,
  Field,
  formShell,
  IconButton,
  Modal,
  Panel,
  parseCsv,
  rowClass,
  smallOutline,
  smallPrimary,
  StatusSelect,
  type ConfirmState,
} from "./ui"

export type Audit = (action: string, resource?: string) => void
type Confirm = (state: ConfirmState) => void

const letter = (index: number) =>
  index >= 0 ? String.fromCharCode(65 + index) : "—"
const plural = (count: number, word: string) =>
  `${count} ${word}${count === 1 ? "" : "s"}`
/* ---------- Question inventory ---------- */

type QuestionDraft = {
  questionText: string
  options: string[]
  optionCount: number
  correctAnswerIndex: number
  difficulty: string
  topic: string
  explanation: string
  status: Status
}

const emptyDraft: QuestionDraft = {
  questionText: "",
  options: ["", "", "", ""],
  optionCount: 4,
  correctAnswerIndex: -1,
  difficulty: "",
  topic: "",
  explanation: "",
  status: "draft",
}

const toDraft = (question: AdminQuestion): QuestionDraft => ({
  questionText: question.questionText,
  options:
    question.options ??
    Array.from({ length: Math.max(2, question.optionCount) }, () => ""),
  optionCount: question.optionCount,
  correctAnswerIndex: question.correctAnswerIndex,
  difficulty: question.difficulty,
  topic: question.topic || "",
  explanation: question.explanation || "",
  status: question.status,
})

const fromDraft = (draft: QuestionDraft, id: string): AdminQuestion => ({
  id,
  questionText: draft.questionText.trim(),
  options: draft.options.map((option) => option.trim()),
  optionCount: draft.options.length,
  correctAnswerIndex: draft.correctAnswerIndex,
  difficulty: draft.difficulty,
  topic: draft.topic.trim() || undefined,
  explanation: draft.explanation.trim() || undefined,
  status: draft.status,
})

function QuestionForm({
  initial,
  editing,
  onSubmit,
  onCancel,
}: {
  initial: QuestionDraft
  editing: boolean
  onSubmit: (draft: QuestionDraft) => void
  onCancel: () => void
}) {
  const { toast } = useApp()
  const id = useId()
  const [draft, setDraft] = useState(initial)
  const set = (patch: Partial<QuestionDraft>) =>
    setDraft((current) => ({ ...current, ...patch }))
  const options = draft.options

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!draft.questionText.trim())
      return toast("Please enter the question text", "error")
    if (options && options.length < 2)
      return toast("A question needs at least 2 options", "error")
    if (options?.some((option) => !option.trim()))
      return toast(
        "Please fill in every option or remove the empty ones",
        "error",
      )
    if (draft.correctAnswerIndex < 0)
      return toast("Please select which option is correct", "error")
    onSubmit(draft)
  }

  return (
    <form onSubmit={submit} className={formShell}>
      <h3 className="font-semibold text-gray-800 dark:text-white">
        {editing ? "Edit question" : "Add Question"}
      </h3>
      <Field id={`${id}-text`} label="Question text">
        <textarea
          id={`${id}-text`}
          rows={2}
          value={draft.questionText}
          onChange={(event) => set({ questionText: event.target.value })}
          className="input"
        />
      </Field>
      <fieldset>
        <legend className="label">Options</legend>
        <div className="space-y-2">
          {options.map((option, index) => (
            <div key={index} className="flex items-center gap-2">
              <input
                type="radio"
                name={`${id}-correct`}
                checked={draft.correctAnswerIndex === index}
                onChange={() => set({ correctAnswerIndex: index })}
                aria-label={`Mark option ${letter(index)} as correct`}
                className="h-4 w-4 shrink-0 accent-green-500"
              />
              <input
                value={option}
                onChange={(event) =>
                  set({
                    options: options.map((item, i) =>
                      i === index ? event.target.value : item,
                    ),
                  })
                }
                placeholder={`Option ${letter(index)}`}
                aria-label={`Option ${letter(index)}`}
                className="input py-2"
              />
              <IconButton
                icon={X}
                label={`Remove option ${letter(index)}`}
                disabled={options.length <= 2}
                onClick={() =>
                  set({
                    options: options.filter((_, i) => i !== index),
                    correctAnswerIndex:
                      draft.correctAnswerIndex === index
                        ? -1
                        : draft.correctAnswerIndex > index
                          ? draft.correctAnswerIndex - 1
                          : draft.correctAnswerIndex,
                  })
                }
              />
            </div>
          ))}
          {options.length < 6 && (
            <button
              type="button"
              onClick={() => set({ options: [...options, ""] })}
              className="inline-flex items-center gap-1 text-sm font-semibold text-primary-600 dark:text-primary-300"
            >
              <Plus size={14} />
              Add option
            </button>
          )}
        </div>
      </fieldset>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field id={`${id}-difficulty`} label="Difficulty">
          <select
            id={`${id}-difficulty`}
            value={draft.difficulty}
            onChange={(event) => set({ difficulty: event.target.value })}
            className="input"
          >
            <option value="">No difficulty</option>
            <option>Easy</option>
            <option>Medium</option>
            <option>Hard</option>
          </select>
        </Field>
        <Field id={`${id}-topic`} label="Topic (optional)">
          <input
            id={`${id}-topic`}
            value={draft.topic}
            onChange={(event) => set({ topic: event.target.value })}
            className="input"
          />
        </Field>
        <Field id={`${id}-status`} label="Publication status">
          <StatusSelect
            id={`${id}-status`}
            value={draft.status}
            onChange={(status) => set({ status })}
          />
        </Field>
      </div>
      <Field id={`${id}-explanation`} label="Explanation (optional)">
        <textarea
          id={`${id}-explanation`}
          rows={2}
          value={draft.explanation}
          onChange={(event) => set({ explanation: event.target.value })}
          className="input"
        />
      </Field>
      <div className="flex gap-2">
        <button type="submit" className={smallPrimary}>
          {editing ? "Update Question" : "Add Question"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="btn-ghost px-4 py-2 text-sm"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}

const templateColumns = [
  "questionText",
  "options",
  "correctAnswer",
  "explanation",
  "difficulty",
  "topic",
]

function BulkUpload({
  existing,
  onImport,
  onClose,
}: {
  existing: AdminQuestion[]
  onImport: (rows: AdminQuestion[]) => Promise<void>
  onClose: () => void
}) {
  const { toast } = useApp()
  const inputRef = useRef<HTMLInputElement>(null)
  const [result, setResult] = useState<{
    fileName: string
    valid: AdminQuestion[]
    errors: string[]
  } | null>(null)

  const handleFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file) return
    if (file.size > 5 * 1024 * 1024)
      return toast("File too large — maximum 5 MB", "error")
    if (!/\.csv$/i.test(file.name))
      return toast("Only CSV files can be read in this preview", "error")
    const rows = parseCsv(await file.text())
    if (rows.length < 2) return toast("No rows found in file", "error")
    if (rows.length - 1 > 500)
      return toast("File too large — maximum 500 rows", "error")
    const header = rows[0].map((cell) => cell.trim().toLowerCase())
    const column = (name: string) => header.indexOf(name.toLowerCase())
    if (column("questionText") < 0 || column("options") < 0)
      return toast(
        "File must contain questionText and options columns",
        "error",
      )

    const seen = new Set(
      existing.map((question) => question.questionText.trim().toLowerCase()),
    )
    const valid: AdminQuestion[] = []
    const errors: string[] = []
    rows.slice(1).forEach((row, index) => {
      const rowNumber = index + 2
      const get = (name: string) =>
        column(name) < 0 ? "" : (row[column(name)] ?? "").trim()
      const text = get("questionText")
      const options = get("options")
        .split("|")
        .map((option) => option.trim())
        .filter(Boolean)
      const answer = get("correctAnswer")
      const correct = /^[a-z]$/i.test(answer)
        ? answer.toUpperCase().charCodeAt(0) - 65
        : Number(answer) - 1
      let error = ""
      if (!text) error = "Question text is missing."
      else if (options.length < 2)
        error = "Question has empty or insufficient options."
      else if (
        !Number.isInteger(correct) ||
        correct < 0 ||
        correct >= options.length
      )
        error = "Question has no valid correct answer."
      else if (seen.has(text.toLowerCase())) error = "duplicate question"
      if (error) {
        errors.push(`Row ${rowNumber}: ${error}`)
        return
      }
      seen.add(text.toLowerCase())
      valid.push({
        id: `import-${Date.now()}-${rowNumber}`,
        questionText: text,
        options,
        optionCount: options.length,
        correctAnswerIndex: correct,
        difficulty:
          ["Easy", "Medium", "Hard"].find(
            (item) => item.toLowerCase() === get("difficulty").toLowerCase(),
          ) ?? "",
        topic: get("topic") || undefined,
        explanation: get("explanation") || undefined,
        status: "draft",
      })
    })
    setResult({ fileName: file.name, valid, errors })
  }

  return (
    <div className="mb-4 rounded-xl border border-dashed border-gray-300 p-4 dark:border-white/15">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-gray-800 dark:text-white">
            Bulk Upload Questions
          </h3>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Expected columns: {templateColumns.join(", ")}. Separate options
            with “|”. Maximum 500 rows and 5 MB. This preview reads CSV files
            only.
          </p>
        </div>
        <IconButton icon={X} label="Close bulk upload" onClick={onClose} />
      </div>
      {!result ? (
        <div className="mt-3 flex flex-wrap gap-2">
          <input
            ref={inputRef}
            type="file"
            accept=".csv,text/csv"
            className="sr-only"
            onChange={handleFile}
            aria-label="Upload CSV file"
            tabIndex={-1}
          />
          <button
            onClick={() => inputRef.current?.click()}
            className={smallPrimary}
          >
            <Upload size={15} />
            Upload CSV file
          </button>
          <button
            onClick={() =>
              downloadFile(
                "questions-template.csv",
                [
                  templateColumns,
                  [
                    "What is 2 + 2?",
                    "3|4|5|6",
                    "B",
                    "Basic addition.",
                    "Easy",
                    "Arithmetic",
                  ],
                ]
                  .map((row) => row.map(csvCell).join(","))
                  .join("\n"),
                "text/csv",
              )
            }
            className={smallOutline}
          >
            <Download size={14} />
            Download CSV template
          </button>
        </div>
      ) : (
        <div className="mt-3 space-y-2 text-sm text-gray-600 dark:text-gray-300">
          <p>
            <strong className="text-gray-800 dark:text-white">
              {result.fileName}
            </strong>{" "}
            — {plural(result.valid.length, "row")} ready, {result.errors.length}{" "}
            rejected. Review before writing.
          </p>
          {result.errors.length > 0 && (
            <ul className="max-h-32 overflow-y-auto rounded-lg bg-red-50 p-2 text-xs text-red-700 dark:bg-red-950/30 dark:text-red-300">
              {result.errors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          )}
          <div className="flex flex-wrap gap-2">
            <button
              disabled={result.valid.length === 0}
              onClick={async () => {
                await onImport(result.valid)
                setResult(null)
              }}
              className={smallPrimary}
            >
              Import All
            </button>
            <button onClick={() => setResult(null)} className={smallOutline}>
              Choose a different file
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export function questionFlags(questions: AdminQuestion[]) {
  return questions.flatMap((question) =>
    [
      !question.questionText.trim() && "Question text is missing.",
      !question.options?.length && "Option text is missing.",
      question.optionCount < 2 && "Question has empty or insufficient options.",
      (question.correctAnswerIndex < 0 ||
        question.correctAnswerIndex >= question.optionCount) &&
        "Question has no valid correct answer.",
      !question.topic && "Question has no topic.",
      !question.difficulty && "Question has no difficulty.",
    ].filter((flag): flag is string => Boolean(flag)),
  )
}

export function QuestionList({
  listId,
  ownerCourseId,
  ownerType,
  ownerLabel,
  showFlags,
  embedded,
  audit,
  onConfirm,
  backLabel,
  onBack,
  /** A link back up to the list these questions belong to. */
}: {
  listId: string
  ownerCourseId: string
  ownerType: "week" | "paper"
  ownerLabel: string
  showFlags: boolean
  embedded?: boolean
  audit: Audit
  onConfirm: Confirm
  backLabel?: string
  onBack?: () => void
}) {
  const {
    adminQuestions,
    saveQuestion,
    saveQuestions,
    archiveQuestion,
    newQuestionId,
    toast,
  } = useApp()
  const questions = adminQuestions[listId] ?? []
  const [form, setForm] = useState<{ mode: "add" } | {
    mode: "edit"
    id: string
  } | null>(null)
  const [bulkOpen, setBulkOpen] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const flags = showFlags ? questionFlags(questions) : []
  const owner = { id: listId, courseId: ownerCourseId, type: ownerType }
  const persistQuestion = async (question: AdminQuestion) => {
    try {
      await saveQuestion(owner, question)
      return true
    } catch (error) {
      toast(
        error instanceof Error ? error.message : "Question couldn't be saved.",
        "error",
      )
      return false
    }
  }

  const body = (
    <>
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-primary-700 hover:underline dark:text-primary-300"
        >
          <ArrowUp size={14} aria-hidden="true" />
          {backLabel}
        </button>
      )}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold font-display text-gray-800 dark:text-white">
          Questions — {ownerLabel}
        </h2>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setPreviewOpen(true)} className={smallOutline}>
            <Eye size={15} />
            Preview
          </button>
          <button
            onClick={() => setBulkOpen((open) => !open)}
            aria-expanded={bulkOpen}
            className={smallOutline}
          >
            <Upload size={15} />
            Bulk Upload
          </button>
          <button
            onClick={() => setForm({ mode: "add" })}
            className={smallPrimary}
          >
            <Plus size={15} />
            Add Question
          </button>
        </div>
      </div>
      {questions.length > 0 && (
        <p className="mb-4 text-xs text-gray-600 dark:text-gray-400">
          {plural(
            questions.filter(isValidQuestion).length,
            "complete question",
          )}
          {" · "}
          {plural(
            questions.filter(
              (question) =>
                question.status === "published" && isValidQuestion(question),
            ).length,
            "published question",
          )}
        </p>
      )}

      {flags.length > 0 && (
        <div className="mb-4 rounded-xl border border-amber-400/70 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-600/70 dark:bg-amber-950/25 dark:text-amber-200">
          <p className="font-semibold">
            Question review: {plural(flags.length, "flag")}
          </p>
          <ul className="mt-1.5 space-y-1">
            {flags.slice(0, 8).map((flag, index) => (
              <li key={index}>· {flag}</li>
            ))}
          </ul>
        </div>
      )}

      {bulkOpen && (
        <BulkUpload
          existing={questions}
          onClose={() => setBulkOpen(false)}
          onImport={async (rows) => {
            try {
              await saveQuestions(
                owner,
                rows.map((row) => ({ ...row, id: newQuestionId() })),
              )
            } catch (error) {
              toast(
                error instanceof Error
                  ? error.message
                  : "Questions couldn't be imported.",
                "error",
              )
              return
            }
            audit(
              `Imported ${plural(rows.length, "question")} as drafts`,
              ownerLabel,
            )
            toast(`Imported ${plural(rows.length, "question")} as drafts`)
            setBulkOpen(false)
          }}
        />
      )}

      {form?.mode === "add" && (
        <QuestionForm
          initial={emptyDraft}
          editing={false}
          onCancel={() => setForm(null)}
          onSubmit={async (draft) => {
            const saved = await persistQuestion(
              fromDraft(draft, newQuestionId()),
            )
            if (!saved) return
            audit(`Question added as ${draft.status}`, ownerLabel)
            toast("Question added")
            setForm(null)
          }}
        />
      )}

      {questions.length === 0 ? (
        <p className="py-4 text-center text-sm text-gray-500 dark:text-gray-400">
          No question records yet.
        </p>
      ) : (
        <div className="space-y-2.5">
          {questions.map((question, index) =>
            form?.mode === "edit" && form.id === question.id ? (
              <QuestionForm
                key={question.id}
                initial={toDraft(question)}
                editing
                onCancel={() => setForm(null)}
                onSubmit={async (draft) => {
                  const saved = await persistQuestion(
                    fromDraft(draft, question.id),
                  )
                  if (!saved) return
                  audit(`Question ${index + 1} edited`, ownerLabel)
                  toast("Question updated")
                  setForm(null)
                }}
              />
            ) : (
              <div
                key={question.id}
                className="flex flex-wrap items-start gap-x-3 gap-y-1.5 rounded-xl bg-gray-50 px-3 py-3 dark:bg-white/[0.035]"
              >
                <div className="min-w-0 flex-1 basis-60">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">
                      Q{index + 1}.
                    </span>
                    <StatusBadge status={question.status} />
                    {question.difficulty && (
                      <span
                        className={`rounded-md px-1.5 py-0.5 text-xs ${difficultyClass(question.difficulty)}`}
                      >
                        {question.difficulty}
                      </span>
                    )}
                  </div>
                  <p className="mt-1.5 text-sm text-gray-800 dark:text-gray-100">
                    {question.questionText || "Untitled question"}
                  </p>
                  <p className="mt-0.5 text-xs text-gray-600 dark:text-gray-400">
                    {question.optionCount} options · Correct:{" "}
                    {letter(question.correctAnswerIndex)}
                  </p>
                </div>
                <div className="ml-auto flex shrink-0">
                  <IconButton
                    icon={question.status === "published" ? EyeOff : Eye}
                    label={
                      question.status === "published"
                        ? "Hide from students"
                        : "Make visible to students"
                    }
                    onClick={async () => {
                      const status: Status =
                        question.status === "published" ? "draft" : "published"
                      const saved = await persistQuestion({
                        ...question,
                        status,
                      })
                      if (!saved) return
                      audit(`Status → ${status}`, ownerLabel)
                      toast(
                        status === "published"
                          ? "Question published"
                          : "Question unpublished",
                      )
                    }}
                  />
                  <IconButton
                    icon={PenLine}
                    label={`Edit question ${index + 1}`}
                    onClick={() => setForm({ mode: "edit", id: question.id })}
                  />
                  <IconButton
                    icon={Trash}
                    label={`Delete question ${index + 1}`}
                    tone="hover:text-red-500"
                    onClick={() =>
                      onConfirm({
                        title: "Archive this question?",
                        body: "The question will disappear from learner views. Its record is retained so existing bookmarks and quiz attempts remain valid.",
                        confirmLabel: "Archive question",
                        onConfirm: async () => {
                          await archiveQuestion(owner, question.id)
                          audit(`Deleted question ${index + 1}`, ownerLabel)
                          toast("Question archived")
                        },
                      })
                    }
                  />
                </div>
              </div>
            ),
          )}
        </div>
      )}

      <Modal
        open={previewOpen}
        title="Preview as student"
        onClose={() => setPreviewOpen(false)}
        footer={
          <button
            onClick={() => setPreviewOpen(false)}
            className={smallOutline}
          >
            Close preview
          </button>
        }
      >
        {questions.filter(
          (question) =>
            question.status === "published" && isValidQuestion(question),
        ).length === 0 ? (
          <p>No questions to preview yet.</p>
        ) : (
          <ol className="space-y-3">
            {questions
              .filter(
                (question) =>
                  question.status === "published" && isValidQuestion(question),
              )
              .map((question, index) => (
                <li
                  key={question.id}
                  className="rounded-xl border border-gray-200 p-3 dark:border-white/10"
                >
                  <p className="font-medium text-gray-800 dark:text-gray-100">
                    {index + 1}. {question.questionText}
                  </p>
                  <ul className="mt-2 space-y-1">
                    {(question.options ?? []).map((option, optionIndex) => (
                      <li
                        key={optionIndex}
                        className="rounded-lg bg-gray-100 px-2.5 py-1.5 dark:bg-white/5"
                      >
                        {letter(optionIndex)}. {option}
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
          </ol>
        )}
      </Modal>
    </>
  )

  return embedded ? <div>{body}</div> : <Panel>{body}</Panel>
}

/* ---------- Weeks ---------- */

const byNumber = (a: Week, b: Week) => a.weekNumber - b.weekNumber

export function WeeksPanel({
  course,
  selectedId,
  onSelect,
  audit,
  onConfirm,
}: {
  course: Course
  selectedId: string | null
  onSelect: (id: string | null) => void
  audit: Audit
  onConfirm: Confirm
}) {
  const {
    weeks: allWeeks,
    saveWeek,
    archiveWeek,
    newContentId,
    adminQuestions,
    toast,
  } = useApp()
  // This course's weeks; updates still go through the shared list, leaving other courses untouched.
  const weeks = allWeeks.filter((week) => week.courseId === course.id)
  const id = useId()
  const [form, setForm] = useState<{
    id: string | null
    weekNumber: string
    title: string
    status: Status
  } | null>(null)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!form) return
    const number = Number(form.weekNumber)
    const title = form.title.trim()
    if (!form.weekNumber.trim() || !title)
      return toast("Please enter a week number and title", "error")
    if (!Number.isInteger(number) || number <= 0)
      return toast("Week number must be a positive whole number", "error")
    if (weeks.some((week) => week.weekNumber === number && week.id !== form.id))
      return toast(`Week ${number} already exists`, "error")
    const updated: Week = {
      id: form.id ?? newContentId("weeks"),
      courseId: course.id,
      weekNumber: number,
      title,
      questionCount:
        weeks.find((week) => week.id === form.id)?.questionCount ?? 0,
      status: form.status,
    }
    try {
      await saveWeek(updated)
    } catch (error) {
      toast(
        error instanceof Error ? error.message : "Week couldn't be saved.",
        "error",
      )
      return
    }
    if (form.id) {
      audit(`Week ${number} edited`, "Weeks")
      toast("Week updated")
    } else {
      audit(`Week ${number} created as ${form.status}`, "Weeks")
      toast("Week added")
    }
    setForm(null)
  }

  return (
    <Panel>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold font-display text-gray-800 dark:text-white">
          Weeks
        </h2>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => {
              const questions = Object.fromEntries(
                weeks
                  .filter((week) => adminQuestions[week.id])
                  .map((week) => [week.id, adminQuestions[week.id]]),
              )
              downloadFile(
                `nptel-${course.id}-weeks-backup-${new Date().toISOString().slice(0, 10)}.json`,
                JSON.stringify(
                  {
                    version: 1,
                    exportedAt: new Date().toISOString(),
                    course: { id: course.id, title: course.title },
                    weeks,
                    questions,
                  },
                  null,
                  2,
                ),
                "application/json",
              )
              audit("Backup exported", "Weeks")
              toast("Backup exported")
            }}
            className={smallOutline}
          >
            Export backup
          </button>
          <button
            disabled
            title="Restore is disabled until full Firestore backup validation is available."
            className={smallOutline}
          >
            Restore unavailable
          </button>
          <button
            onClick={() =>
              setForm({
                id: null,
                weekNumber: String(
                  Math.max(0, ...weeks.map((week) => week.weekNumber)) + 1,
                ),
                title: "",
                status: "draft",
              })
            }
            className={smallPrimary}
          >
            <Plus size={16} />
            Add Week
          </button>
        </div>
      </div>

      {form && (
        <form onSubmit={submit} className={formShell}>
          <h3 className="font-semibold text-gray-800 dark:text-white">
            {form.id ? "Edit Week" : "Add New Week"}
          </h3>
          <div className="grid gap-3 sm:grid-cols-[140px_1fr_180px]">
            <Field id={`${id}-number`} label="Week number">
              <input
                id={`${id}-number`}
                type="number"
                min={1}
                value={form.weekNumber}
                onChange={(event) =>
                  setForm({ ...form, weekNumber: event.target.value })
                }
                className="input"
              />
            </Field>
            <Field id={`${id}-title`} label="Week title">
              <input
                id={`${id}-title`}
                value={form.title}
                onChange={(event) =>
                  setForm({ ...form, title: event.target.value })
                }
                className="input"
              />
            </Field>
            <Field id={`${id}-status`} label="Publication status">
              <StatusSelect
                id={`${id}-status`}
                value={form.status}
                onChange={(status) => setForm({ ...form, status })}
              />
            </Field>
          </div>
          <div className="flex gap-2">
            <button type="submit" className={smallPrimary}>
              {form.id ? "Update" : "Add Week"}
            </button>
            <button
              type="button"
              onClick={() => setForm(null)}
              className="btn-ghost px-4 py-2 text-sm"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {weeks.length === 0 ? (
        <p className="py-6 text-center text-sm text-gray-500 dark:text-gray-400">
          No weeks yet. Click "Add Week" to begin.
        </p>
      ) : (
        <div className="space-y-2.5">
          {weeks.map((week) => {
            const selected = week.id === selectedId
            return (
              <div key={week.id} className={rowClass(selected)}>
                <button
                  onClick={() => onSelect(selected ? null : week.id)}
                  aria-pressed={selected}
                  className="flex min-w-0 flex-1 basis-60 items-center gap-3 text-left"
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary-100 text-sm font-bold text-primary-700 dark:bg-primary-900/50 dark:text-primary-200">
                    {week.weekNumber}
                  </span>
                  <span className="min-w-0">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-gray-800 dark:text-gray-100">
                        {week.title || "Untitled week"}
                      </span>
                      <StatusBadge status={week.status} />
                    </span>
                    <span className="block text-xs text-gray-600 dark:text-gray-400">
                      {plural(week.questionCount, "question")}
                    </span>
                  </span>
                </button>
                <div className="ml-auto flex shrink-0">
                  <IconButton
                    icon={week.status === "published" ? EyeOff : Eye}
                    label={
                      week.status === "published"
                        ? "Hide from students"
                        : "Make visible to students"
                    }
                    onClick={async () => {
                      const status: Status =
                        week.status === "published" ? "draft" : "published"
                      try {
                        await saveWeek({ ...week, status })
                      } catch (error) {
                        toast(
                          error instanceof Error
                            ? error.message
                            : "Week status couldn't be saved.",
                          "error",
                        )
                        return
                      }
                      audit(
                        `Week ${week.weekNumber}: status → ${status}`,
                        "Weeks",
                      )
                      toast(
                        status === "published"
                          ? "Week published"
                          : "Week unpublished",
                      )
                    }}
                  />
                  <IconButton
                    icon={PenLine}
                    label={`Edit ${week.title}`}
                    onClick={() =>
                      setForm({
                        id: week.id,
                        weekNumber: String(week.weekNumber),
                        title: week.title,
                        status: week.status,
                      })
                    }
                  />
                  <IconButton
                    icon={Trash}
                    label={`Delete ${week.title}`}
                    tone="hover:text-red-500"
                    onClick={() =>
                      onConfirm({
                        title: `Archive “${week.title}”?`,
                        body: `This hides the week from learners. Question records remain stored so bookmarks and quiz attempts are not deleted.`,
                        confirmLabel: "Archive week",
                        onConfirm: async () => {
                          await archiveWeek(week)
                          if (selected) onSelect(null)
                          audit(`Week ${week.weekNumber} archived`, "Weeks")
                          toast("Week archived")
                        },
                      })
                    }
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </Panel>
  )
}

/* ---------- PYQ papers ---------- */

type PaperForm = {
  id: string | null
  title: string
  year: string
  session: string
  course: string
  status: Status
}

export function PapersPanel({
  course,
  audit,
  onConfirm,
}: {
  course: Course
  audit: Audit
  onConfirm: Confirm
}) {
  const {
    papers: allPapers,
    savePaper,
    archivePaper,
    newContentId,
    adminQuestions,
    toast,
  } = useApp()
  // This course's papers; updates still go through the shared list, leaving other courses untouched.
  const papers = allPapers.filter((paper) => paper.courseId === course.id)
  const id = useId()
  const [query, setQuery] = useState("")
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [form, setForm] = useState<PaperForm | null>(null)
  const term = query.trim().toLowerCase()
  const visible = term
    ? papers.filter((paper) =>
        `${paper.title} ${paper.year} ${paper.session}`
          .toLowerCase()
          .includes(term),
      )
    : papers
  const totalQuestions = papers.reduce(
    (sum, paper) => sum + paper.questionCount,
    0,
  )
  const selected = papers.find((paper) => paper.id === selectedId)
  const listTop = useRef<HTMLDivElement>(null)
  const questionsTop = useRef<HTMLDivElement>(null)
  const revealQuestions = useRef(false)

  const selectPaper = (id: string | null) => {
    revealQuestions.current = id !== null
    setSelectedId(id)
  }

  // A chosen paper's questions sit below the paper list, so bring them into view.
  useEffect(() => {
    if (!revealQuestions.current || !selectedId) return
    revealQuestions.current = false
    questionsTop.current?.scrollIntoView({ behavior: "smooth", block: "start" })
  }, [selectedId])

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!form) return
    const title = form.title.trim()
    const year = Number(form.year)
    const session = form.session.trim()
    if (!title) return toast("Please enter a paper title", "error")
    if (!Number.isInteger(year) || year < 1950 || year > 2100)
      return toast("Year must be a valid year", "error")
    if (
      papers.some(
        (paper) =>
          paper.id !== form.id &&
          paper.title.toLowerCase() === title.toLowerCase() &&
          paper.year === year &&
          paper.session.toLowerCase() === session.toLowerCase(),
      )
    )
      return toast(
        "A paper with this title, year, and session already exists",
        "error",
      )
    const savedPaper = {
      id: form.id ?? newContentId("papers"),
      courseId: course.id,
      title,
      year,
      session,
      questionCount:
        papers.find((paper) => paper.id === form.id)?.questionCount ?? 0,
      course: form.course.trim() || undefined,
      status: form.status,
    }
    try {
      await savePaper(savedPaper)
    } catch (error) {
      toast(
        error instanceof Error ? error.message : "Paper couldn't be saved.",
        "error",
      )
      return
    }
    if (form.id) {
      audit("Paper edited", "PYQ papers")
      toast("PYQ paper updated")
    } else {
      audit(`Paper created as ${form.status}`, "PYQ papers")
      toast("PYQ paper added")
    }
    setForm(null)
  }

  return (
    <Panel>
      <div
        ref={listTop}
        className="mb-4 flex scroll-mt-36 flex-wrap items-start justify-between gap-3 lg:scroll-mt-24"
      >
        <p className="max-w-xl text-sm text-gray-500 dark:text-gray-400">
          Only add papers with verified questions and correct answers. Do not
          invent examination years or official-paper claims.
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() =>
              setForm({
                id: null,
                title: "",
                year: String(new Date().getFullYear()),
                session: "",
                course: "",
                status: "draft",
              })
            }
            className={smallPrimary}
          >
            <Plus size={16} />
            Add Paper
          </button>
        </div>
      </div>

      {form && (
        <form onSubmit={submit} className={formShell}>
          <h3 className="font-semibold text-gray-800 dark:text-white">
            {form.id ? "Edit Paper" : "Add New Paper"}
          </h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_110px_150px_1fr_160px]">
            <Field id={`${id}-title`} label="Paper title">
              <input
                id={`${id}-title`}
                value={form.title}
                onChange={(event) =>
                  setForm({ ...form, title: event.target.value })
                }
                className="input"
              />
            </Field>
            <Field id={`${id}-year`} label="Year">
              <input
                id={`${id}-year`}
                type="number"
                value={form.year}
                onChange={(event) =>
                  setForm({ ...form, year: event.target.value })
                }
                className="input"
              />
            </Field>
            <Field id={`${id}-session`} label="Session">
              <input
                id={`${id}-session`}
                placeholder="Session (e.g. Dec, Jul)"
                value={form.session}
                onChange={(event) =>
                  setForm({ ...form, session: event.target.value })
                }
                className="input"
              />
            </Field>
            <Field id={`${id}-course`} label="Course label (optional)">
              <input
                id={`${id}-course`}
                value={form.course}
                onChange={(event) =>
                  setForm({ ...form, course: event.target.value })
                }
                className="input"
              />
            </Field>
            <Field id={`${id}-status`} label="Publication status">
              <StatusSelect
                id={`${id}-status`}
                value={form.status}
                onChange={(status) => setForm({ ...form, status })}
              />
            </Field>
          </div>
          <div className="flex gap-2">
            <button type="submit" className={smallPrimary}>
              {form.id ? "Update" : "Add Paper"}
            </button>
            <button
              type="button"
              onClick={() => setForm(null)}
              className="btn-ghost px-4 py-2 text-sm"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative min-w-56 flex-1">
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label="Search PYQ papers"
            placeholder="Search papers by title, year, or session…"
            className="input py-2 pl-9"
          />
        </div>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {plural(papers.length, "paper")} ·{" "}
          {plural(totalQuestions, "question")}
        </span>
      </div>

      {papers.length === 0 ? (
        <p className="py-6 text-center text-sm text-gray-500 dark:text-gray-400">
          No PYQ papers yet. Click "Add Paper" to publish the first verified
          paper.
        </p>
      ) : visible.length === 0 ? (
        <p className="py-6 text-center text-sm text-gray-500 dark:text-gray-400">
          No papers match "{query.trim()}".
        </p>
      ) : (
        <div className="space-y-2.5">
          {visible.map((paper) => {
            const index = papers.indexOf(paper)
            const isSelected = paper.id === selectedId
            const reorderHint = term
              ? "Clear search to reorder papers"
              : undefined
            return (
              <div key={paper.id} className={rowClass(isSelected)}>
                <button
                  onClick={() => selectPaper(isSelected ? null : paper.id)}
                  aria-pressed={isSelected}
                  className="flex min-w-0 flex-1 basis-60 items-center gap-3 text-left"
                >
                  <span className="shrink-0 rounded-lg bg-emerald-100 px-2.5 py-1.5 text-sm font-bold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                    #{index + 1}
                  </span>
                  <span className="hidden shrink-0 rounded-lg bg-emerald-100 px-2.5 py-1.5 text-sm font-bold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 sm:inline">
                    {paper.year}
                  </span>
                  <span className="min-w-0">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-gray-800 dark:text-gray-100">
                        {paper.title}
                      </span>
                      <StatusBadge status={paper.status} />
                    </span>
                    <span className="block text-xs text-gray-600 dark:text-gray-400">
                      {[paper.session, plural(paper.questionCount, "question")]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </span>
                </button>
                <div
                  className="ml-auto flex shrink-0 justify-end"
                  title={reorderHint}
                >
                  <IconButton
                    icon={paper.status === "published" ? EyeOff : Eye}
                    label={
                      paper.status === "published"
                        ? "Hide from students"
                        : "Make visible to students"
                    }
                    onClick={async () => {
                      const status: Status =
                        paper.status === "published" ? "draft" : "published"
                      try {
                        await savePaper({ ...paper, status })
                      } catch (error) {
                        toast(
                          error instanceof Error
                            ? error.message
                            : "Paper status couldn't be saved.",
                          "error",
                        )
                        return
                      }
                      audit(`Status → ${status}`, "PYQ papers")
                      toast(
                        status === "published"
                          ? "Paper published"
                          : "Paper unpublished",
                      )
                    }}
                  />
                  <IconButton
                    icon={PenLine}
                    label={`Edit ${paper.title}`}
                    onClick={() =>
                      setForm({
                        id: paper.id,
                        title: paper.title,
                        year: String(paper.year),
                        session: paper.session,
                        course: paper.course || "",
                        status: paper.status,
                      })
                    }
                  />
                  <IconButton
                    icon={Trash}
                    label={`Delete ${paper.title}`}
                    tone="hover:text-red-500"
                    onClick={() =>
                      onConfirm({
                        title: `Archive “${paper.title}”?`,
                        body: `This hides the paper from learners. Question records remain stored so existing bookmarks and quiz attempts are not deleted.`,
                        confirmLabel: "Archive paper",
                        onConfirm: async () => {
                          await archivePaper(paper)
                          if (isSelected) setSelectedId(null)
                          audit("Paper archived", "PYQ papers")
                          toast("PYQ paper archived")
                        },
                      })
                    }
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}

      {selected && (
        <div
          ref={questionsTop}
          className="mt-5 scroll-mt-36 border-t border-gray-200 pt-5 lg:scroll-mt-24 dark:border-white/10"
        >
          <QuestionList
            key={selected.id}
            listId={selected.id}
            ownerLabel={selected.title}
            ownerCourseId={course.id}
            ownerType="paper"
            showFlags={false}
            embedded
            audit={audit}
            onConfirm={onConfirm}
            backLabel="Back to all papers"
            onBack={() =>
              listTop.current?.scrollIntoView({
                behavior: "smooth",
                block: "start",
              })
            }
          />
        </div>
      )}
    </Panel>
  )
}
