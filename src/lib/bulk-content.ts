import type { AdminQuestion } from "./data"
import { isValidQuestion } from "./question-validation.ts"

export type ImportIssueSeverity = "error" | "warning" | "info"

export type ImportIssue = {
  field: string
  message: string
  severity: ImportIssueSeverity
}

export type ImportRow = {
  row: number
  question: AdminQuestion
  issues: ImportIssue[]
  duplicate: boolean
  sourceId?: string
}

export type ImportPreview = {
  fileName: string
  rows: ImportRow[]
  unknownFields: string[]
}

const questionFields = new Set([
  "id",
  "questionText",
  "options",
  "optionCount",
  "correctAnswer",
  "correctAnswerIndex",
  "explanation",
  "difficulty",
  "topic",
  "status",
  "contentReady",
])

export const normalizeImportText = (value: string) =>
  value.trim().toLowerCase().replace(/\s+/g, " ")

const asCorrectIndex = (value: unknown) => {
  if (typeof value === "number" && Number.isInteger(value)) return value
  if (typeof value !== "string") return -1
  const trimmed = value.trim()
  if (/^[a-f]$/i.test(trimmed)) return trimmed.toUpperCase().charCodeAt(0) - 65
  const index = Number(trimmed)
  return Number.isInteger(index) ? index - 1 : -1
}

const asQuestion = (
  value: Record<string, unknown>,
  id: string,
): AdminQuestion => {
  const options = Array.isArray(value.options)
    ? value.options.map((option) => String(option ?? "").trim())
    : typeof value.options === "string"
      ? value.options.split("|").map((option) => option.trim())
      : []
  return {
    id,
    questionText:
      typeof value.questionText === "string" ? value.questionText.trim() : "",
    options,
    optionCount: options.length,
    correctAnswerIndex: asCorrectIndex(
      value.correctAnswerIndex ?? value.correctAnswer,
    ),
    difficulty:
      typeof value.difficulty === "string" ? value.difficulty.trim() : "",
    explanation:
      typeof value.explanation === "string"
        ? value.explanation.trim() || undefined
        : undefined,
    topic:
      typeof value.topic === "string"
        ? value.topic.trim() || undefined
        : undefined,
    status: "draft",
    contentReady: false,
  }
}

function validateQuestion(
  question: AdminQuestion,
  existing: AdminQuestion[],
  row: number,
): ImportRow {
  const issues: ImportIssue[] = []
  if (!question.questionText.trim())
    issues.push({
      field: "questionText",
      message: "Question text is required.",
      severity: "error",
    })
  if (!isValidQuestion(question))
    issues.push({
      field: "question",
      message: "Use 2–6 non-empty options and a valid correct answer.",
      severity: "error",
    })
  const normalizedOptions = (question.options ?? [])
    .map(normalizeImportText)
    .filter(Boolean)
  if (new Set(normalizedOptions).size !== normalizedOptions.length)
    issues.push({
      field: "options",
      message: "Answer options must be unique.",
      severity: "error",
    })
  if (
    question.difficulty &&
    !["easy", "medium", "hard"].includes(question.difficulty.toLowerCase())
  )
    issues.push({
      field: "difficulty",
      message: "Difficulty must be Easy, Medium, or Hard.",
      severity: "error",
    })
  if (!question.explanation?.trim())
    issues.push({
      field: "explanation",
      message: "Explanation is missing; the record can be imported as a draft.",
      severity: "warning",
    })
  if (!question.difficulty.trim())
    issues.push({
      field: "difficulty",
      message:
        "Difficulty is missing; publication readiness will remain incomplete.",
      severity: "warning",
    })
  const duplicate = existing.some(
    (item) =>
      normalizeImportText(item.questionText) ===
      normalizeImportText(question.questionText),
  )
  if (duplicate)
    issues.push({
      field: "questionText",
      message: "This question already exists in the selected destination.",
      severity: "error",
    })
  return { row, question, issues, duplicate }
}

export function buildImportPreview(
  values: unknown[],
  existing: AdminQuestion[],
  fileName: string,
  idFactory: (row: number) => string,
): ImportPreview {
  const existingTexts = new Set(
    existing.map((item) => normalizeImportText(item.questionText)),
  )
  const existingIds = new Set(existing.map((item) => item.id))
  const rows: ImportRow[] = []
  const unknownFields = new Set<string>()
  values.forEach((value, index) => {
    const row = index + 1
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      rows.push({
        row,
        question: asQuestion({}, idFactory(row)),
        issues: [
          {
            field: "row",
            message: "Each item must be an object.",
            severity: "error",
          },
        ],
        duplicate: false,
      })
      return
    }
    const record = value as Record<string, unknown>
    Object.keys(record).forEach((key) => {
      if (!questionFields.has(key)) unknownFields.add(key)
    })
    const question = asQuestion(
      record,
      typeof record.id === "string" ? record.id : idFactory(row),
    )
    const result = validateQuestion(question, existing, row)
    if (existingIds.has(question.id)) {
      result.issues.push({
        field: "id",
        message: "This question ID already exists in the selected destination.",
        severity: "error",
      })
    }
    existingIds.add(question.id)
    const normalized = normalizeImportText(question.questionText)
    if (normalized && existingTexts.has(normalized)) result.duplicate = true
    if (
      result.duplicate &&
      !result.issues.some(
        (item) => item.field === "questionText" && item.severity === "error",
      )
    )
      result.issues.push({
        field: "questionText",
        message: "This question is duplicated in the selected destination.",
        severity: "error",
      })
    existingTexts.add(normalized)
    result.sourceId = typeof record.id === "string" ? record.id : undefined
    rows.push(result)
  })
  if (unknownFields.size > 0) {
    const warning = [...unknownFields].sort()
    rows.forEach((row) =>
      row.issues.push({
        field: "metadata",
        message: `Unsupported fields were ignored: ${warning.join(", ")}.`,
        severity: "warning",
      }),
    )
  }
  return { fileName, rows, unknownFields: [...unknownFields].sort() }
}

export function parseQuestionImport(
  text: string,
  fileName: string,
  existing: AdminQuestion[],
  idFactory: (row: number) => string,
): ImportPreview {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error("This JSON file could not be parsed. Check its syntax.")
  }
  const values = Array.isArray(parsed)
    ? parsed
    : parsed &&
        typeof parsed === "object" &&
        Array.isArray((parsed as { questions?: unknown[] }).questions)
      ? (parsed as { questions: unknown[] }).questions
      : null
  if (!values)
    throw new Error(
      "JSON must be an array or a versioned envelope with a questions array.",
    )
  return buildImportPreview(values, existing, fileName, idFactory)
}

export function previewCounts(preview: ImportPreview) {
  const valid = preview.rows.filter(
    (row) => !row.issues.some((issue) => issue.severity === "error"),
  ).length
  const invalid = preview.rows.length - valid
  const duplicate = preview.rows.filter((row) => row.duplicate).length
  const warnings = preview.rows.filter((row) =>
    row.issues.some((issue) => issue.severity === "warning"),
  ).length
  return {
    total: preview.rows.length,
    valid,
    invalid,
    duplicate,
    warnings,
    ready: valid,
  }
}
