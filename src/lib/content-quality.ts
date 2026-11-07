import type { AdminQuestion, Course, Paper, Week } from "./data"

export type QualitySeverity = "critical" | "warning" | "info"
export type QualityKind = "duplicate" | "explanation" | "publication" | "reference" | "difficulty" | "completeness"

export interface QualityIssue {
  id: string
  severity: QualitySeverity
  kind: QualityKind
  title: string
  detail: string
  courseId?: string
  ownerId?: string
  ownerType?: "week" | "paper"
  questionId?: string
  questionText?: string
  ownerTitle?: string
  courseTitle?: string
}

export interface DifficultyCount {
  label: string
  count: number
  percentage: number
}

export interface QualityReport {
  issues: QualityIssue[]
  difficulty: DifficultyCount[]
  score: number
  checkedRecords: number
}

const normalize = (value: string) =>
  value.trim().toLowerCase().replace(/\s+/g, " ")

const issue = (
  value: Omit<QualityIssue, "id">,
  index: number,
): QualityIssue => ({
  ...value,
  id: `${value.kind}-${value.ownerId ?? value.courseId ?? "site"}-${value.questionId ?? index}-${index}`,
})

export function buildQualityReport(
  courses: Course[],
  weeks: Week[],
  papers: Paper[],
  questions: Record<string, AdminQuestion[]>,
): QualityReport {
  const issues: QualityIssue[] = []
  const courseIds = new Set(courses.map((course) => course.id))
  const courseById = new Map(courses.map((course) => [course.id, course]))
  const weekIds = new Set(weeks.map((week) => week.id))
  const paperIds = new Set(papers.map((paper) => paper.id))
  const difficultyCounts = new Map<string, number>()
  let checkedRecords = courses.length + weeks.length + papers.length

  courses.forEach((course, index) => {
    if (course.status === "published" && course.contentReady !== true) {
      issues.push(
        issue(
          {
            severity: "critical",
            kind: "publication",
            title: "Published course is not ready",
            detail: `${course.title || "Untitled course"} is marked published without a readiness marker.`,
            courseId: course.id,
          },
          index,
        ),
      )
    }
  })

  const owners = [
    ...weeks.map((record) => ({ record, ownerType: "week" as const })),
    ...papers.map((record) => ({ record, ownerType: "paper" as const })),
  ]
  owners.forEach(({ record, ownerType }, index) => {
    const records = (questions[record.id] ?? []).filter(
      (question) => question.status !== "archived",
    )
    checkedRecords += records.length
    const parentExists = courseIds.has(record.courseId)
    if (!parentExists) {
      issues.push(
        issue(
          {
            severity: "critical",
            kind: "reference",
            title: "Broken course reference",
            detail: `${
              ownerType === "week" ? `Week ${record.weekNumber}` : record.title
            } points to a missing course.`,
            ownerId: record.id,
            ownerType,
            courseId: record.courseId,
            ownerTitle:
              ownerType === "week" ? `Week ${record.weekNumber}` : record.title,
            courseTitle: courseById.get(record.courseId)?.title,
          },
          index,
        ),
      )
    }
    if (record.status === "published" && record.contentReady !== true) {
      issues.push(
        issue(
          {
            severity: "critical",
            kind: "publication",
            title: "Published content is not ready",
            detail: `${
              ownerType === "week" ? `Week ${record.weekNumber}` : record.title
            } is published without a readiness marker.`,
            ownerId: record.id,
            ownerType,
            courseId: record.courseId,
            ownerTitle:
              ownerType === "week" ? `Week ${record.weekNumber}` : record.title,
            courseTitle: courseById.get(record.courseId)?.title,
          },
          index + 10,
        ),
      )
    }
    const textOwners = new Map<string, AdminQuestion[]>()
    records.forEach((question) => {
      const key = normalize(question.questionText)
      if (key) textOwners.set(key, [...(textOwners.get(key) ?? []), question])
      const difficulty = question.difficulty.trim() || "Unspecified"
      difficultyCounts.set(
        difficulty,
        (difficultyCounts.get(difficulty) ?? 0) + 1,
      )
      if (!question.explanation?.trim()) {
        issues.push(
          issue(
            {
              severity: "warning",
              kind: "explanation",
              title: "Missing explanation",
              detail: `${
                ownerType === "week"
                  ? `Week ${record.weekNumber}`
                  : record.title
              } has a question without a learner explanation.`,
              courseId: record.courseId,
              ownerId: record.id,
              ownerType,
              questionId: question.id,
              questionText: question.questionText,
              ownerTitle:
                ownerType === "week"
                  ? `Week ${record.weekNumber}`
                  : record.title,
              courseTitle: courseById.get(record.courseId)?.title,
            },
            index + records.indexOf(question),
          ),
        )
      }
      if (!question.difficulty.trim()) {
        issues.push(
          issue(
            {
              severity: "warning",
              kind: "difficulty",
              title: "Missing difficulty",
              detail: `Question ${question.id} has no difficulty level.`,
              courseId: record.courseId,
              ownerId: record.id,
              ownerType,
              questionId: question.id,
              questionText: question.questionText,
              ownerTitle:
                ownerType === "week"
                  ? `Week ${record.weekNumber}`
                  : record.title,
              courseTitle: courseById.get(record.courseId)?.title,
            },
            index + records.indexOf(question) + 20,
          ),
        )
      }
      const options = (question.options ?? []).map(normalize).filter(Boolean)
      if (new Set(options).size !== options.length) {
        issues.push(
          issue(
            {
              severity: "warning",
              kind: "duplicate",
              title: "Duplicate answer options",
              detail: `Question ${question.id} repeats an answer option.`,
              courseId: record.courseId,
              ownerId: record.id,
              ownerType,
              questionId: question.id,
            },
            index + records.indexOf(question) + 40,
          ),
        )
      }
      if (
        !question.questionText.trim() ||
        !question.options?.length ||
        question.options.some((option) => !option.trim()) ||
        question.correctAnswerIndex < 0 ||
        question.correctAnswerIndex >= question.options.length
      ) {
        issues.push(
          issue(
            {
              severity: "critical",
              kind: "completeness",
              title: "Incomplete question record",
              detail: `Question ${question.id} is missing text, options, or a valid answer.`,
              courseId: record.courseId,
              ownerId: record.id,
              ownerType,
              questionId: question.id,
              questionText: question.questionText,
              ownerTitle:
                ownerType === "week"
                  ? `Week ${record.weekNumber}`
                  : record.title,
              courseTitle: courseById.get(record.courseId)?.title,
            },
            index + records.indexOf(question) + 60,
          ),
        )
      }
      if (question.status === "published" && question.contentReady !== true) {
        issues.push(
          issue(
            {
              severity: "critical",
              kind: "publication",
              title: "Published question is not ready",
              detail: `Question ${question.id} is published without a readiness marker.`,
              courseId: record.courseId,
              ownerId: record.id,
              ownerType,
              questionId: question.id,
              questionText: question.questionText,
              ownerTitle:
                ownerType === "week"
                  ? `Week ${record.weekNumber}`
                  : record.title,
              courseTitle: courseById.get(record.courseId)?.title,
            },
            index + records.indexOf(question) + 70,
          ),
        )
      }
    })
    textOwners.forEach((duplicates) => {
      if (duplicates.length < 2) return
      duplicates.forEach((question, duplicateIndex) =>
        issues.push(
          issue(
            {
              severity: "critical",
              kind: "duplicate",
              title: "Duplicate question text",
              detail: `Question ${question.id} duplicates another question in the same ${ownerType}.`,
              courseId: record.courseId,
              ownerId: record.id,
              ownerType,
              questionId: question.id,
              questionText: question.questionText,
              ownerTitle:
                ownerType === "week"
                  ? `Week ${record.weekNumber}`
                  : record.title,
              courseTitle: courseById.get(record.courseId)?.title,
            },
            index + duplicateIndex + 80,
          ),
        ),
      )
    })
  })

  weeks.forEach((week, index) => {
    if (week.courseId && !courseIds.has(week.courseId))
      issues.push(
        issue(
          {
            severity: "critical",
            kind: "reference",
            title: "Broken week reference",
            detail: `Week ${week.weekNumber} points to a missing course.`,
            ownerId: week.id,
            ownerType: "week",
            courseId: week.courseId,
            ownerTitle: `Week ${week.weekNumber}`,
            courseTitle: courseById.get(week.courseId)?.title,
          },
          index + 100,
        ),
      )
  })
  papers.forEach((paper, index) => {
    if (paper.courseId && !courseIds.has(paper.courseId))
      issues.push(
        issue(
          {
            severity: "critical",
            kind: "reference",
            title: "Broken paper reference",
            detail: `${paper.title} points to a missing course.`,
            ownerId: paper.id,
            ownerType: "paper",
            courseId: paper.courseId,
            ownerTitle: paper.title,
            courseTitle: courseById.get(paper.courseId)?.title,
          },
          index + 120,
        ),
      )
  })

  Object.entries(questions).forEach(([ownerId, records]) => {
    if (weekIds.has(ownerId) || paperIds.has(ownerId)) return
    issues.push(
      issue(
        {
          severity: "critical",
          kind: "reference",
          title: "Orphaned question collection",
          detail: `${records.length} question record(s) point to a missing week or paper.`,
          ownerId,
        },
        140,
      ),
    )
  })

  const totalQuestions = [...difficultyCounts.values()].reduce(
    (sum, count) => sum + count,
    0,
  )
  const difficulty = [...difficultyCounts.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([label, count]) => ({
      label,
      count,
      percentage: totalQuestions
        ? Math.round((count / totalQuestions) * 100)
        : 0,
    }))
  const penalty = issues.reduce(
    (sum, item) =>
      sum +
      (item.severity === "critical" ? 15 : item.severity === "warning" ? 5 : 1),
    0,
  )
  return {
    issues,
    difficulty,
    score: Math.max(0, 100 - penalty),
    checkedRecords,
  }
}
