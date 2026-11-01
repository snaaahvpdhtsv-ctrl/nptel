import { useState } from "react"
import { Link, useNavigate } from "react-router"
import { BookOpen, FileText, LayoutGrid, Zap } from "lucide-react"
import {
  BackLink,
  EmptyState,
  FeatureCard,
  PageHeader,
  SearchInput,
} from "../components/common"
import {
  QuizSettings,
  SelectableCard,
  StartBar,
} from "../components/SelectSetup"
import { useCourse } from "../lib/course-context"
import { paperGradients, type Paper } from "../lib/data"

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
      desc: "Study previous-year questions with correct answers and available explanations.",
      icon: BookOpen,
      to: path("/pyq/answers"),
      gradient: "from-blue-500 to-teal-500",
    },
    {
      title: "Practice PYQs",
      desc: "Practise previous-year questions through interactive quizzes.",
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
        subtitle="Study past papers and practise for exams"
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
                    {paper.questionCount} questions
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
  const navigate = useNavigate()
  const { path, publishedPapers: allPapers } = useCourse()
  const [selected, setSelected] = useState<string[]>([])
  const [shuffleQuestions, setShuffleQuestions] = useState(true)
  const [shuffleOptions, setShuffleOptions] = useState(false)
  const toggle = (id: string) =>
    setSelected((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    )
  const total = allPapers
    .filter((paper) => selected.includes(paper.id))
    .reduce((sum, paper) => sum + paper.questionCount, 0)

  return (
    <div className="learner-page pyq-page max-w-6xl mx-auto px-4 py-8">
      <BackLink to={path("/pyq")} label="PYQs" />
      <PageHeader
        icon={Zap}
        title="Practice PYQs"
        subtitle="Select papers to practise, then customize your quiz."
        gradient="orange"
      />
      {allPapers.length === 0 ? (
        <NoPapers />
      ) : (
        <>
          <div className="selection-toolbar flex items-center justify-between mb-4">
            <h2 className="selection-heading text-lg font-bold font-display text-gray-800 dark:text-white">
              Select papers to practise
            </h2>
            <div className="flex items-center gap-2">
              {selected.length > 0 && (
                <button
                  onClick={() => setSelected([])}
                  className="btn-ghost !py-1.5 !px-3 !text-xs"
                >
                  Clear ({selected.length})
                </button>
              )}
              <button
                onClick={() =>
                  setSelected((current) =>
                    current.length === allPapers.length
                      ? []
                      : allPapers.map((paper) => paper.id),
                  )
                }
                className="btn-outline !py-1.5 !px-3 !text-xs"
              >
                {selected.length === allPapers.length
                  ? "Deselect all"
                  : "Select all"}
              </button>
            </div>
          </div>
          <div className="selection-list grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {allPapers.map((paper, index) => (
              <SelectableCard
                key={paper.id}
                gradient={paperGradients[index % paperGradients.length]}
                index={index}
                selected={selected.includes(paper.id)}
                onToggle={() => toggle(paper.id)}
                eyebrow={
                  <p className="text-sm opacity-80 font-medium flex items-center gap-1.5">
                    <FileText size={13} />
                    {meta(paper) || "PYQ Paper"}
                  </p>
                }
                title={paper.title}
                meta={meta(paper) || "PYQ Paper"}
                questionCount={paper.questionCount}
              />
            ))}
          </div>
        </>
      )}
      <QuizSettings
        tip="Tip: pick one paper for a focused quiz, or several for a combined test."
        shuffleQuestions={shuffleQuestions}
        setShuffleQuestions={setShuffleQuestions}
        shuffleOptions={shuffleOptions}
        setShuffleOptions={setShuffleOptions}
      />
      <StartBar
        summary={
          selected.length === 0 ? (
            "No papers selected"
          ) : (
            <>
              {selected.length} paper{selected.length === 1 ? "" : "s"} selected
              <span className="text-gray-500 dark:text-gray-400 font-normal">
                {" "}
                · {total} questions
              </span>
            </>
          )
        }
        shuffleQuestions={shuffleQuestions}
        shuffleOptions={shuffleOptions}
        disabled={selected.length === 0}
        onStart={() =>
          navigate(path(`/pyq/practice/run?papers=${selected.join(",")}`))
        }
      />
    </div>
  )
}
