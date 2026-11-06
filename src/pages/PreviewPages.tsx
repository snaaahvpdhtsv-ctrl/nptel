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
import { useApp } from "../lib/app-context"

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
  const { questionBank } = useApp()
  const [reporting, setReporting] = useState(false)
  // Only this course's published weeks: hidden or other-course weeks are not found.
  const week = publishedWeeks.find((item) => item.id === weekId)
  if (!week) return <NotFoundPage />
  const sample = questionBank[week.id] ?? []
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
            {sample.length} published questions for Week {week.weekNumber}.
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
          title="No learner-ready questions are currently published"
          action={
            <Link to={path("/saved")} className="btn-outline px-5 py-2.5">
              Open Saved Questions
              <ArrowRight size={16} />
            </Link>
          }
        >
          This week will appear in the answer key once valid questions are
          published.
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
  const { questionBank } = useApp()
  const paper = publishedPapers.find((item) => item.id === paperId)
  if (!paper) return <NotFoundPage />
  const questions = questionBank[paper.id] ?? []

  return (
    <div className="learner-page mx-auto max-w-4xl px-4 py-8">
      <BackLink to={path("/pyq/answers")} label="PYQ Answers" />
      <PageHeader
        icon={FileText}
        title={paper.title}
        subtitle={`${[paper.year, paper.session].filter(Boolean).join(" · ")} · ${questions.length} question${
          questions.length === 1 ? "" : "s"
        }`}
      />
      <div className="space-y-4">
        {questions.map((question, index) => (
          <QuestionCard
            key={question.id}
            question={question}
            index={index}
            showAnswer
          />
        ))}
      </div>
    </div>
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
            } · ${chosen.reduce((sum, paper) => sum + paper.questionCount, 0)} verified questions`
          : "No papers selected"
      }
      back={{ to: path("/pyq/practice"), label: "Practice PYQs" }}
      notice="Interactive PYQ practice is not available yet. Published questions and answers are available in the PYQ answer key."
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
