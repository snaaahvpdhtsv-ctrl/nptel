import { Link } from "react-router"
import { motion } from "motion/react"
import {
  ArrowRight,
  BookOpen,
  Bookmark,
  ChartColumn,
  ChevronRight,
  Ellipsis,
  FileText,
  Flame,
  RotateCcwClock,
  Sparkles,
  Target,
  TrendingUp,
  Trophy,
  Zap,
  type LucideIcon,
} from "lucide-react"
import { FeatureCard, NoticeCard } from "../components/common"
import { WeekCard } from "../components/WeekCard"
import { InstallBanner } from "../components/InstallApp"
import { SyncPrompt } from "../components/SyncPrompt"
import { useCourse } from "../lib/course-context"
import { useCourseProgress } from "../lib/course-progress"
import { relativeDay } from "../lib/progress"
import { useProgress } from "../lib/progress-context"
import { useMediaQuery, WIDE_QUERY } from "../lib/use-media-query"

// `to` values are relative to the current course.
const features = [
  {
    title: "Answer Key",
    desc: "Study mode — view questions with correct answers",
    icon: BookOpen,
    to: "/study",
    gradient: "from-blue-500 to-teal-500",
  },
  {
    title: "Practice Zone",
    desc: "Interactive quizzes with instant feedback",
    icon: Zap,
    to: "/practice",
    gradient: "from-orange-500 to-purple-600",
  },
  {
    title: "Saved Questions",
    desc: "Bookmarked questions, all in one place",
    icon: Bookmark,
    to: "/saved",
    gradient: "from-pink-500 to-rose-600",
  },
  {
    title: "PYQ's",
    desc: "Study previous-year questions and practise for exams",
    icon: FileText,
    to: "/pyq",
    gradient: "from-emerald-500 to-cyan-600",
  },
]

const mobileFeatures = [
  { title: "Study", desc: "Weekly answer keys", icon: BookOpen, to: "/study" },
  {
    title: "Practice",
    desc: "Interactive quizzes",
    icon: Zap,
    to: "/practice",
  },
  { title: "PYQ's", desc: "Previous-year papers", icon: FileText, to: "/pyq" },
  {
    title: "Saved",
    desc: "Bookmarked questions",
    icon: Bookmark,
    to: "/saved",
  },
  { title: "More", desc: "Progress & settings", icon: Ellipsis, to: "/more" },
]

