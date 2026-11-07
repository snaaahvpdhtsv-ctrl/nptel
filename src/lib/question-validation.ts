import type { AdminQuestion } from "./data"

export const isValidQuestion = (question: AdminQuestion) =>
  question.questionText.trim().length > 0 &&
  Boolean(question.options) &&
  (question.options?.length ?? 0) >= 2 &&
  (question.options?.length ?? 0) <= 6 &&
  question.options?.every((option) => option.trim().length > 0) === true &&
  Number.isInteger(question.correctAnswerIndex) &&
  question.correctAnswerIndex >= 0 &&
  question.correctAnswerIndex < (question.options?.length ?? 0)
