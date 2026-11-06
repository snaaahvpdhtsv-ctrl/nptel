import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import { CircleCheck, CircleX } from "lucide-react"
import {
  AppContext,
  type A11yKey,
  type AppState,
  type Toast,
} from "./app-context"
import {
  initialAnnouncement,
  initialRequests,
  type AdminQuestion,
  type Announcement,
  type Course,
  type Paper,
  type Week,
} from "./data"
import { syncThemeColor } from "./offline"
import { createQuestionBank } from "./question-bank"
import { useAuth } from "./auth-context"
import {
  archiveCourse as archiveCloudCourse,
  archivePaper as archiveCloudPaper,
  archiveQuestion as archiveCloudQuestion,
  archiveWeek as archiveCloudWeek,
  isValidQuestion,
  newContentId,
  newQuestionId,
  saveCourse as saveCloudCourse,
  savePaper as saveCloudPaper,
  saveQuestion as saveCloudQuestion,
  saveQuestions as saveCloudQuestions,
  saveWeek as saveCloudWeek,
  subscribeToContent,
} from "./cloud-content"
import { firestore } from "./firebase"

const a11yClasses: Record<A11yKey, string> = {
  largeText: "a11y-large-text",
  highContrast: "a11y-high-contrast",
  reducedMotion: "a11y-reduced-motion",
  dyslexiaSpacing: "a11y-dyslexia-spacing",
}

function requirePublishedQuestion(
  owner: {
    id: string
    type: "week" | "paper"
  },
  questions: AdminQuestion[],
  weeks: Week[],
  papers: Paper[],
) {
  const parent =
    owner.type === "week"
      ? weeks.find((week) => week.id === owner.id)
      : papers.find((paper) => paper.id === owner.id)
  if (
    parent?.status === "published" &&
    !questions.some(
      (question) =>
        question.status === "published" && isValidQuestion(question),
    )
  )
    throw new Error(
      `Unpublish this ${owner.type} before removing its last complete published question.`,
    )
}

