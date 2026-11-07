import assert from "node:assert/strict"
import test from "node:test"
import { buildQualityReport } from "../src/lib/content-quality.ts"

const course = {
  id: "course-1",
  title: "Course One",
  status: "published",
  contentReady: true,
  sample: false,
}

const week = {
  id: "week-1",
  courseId: course.id,
  weekNumber: 1,
  title: "Week One",
  status: "published",
  contentReady: true,
}

const question = (id, patch = {}) => ({
  id,
  questionText: `Question ${id}`,
  options: ["A", "B"],
  optionCount: 2,
  correctAnswerIndex: 0,
  difficulty: "Easy",
  explanation: "Explanation",
  status: "draft",
  contentReady: false,
  ...patch,
})

test("normalizes case and whitespace for duplicate text but preserves distinct wording", () => {
  const report = buildQualityReport([course], [week], [], {
    [week.id]: [
      question("exact", { questionText: "  What is NPTEL? " }),
      question("normalized", { questionText: "what   is nptel?" }),
      question("different", { questionText: "What does NPTEL provide?" }),
    ],
  })
  assert.equal(
    report.issues.filter((item) => item.title === "Duplicate question text")
      .length,
    2,
  )
})

test("detects duplicate options independent of ordering and invalid empty options", () => {
  const report = buildQualityReport([course], [week], [], {
    [week.id]: [
      question("duplicate-options", { options: ["A", " A "] }),
      question("empty-option", { options: ["A", ""] }),
    ],
  })
  assert.equal(
    report.issues.filter((item) => item.title === "Duplicate answer options")
      .length,
    1,
  )
  assert.equal(
    report.issues.filter((item) => item.title === "Incomplete question record")
      .length,
    1,
  )
})

test("detects missing fields, invalid answer indexes, and missing readiness", () => {
  const report = buildQualityReport([course], [week], [], {
    [week.id]: [
      question("missing", {
        questionText: "",
        options: undefined,
        correctAnswerIndex: 3,
        difficulty: "",
        explanation: "",
      }),
      question("published-not-ready", {
        status: "published",
        contentReady: false,
      }),
    ],
  })
  assert.ok(report.issues.some((item) => item.kind === "completeness"))
  assert.ok(report.issues.some((item) => item.kind === "difficulty"))
  assert.ok(report.issues.some((item) => item.kind === "explanation"))
  assert.ok(
    report.issues.some(
      (item) =>
        item.title === "Published question is not ready" &&
        item.questionId === "published-not-ready",
    ),
  )
})

test("detects broken parents and orphan collections", () => {
  const report = buildQualityReport(
    [course],
    [{ ...week, courseId: "missing-course" }],
    [],
    {
      "missing-owner": [question("orphan")],
    },
  )
  assert.ok(
    report.issues.some((item) => item.title === "Broken course reference"),
  )
  assert.ok(
    report.issues.some((item) => item.title === "Orphaned question collection"),
  )
})

test("excludes archived questions from active quality and difficulty metrics", () => {
  const report = buildQualityReport([course], [week], [], {
    [week.id]: [
      question("archived", {
        status: "archived",
        difficulty: "",
        explanation: "",
      }),
      question("active", { difficulty: "Hard" }),
    ],
  })
  assert.equal(report.difficulty[0].label, "Hard")
  assert.equal(report.difficulty[0].count, 1)
  assert.equal(report.issues.length, 0)
})

test("checks a 1000-question dataset without dropping records", () => {
  const records = Array.from({ length: 1000 }, (_, index) =>
    question(`large-${index}`, {
      questionText: `Unique question ${index}`,
      difficulty:
        index % 3 === 0 ? "Easy" : index % 3 === 1 ? "Medium" : "Hard",
    }),
  )
  const started = performance.now()
  const report = buildQualityReport([course], [week], [], {
    [week.id]: records,
  })
  const elapsedMs = performance.now() - started
  assert.equal(report.checkedRecords, 1002)
  assert.equal(report.issues.length, 0)
  assert.equal(
    report.difficulty.reduce((sum, item) => sum + item.count, 0),
    1000,
  )
  console.log(`1000-question diagnostic run: ${elapsedMs.toFixed(2)}ms`)
})
