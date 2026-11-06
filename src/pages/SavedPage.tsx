import { useMemo, useState } from "react"
import { Link } from "react-router"
import { motion } from "motion/react"
import {
  BookOpen,
  BookX,
  Bookmark,
  ChevronDown,
  ChevronRight,
  Search,
} from "lucide-react"
import { QuestionCard } from "../components/QuestionCard"
import { useApp } from "../lib/app-context"
import { useCourse } from "../lib/course-context"
import { useProgress } from "../lib/progress-context"

export default function SavedPage() {
  const { savedIds, toggleSaved } = useProgress()
  // Every week of this course (hidden ones included), so bookmarks only show for this course.
  const { path, weeks } = useCourse()
  const { questionBank } = useApp()
  const groups = useMemo(
    () =>
      weeks
        .map((week) => ({
          week,
          questions: questionBank[week.id] ?? [],
        }))
        .filter((group) => group.questions.length > 0),
    [questionBank, weeks],
  )
  const saved = useMemo(
    () =>
      groups
        .flatMap((group) => group.questions.map((question) => question.id))
        .filter((id) => savedIds.includes(id)),
    [groups, savedIds],
  )
  const unavailableSavedCount = useMemo(() => {
    const publishedIds = new Set(
      Object.values(questionBank).flatMap((questions) =>
        questions.map((question) => question.id),
      ),
    )
    return savedIds.filter((id) => !publishedIds.has(id)).length
  }, [questionBank, savedIds])
  const [query, setQuery] = useState("")
  const [difficulty, setDifficulty] = useState("")
  const [weekFilter, setWeekFilter] = useState("")
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  const normalizeDifficulty = (value?: string) => {
    const normalized = value?.trim().toLowerCase() ?? ""
    return normalized.charAt(0).toUpperCase() + normalized.slice(1)
  }
  const difficulties = [
    ...new Set(
      groups.flatMap((group) =>
        group.questions.map((question) =>
          normalizeDifficulty(question.difficulty),
        ),
      ),
    ),
  ].filter(Boolean)
  const term = query.trim().toLowerCase()
  const matches = (text: string[]) =>
    !term || text.join("\n").toLowerCase().includes(term)
  const filtered = groups.map((group) => ({
    ...group,
    questions: group.questions.filter(
      (question) =>
        saved.includes(question.id) &&
        (!difficulty ||
          normalizeDifficulty(question.difficulty) === difficulty) &&
        matches([question.questionText, ...question.options]),
    ),
  }))
  const visible = filtered.filter(
    (group) =>
      (!weekFilter || group.week.id === weekFilter) &&
      group.questions.length > 0,
  )
  const resultCount = filtered.reduce(
    (sum, group) => sum + group.questions.length,
    0,
  )
  const hasActive = Boolean(term || difficulty || weekFilter)
  const clear = () => {
    setQuery("")
    setDifficulty("")
    setWeekFilter("")
  }

  if (saved.length === 0) {
    return (
      <div className="learner-page saved-empty max-w-4xl mx-auto px-4 py-20 text-center">
        <BookX
          size={48}
          className="mx-auto text-gray-300 dark:text-gray-600 mb-4"
        />
        <h2 className="text-xl font-bold text-gray-500 dark:text-gray-400">
          {unavailableSavedCount > 0
            ? "Some saved questions aren't currently published"
            : "No saved questions"}
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
          {unavailableSavedCount > 0
            ? `${unavailableSavedCount} bookmark${
                unavailableSavedCount === 1 ? "" : "s"
              } remain saved, but their question content is archived or no longer published.`
            : "Bookmark questions while studying or practicing to save them here."}
        </p>
        <Link
          to={path("/study")}
          className="btn-outline mt-5 inline-flex min-h-[44px] items-center"
        >
          <BookOpen size={16} />
          Browse answer key
        </Link>
      </div>
    )
  }

  return (
    <div className="learner-page saved-page max-w-4xl mx-auto px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="saved-header mb-8"
      >
        <div className="flex items-center gap-3 mb-2">
          <span className="saved-header-icon relative flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-pink-500 to-rose-600 text-white shadow-lg shadow-pink-600/20 shrink-0">
            <Bookmark size={22} />
          </span>
          <div>
            <h1 className="text-2xl font-bold font-display text-gray-800 dark:text-white tracking-tight">
              Saved Questions
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              {saved.length} question{saved.length === 1 ? "" : "s"} bookmarked
            </p>
          </div>
        </div>
      </motion.div>

      {unavailableSavedCount > 0 && (
        <p
          role="status"
          className="mb-4 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-200"
        >
          {unavailableSavedCount} bookmark
          {unavailableSavedCount === 1 ? " is" : "s are"} retained, but its
          question content is archived or no longer published.
        </p>
      )}

      <div className="saved-filters mb-6 space-y-3">
        <div className="relative">
          <Search
            size={18}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
          />
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search questions..."
            aria-label="Search questions..."
            className="input pl-10!"
          />
        </div>
        <div className="saved-filter-controls flex flex-wrap items-center gap-2">
          <label className="saved-filter inline-flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-300">
            Difficulty
            <select
              aria-label="Difficulty"
              value={difficulty}
              onChange={(event) => setDifficulty(event.target.value)}
              className="input w-full md:w-auto py-2 text-sm"
            >
              <option value="">All</option>
              {difficulties.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label className="saved-filter inline-flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-300">
            Week
            <select
              aria-label="Week"
              value={weekFilter}
              onChange={(event) => setWeekFilter(event.target.value)}
              className="input w-full md:w-auto py-2 text-sm"
            >
              <option value="">All</option>
              {groups.map((group) => (
                <option key={group.week.id} value={group.week.id}>
                  {group.week.title}
                </option>
              ))}
            </select>
          </label>
          <span
            className="ml-auto text-sm text-gray-500 dark:text-gray-400"
            role="status"
          >
            {resultCount} of {saved.length}
          </span>
          {hasActive && (
            <button
              onClick={clear}
              className="btn-ghost inline-flex items-center gap-1 px-3 py-2 text-sm"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {hasActive && visible.length === 0 && (
        <div className="text-center py-12">
          <BookOpen
            size={40}
            className="mx-auto text-gray-300 dark:text-gray-600 mb-3"
          />
          <p className="text-gray-500 dark:text-gray-400">
            No saved questions match your filters
          </p>
          <button
            onClick={clear}
            className="btn-outline mt-4 inline-flex min-h-[44px] items-center"
          >
            Clear filters
          </button>
        </div>
      )}

      {visible.map(({ week, questions }) => {
        const open = expanded[week.id] ?? true
        return (
          <div key={week.id} className="mb-8">
            <button
              onClick={() =>
                setExpanded((current) => ({ ...current, [week.id]: !open }))
              }
              aria-expanded={open}
              className="saved-group-toggle flex items-center gap-2 w-full text-left mb-3 group"
            >
              {open ? (
                <ChevronDown size={18} className="text-gray-500" />
              ) : (
                <ChevronRight size={18} className="text-gray-500" />
              )}
              <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-200 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                {week.title}
              </h2>
              <span className="text-xs text-gray-600 bg-gray-100 dark:bg-gray-700 dark:text-gray-300 px-2 py-0.5 rounded-full">
                {questions.length}
              </span>
            </button>
            {open && (
              <div className="space-y-4">
                {questions.map((question, index) => (
                  <QuestionCard
                    key={question.id}
                    question={question}
                    index={index}
                    showAnswer
                    isBookmarked={saved.includes(question.id)}
                    onToggleBookmark={toggleSaved}
                  />
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