export function AppProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading, adminClaimsLoading } = useAuth()
  const [dark, setDark] = useState(
    () => localStorage.getItem("nptel-theme") !== "light",
  )
  const [a11y, setA11y] = useState<Record<A11yKey, boolean>>({
    largeText: false,
    highContrast: false,
    reducedMotion: false,
    dyslexiaSpacing: false,
  })
  const [courses, setCourses] = useState<Course[]>([])
  const [weeks, setWeeks] = useState<Week[]>([])
  const [papers, setPapers] = useState<Paper[]>([])
  const [adminQuestions, setAdminQuestions] =
    useState<Record<string, AdminQuestion[]>>({})
  const [contentLoading, setContentLoading] = useState(Boolean(firestore))
  const [contentError, setContentError] = useState<string | null>(
    firestore
      ? null
      : "Course content is unavailable because Firebase Firestore is not configured.",
  )
  const questionBank = useMemo(
    () => createQuestionBank(adminQuestions),
    [adminQuestions],
  )
  const [requests, setRequests] = useState(initialRequests)
  const [announcement, setAnnouncement] = useState<Announcement | null>(
    initialAnnouncement,
  )
  const [toasts, setToasts] = useState<Toast[]>([])

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark)
    localStorage.setItem("nptel-theme", dark ? "dark" : "light")
    syncThemeColor(dark)
  }, [dark])

  useEffect(() => {
    for (const key of Object.keys(a11yClasses) as A11yKey[]) {
      document.documentElement.classList.toggle(a11yClasses[key], a11y[key])
    }
  }, [a11y])

  const toast = useCallback(
    (message: string, kind: Toast["kind"] = "success") => {
      const id = Date.now() + Math.random()
      setToasts((current) => [...current, { id, kind, message }])
      window.setTimeout(
        () => setToasts((current) => current.filter((item) => item.id !== id)),
        3000,
      )
    },
    [],
  )

  useEffect(() => {
    if (!firestore) {
      setContentLoading(false)
      return
    }
    setContentLoading(true)
    setContentError(null)
    setCourses([])
    setWeeks([])
    setPapers([])
    setAdminQuestions({})
    if (authLoading || adminClaimsLoading) return

    return subscribeToContent(
      user?.role === "admin",
      (content) => {
        setCourses(content.courses)
        setWeeks(content.weeks)
        setPapers(content.papers)
        setAdminQuestions(content.questions)
        setContentError(null)
        setContentLoading(false)
      },
      (error) => {
        setCourses([])
        setWeeks([])
        setPapers([])
        setAdminQuestions({})
        setContentError(
          `Course content couldn't be loaded from Firestore: ${error.message}`,
        )
        setContentLoading(false)
      },
    )
  }, [adminClaimsLoading, authLoading, user?.role])

  const saveCourse = useCallback(async (course: Course) => {
    await saveCloudCourse(course)
    setCourses((current) => {
      const exists = current.some((item) => item.id === course.id)
      return exists
        ? current.map((item) => (item.id === course.id ? course : item))
        : [...current, course]
    })
  }, [])

  const archiveCourse = useCallback(async (course: Course) => {
    await archiveCloudCourse(course)
    setCourses((current) =>
      current.map((item) =>
        item.id === course.id ? { ...item, status: "archived" } : item,
      ),
    )
  }, [])

  const saveWeek = useCallback(
    async (week: Week) => {
      await saveCloudWeek(week, adminQuestions[week.id] ?? [])
      setWeeks((current) => {
        const exists = current.some((item) => item.id === week.id)
        return exists
          ? current.map((item) => (item.id === week.id ? week : item))
          : [...current, week]
      })
    },
    [adminQuestions],
  )

  const archiveWeek = useCallback(async (week: Week) => {
    await archiveCloudWeek(week)
    setWeeks((current) =>
      current.map((item) =>
        item.id === week.id ? { ...item, status: "archived" } : item,
      ),
    )
  }, [])

  const savePaper = useCallback(
    async (paper: Paper) => {
      await saveCloudPaper(paper, adminQuestions[paper.id] ?? [])
      setPapers((current) => {
        const exists = current.some((item) => item.id === paper.id)
        return exists
          ? current.map((item) => (item.id === paper.id ? paper : item))
          : [...current, paper]
      })
    },
    [adminQuestions],
  )

  const archivePaper = useCallback(async (paper: Paper) => {
    await archiveCloudPaper(paper)
    setPapers((current) =>
      current.map((item) =>
        item.id === paper.id ? { ...item, status: "archived" } : item,
      ),
    )
  }, [])

  const saveQuestion = useCallback(
    async (
      owner: {
        id: string
        courseId: string
        type: "week" | "paper"
      },
      question: AdminQuestion,
    ) => {
      const current = adminQuestions[owner.id] ?? []
      const exists = current.some((item) => item.id === question.id)
      const next = exists
        ? current.map((item) => (item.id === question.id ? question : item))
        : [...current, question]
      requirePublishedQuestion(owner, next, weeks, papers)
      await saveCloudQuestion(owner, question)
      const questionCount = next.filter(
        (item) => item.status === "published" && isValidQuestion(item),
      ).length
      setAdminQuestions((lists) => ({ ...lists, [owner.id]: next }))
      setWeeks((items) =>
        items.map((item) =>
          item.id === owner.id ? { ...item, questionCount } : item,
        ),
      )
      setPapers((items) =>
        items.map((item) =>
          item.id === owner.id ? { ...item, questionCount } : item,
        ),
      )
    },
    [adminQuestions, papers, weeks],
  )

  const saveQuestions = useCallback(
    async (
      owner: {
        id: string
        courseId: string
        type: "week" | "paper"
      },
      questions: AdminQuestion[],
    ) => {
      await saveCloudQuestions(owner, questions)
      const current = adminQuestions[owner.id] ?? []
      const next = [
        ...current,
        ...questions.filter(
          (question) => !current.some((item) => item.id === question.id),
        ),
      ]
      const questionCount = next.filter(
        (item) => item.status === "published" && isValidQuestion(item),
      ).length
      setAdminQuestions((lists) => ({ ...lists, [owner.id]: next }))
      setWeeks((items) =>
        items.map((item) =>
          item.id === owner.id ? { ...item, questionCount } : item,
        ),
      )
      setPapers((items) =>
        items.map((item) =>
          item.id === owner.id ? { ...item, questionCount } : item,
        ),
      )
    },
    [adminQuestions],
  )

  const archiveQuestion = useCallback(
    async (
      owner: {
        id: string
        type: "week" | "paper"
      },
      questionId: string,
    ) => {
      const next = (adminQuestions[owner.id] ?? []).map((question) =>
        question.id === questionId
          ? { ...question, status: "archived" as const }
          : question,
      )
      requirePublishedQuestion(owner, next, weeks, papers)
      const parent =
        owner.type === "week"
          ? weeks.find((week) => week.id === owner.id)
          : papers.find((paper) => paper.id === owner.id)
      if (!parent)
        throw new Error("The question's parent content is unavailable.")
      await archiveCloudQuestion(
        { ...owner, courseId: parent.courseId },
        questionId,
      )
      const questionCount = next.filter(
        (item) => item.status === "published" && isValidQuestion(item),
      ).length
      setAdminQuestions((current) => ({ ...current, [owner.id]: next }))
      setWeeks((items) =>
        items.map((item) =>
          item.id === owner.id ? { ...item, questionCount } : item,
        ),
      )
      setPapers((items) =>
        items.map((item) =>
          item.id === owner.id ? { ...item, questionCount } : item,
        ),
      )
    },
    [adminQuestions, papers, weeks],
  )

  const value = useMemo<AppState>(
    () => ({
      dark,
      toggleTheme: () => setDark((current) => !current),
      a11y,
      toggleA11y: (key) =>
        setA11y((current) => ({ ...current, [key]: !current[key] })),
      contentLoading,
      contentError,
      courses,
      saveCourse,
      archiveCourse,
      weeks,
      saveWeek,
      archiveWeek,
      papers,
      savePaper,
      archivePaper,
      adminQuestions,
      saveQuestion,
      saveQuestions,
      archiveQuestion,
      newQuestionId,
      newContentId,
      questionBank,
      requests,
      setRequests,
      announcement,
      setAnnouncement,
      toast,
    }),
    [
      dark,
      a11y,
      contentLoading,
      contentError,
      courses,
      saveCourse,
      archiveCourse,
      weeks,
      saveWeek,
      archiveWeek,
      papers,
      savePaper,
      archivePaper,
      adminQuestions,
      saveQuestion,
      saveQuestions,
      archiveQuestion,
      newContentId,
      questionBank,
      requests,
      announcement,
      toast,
    ],
  )

  return (
    <AppContext.Provider value={value}>
      {children}
      <div className="toast-viewport pointer-events-none fixed inset-x-0 bottom-4 z-[100] flex flex-col items-center gap-2 px-4">
        {toasts.map((item) => (
          <div
            key={item.id}
            role="status"
            className="flex max-w-sm items-center gap-2 rounded-xl bg-[#333] px-2.5 py-2 text-sm text-white shadow-lg"
          >
            {item.kind === "success" ? (
              <CircleCheck size={18} className="shrink-0 text-green-400" />
            ) : (
              <CircleX size={18} className="shrink-0 text-red-400" />
            )}
            <span className="px-1">{item.message}</span>
          </div>
        ))}
      </div>
    </AppContext.Provider>
  )
}
