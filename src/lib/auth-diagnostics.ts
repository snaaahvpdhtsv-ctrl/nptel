const enabledKey = "nptel-auth-diagnostics-enabled"
const eventsKey = "nptel-auth-diagnostics-events"
const maxEvents = 100

function requestedInUrl() {
  return (
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("authDiagnostics") === "1"
  )
}

export function authDiagnosticsEnabled() {
  if (requestedInUrl()) return true
  try {
    return sessionStorage.getItem(enabledKey) === "1"
  } catch {
    return false
  }
}

function readEvents(): AuthDiagnosticEvent[] {
  try {
    const stored = sessionStorage.getItem(eventsKey)
    if (!stored) return []
    const parsed: unknown = JSON.parse(stored)
    return Array.isArray(parsed) ? parsed as AuthDiagnosticEvent[] : []
  } catch {
    return []
  }
}

export interface AuthDiagnosticEvent {
  time: string
  stage: string
  details: Record<string, string | boolean | number | null>
}

export function getAuthDiagnosticEvents() {
  return readEvents()
}

export function clearAuthDiagnosticEvents() {
  try {
    sessionStorage.removeItem(eventsKey)
  } catch {
    // The in-memory diagnostic log is still useful for this page load.
  }
}

export function disableAuthDiagnostics() {
  try {
    sessionStorage.removeItem(enabledKey)
  } catch {
    // Removing the URL flag still disables diagnostics for this tab.
  }
  if (requestedInUrl()) {
    const url = new URL(window.location.href)
    url.searchParams.delete("authDiagnostics")
    window.history.replaceState(window.history.state, "", url)
  }
}

export function recordAuthDiagnostic(
  stage: string,
  details: Record<string, string | boolean | number | null> = {},
) {
  if (!authDiagnosticsEnabled()) return
  const event = { time: new Date().toISOString(), stage, details }
  const events = [...readEvents(), event].slice(-maxEvents)
  try {
    sessionStorage.setItem(enabledKey, "1")
    sessionStorage.setItem(eventsKey, JSON.stringify(events))
  } catch {
    // Diagnostics remain visible in the console when browser storage is blocked.
  }
  console.info("[NPTEL auth diagnostic]", event)
}
