import type { QuestionReport, ReportIssue } from "./data"

interface IssueText {
  label: string
  hint: string
  /** Suggested wording for the details box. */
  placeholder: string
}

export const reportIssues: Record<ReportIssue, IssueText> = {
  answer: {
    label: "Wrong correct answer",
    hint: "The marked answer isn't right",
    placeholder: "Optional: why you think so, e.g. a slide or page reference",
  },
  question: {
    label: "Mistake in the question",
    hint: "Typo, missing words or unclear",
    placeholder: "Which words are wrong or missing?",
  },
  option: {
    label: "Mistake in an option",
    hint: "Wrong, repeated or missing",
    placeholder: "Which option, and what should it say?",
  },
  other: {
    label: "Something else",
    hint: "Anything else about this week",
    placeholder: "Describe the problem",
  },
}

export const optionLetter = (index: number) => String.fromCharCode(65 + index)

/** For example "Week 3 · Question 5 · Wrong correct answer". */
export function reportHeadline(report: QuestionReport) {
  return [
    `Week ${report.weekNumber}`,
    report.questionNumber ? `Question ${report.questionNumber}` : "Whole week",
    reportIssues[report.issue].label,
  ].join(" · ")
}

/** Plain-text summary, used for request search and the learner's reply history. */
export function reportMessage(report: QuestionReport) {
  const lines = [reportHeadline(report)]
  if (report.suggestedAnswer !== undefined) {
    const marked =
      report.markedAnswer === undefined
        ? ""
        : ` (marked: ${optionLetter(report.markedAnswer)})`
    lines.push(
      `Suggested answer: ${optionLetter(report.suggestedAnswer)}${marked}`,
    )
  }
  if (report.details) lines.push(report.details)
  return lines.join("\n")
}
