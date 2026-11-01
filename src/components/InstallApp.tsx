import { useState, type ComponentType } from "react"
import {
  CircleCheck,
  CloudOff,
  Download,
  EllipsisVertical,
  LoaderCircle,
  MonitorDown,
  Share,
  Smartphone,
  SquarePlus,
  WifiOff,
  X,
  type LucideProps,
} from "lucide-react"
import { useApp } from "../lib/app-context"
import {
  promptInstall,
  useOfflineState,
  type InstallPlatform,
  type OfflineCopy,
} from "../lib/offline"

type Icon = ComponentType<LucideProps>

const INSTALL_DISMISSED_KEY = "nptel-install-dismissed"

const muted = "text-gray-600 dark:text-gray-400"

interface CopyStatus {
  icon: Icon
  text: string
  tone: string
  /** Shows a spinning icon while the copy is being saved. */
  busy?: boolean
}

const copyStatus: Record<OfflineCopy, CopyStatus> = {
  ready: {
    icon: CircleCheck,
    text: "Saved for offline use on this device",
    tone: "text-emerald-700 dark:text-emerald-400",
  },
  saving: {
    icon: LoaderCircle,
    text: "Saving an offline copy…",
    tone: muted,
    busy: true,
  },
  preview: {
    icon: CloudOff,
    text: "The offline copy is saved once the app is published",
    tone: muted,
  },
  unavailable: {
    icon: CloudOff,
    text: "This browser can't keep an offline copy",
    tone: muted,
  },
  failed: {
    icon: CloudOff,
    text: "Couldn't save an offline copy yet. It retries next time you open the app.",
    tone: "text-amber-700 dark:text-amber-400",
  },
}

const installSteps: Record<InstallPlatform, [Icon, string][]> = {
  ios: [
    [Share, "Tap Share in Safari's toolbar"],
    [SquarePlus, "Choose Add to Home Screen, then Add"],
  ],
  android: [
    [EllipsisVertical, "Open your browser's menu"],
    [Smartphone, "Tap Install app or Add to Home screen"],
  ],
  desktop: [
    [
      MonitorDown,
      "In Chrome or Edge, click the install icon in the address bar",
    ],
    [
      EllipsisVertical,
      "Or choose Install from the browser menu. In Safari, use File → Add to Dock",
    ],
  ],
}

function useInstallAction() {
  const { toast } = useApp()
  return async () => {
    if (await promptInstall()) toast("Installing NPTEL Quiz…")
  }
}

