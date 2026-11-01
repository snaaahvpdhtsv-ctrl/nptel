import { useState } from "react"
import { Link } from "react-router"
import { motion } from "motion/react"
import {
  ArrowRight,
  Clock,
  GraduationCap,
  LibraryBig,
  Sparkles,
} from "lucide-react"
import { EmptyState, SearchInput } from "../components/common"
import { useApp } from "../lib/app-context"
import { coursePath, LAST_COURSE_KEY } from "../lib/course-context"
import { paperGradients, type Course } from "../lib/data"

interface CourseStats {
  weeks: number
  questions: number
  papers: number
}

interface CourseCardProps {
  course: Course
  stats: CourseStats
  gradient: string
  index: number
}

function CourseCard({ course, stats, gradient, index }: CourseCardProps) {
  const hasContent = stats.weeks > 0 || stats.papers > 0
  const figures = [
    { label: "Weeks", value: stats.weeks },
    { label: "Questions", value: stats.questions },
    { label: "PYQ papers", value: stats.papers },
  ]

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
      className="h-full"
    >
      <Link
        to={coursePath(course.id)}
        className="course-card card card-hover group flex h-full flex-col overflow-hidden focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500"
      >
        <div
          className={`course-card-banner relative h-28 shrink-0 overflow-hidden bg-gradient-to-br ${gradient} p-5 text-white`}
        >
          <span
            className="course-card-decoration absolute inset-0 bg-[radial-gradient(120%_80%_at_50%_0%,rgb(255_255_255/0.25),transparent_55%)]"
            aria-hidden="true"
          />
          <span
            className="course-card-decoration absolute -bottom-10 -right-6 h-32 w-32 rounded-full bg-white/10"
            aria-hidden="true"
          />
          <span className="relative flex items-start justify-between gap-3">
            <span className="course-card-symbol flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 shadow-inner backdrop-blur-sm transition-transform duration-300 group-hover:rotate-3 group-hover:scale-110">
              <GraduationCap size={24} />
            </span>
            {course.sample && (
              <span className="course-card-sample rounded-full bg-black/20 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide">
                Sample
              </span>
            )}
          </span>
        </div>
        <div className="course-card-body flex flex-1 flex-col p-5">
          <h3 className="text-lg font-bold font-display leading-snug text-gray-800 dark:text-white">
            {course.title}
          </h3>
          {course.description && (
            <p className="mt-1 line-clamp-2 text-sm text-gray-500 dark:text-gray-400">
              {course.description}
            </p>
          )}
          <div className="mt-auto pt-5">
            {hasContent ? (
              <dl className="course-card-stats grid grid-cols-3 gap-2">
                {figures.map((figure) => (
                  <div
                    key={figure.label}
                    className="rounded-xl bg-gray-100/80 px-3 py-2 dark:bg-white/[0.04]"
                  >
                    <dt className="text-[11px] text-gray-600 dark:text-gray-400">
                      {figure.label}
                    </dt>
                    <dd className="text-lg font-bold font-display text-gray-800 dark:text-white">
                      {figure.value}
                    </dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="flex items-center gap-2 rounded-xl border border-dashed border-gray-300 px-3 py-3 text-sm font-medium text-gray-500 dark:border-gray-600 dark:text-gray-400">
                <Clock size={15} className="shrink-0" />
                Content coming soon
              </p>
            )}
            <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary-600 dark:text-primary-400">
              Open course
              <ArrowRight
                size={15}
                className="transition-transform group-hover:translate-x-0.5"
              />
            </span>
          </div>
        </div>
      </Link>
    </motion.div>
  )
}

export default function CoursesPage() {
  const { courses, weeks, papers } = useApp()
  const [query, setQuery] = useState("")
  const [lastCourseId] = useState(() => localStorage.getItem(LAST_COURSE_KEY))
  const published = courses.filter((course) => course.status === "published")
  const lastCourse = published.find((course) => course.id === lastCourseId)
  const term = query.trim().toLowerCase()
  const visible = term
    ? published.filter((course) =>
        `${course.title} ${course.description ?? ""}`
          .toLowerCase()
          .includes(term),
      )
    : published

  // Learners only count what they can open: published weeks and papers.
  const statsFor = (courseId: string): CourseStats => {
    const courseWeeks = weeks.filter(
      (week) => week.courseId === courseId && week.status === "published",
    )
    return {
      weeks: courseWeeks.length,
      questions: courseWeeks.reduce((sum, week) => sum + week.questionCount, 0),
      papers: papers.filter(
        (paper) => paper.courseId === courseId && paper.status === "published",
      ).length,
    }
  }

  return (
    <div className="learner-page courses-page max-w-6xl mx-auto px-4 py-10">
      <div className="mobile-courses-heading lg:hidden">
        <h1>Choose your course</h1>
        <p>Study, practice, and make steady progress.</p>
      </div>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="courses-hero relative text-center mb-10 overflow-hidden"
      >
        <div
          className="absolute inset-0 -z-10 pointer-events-none"
          aria-hidden="true"
        >
          <div className="absolute top-[-120px] left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-primary-400/20 dark:bg-primary-500/15 rounded-full blur-3xl" />
          <div className="absolute top-10 left-[15%] w-40 h-40 bg-accent-400/15 dark:bg-accent-500/10 rounded-full blur-2xl" />
          <div className="absolute top-20 right-[15%] w-52 h-52 bg-pink-400/15 dark:bg-pink-500/10 rounded-full blur-2xl" />
        </div>
        <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold bg-gradient-to-r from-primary-50 to-accent-50 dark:from-primary-900/30 dark:to-accent-900/30 text-primary-700 dark:text-primary-300 border border-primary-200/70 dark:border-primary-800/60 shadow-sm mb-5">
          <Sparkles size={13} className="animate-pulse text-accent-500" />
          NPTEL Practice Platform
        </div>
        <h1 className="text-4xl md:text-6xl font-display font-extrabold text-balance bg-gradient-to-r from-primary-600 via-accent-500 to-pink-500 bg-clip-text text-transparent leading-[1.1] animate-gradient-shift">
          Choose your course
        </h1>
        <p className="mt-5 text-gray-500 dark:text-gray-400 max-w-lg mx-auto">
          Every course has its own answer key, practice zone, PYQs, saved
          questions and requests.
        </p>
      </motion.div>

      {lastCourse && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="course-continue card mb-10 flex flex-wrap items-center gap-4 p-5 border-l-4 border-l-primary-500"
        >
          <span className="course-continue-symbol flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary-600 to-accent-500 text-white shadow-md shrink-0">
            <GraduationCap size={20} />
          </span>
          <div className="flex-1 min-w-48">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary-600 dark:text-primary-400">
              Continue where you left off
            </p>
            <p className="font-bold font-display text-gray-800 dark:text-white">
              {lastCourse.title}
            </p>
          </div>
          <Link
            to={coursePath(lastCourse.id)}
            aria-label={`Continue ${lastCourse.title}`}
            className="btn-primary px-6 py-2.5"
          >
            Continue
            <ArrowRight size={16} />
          </Link>
        </motion.div>
      )}

      <div className="flex items-end justify-between gap-3 mb-4">
        <h2 className="text-xl font-bold font-display text-gray-800 dark:text-white">
          All courses
        </h2>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {published.length} course{published.length === 1 ? "" : "s"}
        </span>
      </div>

      {published.length === 0 ? (
        <EmptyState icon={LibraryBig} title="No courses are available yet">
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Courses appear here once they're published.
          </p>
        </EmptyState>
      ) : (
        <>
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder="Search courses..."
          />
          {visible.length === 0 ? (
            <EmptyState icon={LibraryBig} title="No courses match your search">
              <button
                onClick={() => setQuery("")}
                className="btn-outline mt-4 inline-flex min-h-[44px] items-center"
              >
                Clear search
              </button>
            </EmptyState>
          ) : (
            <div className="course-list grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {visible.map((course, index) => (
                <CourseCard
                  key={course.id}
                  course={course}
                  stats={statsFor(course.id)}
                  gradient={
                    paperGradients[
                      published.indexOf(course) % paperGradients.length
                    ]
                  }
                  index={index}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
