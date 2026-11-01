import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FocusEvent,
} from "react"
import { AnimatePresence, motion } from "motion/react"
import { Megaphone, X } from "lucide-react"
import { announcementStatus, reachesAudience } from "../lib/announcement"
import { useApp } from "../lib/app-context"
import type { Announcement } from "../lib/data"
import { useMediaQuery, WIDE_QUERY } from "../lib/use-media-query"

const SEEN_KEY = "nptel-announcement-seen"

function readSeen() {
  try {
    return localStorage.getItem(SEEN_KEY)
  } catch {
    return null
  }
}

function markSeen(id: string) {
  try {
    localStorage.setItem(SEEN_KEY, id)
  } catch {
    // Storage unavailable: the announcement may show again after a reload.
  }
}

/** Shows the admin's announcement once per version, inside its publish window and audience. */
export function AnnouncementPopup() {
  const { announcement } = useApp()
  const wide = useMediaQuery(WIDE_QUERY)
  const [shown, setShown] = useState<Announcement | null>(null)
  const close = useCallback(() => setShown(null), [])
  const due =
    announcement !== null &&
    announcementStatus(announcement) === "live" &&
    reachesAudience(announcement.audience, wide) &&
    readSeen() !== announcement.id

  useEffect(() => {
    if (!due || !announcement) return
    // A short pause lets the page settle before the popup slides in.
    const timer = window.setTimeout(() => {
      markSeen(announcement.id)
      setShown(announcement)
    }, 800)
    return () => window.clearTimeout(timer)
  }, [due, announcement])

  return (
    <AnimatePresence>
      {shown && (
        <AnnouncementCard key={shown.id} item={shown} onClose={close} />
      )}
    </AnimatePresence>
  )
}

function AnnouncementCard({
  item,
  onClose,
}: {
  item: Announcement
  onClose: () => void
}) {
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)
  const paused = hovered || focused
  const remaining = useRef(item.durationSeconds * 1000)

  // The countdown pauses while the reader hovers over it or focuses inside it.
  useEffect(() => {
    if (paused) return
    const started = Date.now()
    const timer = window.setTimeout(onClose, remaining.current)
    return () => {
      window.clearTimeout(timer)
      remaining.current -= Date.now() - started
    }
  }, [paused, onClose])

  const blur = (event: FocusEvent<HTMLElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null))
      setFocused(false)
  }

  return (
    <motion.section
      aria-label="Announcement"
      data-paused={paused}
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.2 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={blur}
      className="announcement-popup fixed inset-x-4 top-20 z-[60] mx-auto max-w-md overflow-hidden rounded-2xl border border-primary-200 bg-white shadow-xl dark:border-primary-800/60 dark:bg-gray-900"
    >
      <div className="flex items-start gap-3 p-4">
        <span
          className="announcement-icon flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-600 dark:bg-primary-900/40 dark:text-primary-300"
          aria-hidden="true"
        >
          <Megaphone size={18} />
        </span>
        <div role="status" className="min-w-0 flex-1 pt-0.5">
          <p className="announcement-eyebrow text-xs font-semibold uppercase tracking-wide text-primary-700 dark:text-primary-300">
            Announcement
          </p>
          <p className="announcement-message mt-1 text-sm leading-relaxed text-gray-800 [overflow-wrap:anywhere] dark:text-gray-100">
            {item.message}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Dismiss announcement"
          className="announcement-close -m-1.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500 dark:text-gray-400 dark:hover:bg-white/10 dark:hover:text-white"
        >
          <X size={18} />
        </button>
      </div>
      <span
        className="announcement-timer block h-1 bg-primary-500"
        style={{ animationDuration: `${item.durationSeconds}s` }}
        aria-hidden="true"
      />
    </motion.section>
  )
}
