import { useSyncExternalStore } from "react"

/** True in `vite build` output, which includes sw.js; false on the dev server. */
declare const __OFFLINE_BUILD__: boolean

/** Chromium's install event; it isn't part of the standard DOM typings. */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

/** Where this device's offline copy of the app stands. */
export type OfflineCopy = /** The editor preview: only published builds save an offline copy. */
"preview" /** No service workers here, or the app's files come from another site. */ | "unavailable" | "saving" | "ready" | "failed"

export type InstallPlatform = "ios" | "android" | "desktop"

export interface OfflineState {
  online: boolean
  /** Running from the home screen or as an installed desktop app. */
  standalone: boolean
  /** Installed during this visit; the tab itself stays a browser tab. */
  installed: boolean
  /** The browser offered its own install dialog (Chrome, Edge, Samsung Internet). */
  canInstall: boolean
  copy: OfflineCopy
  platform: InstallPlatform
}

const standaloneQuery = window.matchMedia(
  "(display-mode: standalone), (display-mode: window-controls-overlay)",
)

const isStandalone = () =>
  standaloneQuery.matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true

function detectPlatform(): InstallPlatform {
  const agent = navigator.userAgent
  // iPadOS reports itself as a Mac, but Macs have no touch screen.
  if (
    /iPhone|iPad|iPod/.test(agent) ||
    (agent.includes("Macintosh") && navigator.maxTouchPoints > 1)
  )
    return "ios"
  return /Android/.test(agent) ? "android" : "desktop"
}

let state: OfflineState = {
  online: navigator.onLine,
  standalone: isStandalone(),
  installed: false,
  canInstall: false,
  copy: __OFFLINE_BUILD__ ? "saving" : "preview",
  platform: detectPlatform(),
}
const listeners = new Set<() => void>()
let installEvent: BeforeInstallPromptEvent | null = null
let started = false
// Installed apps can stay open for days, so returning to one also looks for a new version.
const UPDATE_CHECK_MS = 60 * 60 * 1000

function update(patch: Partial<OfflineState>) {
  state = { ...state, ...patch }
  for (const listener of listeners) listener()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export const useOfflineState = () =>
  useSyncExternalStore(subscribe, () => state)

/** Call once before React renders: browsers can offer installation right after load. */
export function startOfflineSupport() {
  if (started) return
  started = true
  window.addEventListener("beforeinstallprompt", (event) => {
    // Hold the browser's own install bar back; the app offers Install where it fits.
    event.preventDefault()
    installEvent = (event as BeforeInstallPromptEvent)
    update({ canInstall: true })
  })
  window.addEventListener("appinstalled", () => {
    installEvent = null
    update({ canInstall: false, installed: true })
  })
  window.addEventListener("online", () => update({ online: true }))
  window.addEventListener("offline", () => update({ online: false }))
  standaloneQuery.addEventListener("change", () =>
    update({ standalone: isStandalone() }),
  )
  if (__OFFLINE_BUILD__) registerServiceWorker()
}

function registerServiceWorker() {
  const base = new URL(import.meta.env.BASE_URL, window.location.href)
  // Service workers must come from the page's own site.
  if (
    !("serviceWorker" in navigator) ||
    !window.isSecureContext ||
    base.origin !== window.location.origin
  ) {
    update({ copy: "unavailable" })
    return
  }

  const follow = (
    worker: ServiceWorker,
    registration: ServiceWorkerRegistration,
  ) => {
    const check = () => {
      if (worker.state === "activated") update({ copy: "ready" })
      else if (worker.state === "redundant" && !registration.active)
        update({ copy: "failed" })
    }
    worker.addEventListener("statechange", check)
    check()
  }

  const register = async () => {
    try {
      const registration = await navigator.serviceWorker.register(
        new URL("sw.js", base),
        { scope: base.pathname },
      )
      // An active worker means an earlier visit already saved a working copy.
      if (registration.active) update({ copy: "ready" })
      const pending = registration.installing ?? registration.waiting
      if (pending) follow(pending, registration)
      // A new version arrives as a new worker; it saves the new copy in the background.
      registration.addEventListener("updatefound", () => {
        if (registration.installing)
          follow(registration.installing, registration)
      })
      let lastCheck = Date.now()
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState !== "visible") return
        if (Date.now() - lastCheck < UPDATE_CHECK_MS) return
        lastCheck = Date.now()
        // Offline checks fail quietly and run again on the next return.
        registration.update().catch(() => {})
      })
    } catch {
      update({ copy: "failed" })
    }
  }

  // Wait for the page to finish loading so saving the copy never slows the first visit.
  if (document.readyState === "complete") void register()
  else window.addEventListener("load", () => void register(), { once: true })
}

/** Shows the browser's install dialog; resolves to true when the learner accepts. */
export async function promptInstall() {
  const event = installEvent
  if (!event) return false
  installEvent = null
  update({ canInstall: false })
  await event.prompt()
  const { outcome } = await event.userChoice
  return outcome === "accepted"
}

/** Colours the browser bar and installed-app title bar to match the header. */
export function syncThemeColor(dark: boolean) {
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", dark ? "#121212" : "#ffffff")
}
