import assert from "node:assert/strict"
import test from "node:test"
import {
  normalizeImportText,
  parseQuestionImport,
  previewCounts,
} from "../src/lib/bulk-content.ts"

const existing = [
  {
    id: "existing",
    questionText: "  What is 2 + 2? ",
    options: ["3", "4"],
    optionCount: 2,
    correctAnswerIndex: 1,
    difficulty: "Easy",
    status: "draft",
  },
]

test("JSON import accepts arrays and versioned envelopes", () => {
  const arrayPreview = parseQuestionImport(
    JSON.stringify([
      {
        questionText: "A new question",
        options: ["A", "B"],
        correctAnswer: "B",
        explanation: "Because B is correct.",
        difficulty: "Medium",
      },
    ]),
    "questions.json",
    existing,
    (row) => `generated-${row}`,
  )
  assert.equal(previewCounts(arrayPreview).valid, 1)
  assert.equal(arrayPreview.rows[0].question.correctAnswerIndex, 1)

  const envelopePreview = parseQuestionImport(
    JSON.stringify({
      schemaVersion: 1,
      destination: { type: "week", id: "week-1" },
      questions: [
        {
          id: "stable-id",
          questionText: "Envelope question",
          options: ["A", "B"],
          correctAnswerIndex: 0,
        },
      ],
    }),
    "questions.json",
    [],
    (row) => `generated-${row}`,
  )
  assert.equal(envelopePreview.rows[0].question.id, "stable-id")
})

test("JSON preview flags duplicates, malformed rows, warnings, and unknown fields", () => {
  const preview = parseQuestionImport(
    JSON.stringify([
      {
        questionText: "WHAT   IS 2 + 2?",
        options: ["3", "4"],
        correctAnswer: "B",
        unexpected: "preserve as warning",
      },
      {
        questionText: "",
        options: ["only one"],
        correctAnswer: 4,
      },
      "not an object",
    ]),
    "mixed.json",
    existing,
    (row) => `generated-${row}`,
  )
  const counts = previewCounts(preview)
  assert.equal(normalizeImportText(" WHAT   IS 2 + 2 "), "what is 2 + 2")
  assert.equal(counts.total, 3)
  assert.equal(counts.duplicate, 1)
  assert.equal(counts.invalid, 3)
  assert.deepEqual(preview.unknownFields, ["unexpected"])
  assert.ok(
    preview.rows[0].issues.some((issue) => issue.severity === "warning"),
  )
})

test("malformed JSON and unsupported envelopes fail before writes", () => {
  assert.throws(
    () => parseQuestionImport("{", "broken.json", [], (row) => `id-${row}`),
    /could not be parsed/,
  )
  assert.throws(
    () =>
      parseQuestionImport(
        JSON.stringify({ schemaVersion: 1, items: [] }),
        "wrong.json",
        [],
        (row) => `id-${row}`,
      ),
    /array or a versioned envelope/,
  )
})
