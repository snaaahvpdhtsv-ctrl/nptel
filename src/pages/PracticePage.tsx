import { useState } from "react"
import { Link, useNavigate } from "react-router"
import { RotateCcwClock, Target, Zap } from "lucide-react"
import { BackLink, EmptyState, PageHeader } from "../components/common"
import {
  QuizSettings,
  SelectableCard,
  StartBar,
} from "../components/SelectSetup"
import { useCourse } from "../lib/course-context"
import { useApp } from "../lib/app-context"
import { useCourseProgress } from "../lib/course-progress"
import { weekGradients } from "../lib/data"

export default function PracticePage() {
  const navigate = useNavigate()
  const { path, publishedWeeks } = useCourse()
  const { questionBank } = useApp()
  const { mistakes } = useCourseProgress()
  const available = publishedWeeks.filter(
    (week) => (questionBank[week.id]?.length ?? 0) > 0,
  )
  const [selected, setSelected] = useState<string[]>([])
  const [shuffleQuestions, setShuffleQuestions] = useState(true)
  const [shuffleOptions, setShuffleOptions] = useState(false)
  const toggle = (id: string) =>
    setSelected((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    )
  const total = available
    .filter((week) => selected.includes(week.id))
    .reduce((sum, week) => sum + (questionBank[week.id]?.length ?? 0), 0)

  return (
    <div className="learner-page practice-page max-w-6xl mx-auto px-4 py-8">
      <BackLink to={path()} label="Home" mobileHidden />
      <PageHeader
        icon={Zap}
        title="Practice Zone"
        mobileTitle="Practice"
        subtitle="Select weeks to practice, then customize your quiz."
        mobileSubtitle="Pick weeks, then start your quiz"
        gradient="orange"
      />
      {available.length === 0 ? (
        <EmptyState icon={Zap} title="Content coming soon">
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Weeks with questions will appear here once they're published.
          </p>
        </EmptyState>
      ) : (
        <>
          <div className="selection-toolbar flex items-center justify-between mb-4">
            <h2 className="selection-heading text-lg font-bold font-display text-gray-800 dark:text-white">
              Select weeks to practice
            </h2>
            <div className="flex items-center gap-2">
              <Link
                to={path("/history")}
                className="practice-desktop-extra btn-ghost !py-1.5 !px-3 !text-xs inline-flex items-center gap-1"
              >
                <RotateCcwClock size={13} />
                History
              </Link>
              {mistakes.length > 0 && (
                <Link
                  to={path("/review")}
                  className="practice-desktop-extra btn-ghost !py-1.5 !px-3 !text-xs inline-flex items-center gap-1"
                >
                  <Target size={13} />
                  Mistakes ({mistakes.length})
                </Link>
              )}
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
                    current.length === available.length
                      ? []
                      : available.map((week) => week.id),
                  )
                }
                className="btn-outline !py-1.5 !px-3 !text-xs"
              >
                {selected.length === available.length
                  ? "Deselect all"
                  : "Select all"}
              </button>
            </div>
          </div>
          <div className="selection-list grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {available.map((week, index) => (
              <SelectableCard
                key={week.id}
                gradient={weekGradients[index % weekGradients.length]}
                index={index}
                selected={selected.includes(week.id)}
                onToggle={() => toggle(week.id)}
                eyebrow={
                  <p className="text-sm opacity-80 font-medium">
                    Week {week.weekNumber}
                  </p>
                }
                title={week.title}
                meta={`Week ${week.weekNumber}`}
                questionCount={questionBank[week.id]?.length ?? 0}
                questionCountLabel="published questions"
              />
            ))}
          </div>
        </>
      )}
      <QuizSettings
        tip="Tip: pick one week for a focused quiz, or several for a combined test."
        shuffleQuestions={shuffleQuestions}
        setShuffleQuestions={setShuffleQuestions}
        shuffleOptions={shuffleOptions}
        setShuffleOptions={setShuffleOptions}
      />
      <StartBar
        summary={
          selected.length === 0 ? (
            "No weeks selected"
          ) : (
            <>
              {selected.length} week{selected.length === 1 ? "" : "s"} selected
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
          navigate(
            path(
              `/practice/run?weeks=${selected.join(",")}&shuffle=${
                shuffleQuestions ? 1 : 0
              }&shuffleOptions=${shuffleOptions ? 1 : 0}`,
            ),
          )
        }
      />
      <div className="mobile-practice-links lg:hidden">
        <Link to={path("/history")}>
          <RotateCcwClock size={16} aria-hidden="true" />
          Past attempts
        </Link>
        {mistakes.length > 0 && (
          <Link to={path("/review")}>
            <Target size={16} aria-hidden="true" />
            Review mistakes ({mistakes.length})
          </Link>
        )}
      </div>
    </div>
  )
}
