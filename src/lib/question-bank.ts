import { savedByWeek, type Question } from "./data"

// Where practisable question content comes from. In this preview only the
// sample questions include full text and options; swap these lookups for
// fetched course content once a backend is connected.

const byWeek = new Map<string, Question[]>(
  savedByWeek.map((group) => [group.weekId, group.questions]),
)

const byId = new Map(
  savedByWeek.flatMap((group) =>
    group.questions.map(
      (question) => [question.id, { question, weekId: group.weekId }] as const,
    ),
  ),
)

/** A week's practisable questions, in their original order. */
export function weekQuestions(weekId: string): Question[] {
  return byWeek.get(weekId) ?? []
}

export function findQuestion(questionId: string) {
  return byId.get(questionId)
}

/** Every sample question id; new progress starts with these bookmarked. */
export const SAMPLE_SAVED_IDS: readonly string[] = [...byId.keys()]
