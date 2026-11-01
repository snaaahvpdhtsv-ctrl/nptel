import { Link, useLocation } from "react-router"
import {
  Accessibility,
  ArrowLeftRight,
  ArrowRight,
  Bookmark,
  ChartColumn,
  ChevronRight,
  FileText,
  Flame,
  LayoutGrid,
  LogIn,
  LogOut,
  MessageSquareText,
  Moon,
  RotateCcwClock,
  Sun,
  Target,
  UserRound,
  type LucideIcon,
} from "lucide-react"
import { PageHeader } from "../components/common"
import { InstallAppCard } from "../components/InstallApp"
import { SyncPrompt } from "../components/SyncPrompt"
import { useApp } from "../lib/app-context"
import { initialOf, useAuth } from "../lib/auth-context"
import { useCourse } from "../lib/course-context"
import { useCourseProgress } from "../lib/course-progress"
import { useProgress } from "../lib/progress-context"
import { useMediaQuery, WIDE_QUERY } from "../lib/use-media-query"

const readingOptions = [
  ["largeText", "Larger text"],
  ["highContrast", "High contrast"],
  ["reducedMotion", "Reduce motion"],
  ["dyslexiaSpacing", "Reading spacing"],
] as const

function MenuRow({
  to,
  icon: Icon,
  title,
  detail,
  tone = "purple",
}: {
  to: string
  icon: LucideIcon
  title: string
  detail: string
  tone?: "purple" | "green" | "orange" | "neutral"
}) {
  return (
    <Link to={to} className="mobile-menu-row">
      <span className={`mobile-menu-icon tone-${tone}`} aria-hidden="true">
        <Icon size={22} strokeWidth={1.8} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="mobile-menu-title">{title}</span>
        <span className="mobile-menu-detail">{detail}</span>
      </span>
      <ChevronRight size={18} aria-hidden="true" />
    </Link>
  )
}

