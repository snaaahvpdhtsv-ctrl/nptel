import { createContext, useContext } from "react"
import type { Course, Paper, Week } from "./data"

/** localStorage key remembering the course a learner opened last. */
export const LAST_COURSE_KEY = "nptel-last-course"

/** Builds a learner URL inside a course, e.g. coursePath(id, "/study"). */
export const coursePath = (courseId: string, subpath = "") =>
  `/courses/${courseId}${subpath}`

export interface CourseScope {
  course: Course
  /** Learner URL inside this course, e.g. path("/practice"). */
  path: (subpath?: string) => string
  /** All of this course's weeks, including ones hidden from learners. */
  weeks: Week[]
  publishedWeeks: Week[]
  /** All of this course's PYQ papers, including ones hidden from learners. */
  papers: Paper[]
  publishedPapers: Paper[]
}

// Lives apart from CourseLayout so hot-reloading the layout never creates a second context object.
export const CourseContext = createContext<CourseScope | null>(null)

export function useCourse() {
  const scope = useContext(CourseContext)
  if (!scope) throw new Error("useCourse must be used within CourseLayout")
  return scope
}

/** For screens that render both inside and outside a course. */
export function useOptionalCourse() {
  return useContext(CourseContext)
}
