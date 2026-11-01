import { useMemo } from "react"
import { useCourse } from "./course-context"
import { buildCourseProgress } from "./progress"
import { useProgress } from "./progress-context"

/** Progress for the current course; only usable inside CourseLayout. */
export function useCourseProgress() {
  const { course, publishedWeeks } = useCourse()
  const { attempts } = useProgress()
  return useMemo(
    () => buildCourseProgress(attempts, course.id, publishedWeeks),
    [attempts, course.id, publishedWeeks],
  )
}
