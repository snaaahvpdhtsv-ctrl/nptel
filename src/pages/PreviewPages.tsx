import { useState, type ComponentType, type ReactNode } from "react"
import { Link, Navigate, useParams, useSearchParams } from "react-router"
import {
  ArrowRight,
  BookOpen,
  CircleQuestionMark,
  FileText,
  Zap,
  type LucideProps,
} from "lucide-react"
import {
  BackLink,
  NoticeCard,
  PageHeader,
  type BackLinkProps,
} from "../components/common"
import { QuestionCard } from "../components/QuestionCard"
import {
  ReportButton,
  ReportProblemDialog,
  ReportPrompt,
} from "../components/ReportProblem"
import { useCourse, useOptionalCourse } from "../lib/course-context"
import { savedByWeek } from "../lib/data"

type Icon = ComponentType<LucideProps>

function NoticePage({
  icon,
  title,
  subtitle,
  back,
  notice,
  children,
  action,
}: {
  icon: Icon
  title: string
  subtitle?: string
  back: BackLinkProps
  notice: string
  children?: ReactNode
  action?: ReactNode
}) {
  return (
    <div className="learner-page mx-auto max-w-6xl px-4 py-8">
      <BackLink to={back.to} label={back.label} />
      <PageHeader icon={icon} title={title} subtitle={subtitle} />
      <NoticeCard title={notice} action={action}>
        {children}
      </NoticeCard>
    </div>
  )
}

export function WeekStudyPage() {
  const { weekId } = useParams()
  const { path, publishedWeeks } = useCourse()
  const [reporting, setReporting] = useState(false)
  // Only this course's published weeks: hidden or other-course weeks are not found.
  const week = publishedWeeks.find((item) => item.id === weekId)
  if (!week) return <NotFoundPage />
  const sample =
    savedByWeek.find((group) => group.weekId === week.id)?.questions ?? []
  const report = () => setReporting(true)

  return (
    <div className="learner-page mx-auto max-w-4xl px-4 py-8">
      <BackLink to={path("/study")} label="Answer Key" />
      <PageHeader
        icon={BookOpen}
        title={week.title}
        subtitle="Study mode — correct answers are shown"
        gradient="blue"
        action={<ReportButton onClick={report} />}
      />
      {sample.length > 0 ? (
        <>
          <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
            This preview includes {sample.length} of {week.questionCount}{" "}
            questions for Week {week.weekNumber}.
          </p>
          <div className="space-y-4">
            {sample.map((question, index) => (
              <QuestionCard
                key={question.id}
                question={question}
                index={index}
                showAnswer
              />
            ))}
          </div>
        </>
      ) : (
        <NoticeCard
          title="Question text for this week isn't included in this preview"
          action={
            <Link to={path("/saved")} className="btn-outline px-5 py-2.5">
              Open Saved Questions
              <ArrowRight size={16} />
            </Link>
          }
        >
          Week {week.weekNumber} lists {week.questionCount} questions. Saved
          Questions shows the sample questions that are available.
        </NoticeCard>
      )}
      <ReportPrompt onReport={report} />
      {/* Keyed by week so a half-written report never carries over to another week. */}
      <ReportProblemDialog
        key={week.id}
        week={week}
        questions={sample}
        open={reporting}
        onClose={() => setReporting(false)}
      />
    </div>
  )
}

export function PracticeWeekRedirect() {
  const { weekId } = useParams()
  const { path } = useCourse()
  return <Navigate to={path(`/practice/run?weeks=${weekId ?? ""}`)} replace />
}

export function PyqPaperPage() {
  const { paperId } = useParams()
  const { path, publishedPapers } = useCourse()
  const paper = publishedPapers.find((item) => item.id === paperId)
  if (!paper) return <NotFoundPage />

  return (
    <NoticePage
      icon={FileText}
      title={paper.title}
      subtitle={`${[paper.year, paper.session].filter(Boolean).join(" · ")} · ${paper.questionCount} questions`}
      back={{ to: path("/pyq/answers"), label: "PYQ's Answers" }}
      notice="Question text for this paper isn't included in this preview"
    />
  )
}

export function PyqPracticeRunPage() {
  const [params] = useSearchParams()
  const { path, publishedPapers } = useCourse()
  const ids = (params.get("papers") || "").split(",").filter(Boolean)
  const chosen = publishedPapers.filter((paper) => ids.includes(paper.id))

  return (
    <NoticePage
      icon={Zap}
      title="PYQ practice"
      subtitle={
        chosen.length
          ? `${chosen.length} paper${
              chosen.length === 1 ? "" : "s"
            } · ${chosen.reduce((sum, paper) => sum + paper.questionCount, 0)} questions`
          : "No papers selected"
      }
      back={{ to: path("/pyq/practice"), label: "Practice PYQ's" }}
      notice="Question text for these papers isn't included in this preview"
      action={
        <Link to={path("/pyq/practice")} className="btn-primary px-5 py-2.5">
          Back to paper selection
        </Link>
      }
    />
  )
}

export function NotFoundPage() {
  // Inside a course, point back to that course instead of the course list.
  const scope = useOptionalCourse()
  return (
    <div className="learner-page mx-auto max-w-6xl px-4 py-16">
      <NoticeCard
        title="Page not found"
        action={
          scope ? (
            <>
              <Link to={scope.path()} className="btn-primary px-5 py-2.5">
                Course home
              </Link>
              <Link to="/" className="btn-outline px-5 py-2.5">
                All courses
              </Link>
            </>
          ) : (
            <Link to="/" className="btn-primary px-5 py-2.5">
              Go home
            </Link>
          )
        }
      >
        <CircleQuestionMark
          size={36}
          className="mx-auto mb-2 text-gray-300 dark:text-gray-600"
        />
        The page you're looking for doesn't exist.
      </NoticeCard>
    </div>
  )
}
