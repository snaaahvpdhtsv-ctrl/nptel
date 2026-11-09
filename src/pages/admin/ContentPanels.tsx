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
  Archive,
  ChevronDown,
  ChevronUp,
  Copy,
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
import {
  importQuestionOperation,
  isValidQuestion,
  restoreWeekBackup,
} from "../../lib/cloud-content"
import {
  parseQuestionImport,
  previewCounts,
  type ImportPreview,
} from "../../lib/bulk-content"
import {
  type AdminQuestion,
  type Course,
  type Status,
  type Week,
} from "../../lib/data"
import {
  csvCell,
  dangerOutline,
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

type CsvIssue = {
  row: number
  field: string
  reason: string
  value: string
}

function BulkUpload({
  existing,
  onImport,
  onClose,
}: {
  existing: AdminQuestion[]
  onImport: (
    rows: AdminQuestion[],
    sourceType: "csv" | "json",
    fileName: string,
  ) => Promise<void>
  onClose: () => void
}) {
  const { toast } = useApp()
  const inputRef = useRef<HTMLInputElement>(null)
  const jsonInputRef = useRef<HTMLInputElement>(null)
  const [csvInfoOpen, setCsvInfoOpen] = useState(false)
  const [result, setResult] = useState<{
    fileName: string
    valid: AdminQuestion[]
    errors: CsvIssue[]
  } | null>(null)
  const [jsonPreview, setJsonPreview] = useState<ImportPreview | null>(null)

  const csvInfoText = `CSV upload format

Create a UTF-8 CSV file with one question per row and these columns in this exact order:
questionText,options,correctAnswer,explanation,difficulty,topic

- Separate answer options with the pipe symbol: |
- Use A-F or 1-6 for correctAnswer, not the full answer text.
- Each question must contain between 2 and 6 options.
- Use Easy, Medium, or Hard for difficulty.
- Wrap fields containing commas in double quotes.
- Maximum 450 question rows and 5 MB per file.
- Imported questions are saved as drafts for review.

Example row:
"What is emotional regulation?","Managing emotions|Ignoring emotions|Avoiding people|Suppressing all feelings",A,"Managing emotions effectively.",Easy,"Emotional Regulation"`

  const handleJsonFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file) return
    if (file.size > 5 * 1024 * 1024)
      return toast("File too large — maximum 5 MB", "error")
    if (!/\.json$/i.test(file.name))
      return toast("Choose a JSON file for question import", "error")
    try {
      setJsonPreview(
        parseQuestionImport(
          await file.text(),
          file.name,
          existing,
          (row) => `import-${Date.now()}-${row}`,
        ),
      )
      setResult({ fileName: file.name, valid: [], errors: [] })
    } catch (error) {
      toast(
        error instanceof Error
          ? error.message
          : "The JSON file could not be read.",
        "error",
      )
    }
  }

  const handleFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file) return
    if (file.size > 5 * 1024 * 1024)
      return toast("File too large — maximum 5 MB", "error")
    if (!/\.csv$/i.test(file.name))
      return toast("Only CSV files can be read in this preview", "error")
    let rows: string[][]
    try {
      rows = parseCsv(await file.text())
    } catch {
      return toast(
        "This CSV file couldn't be read. Check its encoding.",
        "error",
      )
    }
    if (rows.length < 2) return toast("No rows found in file", "error")
    if (rows.length - 1 > 450)
      return toast("File too large — maximum 450 rows", "error")
    const header = rows[0].map((cell) =>
      cell
        .replace(/^\uFEFF/, "")
        .trim()
        .toLowerCase(),
    )
    const column = (name: string) => header.indexOf(name.toLowerCase())
    const expectedColumns = [
      "questionText",
      "options",
      "correctAnswer",
      "explanation",
      "difficulty",
      "topic",
    ]
    if (
      header.length !== expectedColumns.length ||
      expectedColumns.some(
        (name, index) => header[index] !== name.toLowerCase(),
      )
    )
      return toast(
        `CSV headers must be exactly: ${expectedColumns.join(", ")}`,
        "error",
      )

    const seen = new Set(
      existing.map((question) => question.questionText.trim().toLowerCase()),
    )
    const valid: AdminQuestion[] = []
    const errors: CsvIssue[] = []
    rows.slice(1).forEach((row, index) => {
      const rowNumber = index + 2
      const get = (name: string) =>
        column(name) < 0 ? "" : (row[column(name)] ?? "").trim()
      const text = get("questionText")
      const rawOptions = get("options").split("|")
      const options = rawOptions.map((option) => option.trim()).filter(Boolean)
      const answer = get("correctAnswer")
      const correct = /^[a-z]$/i.test(answer)
        ? answer.toUpperCase().charCodeAt(0) - 65
        : Number(answer) - 1
      const rowIssues: CsvIssue[] = []
      if (!text)
        rowIssues.push({
          row: rowNumber,
          field: "questionText",
          reason: "Question text is missing.",
          value: text,
        })
      if (options.length < 2 || options.length > 6)
        rowIssues.push({
          row: rowNumber,
          field: "options",
          reason: "Question must have between 2 and 6 options.",
          value: get("options"),
        })
      if (rawOptions.some((option) => !option.trim()))
        rowIssues.push({
          row: rowNumber,
          field: "options",
          reason: "Options cannot be empty.",
          value: get("options"),
        })
      if (
        new Set(options.map((option) => option.toLowerCase())).size !==
        options.length
      )
        rowIssues.push({
          row: rowNumber,
          field: "options",
          reason: "Options must be unique.",
          value: get("options"),
        })
      if (
        !Number.isInteger(correct) ||
        correct < 0 ||
        correct >= options.length
      )
        rowIssues.push({
          row: rowNumber,
          field: "correctAnswer",
          reason: "Use a letter or number that points to an existing option.",
          value: answer,
        })
      if (seen.has(text.toLowerCase()))
        rowIssues.push({
          row: rowNumber,
          field: "questionText",
          reason: "This question already exists in the current week.",
          value: text,
        })
      const difficulty = get("difficulty")
      if (
        difficulty &&
        !["easy", "medium", "hard"].includes(difficulty.toLowerCase())
      )
        rowIssues.push({
          row: rowNumber,
          field: "difficulty",
          reason: "Use Easy, Medium, or Hard.",
          value: difficulty,
        })
      if (rowIssues.length > 0) {
        errors.push(...rowIssues)
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
            (item) => item.toLowerCase() === difficulty.toLowerCase(),
          ) ?? "",
        topic: get("topic") || undefined,
        explanation: get("explanation") || undefined,
        status: "draft",
      })
    })
    setResult({ fileName: file.name, valid, errors })
  }

  const downloadErrors = () => {
    if (!result || result.errors.length === 0) return
    const report = [
      ["row", "field", "reason", "value"],
      ...result.errors.map((error) => [
        String(error.row),
        error.field,
        error.reason,
        error.value,
      ]),
    ]
      .map((row) => row.map(csvCell).join(","))
      .join("\n")
    downloadFile("questions-upload-errors.csv", report, "text/csv")
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
            with “|”. Maximum 450 rows and 5 MB. This preview reads CSV files
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
          <input
            ref={jsonInputRef}
            type="file"
            accept=".json,application/json"
            className="sr-only"
            onChange={handleJsonFile}
            aria-label="Upload JSON question file"
            tabIndex={-1}
          />
          <button
            onClick={() => jsonInputRef.current?.click()}
            className={smallOutline}
          >
            <Upload size={15} />
            Upload JSON file
          </button>
          <button
            type="button"
            onClick={() => setCsvInfoOpen(true)}
            className={smallOutline}
          >
            CSV info
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
            — {plural(result.valid.length, "row")} ready,{" "}
            {new Set(result.errors.map((error) => error.row)).size} rejected.
            Review before writing.
          </p>
          {(result.errors.length > 0 || jsonPreview) && (
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-semibold text-red-700 dark:text-red-300">
                  {plural(result.errors.length, "validation issue")}
                </p>
                <button
                  type="button"
                  onClick={downloadErrors}
                  className={smallOutline}
                >
                  <Download size={14} />
                  Download error report
                </button>
              </div>
              <div className="max-h-40 overflow-auto rounded-lg border border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-950/30">
                <table className="min-w-full text-left text-xs text-red-800 dark:text-red-200">
                  <thead className="border-b border-red-200 dark:border-red-900/50">
                    <tr>
                      <th className="px-2 py-1.5 font-semibold">Row</th>
                      <th className="px-2 py-1.5 font-semibold">Field</th>
                      <th className="px-2 py-1.5 font-semibold">Problem</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.errors.slice(0, 50).map((error, index) => (
                      <tr
                        key={`${error.row}-${error.field}-${index}`}
                        className="border-b border-red-100 last:border-0 dark:border-red-900/30"
                      >
                        <td className="whitespace-nowrap px-2 py-1.5">
                          {error.row}
                        </td>
                        <td className="whitespace-nowrap px-2 py-1.5">
                          {error.field}
                        </td>
                        <td className="px-2 py-1.5">{error.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {result.errors.length > 50 && (
                  <p className="px-2 py-1.5 text-xs">
                    Showing the first 50 issues. Download the report for all
                    issues.
                  </p>
                )}
                {jsonPreview && (
                  <div className="mt-3 space-y-3 rounded-lg border border-gray-200 p-3 dark:border-white/10">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="font-semibold text-gray-800 dark:text-white">
                          JSON preview — {jsonPreview.fileName}
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          {(() => {
                            const counts = previewCounts(jsonPreview)
                            return `${counts.total} parsed · ${counts.valid} valid · ${counts.invalid} invalid · ${counts.duplicate} duplicates · ${counts.warnings} warnings`
                          })()}
                        </p>
                      </div>
                      <button
                        type="button"
                        className={smallOutline}
                        onClick={() => setJsonPreview(null)}
                      >
                        Choose another file
                      </button>
                    </div>
                    <div className="max-h-80 overflow-auto rounded-md border border-gray-200 dark:border-white/10">
                      <table className="min-w-full text-left text-xs">
                        <thead className="border-b border-gray-200 dark:border-white/10">
                          <tr>
                            <th className="px-2 py-2">Row</th>
                            <th className="px-2 py-2">Question</th>
                            <th className="px-2 py-2">Status</th>
                            <th className="px-2 py-2">Details</th>
                          </tr>
                        </thead>
                        <tbody>
                          {jsonPreview.rows.map((row) => {
                            const invalid = row.issues.some(
                              (issue) => issue.severity === "error",
                            )
                            return (
                              <tr
                                key={row.row}
                                className="border-b border-gray-100 align-top last:border-0 dark:border-white/5"
                              >
                                <td className="whitespace-nowrap px-2 py-2">
                                  {row.row}
                                </td>
                                <td className="max-w-[22rem] px-2 py-2">
                                  <p className="font-medium text-gray-800 dark:text-gray-100">
                                    {row.question.questionText ||
                                      "Missing question text"}
                                  </p>
                                  <p className="mt-1 text-gray-500">
                                    {(row.question.options ?? []).join(" · ")}
                                  </p>
                                </td>
                                <td className="whitespace-nowrap px-2 py-2">
                                  <span
                                    className={
                                      invalid
                                        ? "text-red-600"
                                        : row.issues.length
                                          ? "text-amber-600"
                                          : "text-green-600"
                                    }
                                  >
                                    {invalid
                                      ? "Invalid"
                                      : row.issues.length
                                        ? "Warning"
                                        : "Ready"}
                                  </span>
                                </td>
                                <td className="max-w-[20rem] px-2 py-2">
                                  {row.issues.length
                                    ? row.issues
                                        .map((issue) => issue.message)
                                        .join(" ")
                                    : "Will be imported as draft."}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                    <button
                      type="button"
                      disabled={previewCounts(jsonPreview).ready === 0}
                      className={smallPrimary}
                      onClick={async () => {
                        const valid = jsonPreview.rows
                          .filter(
                            (row) =>
                              !row.issues.some(
                                (issue) => issue.severity === "error",
                              ),
                          )
                          .map((row) => row.question)
                        await onImport(valid, "json", jsonPreview.fileName)
                        setJsonPreview(null)
                        setResult(null)
                      }}
                    >
                      Import valid JSON rows
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
          {result.valid.length > 0 && (
            <div className="rounded-lg border border-green-200 bg-green-50 p-2 text-xs text-green-800 dark:border-green-900/50 dark:bg-green-950/25 dark:text-green-200">
              <p className="font-semibold">Ready to import</p>
              <p className="mt-1">
                {result.valid
                  .slice(0, 3)
                  .map((question) => question.questionText)
                  .join(" · ")}
                {result.valid.length > 3 && " · …"}
              </p>
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <button
              disabled={result.valid.length === 0}
              onClick={async () => {
                await onImport(result.valid, "csv", result.fileName)
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
      <Modal
        open={csvInfoOpen}
        title="CSV upload format"
        onClose={() => setCsvInfoOpen(false)}
        footer={
          <>
            <button
              type="button"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(csvInfoText)
                  toast("CSV information copied to clipboard", "success")
                } catch {
                  toast("Couldn't copy CSV information", "error")
                }
              }}
              className={smallOutline}
            >
              <Copy size={14} />
              Copy all info
            </button>
            <button
              type="button"
              onClick={() => setCsvInfoOpen(false)}
              className={smallOutline}
            >
              Close
            </button>
          </>
        }
      >
        <div className="space-y-4 text-sm text-gray-600 dark:text-gray-300">
          <p>
            Create a UTF-8 CSV file with one question per row and these columns
            in this exact order:
          </p>
          <pre className="overflow-x-auto rounded-lg bg-gray-100 p-3 text-xs text-gray-800 dark:bg-white/10 dark:text-gray-100">
            questionText,options,correctAnswer,explanation,difficulty,topic
          </pre>
          <ul className="list-disc space-y-1 pl-5">
            <li>Separate answer options with the pipe symbol: |</li>
            <li>Use A–F or 1–6 for correctAnswer, not the full answer text.</li>
            <li>Each question must contain between 2 and 6 options.</li>
            <li>Use Easy, Medium, or Hard for difficulty.</li>
            <li>Wrap fields containing commas in double quotes.</li>
            <li>Maximum 450 question rows and 5 MB per file.</li>
            <li>Imported questions are saved as drafts for review.</li>
          </ul>
          <div>
            <p className="mb-1 font-semibold text-gray-800 dark:text-white">
              Example row
            </p>
            <pre className="overflow-x-auto rounded-lg bg-gray-100 p-3 text-xs text-gray-800 dark:bg-white/10 dark:text-gray-100">
              {`"What is emotional regulation?","Managing emotions|Ignoring emotions|Avoiding people|Suppressing all feelings",A,"Managing emotions effectively.",Easy,"Emotional Regulation"`}
            </pre>
          </div>
        </div>
      </Modal>
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

function getPublishReview(question: AdminQuestion, siblings: AdminQuestion[]) {
  const errors: string[] = []
  const warnings: string[] = []
  if (!isValidQuestion(question))
    errors.push(
      "Add question text, 2–6 non-empty options, and a valid correct answer.",
    )
  const normalizedText = question.questionText.trim().toLowerCase()
  if (
    normalizedText &&
    siblings.some(
      (item) =>
        item.id !== question.id &&
        item.questionText.trim().toLowerCase() === normalizedText,
    )
  )
    errors.push("Another question in this week has the same question text.")
  const normalizedOptions = (question.options ?? []).map((option) =>
    option.trim().toLowerCase(),
  )
  if (new Set(normalizedOptions).size !== normalizedOptions.length)
    errors.push("Answer options must be unique.")
  if (!question.explanation?.trim())
    warnings.push("Add an explanation so learners can review the answer.")
  if (!question.topic?.trim())
    warnings.push("Add a topic to improve filtering and content quality.")
  if (!question.difficulty?.trim())
    warnings.push("Add a difficulty level for better learner guidance.")
  return { errors, warnings }
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
    bulkUpdateQuestions,
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
  const [query, setQuery] = useState("")
  const [difficultyFilter, setDifficultyFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState<Status | "all">("all")
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [publishReview, setPublishReview] = useState<{
    question: AdminQuestion
    closeForm: boolean
  } | null>(null)
  const flags = showFlags ? questionFlags(questions) : []
  const owner = { id: listId, courseId: ownerCourseId, type: ownerType }
  const duplicateQuestionIds = new Set(
    questions
      .filter((question, index) =>
        questions.some(
          (other, otherIndex) =>
            index !== otherIndex &&
            question.questionText.trim().toLowerCase() !== "" &&
            question.questionText.trim().toLowerCase() ===
              other.questionText.trim().toLowerCase(),
        ),
      )
      .map((question) => question.id),
  )
  const duplicateOptionIds = new Set(
    questions
      .filter((question) => {
        const options = (question.options ?? []).map((option) =>
          option.trim().toLowerCase(),
        )
        return new Set(options).size !== options.length
      })
      .map((question) => question.id),
  )
  const term = query.trim().toLowerCase()
  const filteredQuestions = questions.filter((question) => {
    const matchesText =
      !term ||
      `${question.questionText} ${question.topic ?? ""}`
        .toLowerCase()
        .includes(term)
    const matchesDifficulty =
      difficultyFilter === "all" ||
      question.difficulty.toLowerCase() === difficultyFilter
    const matchesStatus =
      statusFilter === "all" || question.status === statusFilter
    return matchesText && matchesDifficulty && matchesStatus
  })
  const allFilteredSelected =
    filteredQuestions.length > 0 &&
    filteredQuestions.every((question) => selectedIds.has(question.id))
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
  const requestQuestionSave = async (
    question: AdminQuestion,
    closeForm = false,
  ) => {
    if (question.status === "published") {
      const existing = questions.find((item) => item.id === question.id)
      if (existing?.status !== "review" && existing?.status !== "published") {
        toast("Submit the question for review before publishing it.", "error")
        return false
      }
      setPublishReview({ question, closeForm })
      return false
    }
    return persistQuestion(question)
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

      {questions.length > 0 && (
        <div className="mb-4 space-y-2 rounded-xl border border-gray-200 p-3 dark:border-white/10">
          <div className="flex flex-wrap gap-2">
            <div className="relative min-w-52 flex-1">
              <Search
                size={15}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                aria-label="Search questions"
                placeholder="Search question text or topic"
                className="input py-2 pl-9"
              />
            </div>
            <select
              value={difficultyFilter}
              onChange={(event) => setDifficultyFilter(event.target.value)}
              aria-label="Filter questions by difficulty"
              className="input w-auto py-2"
            >
              <option value="all">All difficulties</option>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value as Status | "all")
              }
              aria-label="Filter questions by status"
              className="input w-auto py-2"
            >
              <option value="all">All statuses</option>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </select>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-gray-600 dark:text-gray-400">
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={allFilteredSelected}
                onChange={() =>
                  setSelectedIds((current) => {
                    const next = new Set(current)
                    if (allFilteredSelected)
                      filteredQuestions.forEach((question) =>
                        next.delete(question.id),
                      )
                    else
                      filteredQuestions.forEach((question) =>
                        next.add(question.id),
                      )
                    return next
                  })
                }
                aria-label="Select all filtered questions"
                className="h-4 w-4 accent-primary-600"
              />
              Select filtered
            </label>
            <span>
              Showing {filteredQuestions.length} of {questions.length} questions
              {duplicateQuestionIds.size > 0 &&
                ` · ${duplicateQuestionIds.size} duplicate question${
                  duplicateQuestionIds.size === 1 ? "" : "s"
                }`}
              {duplicateOptionIds.size > 0 &&
                ` · ${duplicateOptionIds.size} with duplicate options`}
            </span>
            {selectedIds.size > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <select
                  aria-label="Bulk question action"
                  className="input w-auto py-1.5 text-xs"
                  defaultValue=""
                  onChange={(event) => {
                    const action = event.target.value
                    event.target.value = ""
                    if (!action) return
                    const selected = questions.filter((question) =>
                      selectedIds.has(question.id),
                    )
                    const labels: Record<string, string> = {
                      "difficulty:Easy": "Set difficulty to Easy",
                      "difficulty:Medium": "Set difficulty to Medium",
                      "difficulty:Hard": "Set difficulty to Hard",
                      publish: "Publish selected questions",
                      unpublish: "Unpublish selected questions",
                      archive: "Archive selected questions",
                    }
                    const isDifficulty = action.startsWith("difficulty:")
                    const difficulty = isDifficulty ? action.split(":")[1] : ""
                    onConfirm({
                      title: `${labels[action]}?`,
                      body: `${selected.length} selected questions will be updated. The operation will revalidate each record before writing.`,
                      confirmLabel:
                        action === "archive"
                          ? "Archive selected"
                          : "Apply selected action",
                      onConfirm: async () => {
                        try {
                          if (isDifficulty) {
                            await bulkUpdateQuestions(owner, [...selectedIds], {
                              difficulty,
                            })
                          } else if (action === "publish") {
                            await bulkUpdateQuestions(owner, [...selectedIds], {
                              status: "published",
                            })
                          } else if (action === "unpublish") {
                            await bulkUpdateQuestions(owner, [...selectedIds], {
                              status: "draft",
                            })
                          } else {
                            for (const id of selectedIds)
                              await archiveQuestion(owner, id)
                          }
                          audit(
                            `${labels[action]} (${selected.length})`,
                            ownerLabel,
                          )
                          toast(
                            `${selected.length} ${
                              selected.length === 1 ? "question" : "questions"
                            } updated`,
                          )
                          setSelectedIds(new Set())
                        } catch (error) {
                          toast(
                            error instanceof Error
                              ? error.message
                              : "The bulk action failed.",
                            "error",
                          )
                        }
                      },
                    })
                  }}
                >
                  <option value="">Bulk action…</option>
                  <option value="difficulty:Easy">
                    Set difficulty to Easy
                  </option>
                  <option value="difficulty:Medium">
                    Set difficulty to Medium
                  </option>
                  <option value="difficulty:Hard">
                    Set difficulty to Hard
                  </option>
                  <option value="publish">Publish selected</option>
                  <option value="unpublish">Unpublish selected</option>
                  <option value="archive">Archive selected</option>
                </select>
                <button
                  type="button"
                  className={smallOutline}
                  onClick={() => setSelectedIds(new Set())}
                >
                  Clear selection ({selectedIds.size})
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {bulkOpen && (
        <BulkUpload
          existing={questions}
          onClose={() => setBulkOpen(false)}
          onImport={async (rows, sourceType, fileName) => {
            try {
              const prepared = rows.map((row) => ({
                ...row,
                id: row.id || newQuestionId(),
              }))
              const useTrustedService =
                !import.meta.env.DEV ||
                Boolean(import.meta.env.VITE_FIREBASE_FUNCTIONS_EMULATOR_HOST)
              if (useTrustedService)
                await importQuestionOperation(owner, prepared, {
                  sourceType,
                  fileName,
                })
              else await saveQuestions(owner, prepared)
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
            const saved = await requestQuestionSave(
              fromDraft(draft, newQuestionId()),
              true,
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
      ) : filteredQuestions.length === 0 ? (
        <p className="py-4 text-center text-sm text-gray-500 dark:text-gray-400">
          No questions match these filters. Try clearing the search or filters.
        </p>
      ) : (
        <div className="space-y-2.5">
          {filteredQuestions.map((question, index) =>
            form?.mode === "edit" && form.id === question.id ? (
              <QuestionForm
                key={question.id}
                initial={toDraft(question)}
                editing
                onCancel={() => setForm(null)}
                onSubmit={async (draft) => {
                  const saved = await requestQuestionSave(
                    fromDraft(draft, question.id),
                    true,
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
                <input
                  type="checkbox"
                  checked={selectedIds.has(question.id)}
                  onChange={() =>
                    setSelectedIds((current) => {
                      const next = new Set(current)
                      if (next.has(question.id)) next.delete(question.id)
                      else next.add(question.id)
                      return next
                    })
                  }
                  aria-label={`Select question ${index + 1}`}
                  className="mt-1.5 h-4 w-4 shrink-0 accent-primary-600"
                />
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
                    {duplicateQuestionIds.has(question.id) && (
                      <span className="rounded-md bg-red-100 px-1.5 py-0.5 text-xs text-red-700 dark:bg-red-950/40 dark:text-red-300">
                        Duplicate question
                      </span>
                    )}
                    {duplicateOptionIds.has(question.id) && (
                      <span className="rounded-md bg-amber-100 px-1.5 py-0.5 text-xs text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
                        Duplicate options
                      </span>
                    )}
                    {!question.explanation?.trim() && (
                      <span className="rounded-md bg-gray-200 px-1.5 py-0.5 text-xs text-gray-700 dark:bg-white/10 dark:text-gray-300">
                        Missing explanation
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
                    icon={Copy}
                    label={`Duplicate question ${index + 1}`}
                    onClick={async () => {
                      const duplicate = await persistQuestion({
                        ...question,
                        id: newQuestionId(),
                        status: "draft",
                      })
                      if (!duplicate) return
                      audit(
                        `Question ${index + 1} duplicated as draft`,
                        ownerLabel,
                      )
                      toast("Question duplicated as a draft")
                    }}
                  />
                  <IconButton
                    icon={question.status === "published" ? EyeOff : Eye}
                    label={
                      question.status === "published"
                        ? "Hide from students"
                        : question.status === "review"
                          ? "Review and publish question"
                          : "Submit question for review"
                    }
                    onClick={async () => {
                      if (question.status === "published") {
                        const saved = await requestQuestionSave({
                          ...question,
                          status: "draft",
                        })
                        if (saved) {
                          audit("Question unpublished", ownerLabel)
                          toast("Question unpublished")
                        }
                        return
                      }
                      if (question.status === "review") {
                        setPublishReview({ question, closeForm: false })
                        return
                      }
                      const saved = await persistQuestion({
                        ...question,
                        status: "review",
                        reviewNote: undefined,
                      })
                      if (saved) {
                        audit("Question submitted for review", ownerLabel)
                        toast("Question submitted for review")
                      }
                    }}
                  />
                  {question.status === "review" && (
                    <IconButton
                      icon={X}
                      label={`Reject question ${index + 1}`}
                      tone="hover:text-red-500"
                      onClick={async () => {
                        const reason = window.prompt(
                          "Why is this question being returned to draft?",
                          question.reviewNote ?? "",
                        )
                        if (reason === null) return
                        const saved = await persistQuestion({
                          ...question,
                          status: "draft",
                          reviewNote: reason.trim() || "Returned for revision",
                        })
                        if (saved) {
                          audit("Question returned for revision", ownerLabel)
                          toast("Question returned to draft")
                        }
                      }}
                    />
                  )}
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
        open={publishReview !== null}
        title="Review before publishing"
        onClose={() => setPublishReview(null)}
        footer={
          <>
            <button
              type="button"
              onClick={() => setPublishReview(null)}
              className="btn-ghost px-4 py-2 text-sm"
            >
              Keep as draft
            </button>
            <button
              type="button"
              disabled={
                publishReview
                  ? getPublishReview(publishReview.question, questions).errors
                      .length > 0
                  : true
              }
              onClick={async () => {
                if (!publishReview) return
                const saved = await persistQuestion(publishReview.question)
                if (!saved) return
                audit("Question published after review", ownerLabel)
                toast("Question published")
                if (publishReview.closeForm) setForm(null)
                setPublishReview(null)
              }}
              className={smallPrimary}
            >
              Publish question
            </button>
          </>
        }
      >
        {publishReview &&
          (() => {
            const review = getPublishReview(publishReview.question, questions)
            return (
              <div className="space-y-4">
                <p className="text-sm text-gray-700 dark:text-gray-200">
                  Review this question before it becomes visible to learners.
                </p>
                <div className="rounded-xl border border-gray-200 p-3 dark:border-white/10">
                  <p className="font-medium text-gray-800 dark:text-white">
                    {publishReview.question.questionText || "Untitled question"}
                  </p>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    {publishReview.question.optionCount} options ·{" "}
                    {publishReview.question.difficulty || "No difficulty"} ·{" "}
                    {publishReview.question.topic || "No topic"}
                  </p>
                </div>
                {review.errors.length > 0 && (
                  <div
                    role="alert"
                    className="rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200"
                  >
                    <p className="font-semibold">Publishing is blocked</p>
                    <ul className="mt-1 list-disc space-y-1 pl-5">
                      {review.errors.map((error) => (
                        <li key={error}>{error}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {review.warnings.length > 0 && (
                  <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
                    <p className="font-semibold">
                      Recommended before publishing
                    </p>
                    <ul className="mt-1 list-disc space-y-1 pl-5">
                      {review.warnings.map((warning) => (
                        <li key={warning}>{warning}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {review.errors.length === 0 && review.warnings.length === 0 && (
                  <p className="rounded-xl border border-green-300 bg-green-50 p-3 text-sm text-green-800 dark:border-green-900/60 dark:bg-green-950/30 dark:text-green-200">
                    This question passes the local publication review.
                  </p>
                )}
              </div>
            )
          })()}
      </Modal>

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
    saveQuestions,
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
  const backupInputRef = useRef<HTMLInputElement>(null)
  const [backupPreview, setBackupPreview] = useState<{
    fileName: string
    weeks: Week[]
    questions: Record<string, AdminQuestion[]>
    conflicts: string[]
    error?: string
  } | null>(null)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!form) return
    const number = Number(form.weekNumber)
    const title = form.title.trim()
    if (!form.weekNumber.trim() || !title)
      return toast("Please enter a week number and title", "error")
    if (!Number.isInteger(number) || number < 0)
      return toast("Week number must be a whole number starting at 0", "error")
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
                    version: 2,
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
            onClick={() => backupInputRef.current?.click()}
            className={smallOutline}
          >
            Restore JSON backup
          </button>
          <input
            ref={backupInputRef}
            type="file"
            accept=".json,application/json"
            className="sr-only"
            aria-label="Restore JSON backup"
            onChange={async (event) => {
              const file = event.target.files?.[0]
              event.target.value = ""
              if (!file) return
              try {
                const payload = JSON.parse(await file.text()) as {
                  version?: number
                  course?: { id?: string }
                  weeks?: Week[]
                  questions?: Record<string, AdminQuestion[]>
                }
                if (
                  payload.version !== 2 ||
                  payload.course?.id !== course.id ||
                  !Array.isArray(payload.weeks) ||
                  !payload.questions ||
                  payload.weeks.some(
                    (week) =>
                      week.courseId !== course.id ||
                      typeof week.id !== "string" ||
                      !week.title,
                  )
                )
                  throw new Error(
                    "This backup is invalid or belongs to another course.",
                  )
                const backupQuestions = Object.fromEntries(
                  Object.entries(payload.questions).map(([weekId, items]) => [
                    weekId,
                    Array.isArray(items) ? items : [],
                  ]),
                )
                const existingIds = new Set([
                  ...weeks.map((week) => week.id),
                  ...Object.values(adminQuestions)
                    .flat()
                    .map((question) => question.id),
                ])
                const incomingIds = new Set<string>()
                const conflicts: string[] = []
                for (const week of payload.weeks) {
                  if (existingIds.has(week.id))
                    conflicts.push(`Week ${week.id}`)
                  if (incomingIds.has(week.id))
                    conflicts.push(`Duplicate week ${week.id}`)
                  incomingIds.add(week.id)
                }
                for (const questionsForWeek of Object.values(backupQuestions)) {
                  for (const question of questionsForWeek) {
                    if (typeof question.id !== "string")
                      throw new Error("A backup question is missing its ID.")
                    if (existingIds.has(question.id))
                      conflicts.push(`Question ${question.id}`)
                    if (incomingIds.has(question.id))
                      conflicts.push(`Duplicate question ${question.id}`)
                    incomingIds.add(question.id)
                  }
                }
                setBackupPreview({
                  fileName: file.name,
                  weeks: payload.weeks,
                  questions: backupQuestions,
                  conflicts,
                })
              } catch (error) {
                setBackupPreview({
                  fileName: file.name,
                  weeks: [],
                  questions: {},
                  conflicts: [],
                  error:
                    error instanceof Error
                      ? error.message
                      : "Backup couldn't be read.",
                })
              }
            }}
          />
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
                min={0}
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
      <Modal
        open={backupPreview !== null}
        title="Review JSON backup"
        onClose={() => setBackupPreview(null)}
        footer={
          <>
            <button
              type="button"
              onClick={() => setBackupPreview(null)}
              className="btn-ghost px-4 py-2 text-sm"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={
                !backupPreview ||
                Boolean(backupPreview.error) ||
                backupPreview.conflicts.length > 0 ||
                backupPreview.weeks.length === 0
              }
              onClick={async () => {
                if (!backupPreview) return
                try {
                  await restoreWeekBackup(
                    course.id,
                    backupPreview.weeks,
                    backupPreview.questions,
                  )
                  audit(
                    `Restored ${plural(backupPreview.weeks.length, "week")} as drafts`,
                    "Weeks",
                  )
                  toast(
                    `Restored ${plural(backupPreview.weeks.length, "week")} as drafts`,
                  )
                  setBackupPreview(null)
                } catch (error) {
                  toast(
                    error instanceof Error
                      ? error.message
                      : "Backup couldn't be restored.",
                    "error",
                  )
                }
              }}
              className={smallPrimary}
            >
              Restore as drafts
            </button>
          </>
        }
      >
        {backupPreview &&
          (backupPreview.error ? (
            <p role="alert" className="text-sm text-red-600 dark:text-red-300">
              {backupPreview.error}
            </p>
          ) : (
            <div className="space-y-4 text-sm text-gray-700 dark:text-gray-200">
              <p>
                <strong>{backupPreview.fileName}</strong> contains{" "}
                {plural(backupPreview.weeks.length, "week")} and{" "}
                {plural(
                  Object.values(backupPreview.questions).flat().length,
                  "question",
                )}
                .
              </p>
              <p className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
                New records will be restored as drafts for review. Existing
                records are never overwritten.
              </p>
              {backupPreview.conflicts.length > 0 && (
                <div
                  role="alert"
                  className="rounded-xl border border-red-300 bg-red-50 p-3 text-red-800 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200"
                >
                  <p className="font-semibold">
                    Restore blocked by{" "}
                    {plural(backupPreview.conflicts.length, "conflict")}
                  </p>
                  <ul className="mt-1 max-h-32 list-disc overflow-y-auto pl-5">
                    {backupPreview.conflicts.map((conflict) => (
                      <li key={conflict}>{conflict}</li>
                    ))}
                  </ul>
                </div>
              )}
              {backupPreview.conflicts.length === 0 && (
                <p className="rounded-xl border border-green-300 bg-green-50 p-3 text-green-800 dark:border-green-900/60 dark:bg-green-950/30 dark:text-green-200">
                  No ID conflicts found. You can restore this backup safely as
                  drafts.
                </p>
              )}
            </div>
          ))}
      </Modal>
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
