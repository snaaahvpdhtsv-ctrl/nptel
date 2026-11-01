import { Link, useLocation } from "react-router"
import { BookOpen, Bookmark, Ellipsis, House, Zap } from "lucide-react"
import { useCourse } from "../lib/course-context"

const tabs = [
  { label: "Home", section: "", icon: House },
  { label: "Study", section: "/study", icon: BookOpen },
  { label: "Practice", section: "/practice", icon: Zap },
  { label: "Saved", section: "/saved", icon: Bookmark },
  { label: "More", section: "/more", icon: Ellipsis },
] as const

export function MobileBottomNav() {
  const { path } = useCourse()
  const { pathname } = useLocation()
  const subpath = pathname.replace(/\/+$/, "").slice(path().length)
  const section = subpath.split("/")[1] ?? ""
  const active = ["", "study", "practice", "saved"].includes(section)
    ? `/${section}`.replace(/\/$/, "")
    : "/more"

  return (
    <nav className="mobile-bottom-nav lg:hidden" aria-label="Course navigation">
      {tabs.map(({ label, section, icon: Icon }) => (
        <Link
          key={label}
          to={path(section)}
          className="mobile-tab"
          aria-current={active === section ? "page" : undefined}
        >
          <Icon size={22} strokeWidth={1.7} aria-hidden="true" />
          <span>{label}</span>
        </Link>
      ))}
    </nav>
  )
}
