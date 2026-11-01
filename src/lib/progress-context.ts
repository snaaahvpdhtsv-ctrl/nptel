import { createContext, useContext } from "react"
import type { NewQuizAttempt, QuizAttempt } from "./progress"

export interface ProgressState {
  /** True while signed out: progress then belongs to this browser only. */
  isGuest: boolean
  /** Finished quizzes, newest first, across every course. */
  attempts: QuizAttempt[]
  /** Bookmarked question ids, shared by quizzes, Review Mistakes and Saved Questions. */
  savedIds: string[]
  /** Consecutive days with a finished quiz, in any course. */
  streak: number
  toggleSaved: (questionId: string) => void
  recordAttempt: (attempt: NewQuizAttempt) => void
  /** Removes one course's attempts; bookmarks are kept. */
  clearHistory: (courseId: string) => void
}

// Lives apart from ProgressProvider so hot-reloading the provider never creates a second context object.
export const ProgressContext = createContext<ProgressState | null>(null)

export function useProgress() {
  const context = useContext(ProgressContext)
  if (!context)
    throw new Error("useProgress must be used within ProgressProvider")
  return context
}
