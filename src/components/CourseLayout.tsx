import { useEffect, useMemo } from "react"
import { Link, Outlet, useParams } from "react-router"
import { NoticeCard } from "./common"
import { MobileBottomNav } from "./MobileBottomNav"
import { useApp } from "../lib/app-context"
import {
  CourseContext,
  coursePath,
  LAST_COURSE_KEY,
  type CourseScope,
} from "../lib/course-context"

/** Resolves `:courseId`, scopes every learner page to that course, and rejects unknown or hidden courses. */
export function CourseLayout() {
  const { courseId } = useParams()
  const { courses, weeks, papers } = useApp()
  const course = courses.find(
    (item) => item.id === courseId && item.status === "published",
  )

  const scope = useMemo<CourseScope | null>(() => {
    if (!course) return null
    const courseWeeks = weeks.filter((week) => week.courseId === course.id)
    const coursePapers = papers.filter((paper) => paper.courseId === course.id)
    return {
      course,
      path: (subpath = "") => coursePath(course.id, subpath),
      weeks: courseWeeks,
      publishedWeeks: courseWeeks.filter((week) => week.status === "published"),
      papers: coursePapers,
      publishedPapers: coursePapers.filter(
        (paper) => paper.status === "published",
      ),
    }
  }, [course, weeks, papers])

  const id = course?.id
  const title = course?.title
  useEffect(() => {
    if (!id || !title) return
    localStorage.setItem(LAST_COURSE_KEY, id)
    const previousTitle = document.title
    document.title = previousTitle ? `${title} · ${previousTitle}` : title
    return () => {
      document.title = previousTitle
    }
  }, [id, title])

  if (!scope) {
    return (
      <div className="learner-page mx-auto max-w-6xl px-4 py-16">
        <NoticeCard
          title="Course not found"
          action={
            <Link to="/" className="btn-primary px-5 py-2.5">
              Back to courses
            </Link>
          }
        >
          This course doesn't exist or isn't available right now.
        </NoticeCard>
      </div>
    )
  }

  return (
    <CourseContext.Provider value={scope}>
      {/* Keyed so selections, searches and bookmarks never carry over to another course. */}
      <Outlet key={scope.course.id} />
      <MobileBottomNav />
    </CourseContext.Provider>
  )
}
