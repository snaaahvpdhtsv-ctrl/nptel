import { Link } from "react-router"
import { motion } from "motion/react"
import { BookOpen, ChevronRight } from "lucide-react"
import { weekGradients, type Week } from "../lib/data"

export function ProgressRing({ percent = 0, size = 56, strokeWidth = 4 }) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (percent / 100) * circumference
  const color =
    percent >= 80 ? "#10b981" : percent >= 50 ? "#f59e0b" : "#ef4444"

  return (
    <svg
      width={size}
      height={size}
      className="transform -rotate-90"
      role="img"
      aria-label={`${Math.round(percent)}% complete`}
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke="currentColor"
        strokeWidth={strokeWidth}
        fill="none"
        className="text-gray-200 dark:text-gray-700"
      />
      <motion.circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke={color}
        strokeWidth={strokeWidth}
        fill="none"
        strokeLinecap="round"
        strokeDasharray={circumference}
        initial={{ strokeDashoffset: circumference }}
        animate={{ strokeDashoffset: offset }}
        transition={{ duration: 1, ease: "easeOut" }}
      />
      <text
        x={size / 2}
        y={size / 2}
        textAnchor="middle"
        dominantBaseline="central"
        className="fill-current text-xs font-bold dark:text-white"
        transform={`rotate(90, ${size / 2}, ${size / 2})`}
      >
        {Math.round(percent)}%
      </text>
    </svg>
  )
}

export function WeekCard({
  week,
  index,
  to,
  percent = 0,
  /** Share of the week's questions currently answered correctly. */
}: {
  week: Week
  index: number
  to: string
  percent?: number
}) {
  return (
    <motion.div
      className="week-card"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      whileHover={{ scale: 1.03, y: -4 }}
      whileTap={{ scale: 0.98 }}
    >
      <Link
        to={to}
        className={`week-card-link relative block rounded-2xl p-5 bg-gradient-to-br ${weekGradients[index % weekGradients.length]} text-white shadow-lg hover:shadow-2xl hover:shadow-primary-900/20 hover:brightness-110 transition-all overflow-hidden focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white`}
      >
        <div
          className="week-card-decoration absolute inset-0 bg-[radial-gradient(120%_70%_at_20%_0%,rgb(255_255_255/0.25),transparent_50%)] pointer-events-none"
          aria-hidden="true"
        />
        <div className="week-card-desktop relative flex items-center justify-between">
          <div className="relative z-10">
            <p className="text-xs uppercase tracking-wider opacity-80 font-semibold">
              Week {week.weekNumber}
            </p>
            <h3 className="text-lg font-bold font-display mt-1.5 leading-snug">
              {week.title}
            </h3>
            <p className="text-sm opacity-75 mt-2 flex items-center gap-1.5">
              <BookOpen size={14} />
              {week.questionCount} questions
            </p>
          </div>
          <div className="relative z-10 flex flex-col items-center gap-2">
            <ProgressRing percent={percent} size={56} strokeWidth={4} />
          </div>
          <div
            className="absolute top-1/2 -right-10 w-24 h-24 bg-white/10 rounded-full blur-md pointer-events-none"
            aria-hidden="true"
          />
          <div
            className="absolute -bottom-10 -left-10 w-28 h-28 bg-white/10 rounded-full blur-md pointer-events-none"
            aria-hidden="true"
          />
        </div>
        <span className="mobile-week-content">
          <span className="min-w-0 flex-1">
            <span className="mobile-row-title">{week.title}</span>
            <span className="mobile-row-meta">
              Week {week.weekNumber} · {week.questionCount} questions
            </span>
          </span>
          <ChevronRight size={18} aria-hidden="true" />
        </span>
        <ChevronRight
          size={20}
          className="week-card-decoration absolute bottom-4 right-4 opacity-60"
        />
      </Link>
    </motion.div>
  )
}
