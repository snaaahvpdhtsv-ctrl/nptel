import { useEffect, useState, type ComponentType, type ReactNode } from "react"
import { AnimatePresence, motion } from "motion/react"
import { GraduationCap, X, type LucideProps } from "lucide-react"
import type { Status } from "../../lib/data"

export type IconType = ComponentType<LucideProps>

export function Panel({
  children,
  className = "",
  role,
}: {
  children: ReactNode
  className?: string
  role?: "status" | "alert"
}) {
  return (
    <section role={role} className={`card p-5 sm:p-6 ${className}`}>
      {children}
    </section>
  )
}

export function PanelTitle({
  title,
  subtitle,
  icon: Icon,
  iconClass = "from-primary-600 to-fuchsia-500",
  action,
}: {
  title: ReactNode
  subtitle?: ReactNode
  icon?: IconType
  iconClass?: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
      <div className="flex items-center gap-3 min-w-0">
        {Icon && (
          <span
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${iconClass} text-white shadow-md`}
          >
            <Icon size={18} />
          </span>
        )}
        <div className="min-w-0">
          <h2 className="text-lg font-bold font-display text-gray-800 dark:text-white">
            {title}
          </h2>
          {subtitle && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {action && (
        <div className="flex flex-wrap items-center gap-2">{action}</div>
      )}
    </div>
  )
}

export function Tile({
  value,
  label,
  tone = "text-gray-800 dark:text-white",
}: {
  value: ReactNode
  label: string
  tone?: string
}) {
  return (
    <div className="rounded-xl bg-gray-100/80 dark:bg-white/[0.04] border border-gray-200/70 dark:border-white/[0.04] px-3 py-3">
      <p className={`text-2xl font-bold font-display leading-tight ${tone}`}>
        {value}
      </p>
      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{label}</p>
    </div>
  )
}

export function IconButton({
  icon: Icon,
  label,
  onClick,
  disabled,
  tone = "hover:text-primary-600 dark:hover:text-primary-300",
}: {
  icon: IconType
  label: string
  onClick: () => void
  disabled?: boolean
  tone?: string
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={(event) => {
        event.stopPropagation()
        onClick()
      }}
      className={`inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-200/70 dark:hover:bg-white/5 transition-colors disabled:opacity-30 disabled:pointer-events-none ${tone}`}
    >
      <Icon size={16} />
    </button>
  )
}

export const smallOutline = "btn-outline px-3.5 py-1.5 text-xs sm:text-sm"
export const smallPrimary = "btn-primary px-4 py-2 text-sm"
export const fieldLabel =
  "mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400"
export const dangerOutline =
  "btn inline-flex items-center gap-1.5 rounded-lg border border-red-300 dark:border-red-900/70 px-3 py-1.5 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40"
// Rows wrap their action buttons onto a second line when space is tight, so titles keep their width.
export const rowClass = (selected = false) =>
  `flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-xl border px-3 py-3 transition-colors ${
    selected
      ? "border-primary-500/80 bg-primary-50 dark:bg-primary-950/40"
      : "border-transparent bg-gray-50 dark:bg-white/[0.035] hover:border-gray-200 dark:hover:border-white/10"
  }`

export function Field({
  id,
  label,
  children,
}: {
  id: string
  label: string
  children: ReactNode
}) {
  return (
    <div>
      <label htmlFor={id} className="label">
        {label}
      </label>
      {children}
    </div>
  )
}

export function StatusSelect({
  id,
  value,
  onChange,
}: {
  id: string
  value: Status
  onChange: (value: Status) => void
}) {
  return (
    <select
      id={id}
      value={value}
      onChange={(event) => onChange(event.target.value as Status)}
      className="input"
    >
      <option value="draft">Draft</option>
      <option value="review">Ready for review</option>
      <option value="published">Published</option>
      <option value="archived">Archived</option>
    </select>
  )
}

export const formShell =
  "mb-4 space-y-3 rounded-xl border border-primary-300/70 bg-primary-50/50 p-4 dark:border-primary-500/30 dark:bg-primary-950/25"

/** Names the course a panel's content belongs to. */
export function CourseChip({ title }: { title: string }) {
  return (
    <span className="inline-flex min-w-0 max-w-full items-center gap-1 rounded-md bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 dark:bg-white/10 dark:text-gray-300">
      <GraduationCap size={12} className="shrink-0" />
      <span className="truncate">{title}</span>
    </span>
  )
}

export function Modal({
  open,
  title,
  onClose,
  children,
  footer,
}: {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose()
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            onClick={(event) => event.stopPropagation()}
            className="card w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col bg-white dark:bg-[#111a2e]"
          >
            <div className="flex items-center justify-between gap-3 border-b border-gray-200 dark:border-white/10 px-5 py-4">
              <h2 className="font-bold font-display text-gray-800 dark:text-white">
                {title}
              </h2>
              <IconButton icon={X} label="Close" onClick={onClose} />
            </div>
            <div className="overflow-y-auto px-5 py-4 text-sm text-gray-600 dark:text-gray-300">
              {children}
            </div>
            {footer && (
              <div className="flex justify-end gap-2 border-t border-gray-200 dark:border-white/10 px-5 py-3">
                {footer}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export type ConfirmState = {
  title: string
  body: string
  confirmLabel: string
  onConfirm: () => void | Promise<void>
} | null

export function ConfirmDialog({
  state,
  onClose,
}: {
  state: ConfirmState
  onClose: () => void
}) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const confirm = async () => {
    if (!state) return
    setSaving(true)
    setError("")
    try {
      await state.onConfirm()
      onClose()
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "The change couldn't be saved.",
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={Boolean(state)}
      title={state?.title || ""}
      onClose={onClose}
      footer={
        <>
          <button
            disabled={saving}
            onClick={onClose}
            className="btn-ghost px-4 py-2 text-sm"
          >
            Cancel
          </button>
          <button
            disabled={saving}
            onClick={() => void confirm()}
            className="btn rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500"
          >
            {saving ? "Saving…" : state?.confirmLabel}
          </button>
        </>
      }
    >
      <p>{state?.body}</p>
      {error && (
        <p role="alert" className="mt-3 text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </Modal>
  )
}

export function downloadFile(name: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const link = document.createElement("a")
  link.href = url
  link.download = name
  link.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export const csvCell = (value: unknown) =>
  `"${String(value ?? "").replace(/"/g, '""')}"`

/** Minimal RFC 4180-style parser: handles quoted cells, escaped quotes and CRLF. */
export function parseCsv(text: string) {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ""
  let quoted = false
  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') {
        cell += '"'
        i++
      } else if (char === '"') quoted = false
      else cell += char
    } else if (char === '"') quoted = true
    else if (char === ",") {
      row.push(cell)
      cell = ""
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[i + 1] === "\n") i++
      row.push(cell)
      if (row.some((value) => value.trim())) rows.push(row)
      row = []
      cell = ""
    } else cell += char
  }
  row.push(cell)
  if (row.some((value) => value.trim())) rows.push(row)
  return rows
}
