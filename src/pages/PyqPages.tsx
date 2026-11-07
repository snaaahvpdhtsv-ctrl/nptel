import { useState } from "react"
import { Link } from "react-router"
import { BookOpen, FileText, LayoutGrid, Zap } from "lucide-react"
import {
  BackLink,
  EmptyState,
  FeatureCard,
  PageHeader,
  SearchInput,
} from "../components/common"
import { useCourse } from "../lib/course-context"
import type { Paper } from "../lib/data"

const meta = (paper: Pick<Paper, "year" | "session">) =>
  [paper.year, paper.session].filter(Boolean).join(" · ")

function NoPapers() {
  return (
    <EmptyState icon={FileText} title="Content coming soon">
      <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
        No previous-year papers have been published for this course yet.
      </p>
    </EmptyState>
  )
}

export function PyqLandingPage() {
  const { path } = useCourse()
  const tracks = [
    {
      title: "PYQ Answers",
      desc: "Study verified questions, options, correct answers, and explanations.",
      icon: BookOpen,
      to: path("/pyq/answers"),
      gradient: "from-blue-500 to-teal-500",
    },
    {
      title: "Practice PYQs",
      desc: "PYQ quiz mode is not available yet. Review verified questions in the answer key.",
      icon: Zap,
      to: path("/pyq/practice"),
      gradient: "from-orange-500 to-purple-600",
    },
  ]

  return (
    <div className="learner-page pyq-page max-w-6xl mx-auto px-4 py-8">
      <BackLink to={path()} label="Home" />
      <PageHeader
        icon={FileText}
        title="Previous Year Questions"
        subtitle="Browse previous-year paper listings"
        gradient="purple"
      />
      <div className="pyq-tracks grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-3xl">
        {tracks.map((track, index) => (
          <FeatureCard key={track.title} {...track} index={index} />
        ))}
      </div>
    </div>
  )
}

export function PyqAnswersPage() {
  const { path, publishedPapers: allPapers } = useCourse()
  const [query, setQuery] = useState("")
  const term = query.trim().toLowerCase()
  const papers = term
    ? allPapers.filter((paper) =>
        `${paper.title} ${paper.year} ${paper.session}`
          .toLowerCase()
          .includes(term),
      )
    : allPapers

  return (
    <div className="learner-page pyq-page max-w-6xl mx-auto px-4 py-8">
      <BackLink to={path("/pyq")} label="PYQs" />
      <PageHeader
        icon={BookOpen}
        title="PYQ Answers"
        subtitle="Study mode — correct answers are shown"
        gradient="blue"
      />
      {allPapers.length === 0 ? (
        <NoPapers />
      ) : (
        <>
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder="Search papers..."
          />
          {papers.length === 0 ? (
            <EmptyState icon={FileText} title="No papers match your search">
              <button
                onClick={() => setQuery("")}
                className="btn-outline mt-4 inline-flex min-h-[44px] items-center"
              >
                Clear search
              </button>
            </EmptyState>
          ) : (
            <div className="paper-list grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {papers.map((paper) => (
                <Link
                  key={paper.id}
                  to={path(`/pyq/answers/${paper.id}`)}
                  className="paper-card card card-hover p-5 block"
                >
                  <div className="flex items-center gap-3">
                    <span className="paper-card-icon flex items-center justify-center w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 to-teal-500 text-white shrink-0">
                      <FileText size={20} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-bold font-display line-clamp-2 leading-snug text-gray-800 dark:text-white">
                        {paper.title}
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {meta(paper)}
                      </p>
                    </div>
                    <span className="paper-card-index shrink-0 rounded-full bg-blue-100 px-2.5 py-1 text-xs font-bold text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                      #{allPapers.indexOf(paper) + 1}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-3 inline-flex items-center gap-1.5">
                    <LayoutGrid size={13} />
                    {paper.questionCount} verified question
                    {paper.questionCount === 1 ? "" : "s"}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

export function PyqPracticePage() {
  const { path, publishedPapers } = useCourse()
  return (
    <div className="learner-page pyq-page max-w-6xl mx-auto px-4 py-8">
      <BackLink to={path("/pyq")} label="PYQs" />
      <PageHeader
        icon={Zap}
        title="Practice PYQs"
        subtitle="Practice quiz mode for PYQ papers is not available yet."
        gradient="orange"
      />
      {publishedPapers.length === 0 ? (
        <NoPapers />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {publishedPapers.map((paper) => (
            <Link
              key={paper.id}
              to={path(`/pyq/practice/run?papers=${paper.id}&shuffle=0`)}
              className="card card-hover p-5"
            >
              <h2 className="font-display font-bold text-gray-800 dark:text-white">
                {paper.title}
              </h2>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                {paper.questionCount} verified questions
              </p>
              <span className="btn-primary mt-4 inline-flex px-4 py-2 text-sm">
                Start practice
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
