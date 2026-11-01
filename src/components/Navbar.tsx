import { startTransition, useEffect, useState } from "react"
import { Link, useLocation, useMatch, useNavigate } from "react-router"
import { motion } from "motion/react"
import {
  Accessibility,
  ArrowLeftRight,
  Flame,
  GraduationCap,
  LayoutDashboard,
  LogIn,
  LogOut,
  Moon,
  ShieldCheck,
  Sparkles,
  Sun,
} from "lucide-react"
import { useApp } from "../lib/app-context"
import { initialOf, useAuth } from "../lib/auth-context"
import { coursePath } from "../lib/course-context"
import { useProgress } from "../lib/progress-context"
import { InstallNavButton } from "./InstallApp"

interface NavLink {
  label: string
  path: string
  /** Active only on this exact path (home links). */
  exact?: boolean
}

const courseLinks = (base: string): NavLink[] => [
  { label: "Home", path: base, exact: true },
  { label: "Answer Key", path: `${base}/study` },
  { label: "Practice Zone", path: `${base}/practice` },
  { label: "PYQs", path: `${base}/pyq` },
  { label: "Saved Questions", path: `${base}/saved` },
  { label: "Requests & Feedback", path: `${base}/feedback` },
]

const globalLinks: NavLink[] = [{ label: "Courses", path: "/", exact: true }]

const readingOptions = [
  ["largeText", "Larger text"],
  ["highContrast", "High contrast"],
  ["reducedMotion", "Reduce motion"],
  ["dyslexiaSpacing", "Reading spacing"],
] as const

const menuItem =
  "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700/60"

