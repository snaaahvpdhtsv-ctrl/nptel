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
  adminPaperQuestions,
  adminWeekQuestions,
  initialAnnouncement,
  initialCourses,
  initialPapers,
  initialRequests,
  initialWeeks,
  type AdminQuestion,
  type Announcement,
} from "./data"
import { syncThemeColor } from "./offline"

const a11yClasses: Record<A11yKey, string> = {
  largeText: "a11y-large-text",
  highContrast: "a11y-high-contrast",
  reducedMotion: "a11y-reduced-motion",
  dyslexiaSpacing: "a11y-dyslexia-spacing",
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [dark, setDark] = useState(
    () => localStorage.getItem("nptel-theme") !== "light",
  )
  const [a11y, setA11y] = useState<Record<A11yKey, boolean>>({
    largeText: false,
    highContrast: false,
    reducedMotion: false,
    dyslexiaSpacing: false,
  })
  const [courses, setCourses] = useState(initialCourses)
  const [weeks, setWeeks] = useState(initialWeeks)
  const [papers, setPapers] = useState(initialPapers)
  const [adminQuestions, setAdminQuestions] =
    useState<Record<string, AdminQuestion[]>>(() => ({
      ...adminWeekQuestions,
      ...adminPaperQuestions,
    }))
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

  const value = useMemo<AppState>(
    () => ({
      dark,
      toggleTheme: () => setDark((current) => !current),
      a11y,
      toggleA11y: (key) =>
        setA11y((current) => ({ ...current, [key]: !current[key] })),
      courses,
      setCourses,
      weeks,
      setWeeks,
      papers,
      setPapers,
      adminQuestions,
      setAdminQuestions,
      requests,
      setRequests,
      announcement,
      setAnnouncement,
      toast,
    }),
    [
      dark,
      a11y,
      courses,
      weeks,
      papers,
      adminQuestions,
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
