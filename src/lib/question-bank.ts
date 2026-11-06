import { type AdminQuestion, type Question } from "./data"

export type QuestionBank = Record<string, Question[]>

/** Include only complete, published questions in learner-facing views. */
export function createQuestionBank(
  adminQuestions: Record<string, AdminQuestion[]>,
): QuestionBank {
  return Object.fromEntries(
    Object.entries(adminQuestions).map(([weekId, questions]) => [
      weekId,
      questions.flatMap((question) => {
        const options = question.options
        if (
          question.status !== "published" ||
          !question.questionText.trim() ||
          !options ||
          options.length < 2 ||
          options.some((option) => !option.trim()) ||
          !Number.isInteger(question.correctAnswerIndex) ||
          question.correctAnswerIndex < 0 ||
          question.correctAnswerIndex >= options.length
        )
          return []

        return [
          {
            id: question.id,
            questionText: question.questionText,
            options: [...options],
            correctAnswerIndex: question.correctAnswerIndex,
            difficulty: question.difficulty || undefined,
            explanation: question.explanation,
          },
        ]
      }),
    ]),
  )
}

/** A week's complete, published questions, in their original order. */
export function weekQuestions(
  weekId: string,
  questionBank: QuestionBank,
): Question[] {
  return questionBank[weekId] ?? []
}

export function findQuestion(questionId: string, questionBank: QuestionBank) {
  for (const [weekId, questions] of Object.entries(questionBank)) {
    const question = questions.find((item) => item.id === questionId)
    if (question) return { question, weekId }
  }
}

export const SAMPLE_SAVED_IDS: readonly string[] = []