export default function MorePage() {
  const { course, path } = useCourse()
  // Only the layout on screen is rendered; building both doubled the work of every visit.
  const wide = useMediaQuery(WIDE_QUERY)
  const location = useLocation()
  const { user, signOut } = useAuth()
  const { dark, toggleTheme, a11y, toggleA11y, toast } = useApp()
  const { streak } = useProgress()
  const { attempts, mistakes, accuracy, rankedWeakWeeks } = useCourseProgress()
  const links = [
    { to: path("/saved"), label: "Saved Questions" },
    { to: path("/feedback"), label: "Requests & Feedback" },
    { to: path("/history"), label: "Quiz History" },
    { to: path("/review"), label: "Review Mistakes" },
    { to: path("/analytics"), label: "Analytics" },
    { to: "/", label: "All courses" },
  ]

  return (
    <div className="learner-page mx-auto max-w-3xl px-4 py-8">
      {wide && (
        <div>
          <PageHeader icon={LayoutGrid} title="More" />
          <div className="grid gap-3 sm:grid-cols-2">
            {links.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="card card-hover flex items-center justify-between p-4 font-medium text-gray-800 dark:text-gray-100"
              >
                {link.label}
                <ArrowRight size={16} className="text-gray-400" />
              </Link>
            ))}
          </div>
          <section className="mt-8" aria-labelledby="app-heading">
            <h2
              id="app-heading"
              className="mb-3 text-lg font-bold font-display text-gray-800 dark:text-white"
            >
              App
            </h2>
            <InstallAppCard className="card p-5" />
          </section>
        </div>
      )}

      {!wide && (
        <div className="mobile-more">
          <div className="mobile-more-heading">
            <h1>More</h1>
            <p>Your learning, preferences & account</p>
          </div>

          <section
            className="mobile-more-group"
            aria-labelledby="mobile-account-heading"
          >
            <h2 id="mobile-account-heading" className="mobile-group-label">
              Account
            </h2>
            <div className="mobile-account-card">
              <div className="flex items-center gap-3">
                <span className="mobile-profile-avatar" aria-hidden="true">
                  {user ? initialOf(user.name) : <UserRound size={21} />}
                </span>
                <div className="min-w-0">
                  <p className="mobile-menu-title">
                    {user?.name ?? "Learning as a guest"}
                  </p>
                  <p className="mobile-menu-detail break-all">
                    {user?.email ?? "Sign in is always optional"}
                  </p>
                </div>
              </div>
              <div className="mobile-account-actions">
                {user ? (
                  <>
                    <Link
                      to="/signin"
                      state={{ from: location }}
                      className="btn-outline"
                    >
                      Your account
                    </Link>
                    <button
                      type="button"
                      className="btn-outline"
                      onClick={() => {
                        void signOut().then((error) =>
                          error ? toast(error, "error") : toast("Signed out"),
                        )
                      }}
                    >
                      <LogOut size={16} />
                      Sign out
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      to="/signin"
                      state={{ from: location }}
                      className="btn-primary"
                    >
                      <LogIn size={16} />
                      Sign in
                    </Link>
                    <Link
                      to="/signin?view=signup"
                      state={{ from: location }}
                      className="btn-outline"
                    >
                      Create account
                    </Link>
                  </>
                )}
              </div>
              <SyncPrompt compact />
            </div>
          </section>

          <section
            className="mobile-more-group"
            aria-labelledby="mobile-learning-heading"
          >
            <h2 id="mobile-learning-heading" className="mobile-group-label">
              Learning
            </h2>
            <div className="mobile-menu-list">
              <MenuRow
                to={path("/pyq")}
                icon={FileText}
                title="PYQs"
                detail="Previous-year papers & practice"
                tone="green"
              />
              <MenuRow
                to={path("/saved")}
                icon={Bookmark}
                title="Saved Questions"
                detail="Your bookmarked questions"
              />
              <MenuRow
                to={path("/history")}
                icon={RotateCcwClock}
                title="Quiz History"
                detail={
                  attempts.length
                    ? `${attempts.length} completed attempt${
                        attempts.length === 1 ? "" : "s"
                      }`
                    : "Your past attempts, scores & answers"
                }
              />
              <MenuRow
                to={path("/review")}
                icon={Target}
                title="Review Mistakes"
                detail={
                  mistakes.length
                    ? `${mistakes.length} question${
                        mistakes.length === 1 ? "" : "s"
                      } to fix`
                    : "A fresh start — nothing to fix"
                }
              />
              <MenuRow
                to={path("/analytics")}
                icon={ChartColumn}
                title="Analytics"
                detail={
                  accuracy === null
                    ? "Progress, activity & weekly mastery"
                    : `${accuracy}% accuracy · see your progress`
                }
              />
            </div>
          </section>

          {rankedWeakWeeks.length > 0 && (
            <section
              className="mobile-more-group"
              aria-labelledby="mobile-weakest-heading"
            >
              <h2 id="mobile-weakest-heading" className="mobile-group-label">
                Weakest weeks
              </h2>
              <div className="mobile-menu-list">
                {rankedWeakWeeks.slice(0, 6).map((entry) => (
                  <MenuRow
                    key={entry.week.id}
                    to={path(`/review?week=${entry.week.id}`)}
                    icon={Target}
                    title={`Week ${entry.week.weekNumber}`}
                    detail={`${entry.week.title} · ${entry.mistakeIds.length} to fix`}
                  />
                ))}
              </div>
            </section>
          )}

          <div className="mobile-more-group">
            <MenuRow
              to={path("/feedback")}
              icon={MessageSquareText}
              title="Requests & Feedback"
              detail="Ask questions, report issues"
            />
          </div>

          <section
            className="mobile-more-group"
            aria-labelledby="mobile-preferences-heading"
          >
            <h2 id="mobile-preferences-heading" className="mobile-group-label">
              Preferences
            </h2>
            <button
              type="button"
              className="mobile-menu-row mobile-setting"
              onClick={toggleTheme}
            >
              <span className="mobile-menu-icon tone-orange" aria-hidden="true">
                {dark ? <Moon size={22} /> : <Sun size={22} />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="mobile-menu-title">Appearance</span>
                <span className="mobile-menu-detail">
                  Currently {dark ? "dark" : "light"} mode — tap to switch
                </span>
              </span>
              <ArrowLeftRight size={17} aria-hidden="true" />
            </button>
            <div className="mobile-accessibility-card">
              <div className="flex items-center gap-2">
                <Accessibility
                  size={18}
                  className="text-primary-500"
                  aria-hidden="true"
                />
                <h3>Accessibility</h3>
              </div>
              <p>Adjust reading comfort and motion.</p>
              <div className="mobile-reading-options">
                {readingOptions.map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => toggleA11y(key)}
                    aria-pressed={a11y[key]}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </section>

          <section
            className="mobile-more-group"
            aria-labelledby="mobile-app-heading"
          >
            <h2 id="mobile-app-heading" className="mobile-group-label">
              App
            </h2>
            <InstallAppCard className="mobile-account-card" />
          </section>

          <div className="mobile-more-group mobile-menu-row">
            <span className="mobile-menu-icon tone-orange" aria-hidden="true">
              <Flame size={23} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="mobile-menu-title">
                Day streak{streak > 0 && ` · ${streak}`}
              </span>
              <span className="mobile-menu-detail">
                {streak
                  ? "Keep it going — a little practice every day"
                  : "Practice daily to build a streak"}
              </span>
            </span>
          </div>

          <section
            className="mobile-more-group"
            aria-labelledby="mobile-current-course-heading"
          >
            <h2
              id="mobile-current-course-heading"
              className="mobile-group-label"
            >
              Current course
            </h2>
            <MenuRow
              to="/"
              icon={ArrowLeftRight}
              title={course.title}
              detail="All courses · change course"
              tone="neutral"
            />
          </section>
        </div>
      )}
    </div>
  )
}
