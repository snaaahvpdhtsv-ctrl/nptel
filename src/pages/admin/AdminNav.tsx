import { useEffect, useRef } from "react"
import {
  FileText,
  GraduationCap,
  History,
  Layers,
  LayoutDashboard,
  Megaphone,
  MessageSquareText,
} from "lucide-react"
import type { IconType } from "./ui"

export type SectionId = "overview" | "weeks" | "papers" | "courses" | "requests" | "announcement" | "audit"

interface SectionMeta {
  label: string
  icon: IconType
  iconClass: string
}

export const SECTIONS: Record<SectionId, SectionMeta> = {
  overview: {
    label: "Overview",
    icon: LayoutDashboard,
    iconClass: "from-primary-500 to-fuchsia-500",
  },
  weeks: {
    label: "Weeks & questions",
    icon: Layers,
    iconClass: "from-violet-500 to-indigo-600",
  },
  papers: {
    label: "PYQ papers",
    icon: FileText,
    iconClass: "from-emerald-500 to-teal-500",
  },
  courses: {
    label: "Courses",
    icon: GraduationCap,
    iconClass: "from-primary-600 to-accent-500",
  },
  requests: {
    label: "Requests & feedback",
    icon: MessageSquareText,
    iconClass: "from-primary-600 to-indigo-500",
  },
  announcement: {
    label: "Announcement",
    icon: Megaphone,
    iconClass: "from-fuchsia-500 to-orange-400",
  },
  audit: {
    label: "Audit history",
    icon: History,
    iconClass: "from-sky-500 to-indigo-500",
  },
}

export const SECTION_IDS = Object.keys(SECTIONS) as SectionId[]

/** Sections that work on the course chosen in the course switcher; the rest cover every course. */
export const COURSE_SECTIONS: readonly SectionId[] = [
  "overview",
  "weeks",
  "papers",
]

interface NavGroup {
  label?: string
  ids: SectionId[]
}

/** The overview, then content for the managed course, then tools that span every course. */
const NAV_GROUPS: NavGroup[] = [
  { ids: ["overview"] },
  { label: "Course content", ids: ["weeks", "papers"] },
  { label: "Site-wide", ids: ["courses", "requests", "announcement", "audit"] },
]

export interface NavBadge {
  value: number
  alert?: boolean
  /** Screen-reader context for the number, e.g. "pending". */
  label?: string
}

interface AdminNavProps {
  active: SectionId
  badges: Partial<Record<SectionId, NavBadge>>
  onSelect: (id: SectionId) => void
}

function Badge({ badge }: { badge: NavBadge }) {
  return (
    <span
      className={`ml-auto shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums ${
        badge.alert
          ? "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300"
          : "bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-300"
      }`}
    >
      {badge.value}
      {badge.label && <span className="sr-only"> {badge.label}</span>}
    </span>
  )
}

const tabTone = (selected: boolean) =>
  selected
    ? "bg-primary-50 text-primary-700 dark:bg-primary-500/15 dark:text-primary-200"
    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-white/5 dark:hover:text-white"

const iconTone = (selected: boolean) =>
  selected
    ? "shrink-0 text-primary-600 dark:text-primary-300"
    : "shrink-0 text-gray-400 dark:text-gray-500"

/** Grouped section list for the desktop sidebar. */
export function AdminSidebarNav({ active, badges, onSelect }: AdminNavProps) {
  return (
    <nav aria-label="Admin sections">
      {NAV_GROUPS.map((group) => (
        <div key={group.ids[0]}>
          {group.label && (
            <p className="px-3 pb-1.5 pt-4 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              {group.label}
            </p>
          )}
          {group.ids.map((id) => {
            const { label, icon: Icon } = SECTIONS[id]
            const selected = id === active
            return (
              <button
                key={id}
                type="button"
                onClick={() => onSelect(id)}
                aria-current={selected ? "page" : undefined}
                className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500 ${tabTone(selected)}`}
              >
                <Icon size={16} className={iconTone(selected)} />
                <span className="truncate">{label}</span>
                {badges[id] && <Badge badge={badges[id]} />}
              </button>
            )
          })}
        </div>
      ))}
    </nav>
  )
}

/** One scrollable row of section tabs for phones and tablets; the active tab stays in view. */
export function AdminTabsNav({ active, badges, onSelect }: AdminNavProps) {
  const row = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = row.current
    const tab = container?.querySelector<HTMLElement>('[aria-current="page"]')
    if (!container || !tab) return
    // Centre the active tab without scrolling the page itself.
    container.scrollTo({
      left: tab.offsetLeft - (container.clientWidth - tab.offsetWidth) / 2,
      behavior: "smooth",
    })
  }, [active])

  return (
    <nav aria-label="Admin sections">
      <div
        ref={row}
        className="flex gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {SECTION_IDS.map((id) => {
          const { label, icon: Icon } = SECTIONS[id]
          const selected = id === active
          return (
            <button
              key={id}
              type="button"
              onClick={() => onSelect(id)}
              aria-current={selected ? "page" : undefined}
              className={`flex min-h-11 shrink-0 items-center gap-2 whitespace-nowrap rounded-lg px-3 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary-500 ${tabTone(selected)}`}
            >
              <Icon size={16} className={iconTone(selected)} />
              {label}
              {badges[id] && <Badge badge={badges[id]} />}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
