import { useState } from "react"
import { Megaphone, Send, Trash } from "lucide-react"
import {
  announcementStatus,
  type AnnouncementStatus,
} from "../../lib/announcement"
import { useApp } from "../../lib/app-context"
import type { Announcement, Audience } from "../../lib/data"
import { dangerOutline, fieldLabel, Panel } from "./ui"

const statusLabels: Record<AnnouncementStatus, string> = {
  draft: "Draft",
  scheduled: "Scheduled",
  live: "Live",
  expired: "Expired",
}

const audienceNotes: Record<Audience, string> = {
  all: "",
  desktop: " · desktop only (1024px and wider)",
  mobile: " · phones and tablets only",
}

const formatWhen = (value: string) =>
  new Date(value).toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  })

export function AnnouncementPanel({
  audit,
}: {
  audit: (action: string, resource?: string) => void
}) {
  const { toast, announcement, setAnnouncement } = useApp()
  // The form starts from the current announcement, so updating it keeps its settings.
  const [message, setMessage] = useState(announcement?.message ?? "")
  const [duration, setDuration] = useState(
    String(announcement?.durationSeconds ?? 10),
  )
  const [status, setStatus] = useState<"publish" | "draft">(
    announcement?.draft ? "draft" : "publish",
  )
  const [publishAt, setPublishAt] = useState(announcement?.publishAt ?? "")
  const [expiresAt, setExpiresAt] = useState(announcement?.expiresAt ?? "")
  const [audience, setAudience] = useState<Audience>(
    announcement?.audience ?? "all",
  )
  const [saving, setSaving] = useState(false)
  const state = announcement ? announcementStatus(announcement) : null

  const publish = () => {
    const seconds = Number(duration)
    if (!message.trim()) return toast("Please enter a message", "error")
    if (!Number.isInteger(seconds) || seconds < 1 || seconds > 120)
      return toast("Auto-close duration must be 1–120 seconds", "error")
    if (expiresAt && new Date(expiresAt).getTime() <= Date.now())
      return toast("The expiry time has passed — choose a later one", "error")
    if (publishAt && expiresAt && new Date(expiresAt) <= new Date(publishAt))
      return toast("The expiry must be after the publish time", "error")
    setSaving(true)
    window.setTimeout(() => {
      const next: Announcement = {
        id: `announcement-${Date.now()}`,
        message: message.trim(),
        durationSeconds: seconds,
        draft: status === "draft",
        publishAt,
        expiresAt,
        audience,
      }
      const result = next.draft
        ? "Announcement saved as draft"
        : announcementStatus(next) === "scheduled"
          ? "Announcement scheduled"
          : "Announcement published"
      setAnnouncement(next)
      setSaving(false)
      audit(result, "Announcement")
      toast(result)
    }, 500)
  }

  return (
    <Panel>
      <label className="block">
        <span className={fieldLabel}>Message</span>
        <textarea
          rows={2}
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder="Enter the announcement message..."
          className="input"
        />
      </label>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <label>
          <span className={fieldLabel}>Auto-close duration (seconds)</span>
          <input
            type="number"
            min={1}
            max={120}
            value={duration}
            onChange={(event) => setDuration(event.target.value)}
            className="input"
          />
        </label>
        <label>
          <span className={fieldLabel}>Status</span>
          <select
            value={status}
            onChange={(event) =>
              setStatus(event.target.value as "publish" | "draft")
            }
            className="input"
          >
            <option value="publish">Publish now</option>
            <option value="draft">Draft</option>
          </select>
        </label>
        <label>
          <span className={fieldLabel}>Publish at</span>
          <input
            type="datetime-local"
            value={publishAt}
            onChange={(event) => setPublishAt(event.target.value)}
            className="input"
          />
        </label>
        <label>
          <span className={fieldLabel}>Expires at</span>
          <input
            type="datetime-local"
            value={expiresAt}
            onChange={(event) => setExpiresAt(event.target.value)}
            className="input"
          />
        </label>
        <label>
          <span className={fieldLabel}>Audience</span>
          <select
            value={audience}
            onChange={(event) => setAudience(event.target.value as Audience)}
            className="input"
          >
            <option value="all">All users</option>
            <option value="desktop">Desktop</option>
            <option value="mobile">Mobile</option>
          </select>
        </label>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          onClick={publish}
          disabled={saving}
          className="btn-primary px-5 py-2.5"
        >
          <Send size={16} />
          {saving
            ? "Publishing..."
            : announcement
              ? "Update Announcement"
              : "Publish Announcement"}
        </button>
        {announcement && (
          <button
            onClick={() => {
              setAnnouncement(null)
              setMessage("")
              audit("Announcement removed", "Announcement")
              toast("Announcement removed")
            }}
            // A publish still saving would bring the announcement back after removal.
            disabled={saving}
            className={`${dangerOutline} px-4 py-2.5 text-sm`}
          >
            <Trash size={15} />
            Remove
          </button>
        )}
      </div>
      {announcement && state && (
        <div
          className={`mt-4 flex gap-2 rounded-xl border p-3 ${
            state === "expired"
              ? "border-amber-400/60 bg-amber-50 dark:border-amber-500/40 dark:bg-amber-950/30"
              : "border-primary-400/60 bg-primary-50 dark:border-primary-500/40 dark:bg-primary-950/40"
          }`}
        >
          <Megaphone
            size={15}
            className={`mt-0.5 shrink-0 ${
              state === "expired"
                ? "text-amber-600 dark:text-amber-300"
                : "text-primary-500 dark:text-primary-300"
            }`}
          />
          <div className="text-sm">
            <p className="text-gray-800 dark:text-gray-100">
              <strong>{statusLabels[state]}:</strong> {announcement.message}
            </p>
            <p className="mt-0.5 text-xs text-gray-600 dark:text-gray-400">
              {state === "draft"
                ? "Not shown to users until it is published."
                : state === "scheduled"
                  ? `Shows from ${formatWhen(announcement.publishAt)} for ${announcement.durationSeconds} seconds${audienceNotes[announcement.audience]}`
                  : state === "expired"
                    ? `Ended ${formatWhen(announcement.expiresAt)} — choose a later expiry and update it to show it again`
                    : `Users will see this for ${announcement.durationSeconds} seconds on their next visit${audienceNotes[announcement.audience]}`}
            </p>
          </div>
        </div>
      )}
    </Panel>
  )
}
