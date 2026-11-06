import {
  startTransition,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react"
import { Link, useNavigate, useSearchParams } from "react-router"
import {
  ArrowUpRight,
  Globe,
  GraduationCap,
  Layers,
  LogOut,
} from "lucide-react"
import { StatusBadge } from "../../components/common"
import { useApp } from "../../lib/app-context"
import { useAuth } from "../../lib/auth-context"
import { coursePath } from "../../lib/course-context"
import type { Course } from "../../lib/data"
import { useMediaQuery, WIDE_QUERY } from "../../lib/use-media-query"
import {
  AdminSidebarNav,
  AdminTabsNav,
  COURSE_SECTIONS,
  SECTION_IDS,
  SECTIONS,
  type NavBadge,
  type SectionId,
} from "./AdminNav"
import { AnnouncementPanel } from "./AnnouncementPanel"
import { AuditPanel, type AuditEntry } from "./AuditPanel"
import { PapersPanel, QuestionList, WeeksPanel } from "./ContentPanels"
import { CoursesPanel } from "./CoursesPanel"
import { OverviewSection } from "./OverviewSection"
import { RequestsPanel } from "./RequestsPanel"
import {
  ConfirmDialog,
  CourseChip,
  fieldLabel,
  Panel,
  smallPrimary,
  type ConfirmState,
} from "./ui"

// The sticky navbar, plus the section tabs on small screens, cover the top of the page.
const scrollMargin = "scroll-mt-36 lg:scroll-mt-24"

function SectionHeader({
  id,
  description,
  scope,
}: {
  id: SectionId
  description: ReactNode
  scope?: ReactNode
}) {
  const { label, icon: Icon, iconClass } = SECTIONS[id]
  return (
    <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3">
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${iconClass} text-white shadow-md sm:h-11 sm:w-11`}
          aria-hidden="true"
        >
          <Icon size={20} />
        </span>
        <div className="min-w-0">
          <h2
            id={`admin-section-${id}`}
            className="text-xl font-bold font-display tracking-tight text-gray-800 dark:text-white"
          >
            {label}
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {description}
          </p>
        </div>
      </div>
      {scope}
    </header>
  )
}

/** Scope marker for sections that cover every course (pairs with `CourseChip`). */
function SiteWideChip() {
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700 dark:bg-white/10 dark:text-gray-300">
      <Globe size={12} className="shrink-0" aria-hidden="true" />
      All courses
    </span>
  )
}

function NoCourseState({ onOpenCourses }: { onOpenCourses: () => void }) {
  return (
    <Panel className="text-center">
      <GraduationCap size={24} className="mx-auto text-gray-400" />
      <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">
        Add a course first — weeks, questions and PYQ papers belong to a course.
      </p>
      <button onClick={onOpenCourses} className={`${smallPrimary} mt-4`}>
        Go to courses
      </button>
    </Panel>
  )
}

/** Picks the course that the Overview, Weeks and PYQ sections work on. */
function CourseSwitcher({
  course,
  courses,
  onSelect,
  compact = false,
  /** One tight row above the section tabs on small screens. */
}: {
  course?: Course
  courses: Course[]
  onSelect: (id: string) => void
  compact?: boolean
}) {
  if (!course)
    return (
      <div
        className={
          compact
            ? "card mb-3 p-3"
            : "rounded-xl bg-gray-50 p-3 dark:bg-white/[0.035]"
        }
      >
        <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
          No courses yet
        </p>
        <p className="mt-0.5 text-xs text-gray-600 dark:text-gray-400">
          Add a course to manage its weeks, questions and PYQ papers.
        </p>
      </div>
    )

  const select = (
    <select
      id="admin-course"
      value={course.id}
      onChange={(event) => onSelect(event.target.value)}
      className="input py-2"
    >
      {courses.map((item) => (
        <option key={item.id} value={item.id}>
          {item.status === "published"
            ? item.title
            : `${item.title} (${
                item.status === "draft" ? "Draft" : "Archived"
              })`}
        </option>
      ))}
    </select>
  )
  const learnerLink = course.status === "published" && (
    <Link
      to={coursePath(course.id)}
      className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-primary-700 hover:underline dark:text-primary-300"
    >
      View as learner
      <ArrowUpRight size={13} aria-hidden="true" />
    </Link>
  )

  if (compact)
    return (
      <div className="card mb-3 p-3">
        <label htmlFor="admin-course" className={fieldLabel}>
          Managing course
        </label>
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">{select}</div>
          {learnerLink}
        </div>
      </div>
    )

  return (
    <div className="rounded-xl bg-gray-50 p-3 dark:bg-white/[0.035]">
      <label htmlFor="admin-course" className={fieldLabel}>
        Managing course
      </label>
      {select}
      <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">
        <StatusBadge status={course.status} />
        {learnerLink}
      </div>
    </div>
  )
}

export default function AdminPage() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const { signOut } = useAuth()
  const {
    contentLoading,
    contentError,
    courses,
    weeks: allWeeks,
    papers: allPapers,
    requests,
    toast,
  } = useApp()
  // Desktop gets a sidebar; smaller screens a row of section tabs.
  const wide = useMediaQuery(WIDE_QUERY)
  const [confirm, setConfirm] = useState<ConfirmState>(null)
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([])
  const [selectedWeekId, setSelectedWeekId] = useState<string | null>(null)
  const weeksTop = useRef<HTMLDivElement>(null)
  const questionsTop = useRef<HTMLDivElement>(null)
  const revealQuestions = useRef(false)

  // `?course=` picks the course being managed; default to the first one.
  const course =
    courses.find((item) => item.id === params.get("course")) ?? courses[0]
  const courseId = course?.id
  const courseTitle = course?.title
  // `?section=` picks the visible section; unknown values fall back to the overview.
  const sectionParam = params.get("section") as SectionId | null
  const section =
    sectionParam && SECTION_IDS.includes(sectionParam)
      ? sectionParam
      : "overview"
  const weeks = allWeeks.filter((week) => week.courseId === courseId)
  const papers = allPapers.filter((paper) => paper.courseId === courseId)
  const pending = requests.filter((item) => item.status === "pending")
  const selectedWeek = weeks.find((week) => week.id === selectedWeekId)

  // Sections swap in place, so open each one from the top of the page.
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [section])

  // A chosen week's questions sit below the week list, so bring them into view. Waits for the
  // Weeks section too: opening a week from the Overview switches sections in a later render.
  useEffect(() => {
    if (!revealQuestions.current || !selectedWeekId || section !== "weeks")
      return
    revealQuestions.current = false
    questionsTop.current?.scrollIntoView({ behavior: "smooth", block: "start" })
  }, [selectedWeekId, section])

  const updateParams = (
    changes: Record<string, string | null>,
    replace: boolean,
  ) =>
    setParams(
      (current) => {
        const next = new URLSearchParams(current)
        for (const [key, value] of Object.entries(changes)) {
          if (value) next.set(key, value)
          else next.delete(key)
        }
        return next
      },
      { replace },
    )

  const selectCourse = (id: string | null) => {
    updateParams({ course: id }, true)
    setSelectedWeekId(null)
  }

  // Each section is a history entry, so Back returns to the previous one.
  const selectSection = (id: SectionId) => {
    if (id !== section)
      updateParams({ section: id === "overview" ? null : id }, false)
  }

  const selectWeek = (id: string | null) => {
    revealQuestions.current = id !== null
    setSelectedWeekId(id)
  }

  const openFromOverview = (target: SectionId, weekId?: string) => {
    selectSection(target)
    if (weekId) selectWeek(weekId)
  }

  // Error reports can come from any course, so this switches course as well.
  const openReportedWeek = (targetCourseId: string, weekId: string) => {
    updateParams({ course: targetCourseId, section: "weeks" }, false)
    selectWeek(weekId)
  }

  const audit = useCallback((action: string, resource = "Content") => {
    setAuditLog((current) => [
      { id: Date.now() + Math.random(), action, resource, at: new Date() },
      ...current,
    ])
  }, [])

  // Week, question, paper and health entries name the course they belong to.
  const courseAudit = useCallback(
    (action: string, resource = "Content") =>
      audit(action, courseTitle ? `${courseTitle} · ${resource}` : resource),
    [audit, courseTitle],
  )

  const logOut = () => {
    // The router commits navigations as transitions. Signing out in the same
    // transition leaves the dashboard before its guard redirects to the admin sign-in.
    startTransition(() => {
      navigate("/", { replace: true })
      void signOut().then((error) =>
        error
          ? toast(error, "error")
          : toast("Signed out of the admin account"),
      )
    })
  }

  const badges: Partial<Record<SectionId, NavBadge>> = {
    courses: { value: courses.length },
  }
  if (course) {
    badges.weeks = { value: weeks.length }
    badges.papers = { value: papers.length }
  }
  if (pending.length > 0)
    badges.requests = { value: pending.length, alert: true, label: "pending" }
  if (auditLog.length > 0) badges.audit = { value: auditLog.length }
  const nav = { active: section, badges, onSelect: selectSection }

  const courseScope = course ? <CourseChip title={course.title} /> : undefined
  const siteScope = <SiteWideChip />
  const noCourse = (
    <NoCourseState onOpenCourses={() => selectSection("courses")} />
  )

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 lg:py-8">
      <header className="mb-5 flex flex-wrap items-center justify-between gap-x-4 gap-y-3 lg:mb-6">
        <div className="flex min-w-0 items-center gap-3">
          <span
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500 to-fuchsia-500 text-white shadow-lg shadow-primary-600/30"
            aria-hidden="true"
          >
            <Layers size={20} />
          </span>
          <div className="min-w-0">
            <h1 className="font-display text-2xl font-bold tracking-tight text-gray-800 dark:text-white">
              Admin dashboard
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Course content is managed in Firestore · learner views update from
              the same records
            </p>
            <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
              Announcements, learner requests, and activity logs are local
              preview data and do not persist.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/" className="btn-ghost px-3 py-2 text-sm">
            <ArrowUpRight size={16} aria-hidden="true" />
            View site
          </Link>
          <button
            type="button"
            onClick={logOut}
            className="btn-outline px-3 py-2 text-sm"
          >
            <LogOut size={16} aria-hidden="true" />
            Log out
          </button>
        </div>
      </header>

      {!wide && (
        <>
          {COURSE_SECTIONS.includes(section) && (
            <CourseSwitcher
              compact
              course={course}
              courses={courses}
              onSelect={selectCourse}
            />
          )}
          <div className="sticky top-16 z-30 -mx-4 mb-5 border-y border-gray-200/80 bg-white/90 px-2 py-1 backdrop-blur-md dark:border-white/10 dark:bg-gray-950/90">
            <AdminTabsNav {...nav} />
          </div>
        </>
      )}

      {contentLoading ? (
        <Panel role="status">Loading course content from Firestore…</Panel>
      ) : contentError ? (
        <Panel
          role="alert"
          className="border-red-300 text-red-700 dark:text-red-300"
        >
          <p className="font-semibold">
            Course content management is unavailable.
          </p>
          <p className="mt-1 text-sm">{contentError}</p>
          <p className="mt-2 text-sm">
            No content changes have been applied. Check the connection and
            reload before editing.
          </p>
        </Panel>
      ) : (
        <div className="lg:flex lg:items-start lg:gap-6">
          {wide && (
            <aside className="sticky top-20 w-64 shrink-0">
              <div className="card p-3">
                <CourseSwitcher
                  course={course}
                  courses={courses}
                  onSelect={selectCourse}
                />
                <div className="mt-2">
                  <AdminSidebarNav {...nav} />
                </div>
              </div>
            </aside>
          )}

          {/* Every section stays mounted so drafts, filters and forms survive switching. */}
          <div className="min-w-0 flex-1">
            <section
              hidden={section !== "overview"}
              aria-labelledby="admin-section-overview"
            >
              <SectionHeader
                id="overview"
                description={
                  course
                    ? "Key numbers and open work for this course, plus learner requests from every course."
                    : "Add a course to see its numbers and content health."
                }
                scope={courseScope}
              />
              {course ? (
                <OverviewSection
                  course={course}
                  weeks={weeks}
                  papers={papers}
                  pending={pending}
                  audit={courseAudit}
                  onOpen={openFromOverview}
                />
              ) : (
                noCourse
              )}
            </section>

            <section
              hidden={section !== "weeks"}
              aria-labelledby="admin-section-weeks"
            >
              <SectionHeader
                id="weeks"
                description="Add, publish and back up weeks, then select a week to edit its questions."
                scope={courseScope}
              />
              {course ? (
                <div className="space-y-4">
                  <div ref={weeksTop} className={scrollMargin}>
                    {/* Keyed by course so open forms, searches and restore previews never carry over. */}
                    <WeeksPanel
                      key={`weeks-${course.id}`}
                      course={course}
                      selectedId={selectedWeekId}
                      onSelect={selectWeek}
                      audit={courseAudit}
                      onConfirm={setConfirm}
                    />
                  </div>
                  {selectedWeek ? (
                    <div ref={questionsTop} className={scrollMargin}>
                      <QuestionList
                        key={selectedWeek.id}
                        listId={selectedWeek.id}
                        ownerCourseId={course.id}
                        ownerType="week"
                        ownerLabel={`Week ${selectedWeek.weekNumber}`}
                        showFlags
                        audit={courseAudit}
                        onConfirm={setConfirm}
                        backLabel="Back to all weeks"
                        onBack={() =>
                          weeksTop.current?.scrollIntoView({
                            behavior: "smooth",
                            block: "start",
                          })
                        }
                      />
                    </div>
                  ) : (
                    weeks.length > 0 && (
                      <p className="rounded-2xl border border-dashed border-gray-300 px-5 py-8 text-center text-sm text-gray-600 dark:border-white/10 dark:text-gray-400">
                        Select a week above to view and edit its questions.
                      </p>
                    )
                  )}
                </div>
              ) : (
                noCourse
              )}
            </section>

            <section
              hidden={section !== "papers"}
              aria-labelledby="admin-section-papers"
            >
              <SectionHeader
                id="papers"
                description="Manage PYQ papers and their question records. Learners see only complete questions in published papers."
                scope={courseScope}
              />
              {course ? (
                <PapersPanel
                  key={`papers-${course.id}`}
                  course={course}
                  audit={courseAudit}
                  onConfirm={setConfirm}
                />
              ) : (
                noCourse
              )}
            </section>

            <section
              hidden={section !== "courses"}
              aria-labelledby="admin-section-courses"
            >
              <SectionHeader
                id="courses"
                description="Learners choose from published courses. Select a course to manage its content."
                scope={siteScope}
              />
              <CoursesPanel
                selectedId={courseId}
                onSelect={selectCourse}
                audit={audit}
                onConfirm={setConfirm}
              />
            </section>

            <section
              hidden={section !== "requests"}
              aria-labelledby="admin-section-requests"
            >
              <SectionHeader
                id="requests"
                description={`Learner messages from every course · ${requests.length} total · ${pending.length} pending`}
                scope={siteScope}
              />
              <RequestsPanel
                onConfirm={setConfirm}
                audit={audit}
                onOpenWeek={openReportedWeek}
              />
            </section>

            <section
              hidden={section !== "announcement"}
              aria-labelledby="admin-section-announcement"
            >
              <SectionHeader
                id="announcement"
                description="Shown as a popup to users when they open the site."
                scope={siteScope}
              />
              <AnnouncementPanel audit={audit} />
            </section>

            <section
              hidden={section !== "audit"}
              aria-labelledby="admin-section-audit"
            >
              <SectionHeader
                id="audit"
                description="Who changed what, when, and through which operation."
                scope={siteScope}
              />
              <AuditPanel entries={auditLog} />
            </section>
          </div>
        </div>
      )}

      <ConfirmDialog state={confirm} onClose={() => setConfirm(null)} />
    </div>
  )
}
