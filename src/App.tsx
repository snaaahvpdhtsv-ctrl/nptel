import { useEffect, useLayoutEffect, type ReactNode } from "react"
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
  useMatch,
} from "react-router"
import { AnnouncementPopup } from "./components/AnnouncementPopup"
import { CourseLayout } from "./components/CourseLayout"
import { OfflineNotice } from "./components/InstallApp"
import { Navbar } from "./components/Navbar"
import { AppProvider } from "./lib/app-state"
import { useApp } from "./lib/app-context"
import { useAuth } from "./lib/auth-context"
import { AuthProvider } from "./lib/auth-state"
import { coursePath } from "./lib/course-context"
import { DEFAULT_COURSE_ID } from "./lib/data"
import { ProgressProvider } from "./lib/progress-state"
import AdminPage from "./pages/admin/AdminPage"
import AnalyticsPage from "./pages/AnalyticsPage"
import CoursesPage from "./pages/CoursesPage"
import FeedbackPage from "./pages/FeedbackPage"
import HistoryPage from "./pages/HistoryPage"
import HomePage from "./pages/HomePage"
import MorePage from "./pages/MorePage"
import PracticePage from "./pages/PracticePage"
import PracticeQuizPage from "./pages/PracticeQuizPage"
import {
  NotFoundPage,
  PracticeWeekRedirect,
  PyqPaperPage,
  PyqPracticeRunPage,
  WeekStudyPage,
} from "./pages/PreviewPages"
import {
  PyqAnswersPage,
  PyqLandingPage,
  PyqPracticePage,
} from "./pages/PyqPages"
import ReviewPage from "./pages/ReviewPage"
import SavedPage from "./pages/SavedPage"
import SignInPage from "./pages/SignInPage"
import StudyPage from "./pages/StudyPage"

function ScrollToTop() {
  const { pathname } = useLocation()
  // Block body on purpose: newer browsers return a Promise from scrollTo, and an
  // effect must return nothing or a cleanup function.
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}

/** Admin pages keep the desktop chrome and never show learner-only UI. */
function isAdminSurface(pathname: string, search: string) {
  return (
    pathname === "/admin" ||
    pathname.startsWith("/admin/") ||
    (pathname === "/signin" &&
      new URLSearchParams(search).get("view") === "admin")
  )
}

/** Scope the mobile skin without changing the route tree or remounting a quiz. */
function MobileSurface() {
  const { pathname, search } = useLocation()
  const match = useMatch("/courses/:courseId/*")
  const { courses } = useApp()
  const admin = isAdminSurface(pathname, search)
  const hasTabs =
    !admin &&
    courses.some(
      (course) =>
        course.id === match?.params.courseId && course.status === "published",
    )

  useLayoutEffect(() => {
    const root = document.documentElement
    root.classList.toggle("mobile-learner", !admin)
    root.classList.toggle("mobile-course", hasTabs)
    return () => {
      root.classList.remove("mobile-learner", "mobile-course")
    }
  }, [admin, hasTabs])

  return null
}

/** Learners see the admin's announcement; admins manage it from the dashboard. */
function LearnerAnnouncement() {
  const { pathname, search } = useLocation()
  return isAdminSurface(pathname, search) ? null : <AnnouncementPopup />
}

/** Pre-course URLs (e.g. /practice/run?weeks=…) keep working by opening the original course. */
function LegacyRedirect() {
  const { pathname, search, hash } = useLocation()
  return (
    <Navigate
      to={`${coursePath(DEFAULT_COURSE_ID, pathname)}${search}${hash}`}
      replace
    />
  )
}

/** The dashboard is admin-only: everyone else goes to the admin sign-in and comes back afterwards. */
function RequireAdmin({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading)
    return (
      <div className="mx-auto max-w-6xl px-4 py-16 text-center text-sm text-gray-500 dark:text-gray-400">
        Checking admin access…
      </div>
    )
  if (user?.role !== "admin")
    return (
      <Navigate to="/signin?view=admin" replace state={{ from: location }} />
    )
  return children
}

const legacyPaths = [
  "/study/*",
  "/practice/*",
  "/pyq/*",
  "/saved",
  "/feedback",
  "/history",
  "/review",
  "/analytics",
  "/more",
]

function Aurora() {
  return (
    <div
      className="aurora-background fixed inset-0 z-0 pointer-events-none"
      aria-hidden="true"
    >
      <div className="aurora-band aurora-band-1" />
      <div className="aurora-band aurora-band-2" />
      <div className="aurora-band aurora-band-3" />
      <div className="aurora-band aurora-band-4" />
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <AuthProvider>
          <ProgressProvider>
            <MobileSurface />
            <ScrollToTop />
            <LearnerAnnouncement />
            <Aurora />
            <div className="app-frame relative z-10 flex min-h-screen flex-col">
              <Navbar />
              <main className="app-main flex-1 pb-12">
                <OfflineNotice />
                <Routes>
                  <Route path="/" element={<CoursesPage />} />
                  <Route
                    path="/courses"
                    element={<Navigate to="/" replace />}
                  />
                  <Route path="/courses/:courseId" element={<CourseLayout />}>
                    <Route index element={<HomePage />} />
                    <Route path="study" element={<StudyPage />} />
                    <Route path="study/:weekId" element={<WeekStudyPage />} />
                    <Route path="practice" element={<PracticePage />} />
                    <Route path="practice/run" element={<PracticeQuizPage />} />
                    <Route
                      path="practice/:weekId"
                      element={<PracticeWeekRedirect />}
                    />
                    <Route path="pyq" element={<PyqLandingPage />} />
                    <Route path="pyq/answers" element={<PyqAnswersPage />} />
                    <Route
                      path="pyq/answers/:paperId"
                      element={<PyqPaperPage />}
                    />
                    <Route path="pyq/practice" element={<PyqPracticePage />} />
                    <Route
                      path="pyq/practice/run"
                      element={<PyqPracticeRunPage />}
                    />
                    <Route path="saved" element={<SavedPage />} />
                    <Route path="feedback" element={<FeedbackPage />} />
                    <Route path="history" element={<HistoryPage />} />
                    <Route path="review" element={<ReviewPage />} />
                    <Route path="analytics" element={<AnalyticsPage />} />
                    <Route path="more" element={<MorePage />} />
                    <Route path="*" element={<NotFoundPage />} />
                  </Route>
                  {legacyPaths.map((path) => (
                    <Route
                      key={path}
                      path={path}
                      element={<LegacyRedirect />}
                    />
                  ))}
                  <Route path="/signin" element={<SignInPage />} />
                  <Route
                    path="/admin"
                    element={<Navigate to="/signin?view=admin" replace />}
                  />
                  <Route
                    path="/admin/dashboard"
                    element={
                      <RequireAdmin>
                        <AdminPage />
                      </RequireAdmin>
                    }
                  />
                  <Route path="*" element={<NotFoundPage />} />
                </Routes>
              </main>
            </div>
          </ProgressProvider>
        </AuthProvider>
      </AppProvider>
    </BrowserRouter>
  )
}