/** Install button or instructions, plus the state of this device's offline copy. */
export function InstallAppCard({ className = "" }: { className?: string }) {
  const { standalone, installed, canInstall, copy, platform } =
    useOfflineState()
  const install = useInstallAction()
  const status = copyStatus[copy]
  const StatusIcon = status.icon

  return (
    <div className={className}>
      <div className="flex items-start gap-3">
        <span
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary-600 via-primary-500 to-accent-500 text-white shadow-sm"
          aria-hidden="true"
        >
          <Download size={20} />
        </span>
        <div className="min-w-0">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">
            {standalone ? "You're using the app" : "Install the app"}
          </h3>
          <p className={`mt-1 text-sm ${muted}`}>
            {standalone
              ? "Answer keys, practice and saved questions keep working without a signal."
              : "Add NPTEL Quiz to your home screen. It opens like an app, and answer keys, practice and saved questions keep working without a signal."}
          </p>
        </div>
      </div>
      <p
        className={`mt-3 flex items-center gap-2 text-sm font-medium ${status.tone}`}
      >
        <StatusIcon
          size={16}
          className={`shrink-0 ${
            status.busy ? "animate-spin motion-reduce:animate-none" : ""
          }`}
          aria-hidden="true"
        />
        {status.text}
      </p>
      {standalone ? null : installed ? (
        <p className={`mt-3 text-sm ${muted}`}>
          Installed. Open NPTEL Quiz from your home screen or app list.
        </p>
      ) : canInstall ? (
        <button
          type="button"
          onClick={install}
          className="btn-primary mt-4 w-full sm:w-auto"
        >
          <Download size={16} aria-hidden="true" />
          Install app
        </button>
      ) : (
        <ol className="mt-4 space-y-2" aria-label="How to install">
          {installSteps[platform].map(([StepIcon, text]) => (
            <li
              key={text}
              className="flex items-center gap-3 text-sm text-gray-700 dark:text-gray-300"
            >
              <span
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-300"
                aria-hidden="true"
              >
                <StepIcon size={16} />
              </span>
              {text}
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}

function readDismissed() {
  try {
    return localStorage.getItem(INSTALL_DISMISSED_KEY) === "1"
  } catch {
    return false
  }
}

/** Suggests installing on the phone dashboard, when the browser allows it. */
export function InstallBanner() {
  const { standalone, installed, canInstall, platform } = useOfflineState()
  const install = useInstallAction()
  const [dismissed, setDismissed] = useState(readDismissed)
  // iOS never offers an install dialog, but Safari can add any site to the home screen.
  const offered = canInstall || platform === "ios"
  if (standalone || installed || dismissed || !offered) return null

  const dismiss = () => {
    setDismissed(true)
    try {
      localStorage.setItem(INSTALL_DISMISSED_KEY, "1")
    } catch {
      // Storage unavailable: stays hidden until the page reloads.
    }
  }

  return (
    <div
      className="card mt-4 flex items-start gap-3 p-4"
      role="region"
      aria-label="Install the app"
    >
      <span className="mobile-menu-icon" aria-hidden="true">
        <Download size={20} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="mobile-row-title">Install NPTEL Quiz</p>
        <p className="mobile-row-meta">
          {canInstall
            ? "Study answer keys offline, right from your home screen."
            : "Tap Share, then Add to Home Screen, to study offline."}
        </p>
        {canInstall && (
          <button
            type="button"
            onClick={install}
            className="btn-primary mt-3 px-4 text-sm"
          >
            Install
          </button>
        )}
      </div>
      <button
        type="button"
        onClick={dismiss}
        className="mobile-icon-button -mr-2 -mt-2 shrink-0"
        aria-label="Dismiss install suggestion"
      >
        <X size={17} />
      </button>
    </div>
  )
}

/**
 * Navbar shortcut, shown only while the browser is ready to install the app. It's icon-only and
 * waits for wide screens so the desktop links keep a single line; narrower desktops still have
 * the browser's own install icon in the address bar.
 */
export function InstallNavButton() {
  const { standalone, canInstall } = useOfflineState()
  const install = useInstallAction()
  if (standalone || !canInstall) return null

  return (
    <button
      type="button"
      onClick={install}
      title="Install NPTEL Quiz as an app"
      aria-label="Install app"
      className="hidden rounded-lg p-2 text-gray-600 transition-colors hover:bg-gray-100/80 xl:inline-flex dark:text-gray-300 dark:hover:bg-gray-800/80"
    >
      <MonitorDown size={18} aria-hidden="true" />
    </button>
  )
}

/** Says when the connection drops, and what keeps working. */
export function OfflineNotice() {
  const { online, copy } = useOfflineState()
  // The status region stays mounted so screen readers announce the change.
  return (
    <div role="status">
      {!online && (
        <div className="mx-auto max-w-6xl px-4 pt-4">
          <p className="flex items-start gap-2.5 rounded-xl border border-amber-300 bg-amber-50 px-3.5 py-2.5 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
            <WifiOff size={17} className="mt-0.5 shrink-0" aria-hidden="true" />
            <span>
              <span className="font-semibold">You're offline.</span>{" "}
              {copy === "ready"
                ? "Answer keys, practice and saved questions still work."
                : "This page keeps working, but reloading needs a connection."}
            </span>
          </p>
        </div>
      )}
    </div>
  )
}
