import type { Announcement, Audience } from "./data"

export type AnnouncementStatus = "draft" | "scheduled" | "live" | "expired"

// An empty date parses to NaN, and every comparison with NaN is false: no limit.
const time = (value: string) => (value ? new Date(value).getTime() : Number.NaN)

/** Where an announcement is in its publish window. */
export function announcementStatus(
  item: Announcement,
  now = Date.now(),
): AnnouncementStatus {
  if (item.draft) return "draft"
  if (now < time(item.publishAt)) return "scheduled"
  if (now >= time(item.expiresAt)) return "expired"
  return "live"
}

/** Whether learners on the current layout are part of the announcement's audience. */
export const reachesAudience = (audience: Audience, wide: boolean) =>
  audience === "all" || (audience === "desktop") === wide
