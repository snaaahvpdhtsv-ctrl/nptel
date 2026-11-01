import { useState } from "react"
import { AnimatePresence, motion } from "motion/react"
import {
  Bookmark,
  BookmarkCheck,
  ChevronDown,
  ChevronUp,
  CircleCheck,
  CircleX,
  Lightbulb,
} from "lucide-react"
import type { Question } from "../lib/data"
import { difficultyClass } from "./common"

export function QuestionCard({
  question,
  index,
  showAnswer = true,
  isBookmarked,
  onToggleBookmark,
  chosenIndex,
  /** Original index of the learner's answer, highlighted when it was wrong. */
}: {
  question: Question
  index: number
  showAnswer?: boolean
  isBookmarked?: boolean
  onToggleBookmark?: (id: string) => void
  chosenIndex?: number
}) {
  const [open, setOpen] = useState(false)

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="question-card card p-5 card-hover"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="question-number inline-flex items-center justify-center w-7 h-7 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 text-white text-sm font-bold shadow-sm">
              {index + 1}
            </span>
            {question.difficulty && (
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-semibold ${difficultyClass(question.difficulty)}`}
              >
                {question.difficulty}
              </span>
            )}
          </div>
          <p className="text-gray-800 dark:text-gray-100 text-base leading-relaxed">
            {question.questionText}
          </p>
        </div>
        {onToggleBookmark && (
          <button
            onClick={() => onToggleBookmark(question.id)}
            aria-label={isBookmarked ? "Remove bookmark" : "Bookmark question"}
            aria-pressed={isBookmarked}
            className="flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            {isBookmarked ? (
              <BookmarkCheck size={18} className="text-primary-500" />
            ) : (
              <Bookmark size={18} className="text-gray-400" />
            )}
          </button>
        )}
      </div>

      <div className="mt-4 space-y-2">
        {question.options.map((option, optionIndex) => {
          const correct =
            showAnswer && optionIndex === question.correctAnswerIndex
          const chosen = optionIndex === chosenIndex
          const wrong = showAnswer && chosen && !correct
          return (
            <div
              key={option}
              data-answer-state={correct ? "correct" : wrong ? "wrong" : "idle"}
              className={`qcard-option flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                correct
                  ? "border-2 border-green-400 bg-green-50 dark:bg-green-900/20 dark:border-green-600 shadow-sm shadow-green-500/10"
                  : wrong
                    ? "border-2 border-red-400 bg-red-50 dark:bg-red-900/20 dark:border-red-600"
                    : "border-[#e6e3f1] dark:border-[#26314b] bg-gray-50 dark:bg-gray-700/50"
              }`}
            >
              <span
                className={`w-8 h-8 flex items-center justify-center rounded-full text-sm font-bold shrink-0 ${
                  correct
                    ? "bg-gradient-to-br from-green-400 to-emerald-500 text-white"
                    : wrong
                      ? "bg-red-500 text-white"
                      : "bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300"
                }`}
              >
                {String.fromCharCode(65 + optionIndex)}
              </span>
              {/* The tag sits under the text on phones so long options keep their width. */}
              <span className="flex min-w-0 flex-1 flex-col items-start gap-1.5 sm:flex-row sm:items-center sm:gap-3">
                <span
                  className={`qcard-option-text text-sm sm:flex-1 ${
                    correct
                      ? "text-green-800 dark:text-green-200 font-medium"
                      : wrong
                        ? "text-red-800 dark:text-red-200 font-medium"
                        : "text-gray-700 dark:text-gray-300"
                  }`}
                >
                  {option}
                </span>
                {chosen && (
                  <span className="shrink-0 rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-gray-600 ring-1 ring-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:ring-gray-600">
                    Your answer
                  </span>
                )}
              </span>
              {correct && (
                <CircleCheck size={20} className="text-green-500 shrink-0" />
              )}
              {wrong && <CircleX size={20} className="text-red-500 shrink-0" />}
            </div>
          )
        })}
      </div>

      {question.explanation && (
        <div className="mt-3">
          <button
            onClick={() => setOpen(!open)}
            className="flex min-h-[44px] items-center gap-1.5 text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 transition-colors"
          >
            <Lightbulb size={14} />
            {open ? "Hide" : "Show"} explanation
            {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          <AnimatePresence>
            {open && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg border-l-4 border-l-primary-400">
                  {question.explanation}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  )
}