function ProgressLink({
  to,
  icon: Icon,
  title,
  detail,
  gradient,
}: {
  to: string
  icon: LucideIcon
  title: string
  detail: string
  gradient: string
}) {
  return (
    <Link to={to} className="card card-hover group flex items-center gap-4 p-5">
      <span
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${gradient} text-white shadow-md`}
      >
        <Icon size={20} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-bold font-display text-gray-800 dark:text-white">
          {title}
        </span>
        <span className="block truncate text-sm text-gray-500 dark:text-gray-400">
          {detail}
        </span>
      </span>
      <ArrowRight
        size={16}
        className="shrink-0 text-gray-400 transition-transform group-hover:translate-x-0.5"
      />
    </Link>
  )
}

export default function HomePage() {
  const { course, path, publishedWeeks: weeks } = useCourse()
  // Only the layout on screen is rendered; building both doubled the work of every visit.
  const wide = useMediaQuery(WIDE_QUERY)
  const { streak } = useProgress()
  const {
    attempts,
    byWeek,
    mistakes,
    rankedWeakWeeks,
    weeksDone,
    accuracy,
    lastAttemptAt,
  } = useCourseProgress()
  const totalQuestions = weeks.reduce(
    (sum, week) => sum + week.questionCount,
    0,
  )
  const weakest = rankedWeakWeeks.slice(0, 6)
  const upNext = weakest[0]

  const stats = [
    {
      icon: Flame,
      label: "Day streak",
      value: streak,
      color: "text-orange-500",
    },
    {
      icon: TrendingUp,
      label: "Questions",
      value: totalQuestions,
      color: "text-primary-500",
    },
    {
      icon: Trophy,
      label: "Weeks done",
      value: weeksDone,
      color: "text-amber-500",
    },
  ]

  return (
    <div className="learner-page max-w-6xl mx-auto px-4 py-10">
      {!wide && (
        <div className="mobile-home">
          <div className="mobile-home-heading">
            <h1>Study dashboard</h1>
            <p className="mobile-course-name">
              {course.title}
              {course.sample && (
                <span className="mobile-sample-badge">Sample</span>
              )}
            </p>
            <p className="mobile-home-stats">
              {totalQuestions} questions · {weeksDone} week
              {weeksDone === 1 ? "" : "s"} done
            </p>
          </div>
          <div className="mobile-shortcuts">
            {mobileFeatures.map(({ title, desc, icon: Icon, to }) => (
              <Link key={to} to={path(to)} className="mobile-shortcut">
                <span className="mobile-shortcut-icon" aria-hidden="true">
                  <Icon size={19} strokeWidth={1.7} />
                </span>
                <span className="mobile-shortcut-title">{title}</span>
                <span className="mobile-shortcut-desc">{desc}</span>
              </Link>
            ))}
          </div>
          <InstallBanner />
          {upNext && (
            <Link
              to={path(`/review?week=${upNext.week.id}`)}
              className="mobile-menu-row mobile-up-next"
              aria-label={`Review mistakes: Week ${upNext.week.weekNumber}`}
            >
              <span className="mobile-menu-icon" aria-hidden="true">
                <Zap size={20} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="mobile-eyebrow">Up next · fix mistakes</span>
                <span className="mobile-row-title">
                  Week {upNext.week.weekNumber}: {upNext.week.title}
                </span>
                <span className="mobile-row-meta">
                  {upNext.mistakeIds.length} mistake
                  {upNext.mistakeIds.length === 1 ? "" : "s"} to fix — tap to
                  continue
                </span>
              </span>
              <ChevronRight size={17} aria-hidden="true" />
            </Link>
          )}
          <section
            className="mobile-home-weeks"
            aria-labelledby="mobile-weeks-heading"
          >
            <h2 id="mobile-weeks-heading" className="mobile-section-title">
              Course weeks
            </h2>
            {weeks.length ? (
              <div className="week-list grid">
                {weeks.map((week, index) => (
                  <WeekCard
                    key={week.id}
                    week={week}
                    index={index}
                    to={path(`/study/${week.id}`)}
                    percent={byWeek[week.id]?.percent}
                  />
                ))}
              </div>
            ) : (
              <NoticeCard title="Content coming soon">
                Weeks for this course will appear here once they're published.
              </NoticeCard>
            )}
          </section>
        </div>
      )}
      {wide && (
        <div>
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative text-center mb-10 overflow-hidden"
          >
            <div
              className="absolute inset-0 -z-10 pointer-events-none"
              aria-hidden="true"
            >
              <div className="absolute top-[-120px] left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-primary-400/20 dark:bg-primary-500/15 rounded-full blur-3xl" />
              <div className="absolute top-10 left-[15%] w-40 h-40 bg-accent-400/15 dark:bg-accent-500/10 rounded-full blur-2xl" />
              <div className="absolute top-20 right-[15%] w-52 h-52 bg-pink-400/15 dark:bg-pink-500/10 rounded-full blur-2xl" />
            </div>
            <div className="mb-5 flex flex-wrap items-center justify-center gap-2">
              <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold bg-gradient-to-r from-primary-50 to-accent-50 dark:from-primary-900/30 dark:to-accent-900/30 text-primary-700 dark:text-primary-300 border border-primary-200/70 dark:border-primary-800/60 shadow-sm">
                <Sparkles size={13} className="animate-pulse text-accent-500" />
                Your weekly NPTEL companion
              </div>
              {course.sample && (
                <span className="px-3 py-1.5 rounded-full text-xs font-semibold bg-white/70 dark:bg-gray-800/70 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 shadow-sm">
                  Sample course
                </span>
              )}
            </div>
            <h1 className="text-4xl md:text-6xl font-display font-extrabold text-balance bg-gradient-to-r from-primary-600 via-accent-500 to-pink-500 bg-clip-text text-transparent leading-[1.1] animate-gradient-shift">
              {course.title}
            </h1>
            <p className="mt-5 text-gray-500 dark:text-gray-400 max-w-lg mx-auto">
              Practice weekly assignments, track your progress, and master your
              NPTEL courses.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link
                to={path("/practice")}
                className="btn-primary px-7 py-3 text-base"
              >
                <Zap size={18} />
                Start Practicing
              </Link>
              <Link
                to={path("/study")}
                className="btn-outline px-7 py-3 text-base"
              >
                <BookOpen size={18} />
                View Answer Key
              </Link>
            </div>
            <div className="mt-8 grid grid-cols-3 gap-3 sm:gap-6 max-w-xl mx-auto">
              {stats.map(({ icon: Icon, label, value, color }, index) => (
                <motion.div
                  key={label}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + index * 0.08 }}
                  className="card card-hover flex items-center gap-3 px-4 py-3"
                >
                  <span
                    className={`flex items-center justify-center h-10 w-10 rounded-xl bg-gradient-to-br from-white to-gray-50 dark:from-gray-700 dark:to-gray-800 border border-gray-200 dark:border-gray-600 shadow-sm ${color}`}
                  >
                    <Icon size={18} />
                  </span>
                  <div className="text-left">
                    <p className="text-xl font-bold font-display text-gray-800 dark:text-white leading-none">
                      {value}
                    </p>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
                      {label}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          <SyncPrompt />

          {upNext && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="card mb-8 flex flex-wrap items-center gap-4 p-5 border-l-4 border-l-primary-500"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary-600 to-accent-500 text-white shadow-md shrink-0">
                <Zap size={20} />
              </span>
              <div className="flex-1 min-w-48">
                <p className="text-xs font-semibold uppercase tracking-wide text-primary-600 dark:text-primary-400">
                  Up next · fix mistakes
                </p>
                <p className="font-bold font-display text-gray-800 dark:text-white">
                  Week {upNext.week.weekNumber}: {upNext.week.title}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {upNext.mistakeIds.length} mistake
                  {upNext.mistakeIds.length === 1 ? "" : "s"} to fix
                </p>
              </div>
              <Link
                to={path(`/review?week=${upNext.week.id}`)}
                aria-label={`Review mistakes: Week ${upNext.week.weekNumber}`}
                className="btn-primary px-6 py-2.5"
              >
                Review mistakes
                <ArrowRight size={16} />
              </Link>
            </motion.div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <FeatureCard
                key={feature.title}
                {...feature}
                to={path(feature.to)}
                index={index}
              />
            ))}
          </div>

          {weeks.length > 0 && (
            <section className="mt-10" aria-labelledby="home-progress-heading">
              <h2
                id="home-progress-heading"
                className="mb-4 text-xl font-bold font-display text-gray-800 dark:text-white"
              >
                Your progress
              </h2>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <ProgressLink
                  to={path("/history")}
                  icon={RotateCcwClock}
                  title="Quiz History"
                  detail={
                    lastAttemptAt
                      ? `${attempts.length} attempt${
                          attempts.length === 1 ? "" : "s"
                        } · latest ${relativeDay(new Date(lastAttemptAt))}`
                      : "No attempts yet"
                  }
                  gradient="from-blue-500 to-teal-500"
                />
                <ProgressLink
                  to={path("/review")}
                  icon={Target}
                  title="Review Mistakes"
                  detail={
                    mistakes.length
                      ? `${mistakes.length} question${
                          mistakes.length === 1 ? "" : "s"
                        } to fix`
                      : "Nothing to fix"
                  }
                  gradient="from-orange-500 to-pink-500"
                />
                <ProgressLink
                  to={path("/analytics")}
                  icon={ChartColumn}
                  title="Analytics"
                  detail={
                    accuracy === null
                      ? "Take a quiz to see stats"
                      : `${accuracy}% accuracy`
                  }
                  gradient="from-purple-500 to-indigo-600"
                />
              </div>
            </section>
          )}

          {weakest.length > 0 && (
            <div className="mt-10">
              <div className="flex items-end justify-between mb-4">
                <h2 className="text-xl font-bold font-display text-gray-800 dark:text-white">
                  Weakest Weeks
                </h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {weakest.map((entry, index) => (
                  <Link
                    key={entry.week.id}
                    to={path(`/review?week=${entry.week.id}`)}
                    className={`relative overflow-hidden rounded-2xl p-5 border transition-all hover:shadow-xl hover:-translate-y-1 ${
                      index === 0
                        ? "bg-gradient-to-br from-amber-400 to-orange-600 text-white border-transparent shadow-lg shadow-orange-500/25"
                        : "card card-hover border-gray-200 dark:border-gray-700"
                    }`}
                  >
                    {index === 0 && (
                      <div
                        className="absolute -bottom-6 -right-6 w-28 h-28 bg-white/15 rounded-full"
                        aria-hidden="true"
                      />
                    )}
                    <div className="flex items-center justify-between mb-2">
                      <span
                        className={`text-sm font-bold ${
                          index === 0
                            ? "text-white/90"
                            : "text-gray-500 dark:text-gray-400"
                        }`}
                      >
                        Week {entry.week.weekNumber}
                      </span>
                      {index === 0 && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide bg-white/20 rounded-full px-2 py-0.5">
                          <Flame size={11} />
                          Weakest Week
                        </span>
                      )}
                    </div>
                    <p
                      className={`font-semibold font-display truncate ${
                        index === 0
                          ? "text-white"
                          : "text-gray-800 dark:text-white"
                      }`}
                    >
                      {entry.week.title}
                    </p>
                    <p
                      className={`mt-2 inline-flex items-center gap-1.5 text-sm ${
                        index === 0
                          ? "text-white/90"
                          : "text-amber-600 dark:text-amber-400"
                      }`}
                    >
                      <Target size={13} />
                      {entry.mistakeIds.length} mistake
                      {entry.mistakeIds.length === 1 ? "" : "s"}
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          )}

          <div className="mt-14">
            <div className="flex items-end justify-between mb-5">
              <h2 className="text-xl font-bold font-display text-gray-800 dark:text-white">
                Course Weeks
              </h2>
              {weeks.length > 0 && (
                <Link
                  to={path("/study")}
                  className="text-sm font-semibold text-primary-600 dark:text-primary-400 hover:underline inline-flex items-center gap-1"
                >
                  View all <ArrowRight size={14} />
                </Link>
              )}
            </div>
            {weeks.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {weeks.map((week, index) => (
                  <WeekCard
                    key={week.id}
                    week={week}
                    index={index}
                    to={path(`/study/${week.id}`)}
                    percent={byWeek[week.id]?.percent}
                  />
                ))}
              </div>
            ) : (
              <NoticeCard title="Content coming soon">
                Weeks for this course will appear here once they're published.
              </NoticeCard>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
