import { useEffect, useRef, type ComponentType, type ReactNode } from "react"
import { Link } from "react-router"
import { motion } from "motion/react"
import { ArrowRight, ChevronLeft, Search, type LucideProps } from "lucide-react"

type Icon = ComponentType<LucideProps>

const headerGradients = {
  blue: "from-blue-500 to-teal-500",
  orange: "from-orange-500 to-purple-600",
  purple: "from-purple-500 to-indigo-600",
  pink: "from-pink-500 to-rose-600",
  primary: "from-primary-600 to-accent-500",
}

export function PageHeader({
  icon: IconComponent,
  title,
  subtitle,
  gradient = "primary",
  action,
  mobileTitle,
  mobileSubtitle,
}: {
  icon: Icon
  title: string
  subtitle?: string
  gradient?: keyof typeof headerGradients
  action?: ReactNode
  mobileTitle?: string
  mobileSubtitle?: string
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="page-header flex flex-wrap items-center justify-between gap-4 mb-8"
    >
      <div className="page-header-main flex items-center gap-4">
        <span
          className={`page-header-icon relative flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br ${headerGradients[gradient]} text-white shadow-lg shadow-primary-600/20 shrink-0`}
        >
          <span
            className="absolute inset-0 rounded-2xl bg-white/25 blur-md opacity-0 group-hover:opacity-100 transition-opacity"
            aria-hidden="true"
          />
          <IconComponent size={22} className="relative" />
        </span>
        <div>
          <h1 className="page-header-title text-2xl font-bold font-display text-gray-800 dark:text-white tracking-tight">
            {mobileTitle ? (
              <>
                <span className="hidden lg:inline">{title}</span>
                <span className="lg:hidden">{mobileTitle}</span>
              </>
            ) : (
              title
            )}
          </h1>
          {subtitle && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              {mobileSubtitle ? (
                <>
                  <span className="hidden lg:inline">{subtitle}</span>
                  <span className="lg:hidden">{mobileSubtitle}</span>
                </>
              ) : (
                subtitle
              )}
            </p>
          )}
        </div>
      </div>
      {action && <div className="page-header-action shrink-0">{action}</div>}
    </motion.div>
  )
}

export interface BackLinkProps {
  to: string
  label: string
  mobileHidden?: boolean
}

export function BackLink({ to, label, mobileHidden }: BackLinkProps) {
  return (
    <Link
      to={to}
      className={`back-link ${
        mobileHidden ? "mobile-top-level-back" : ""
      } inline-flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 mb-4`}
    >
      <ChevronLeft size={15} />
      {label}
    </Link>
  )
}

export function SearchInput({
  value,
  onChange,
  placeholder,
  mobileOpen,
  onMobileClose,
}: {
  value: string
  onChange: (value: string) => void
  placeholder: string
  mobileOpen?: boolean
  onMobileClose?: () => void
}) {
  const input = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (mobileOpen) input.current?.focus()
  }, [mobileOpen])

  return (
    <div
      className={`search-field relative mb-6 ${
        mobileOpen !== undefined ? "search-collapsible" : ""
      }`}
      data-open={mobileOpen}
    >
      <Search
        size={18}
        className="search-field-icon absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
      />
      <input
        ref={input}
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (mobileOpen && event.key === "Escape") onMobileClose?.()
        }}
        placeholder={placeholder}
        aria-label={placeholder}
        className="input pl-10!"
      />
    </div>
  )
}

export function EmptyState({
  icon: IconComponent,
  title,
  children,
}: {
  icon: Icon
  title: string
  children?: ReactNode
}) {
  return (
    <div className="learner-empty text-center py-20">
      <IconComponent
        size={48}
        className="mx-auto text-gray-300 dark:text-gray-600 mb-4"
      />
      <h3 className="text-lg font-medium text-gray-600 dark:text-gray-400">
        {title}
      </h3>
      {children}
    </div>
  )
}

/** Honest placeholder card for content or screens that aren't available. */
export function NoticeCard({
  title,
  children,
  action,
}: {
  title: string
  children?: ReactNode
  action?: ReactNode
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="learner-notice card mx-auto max-w-xl p-8 text-center"
    >
      <p className="font-semibold font-display text-gray-800 dark:text-white">
        {title}
      </p>
      {children && (
        <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          {children}
        </div>
      )}
      {action && (
        <div className="mt-5 flex flex-wrap justify-center gap-2">{action}</div>
      )}
    </motion.div>
  )
}

export function FeatureCard({
  title,
  desc,
  icon: IconComponent,
  to,
  gradient,
  index,
}: {
  title: string
  desc: string
  icon: Icon
  to: string
  gradient: string
  index: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08 }}
      whileHover={{ scale: 1.02, y: -4 }}
      className="feature-card relative overflow-hidden rounded-2xl text-white shadow-lg hover:shadow-2xl transition-shadow group"
    >
      <Link
        to={to}
        aria-label={title}
        className={`feature-card-link absolute inset-0 bg-gradient-to-br ${gradient}`}
      />
      <div
        className="feature-card-decoration absolute inset-0 bg-[radial-gradient(120%_80%_at_50%_0%,rgb(255_255_255/0.25),transparent_55%)] pointer-events-none"
        aria-hidden="true"
      />
      <div
        className="feature-card-decoration absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none"
        aria-hidden="true"
      />
      <div className="feature-card-content relative z-10 p-6 pointer-events-none">
        <div className="flex items-center justify-between mb-4">
          <span className="feature-card-icon inline-flex items-center justify-center h-12 w-12 rounded-xl bg-white/20 backdrop-blur-sm shadow-inner transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3">
            <IconComponent size={24} />
          </span>
          <span className="card-hint inline-flex items-center gap-1 text-sm font-semibold opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0 transition-all">
            Open <ArrowRight size={15} />
          </span>
        </div>
        <h2 className="text-xl font-bold font-display">{title}</h2>
        <p className="text-sm opacity-85 mt-1">{desc}</p>
      </div>
      <div
        className="feature-card-decoration absolute -bottom-8 -right-8 w-36 h-36 bg-white/10 rounded-full pointer-events-none"
        aria-hidden="true"
      />
      <div
        className="feature-card-decoration absolute top-4 -left-10 w-24 h-24 bg-white/5 rounded-full pointer-events-none blur-md"
        aria-hidden="true"
      />
    </motion.div>
  )
}

export function StatusBadge({ status }: { status?: string }) {
  const value = status || "published"
  const styles: Record<string, string> = {
    draft: "bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300",
    review: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
    published:
      "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
    archived:
      "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
  }
  const labels: Record<string, string> = {
    draft: "Draft",
    review: "Review",
    published: "Published",
    archived: "Archived",
  }
  return (
    <span
      className={`text-[11px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${styles[value] || styles.published}`}
    >
      {labels[value] || labels.published}
    </span>
  )
}

export function difficultyClass(difficulty: string) {
  if (difficulty === "Easy")
    return "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
  if (difficulty === "Hard")
    return "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
  return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300"
}
