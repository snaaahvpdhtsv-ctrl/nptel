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
  /** Every course, including hidden ones; learner pages only show published courses. */
  courses: Course[]
  setCourses: Dispatch<SetStateAction<Course[]>>
  weeks: Week[]
  setWeeks: Dispatch<SetStateAction<Week[]>>
  papers: Paper[]
  setPapers: Dispatch<SetStateAction<Paper[]>>
  /** Admin question inventory keyed by week or paper id. Only lists included in the preview data are present. */
  adminQuestions: Record<string, AdminQuestion[]>
  setAdminQuestions: Dispatch<SetStateAction<Record<string, AdminQuestion[]>>>
  requests: RequestItem[]
  setRequests: Dispatch<SetStateAction<RequestItem[]>>
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
