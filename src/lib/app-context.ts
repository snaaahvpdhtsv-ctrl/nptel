import {
  createContext,
  useContext,
  type Dispatch,
  type SetStateAction,
} from "react"
import type {
  AdminQuestion,
  Announcement,
  Course,
  Paper,
  RequestItem,
  Week,
} from "./data"
import type { BulkOperation } from "./cloud-content"
import type { QuestionBank } from "./question-bank"

export type A11yKey = "largeText" | "highContrast" | "reducedMotion" | "dyslexiaSpacing"

export interface Toast {
  id: number
  kind: "success" | "error"
  message: string
}

export interface AppState {
  dark: boolean
  toggleTheme: () => void
  a11y: Record<A11yKey, boolean>
  toggleA11y: (key: A11yKey) => void
  contentLoading: boolean
  contentError: string | null
  /** Firestore courses; learner pages only show published courses. */
  courses: Course[]
  saveCourse: (course: Course) => Promise<void>
  archiveCourse: (course: Course) => Promise<void>
  weeks: Week[]
  saveWeek: (week: Week) => Promise<void>
  archiveWeek: (week: Week) => Promise<void>
  papers: Paper[]
  savePaper: (paper: Paper) => Promise<void>
  archivePaper: (paper: Paper) => Promise<void>
  /** Firestore question records keyed by their parent week or paper ID. */
  adminQuestions: Record<string, AdminQuestion[]>
  saveQuestion: (
    owner: {
      id: string
      courseId: string
      type: "week" | "paper"
    },
    question: AdminQuestion,
  ) => Promise<void>
  saveQuestions: (
    owner: {
      id: string
      courseId: string
      type: "week" | "paper"
    },
    questions: AdminQuestion[],
  ) => Promise<void>
  bulkUpdateQuestions: (
    owner: {
      id: string
      courseId: string
      type: "week" | "paper"
    },
    questionIds: string[],
    patch: Partial<Pick<AdminQuestion, "difficulty" | "topic" | "explanation" | "status">>,
  ) => Promise<void>
  bulkOperations: BulkOperation[]
  archiveQuestion: (
    owner: {
      id: string
      type: "week" | "paper"
    },
    questionId: string,
  ) => Promise<void>
  newQuestionId: () => string
  newContentId: (collection: "weeks" | "papers") => string
  /** Complete published questions, derived from the Firestore inventory. */
  questionBank: QuestionBank
  requests: RequestItem[]
  setRequests: Dispatch<SetStateAction<RequestItem[]>>
  createRequest: (request: RequestItem) => Promise<void>
  updateRequest: (request: RequestItem) => Promise<void>
  deleteRequest: (request: RequestItem) => Promise<void>
  /** The admin's site-wide announcement, shown to learners as a popup; null when there is none. */
  announcement: Announcement | null
  setAnnouncement: Dispatch<SetStateAction<Announcement | null>>
  toast: (message: string, kind?: Toast["kind"]) => void
}

// Lives apart from AppProvider so hot-reloading the provider never creates a second context object.
export const AppContext = createContext<AppState | null>(null)

export function useApp() {
  const context = useContext(AppContext)
  if (!context) throw new Error("useApp must be used within AppProvider")
  return context
}
