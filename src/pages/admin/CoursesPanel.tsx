import { useId, useState, type FormEvent } from "react"
import { Eye, EyeOff, GraduationCap, PenLine, Plus, Trash } from "lucide-react"
import { StatusBadge } from "../../components/common"
import { useApp } from "../../lib/app-context"
import { LAST_COURSE_KEY } from "../../lib/course-context"
import type { Course, Status } from "../../lib/data"
import type { Audit } from "./ContentPanels"
import {
  Field,
  formShell,
  IconButton,
  Panel,
  rowClass,
  smallPrimary,
  StatusSelect,
  type ConfirmState,
} from "./ui"

interface CourseForm {
  /** Null while adding a new course. */
  id: string | null
  title: string
  description: string
  status: Status
  sample: boolean
}

const plural = (count: number, word: string) =>
  `${count} ${word}${count === 1 ? "" : "s"}`

/** URL-safe id from a title, e.g. "Data Science 101" → "data-science-101". */
const slugify = (title: string) =>
  title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/, "") || "course"

const uniqueSlug = (title: string, taken: string[]) => {
  const base = slugify(title)
  let slug = base
  for (let n = 2; taken.includes(slug); n++) slug = `${base}-${n}`
  return slug
}

export function CoursesPanel({
  selectedId,
  onSelect,
  audit,
  onConfirm,
}: {
  selectedId: string | undefined
  onSelect: (id: string | null) => void
  audit: Audit
  onConfirm: (state: ConfirmState) => void
}) {
  const {
    courses,
    setCourses,
    weeks,
    setWeeks,
    papers,
    setPapers,
    setAdminQuestions,
    toast,
  } = useApp()
  const id = useId()
  const [form, setForm] = useState<CourseForm | null>(null)
  const courseIds = courses.map((course) => course.id)
  const visibleCount = courses.filter(
    (course) => course.status === "published",
  ).length
  const weeksOf = (courseId: string) =>
    weeks.filter((week) => week.courseId === courseId)
  const papersOf = (courseId: string) =>
    papers.filter((paper) => paper.courseId === courseId)

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!form) return
    const title = form.title.trim()
    if (!title) return toast("Please enter a course title", "error")
    if (
      courses.some(
        (course) =>
          course.id !== form.id &&
          course.title.trim().toLowerCase() === title.toLowerCase(),
      )
    )
      return toast("A course with this title already exists", "error")
    const values = {
      title,
      description: form.description.trim() || undefined,
      status: form.status,
      sample: form.sample,
    }
    if (form.id) {
      setCourses((current) =>
        current.map((course) =>
          course.id === form.id ? { ...course, ...values } : course,
        ),
      )
      audit(`Course “${title}” edited`, "Courses")
      toast("Course updated")
    } else {
      const courseId = uniqueSlug(title, courseIds)
      setCourses((current) => [...current, { id: courseId, ...values }])
      // Switch to the new course so weeks and papers can be added right away.
      onSelect(courseId)
      audit(`Course “${title}” created as ${form.status}`, "Courses")
      toast(
        form.status === "published"
          ? "Course added"
          : "Course added as a draft — learners can't see it yet",
      )
    }
    setForm(null)
  }

  const toggleVisibility = (course: Course) => {
    const status: Status = course.status === "published" ? "draft" : "published"
    setCourses((current) =>
      current.map((item) =>
        item.id === course.id ? { ...item, status } : item,
      ),
    )
    audit(`Course “${course.title}”: status → ${status}`, "Courses")
    toast(
      status === "published"
        ? "Course is now visible to students"
        : "Course hidden from students",
    )
  }

  const remove = (course: Course) => {
    const courseWeeks = weeksOf(course.id)
    const coursePapers = papersOf(course.id)
    onConfirm({
      title: `Delete “${course.title}”?`,
      body: `This permanently deletes the course, its ${plural(courseWeeks.length, "week")}, ${plural(coursePapers.length, "PYQ paper")} and their questions. Requests sent from this course are kept and shown as “No course”. This cannot be undone.`,
      confirmLabel: "Delete course",
      onConfirm: () => {
        const listIds = new Set(
          [...courseWeeks, ...coursePapers].map((item) => item.id),
        )
        setCourses((current) => current.filter((item) => item.id !== course.id))
        setWeeks((current) =>
          current.filter((week) => week.courseId !== course.id),
        )
        setPapers((current) =>
          current.filter((paper) => paper.courseId !== course.id),
        )
        setAdminQuestions((current) =>
          Object.fromEntries(
            Object.entries(current).filter(([listId]) => !listIds.has(listId)),
          ),
        )
        if (localStorage.getItem(LAST_COURSE_KEY) === course.id)
          localStorage.removeItem(LAST_COURSE_KEY)
        if (course.id === selectedId)
          onSelect(courses.find((item) => item.id !== course.id)?.id ?? null)
        if (form?.id === course.id) setForm(null)
        audit(`Course “${course.title}” deleted`, "Courses")
        toast("Course deleted")
      },
    })
  }

  return (
    <Panel>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {visibleCount} of {plural(courses.length, "course")} visible to
          students
        </p>
        <button
          onClick={() =>
            setForm({
              id: null,
              title: "",
              description: "",
              status: "draft",
              sample: false,
            })
          }
          className={smallPrimary}
        >
          <Plus size={16} />
          Add Course
        </button>
      </div>

      {form && (
        <form onSubmit={submit} className={formShell}>
          <h3 className="font-semibold text-gray-800 dark:text-white">
            {form.id ? "Edit Course" : "Add New Course"}
          </h3>
          <div className="grid gap-3 sm:grid-cols-[1fr_180px]">
            <Field id={`${id}-title`} label="Course title">
              <input
                id={`${id}-title`}
                value={form.title}
                onChange={(event) =>
                  setForm({ ...form, title: event.target.value })
                }
                className="input"
              />
            </Field>
            <Field id={`${id}-status`} label="Publication status">
              <StatusSelect
                id={`${id}-status`}
                value={form.status}
                onChange={(status) => setForm({ ...form, status })}
              />
            </Field>
          </div>
          <Field id={`${id}-description`} label="Description (optional)">
            <textarea
              id={`${id}-description`}
              rows={2}
              value={form.description}
              onChange={(event) =>
                setForm({ ...form, description: event.target.value })
              }
              className="input"
            />
          </Field>
          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
            <input
              type="checkbox"
              checked={form.sample}
              onChange={(event) =>
                setForm({ ...form, sample: event.target.checked })
              }
              className="h-4 w-4 accent-primary-600"
            />
            Sample course (placeholder without real content)
          </label>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {form.id
              ? `Learner URL: /courses/${form.id} — it stays the same when the title changes.`
              : form.title.trim()
                ? `Learner URL: /courses/${uniqueSlug(form.title, courseIds)}`
                : "The learner URL is created from the title."}
          </p>
          <div className="flex gap-2">
            <button type="submit" className={smallPrimary}>
              {form.id ? "Update" : "Add Course"}
            </button>
            <button
              type="button"
              onClick={() => setForm(null)}
              className="btn-ghost px-4 py-2 text-sm"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {courses.length === 0 ? (
        <p className="py-6 text-center text-sm text-gray-500 dark:text-gray-400">
          No courses yet. Click "Add Course" to create the first one.
        </p>
      ) : (
        <div className="space-y-2.5">
          {courses.map((course) => {
            const selected = course.id === selectedId
            return (
              <div key={course.id} className={rowClass(selected)}>
                <button
                  onClick={() => onSelect(course.id)}
                  aria-pressed={selected}
                  className="flex min-w-0 flex-1 basis-60 items-center gap-3 text-left"
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary-100 text-primary-700 dark:bg-primary-900/50 dark:text-primary-200">
                    <GraduationCap size={17} />
                  </span>
                  <span className="min-w-0">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-gray-800 dark:text-gray-100">
                        <span className="sr-only">Manage </span>
                        {course.title}
                      </span>
                      <StatusBadge status={course.status} />
                      {course.sample && (
                        <span className="rounded-full bg-gray-200 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-gray-600 dark:bg-white/10 dark:text-gray-300">
                          Sample
                        </span>
                      )}
                      {selected && (
                        <span className="text-xs font-semibold text-primary-600 dark:text-primary-300">
                          Managing
                        </span>
                      )}
                    </span>
                    <span className="block truncate text-xs text-gray-600 dark:text-gray-400">
                      {plural(weeksOf(course.id).length, "week")} ·{" "}
                      {plural(papersOf(course.id).length, "PYQ paper")} ·
                      /courses/{course.id}
                    </span>
                  </span>
                </button>
                <div className="ml-auto flex shrink-0">
                  <IconButton
                    icon={course.status === "published" ? EyeOff : Eye}
                    label={
                      course.status === "published"
                        ? `Hide ${course.title} from students`
                        : `Make ${course.title} visible to students`
                    }
                    onClick={() => toggleVisibility(course)}
                  />
                  <IconButton
                    icon={PenLine}
                    label={`Edit ${course.title}`}
                    onClick={() =>
                      setForm({
                        id: course.id,
                        title: course.title,
                        description: course.description ?? "",
                        status: course.status,
                        sample: course.sample,
                      })
                    }
                  />
                  <IconButton
                    icon={Trash}
                    label={`Delete ${course.title}`}
                    tone="hover:text-red-500"
                    onClick={() => remove(course)}
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </Panel>
  )
}
