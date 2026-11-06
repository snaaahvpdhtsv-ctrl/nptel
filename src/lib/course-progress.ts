import { useMemo } from "react"
import { useApp } from "./app-context"
import { useCourse } from "./course-context"
import { buildCourseProgress } from "./progress"
import { useProgress } from "./progress-context"

/** Progress for the current course; only usable inside CourseLayout. */
export function useCourseProgress() {
  const { course, publishedWeeks } = useCourse()
  const { attempts } = useProgress()
  const { questionBank } = useApp()
  return useMemo(
    () =>
      buildCourseProgress(attempts, course.id, publishedWeeks, questionBank),
    [attempts, course.id, publishedWeeks, questionBank],
  )
}