export function Navbar() {
  const { dark, toggleTheme, a11y, toggleA11y, courses, toast } = useApp()
  const { user, signOut } = useAuth()
  const { streak } = useProgress()
  const location = useLocation()
  const { pathname } = location
  const navigate = useNavigate()
  // The navbar sits outside the course routes, so it reads the course from the URL itself.
  const courseMatch = useMatch("/courses/:courseId/*")
  const course = courses.find(
    (item) =>
      item.id === courseMatch?.params.courseId && item.status === "published",
  )
  const links = course ? courseLinks(coursePath(course.id)) : globalLinks
  const [panelOpen, setPanelOpen] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)

  useEffect(() => {
    setAccountOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!panelOpen) return
    const onKey = (event: KeyboardEvent) =>
      event.key === "Escape" && setPanelOpen(false)
    const onPointer = (event: PointerEvent) => {
      if (!(event.target as HTMLElement).closest?.("[data-a11y-panel]"))
        setPanelOpen(false)
    }
    window.addEventListener("keydown", onKey)
    document.addEventListener("pointerdown", onPointer)
    return () => {
      window.removeEventListener("keydown", onKey)
      document.removeEventListener("pointerdown", onPointer)
    }
  }, [panelOpen])

  useEffect(() => {
    if (!accountOpen) return
    const onKey = (event: KeyboardEvent) =>
      event.key === "Escape" && setAccountOpen(false)
    const onPointer = (event: PointerEvent) => {
      if (!(event.target as HTMLElement).closest?.("[data-account-menu]"))
        setAccountOpen(false)
    }
    window.addEventListener("keydown", onKey)
    document.addEventListener("pointerdown", onPointer)
    return () => {
      window.removeEventListener("keydown", onKey)
      document.removeEventListener("pointerdown", onPointer)
    }
  }, [accountOpen])

  const handleSignOut = () => {
    setAccountOpen(false)
    // The router commits navigations as transitions. Signing out in the same transition
    // leaves admin pages before the dashboard guard can bounce to the admin sign-in.
    startTransition(() => {
      if (pathname.startsWith("/admin")) navigate("/", { replace: true })
      void signOut().then((error) =>
        error ? toast(error, "error") : toast("Signed out"),
      )
    })
  }

  const current = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname
  const isActive = (link: NavLink) =>
    current === link.path ||
    (!link.exact && current.startsWith(`${link.path}/`))
  const linkClass = (link: NavLink) =>
    `relative px-3.5 py-2 text-sm font-semibold rounded-lg transition-colors ${
      isActive(link)
        ? "text-primary-700 dark:text-primary-300"
        : "text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400"
    }`

  return (
    <>
      <header className="mobile-header">
        <Link
          to="/"
          className="mobile-brand"
          aria-label="NPTEL Quiz — all courses"
        >
          <span className="mobile-brand-symbol" aria-hidden="true">
            <Sparkles size={18} />
          </span>
          <span>NPTEL Quiz</span>
        </Link>
        <div className="flex items-center gap-1">
          {!course && pathname !== "/signin" && (
            <Link
              to="/signin"
              state={{ from: location }}
              className="mobile-account-link"
              aria-label={user ? "Your account" : "Sign in"}
            >
              {user ? (
                <span className="mobile-avatar">{initialOf(user.name)}</span>
              ) : (
                <>
                  <LogIn size={16} aria-hidden="true" />
                  <span>Sign in</span>
                </>
              )}
            </Link>
          )}
          <button
            type="button"
            onClick={toggleTheme}
            className="mobile-icon-button"
            aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
          >
            {dark ? <Sun size={21} /> : <Moon size={21} />}
          </button>
        </div>
      </header>
      <nav className="site-navbar sticky top-0 z-50 glass border-b border-gray-200/80 dark:border-gray-700/60 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link
              to="/"
              className="flex items-center gap-2 group"
              aria-label="NPTEL Quiz — all courses"
            >
              <span className="relative flex items-center justify-center h-9 w-9 rounded-xl bg-gradient-to-br from-primary-600 via-primary-500 to-accent-500 shadow-lg shadow-primary-600/30 transition-transform group-hover:scale-110">
                <span
                  className="absolute inset-0 rounded-xl bg-gradient-to-br from-primary-400 to-accent-400 opacity-0 blur-md transition-opacity group-hover:opacity-60"
                  aria-hidden="true"
                />
                <Sparkles size={17} className="relative text-white" />
              </span>
              <span className="text-lg font-bold font-display bg-gradient-to-r from-primary-600 via-primary-500 to-accent-500 bg-clip-text text-transparent tracking-tight">
                NPTEL Quiz
              </span>
            </Link>
            <div className="hidden lg:flex items-center gap-1">
              {links.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  aria-current={isActive(link) ? "page" : undefined}
                  className={linkClass(link)}
                >
                  {isActive(link) && (
                    <motion.span
                      layoutId="nav-active-pill"
                      className="absolute inset-0 rounded-lg bg-primary-100 dark:bg-primary-900/40 border border-primary-200 dark:border-primary-800/60"
                      transition={{
                        type: "spring",
                        stiffness: 400,
                        damping: 32,
                      }}
                      aria-hidden="true"
                    />
                  )}
                  <span className="relative z-10">{link.label}</span>
                </Link>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {streak > 0 && (
              <div
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-900/30 dark:to-amber-900/30 border border-orange-200/80 dark:border-orange-800/50 shadow-sm"
                title={`${streak} day streak`}
              >
                <Flame size={16} className="text-orange-500 animate-pulse" />
                <span className="text-sm font-bold text-orange-600 dark:text-orange-400">
                  {streak}
                </span>
              </div>
            )}
            <InstallNavButton />
            <button
              onClick={toggleTheme}
              aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
              className="p-2 rounded-lg hover:bg-gray-100/80 dark:hover:bg-gray-800/80 transition-colors text-gray-600 dark:text-gray-300"
            >
              {dark ? (
                <Sun size={18} className="text-yellow-400" />
              ) : (
                <Moon size={18} />
              )}
            </button>
            <div className="relative" data-a11y-panel>
              <button
                onClick={() => setPanelOpen((open) => !open)}
                aria-label="Accessibility settings"
                aria-expanded={panelOpen}
                className="hidden sm:inline-flex p-2 rounded-lg hover:bg-gray-100/80 dark:hover:bg-gray-800/80 transition-colors text-gray-600 dark:text-gray-300"
              >
                <Accessibility size={18} />
              </button>
              {panelOpen && (
                <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-xl border border-gray-200 bg-white p-3 shadow-lg dark:border-gray-700 dark:bg-gray-800">
                  <p className="px-1 pb-2 text-xs font-semibold text-gray-500 dark:text-gray-400">
                    Reading comfort
                  </p>
                  <div className="grid gap-1.5">
                    {readingOptions.map(([key, label]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => toggleA11y(key)}
                        aria-pressed={a11y[key]}
                        className={`rounded-lg border px-3 py-2 text-left text-xs font-medium transition-colors ${
                          a11y[key]
                            ? "border-primary-500 bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-200"
                            : "border-gray-200 text-gray-600 hover:border-primary-300 dark:border-gray-600 dark:text-gray-300"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            {user ? (
              <div className="relative" data-account-menu>
                <button
                  type="button"
                  onClick={() => setAccountOpen((open) => !open)}
                  aria-label="Account menu"
                  aria-expanded={accountOpen}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-primary-600 to-accent-500 text-sm font-bold text-white shadow-sm transition-transform hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500"
                >
                  {initialOf(user.name)}
                </button>
                {accountOpen && (
                  <div className="absolute right-0 top-full z-50 mt-2 w-64 rounded-xl border border-gray-200 bg-white p-2 shadow-lg dark:border-gray-700 dark:bg-gray-800">
                    <div className="px-2.5 py-2">
                      <p className="truncate text-sm font-semibold text-gray-800 dark:text-white">
                        {user.name}
                      </p>
                      <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                        {user.email}
                      </p>
                      {(user.role === "admin" || user.method === "google") && (
                        <span className="mt-2 inline-flex items-center gap-1 rounded-md bg-primary-50 px-1.5 py-0.5 text-xs font-medium text-primary-700 dark:bg-primary-900/40 dark:text-primary-200">
                          {user.role === "admin" && <ShieldCheck size={12} />}
                          {user.role === "admin" ? "Admin" : "Google"}
                        </span>
                      )}
                    </div>
                    <div className="my-1 h-px bg-gray-200 dark:bg-gray-700" />
                    {user.role === "admin" && (
                      <Link to="/admin/dashboard" className={menuItem}>
                        <LayoutDashboard size={16} className="text-gray-400" />
                        Admin dashboard
                      </Link>
                    )}
                    <button
                      type="button"
                      onClick={handleSignOut}
                      className={menuItem}
                    >
                      <LogOut size={16} className="text-gray-400" />
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              pathname !== "/signin" && (
                <Link
                  to="/signin"
                  state={{ from: location }}
                  className="btn-primary px-3.5 py-1.5 text-xs"
                >
                  <LogIn size={14} />
                  Sign in
                </Link>
              )
            )}
          </div>
        </div>
      </nav>
      {course && (
        <div className="course-strip border-b border-gray-200/70 bg-white/50 backdrop-blur-md dark:border-gray-700/50 dark:bg-gray-900/40">
          <div className="mx-auto flex max-w-6xl items-center gap-2.5 px-4 py-2 text-sm">
            <span
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary-600 to-accent-500 text-white shadow-sm"
              aria-hidden="true"
            >
              <GraduationCap size={15} />
            </span>
            <p className="min-w-0 truncate font-semibold text-gray-800 dark:text-gray-100">
              <span className="sr-only">Current course: </span>
              {course.title}
            </p>
            {course.sample && (
              <span className="shrink-0 rounded-full bg-gray-200/80 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-gray-600 dark:bg-white/10 dark:text-gray-300">
                Sample
              </span>
            )}
            <Link
              to="/"
              className="ml-auto inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-primary-600 transition-colors hover:bg-primary-50 dark:text-primary-300 dark:hover:bg-primary-900/30"
            >
              <ArrowLeftRight size={13} aria-hidden="true" />
              Change course
            </Link>
          </div>
        </div>
      )}
    </>
  )
}
