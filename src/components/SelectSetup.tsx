import type { ComponentType, ReactNode } from "react"
import { motion } from "motion/react"
import {
  Check,
  LayoutGrid,
  ListOrdered,
  Shuffle,
  Zap,
  type LucideProps,
} from "lucide-react"

export function SelectableCard({
  gradient,
  index,
  selected,
  onToggle,
  eyebrow,
  title,
  questionCount,
  questionCountLabel = "questions",
  meta,
}: {
  gradient: string
  index: number
  selected: boolean
  onToggle: () => void
  eyebrow: ReactNode
  title: string
  questionCount: number
  questionCountLabel?: string
  meta?: string
}) {
  return (
    <motion.button
      type="button"
      onClick={onToggle}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.97 }}
      aria-pressed={selected}
      data-selected={selected}
      className={`selectable-card relative text-left rounded-2xl p-5 bg-gradient-to-br ${gradient} text-white shadow-lg hover:shadow-xl hover:brightness-110 transition-all overflow-hidden focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500 ${
        selected
          ? "ring-2 ring-primary-400/90 ring-offset-2 dark:ring-offset-gray-900"
          : ""
      }`}
    >
      <span
        className={`selectable-check absolute top-3 right-3 flex items-center justify-center w-6 h-6 rounded-full border-2 transition-all duration-200 ${
          selected
            ? "bg-white border-white scale-100"
            : "bg-white/20 border-white/70 scale-90"
        }`}
        aria-hidden="true"
      >
        {selected && (
          <Check size={14} className="text-gray-900" strokeWidth={3} />
        )}
      </span>
      <div
        className="selectable-decoration absolute inset-0 bg-[radial-gradient(120%_70%_at_20%_0%,rgb(255_255_255/0.25),transparent_50%)] pointer-events-none"
        aria-hidden="true"
      />
      <div
        className="selectable-decoration absolute -bottom-8 -right-8 w-28 h-28 bg-white/10 rounded-full pointer-events-none"
        aria-hidden="true"
      />
      <div className="selectable-desktop relative z-10">
        {eyebrow}
        <h3 className="text-lg font-bold font-display mt-1 pr-8">{title}</h3>
        <p className="text-sm opacity-75 mt-2">
          <span className="inline-flex items-center gap-1.5">
            <LayoutGrid size={13} />
            {questionCount} {questionCountLabel}
          </span>
        </p>
        <span
          className={`inline-block mt-3 text-xs font-semibold px-2.5 py-1 rounded-full transition-colors ${
            selected ? "bg-white/95 text-gray-900" : "bg-black/20 text-white/90"
          }`}
        >
          {selected ? "Selected" : "Tap to select"}
        </span>
      </div>
      <span className="selectable-mobile">
        <span className="mobile-row-title">{title}</span>
        <span className="mobile-row-meta">
          {meta ? `${meta} · ` : ""}
          {questionCount} {questionCountLabel}
        </span>
      </span>
    </motion.button>
  )
}

function ToggleCard({
  checked,
  onChange,
  label,
  desc,
  icon: IconComponent,
}: {
  checked: boolean
  onChange: () => void
  label: string
  desc: string
  icon: ComponentType<LucideProps>
}) {
  return (
    <label className="quiz-option flex items-center justify-between gap-4 w-full p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white/90 dark:bg-gray-800/90 hover:bg-gray-50 dark:hover:bg-gray-700/50 hover:border-primary-300 dark:hover:border-primary-700 transition-all cursor-pointer group shadow-sm">
      <div className="flex items-start gap-3">
        <span
          className={`quiz-option-icon flex items-center justify-center w-9 h-9 rounded-xl shrink-0 transition-colors ${
            checked
              ? "bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400"
              : "bg-gray-100 dark:bg-gray-700 text-gray-400"
          }`}
        >
          <IconComponent size={16} />
        </span>
        <div>
          <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">
            {label}
          </p>
          <p className="quiz-option-description text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {desc}
          </p>
        </div>
      </div>
      <span
        className={`quiz-option-switch relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
          checked
            ? "bg-gradient-to-r from-primary-600 to-primary-500 shadow-md shadow-primary-600/30"
            : "bg-gray-300 dark:bg-gray-600"
        }`}
        aria-hidden="true"
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-5" : "translate-x-0.5"
          }`}
        />
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="quiz-option-input sr-only"
      />
    </label>
  )
}

export function QuizSettings({
  tip,
  shuffleQuestions,
  setShuffleQuestions,
  shuffleOptions,
  setShuffleOptions,
}: {
  tip: string
  shuffleQuestions: boolean
  setShuffleQuestions: (value: boolean) => void
  shuffleOptions: boolean
  setShuffleOptions: (value: boolean) => void
}) {
  return (
    <>
      <p className="quiz-settings-tip text-xs text-gray-600 dark:text-gray-400 mt-3 flex items-center gap-1.5">
        <Zap size={12} className="text-accent-500" />
        {tip}
      </p>
      <h2 className="quiz-settings-title text-lg font-bold font-display text-gray-800 dark:text-white mt-10 mb-4">
        <span className="hidden lg:inline">Quiz settings</span>
        <span className="lg:hidden">Quiz options</span>
      </h2>
      <div className="quiz-toggle-grid grid grid-cols-1 lg:grid-cols-2 gap-4 max-w-3xl">
        <ToggleCard
          checked={shuffleQuestions}
          onChange={() => setShuffleQuestions(!shuffleQuestions)}
          label="Jumble question order"
          desc="Questions appear in random order"
          icon={Shuffle}
        />
        <ToggleCard
          checked={shuffleOptions}
          onChange={() => setShuffleOptions(!shuffleOptions)}
          label="Jumble option order"
          desc="Answer options are shuffled per question"
          icon={ListOrdered}
        />
      </div>
    </>
  )
}

export function StartBar({
  summary,
  shuffleQuestions,
  shuffleOptions,
  disabled,
  onStart,
}: {
  summary: ReactNode
  shuffleQuestions: boolean
  shuffleOptions: boolean
  disabled: boolean
  onStart: () => void
}) {
  return (
    <div className="practice-start sticky bottom-4 z-40 mt-10">
      <div className="practice-start-inner card p-4 flex items-center justify-between gap-4 shadow-xl border-t-4 border-t-primary-500 bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl">
        <div>
          <p className="practice-summary text-sm font-semibold text-gray-800 dark:text-gray-100">
            {summary}
          </p>
          <p className="practice-start-details text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Jumble questions: {shuffleQuestions ? "On" : "Off"} · Jumble
            options: {shuffleOptions ? "On" : "Off"}
          </p>
        </div>
        <button
          onClick={onStart}
          disabled={disabled}
          className="practice-start-action btn-primary px-6 py-3 text-base disabled:shadow-none disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Zap size={18} />
          Start Practice
        </button>
      </div>
    </div>
  )
}
