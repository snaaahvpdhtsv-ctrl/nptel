import { useRef, useState } from "react"
import { BookOpen, Search, X } from "lucide-react"
import {
  BackLink,
  EmptyState,
  PageHeader,
  SearchInput,
} from "../components/common"
import { WeekCard } from "../components/WeekCard"
import { useCourse } from "../lib/course-context"
import { useCourseProgress } from "../lib/course-progress"

export default function StudyPage() {
  const { path, publishedWeeks: weeks } = useCourse()
  const { byWeek } = useCourseProgress()
  const [query, setQuery] = useState("")
  const [searchOpen, setSearchOpen] = useState(false)
  const searchToggle = useRef<HTMLButtonElement>(null)
  const closeSearch = () => {
    setQuery("")
    setSearchOpen(false)
    searchToggle.current?.focus()
  }
  const term = query.trim().toLowerCase()
  const visible = term
    ? weeks.filter((week) =>
        `${week.title} week ${week.weekNumber}`.toLowerCase().includes(term),
      )
    : weeks

  return (
    <div className="learner-page study-page max-w-6xl mx-auto px-4 py-8">
      <BackLink to={path()} label="Home" mobileHidden />
      <PageHeader
        icon={BookOpen}
        title="Weekly Answer Key"
        mobileTitle="Answer Key"
        subtitle="Study mode — correct answers are shown"
        gradient="blue"
        action={
          weeks.length > 0 && (
            <button
              ref={searchToggle}
              type="button"
              className="mobile-icon-button lg:hidden"
              aria-label={searchOpen ? "Close search" : "Search weeks"}
              aria-expanded={searchOpen}
              onClick={() => (searchOpen ? closeSearch() : setSearchOpen(true))}
            >
              {searchOpen ? <X size={19} /> : <Search size={19} />}
            </button>
          )
        }
      />
      {weeks.length === 0 ? (
        <EmptyState icon={BookOpen} title="Content coming soon">
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            No weeks have been published for this course yet.
          </p>
        </EmptyState>
      ) : (
        <>
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder="Search weeks..."
            mobileOpen={searchOpen}
            onMobileClose={closeSearch}
          />
          {visible.length === 0 ? (
            <EmptyState icon={BookOpen} title="No weeks match your search">
              <button
                onClick={() => setQuery("")}
                className="btn-outline mt-4 inline-flex min-h-[44px] items-center"
              >
                Clear search
              </button>
            </EmptyState>
          ) : (
            <div className="week-list grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {visible.map((week, index) => (
                <WeekCard
                  key={week.id}
                  week={week}
                  index={index}
                  to={path(`/study/${week.id}`)}
                  percent={byWeek[week.id]?.percent}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
