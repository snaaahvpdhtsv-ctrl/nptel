import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
  type RefObject,
} from "react"
import {
  Navigate,
  useLocation,
  useNavigate,
  useSearchParams,
} from "react-router"
import { motion } from "motion/react"
import {
  ArrowLeft,
  ArrowRight,
  CircleAlert,
  Eye,
  EyeOff,
  Info,
  LayoutDashboard,
  LogOut,
  ShieldCheck,
  Sparkles,
} from "lucide-react"
import { useApp } from "../lib/app-context"
import {
  firstName,
  initialOf,
  useAuth,
  type AuthFailure,
  type AuthField,
  type SessionUser,
} from "../lib/auth-context"

type View = "signin" | "signup" | "admin"
type LearnerView = Exclude<View, "admin">
type FieldErrors = Partial<Record<AuthField, string>>

const VIEWS: View[] = ["signin", "signup", "admin"]
const FIELD_ORDER: AuthField[] = ["name", "email", "password", "confirm"]
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const invalidInput = "border-red-400 dark:border-red-500/70"
const textLink =
  "font-semibold text-primary-600 hover:underline disabled:pointer-events-none disabled:opacity-60 dark:text-primary-300"
const focusRing =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500"
const disabledState = "disabled:cursor-not-allowed disabled:opacity-60"

/** The router location a protected page or navbar link sent us from, as a path. */
function fromPath(state: unknown) {
  if (typeof state !== "object" || state === null || !("from" in state))
    return null
  const from = state.from
  if (typeof from !== "object" || from === null || !("pathname" in from))
    return null
  const { pathname } = from
  if (
    typeof pathname !== "string" ||
    !pathname.startsWith("/") ||
    pathname.startsWith("//")
  )
    return null
  const search =
    "search" in from && typeof from.search === "string" ? from.search : ""
  const hash = "hash" in from && typeof from.hash === "string" ? from.hash : ""
  return `${pathname}${search}${hash}`
}

/** Learners go back where they came from, never into the sign-in or admin flow. */
function learnerTarget(state: unknown) {
  const path = fromPath(state)
  return path && !path.startsWith("/signin") && !path.startsWith("/admin")
    ? path
    : "/"
}

/** Admins return to the dashboard URL they asked for, keeping its course and section. */
function adminTarget(state: unknown) {
  const path = fromPath(state)
  return path?.startsWith("/admin/dashboard") ? path : "/admin/dashboard"
}

function takeGoogleRedirectTarget() {
  try {
    const requestedTarget = sessionStorage.getItem(
      "nptel-google-redirect-target",
    )
    sessionStorage.removeItem("nptel-google-redirect-target")
    if (!requestedTarget) return null

    const url = new URL(requestedTarget, window.location.origin)
    const safePath = `${url.pathname}${url.search}${url.hash}`
    return url.origin === window.location.origin &&
      safePath.startsWith("/") &&
      !safePath.startsWith("//") &&
      !safePath.startsWith("/signin") &&
      !safePath.startsWith("/admin")
      ? safePath
      : null
  } catch {
    return null
  }
}

/** Google's multicolor "G". Brand colors are the one place raw hex values are used. */
function GoogleIcon() {
  return (
    <svg viewBox="0 0 48 48" className="size-4.5 shrink-0" aria-hidden="true">
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  )
}

interface AuthHeaderProps {
  icon: ReactNode
  tone: string
  title: string
  subtitle: string
}

function AuthHeader({ icon, tone, title, subtitle }: AuthHeaderProps) {
  return (
    <div className="text-center">
      <span
        className={`auth-header-icon mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${tone} text-white shadow-lg shadow-primary-600/30`}
      >
        {icon}
      </span>
      <h1 className="mt-4 text-2xl font-bold font-display tracking-tight text-gray-800 dark:text-white">
        {title}
      </h1>
      <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400">
        {subtitle}
      </p>
    </div>
  )
}

function FormAlert({ message }: { message: string }) {
  if (!message) return null
  return (
    <div
      role="alert"
      className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300"
    >
      <CircleAlert size={16} className="mt-0.5 shrink-0" />
      {message}
    </div>
  )
}

interface FieldProps {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  autoComplete: string
  inputRef: RefObject<HTMLInputElement | null>
  error?: string
  /** Inline action after the error, such as "Sign in instead". */
  errorAction?: ReactNode
  hint?: string
}

interface TextFieldProps extends FieldProps {
  type?: "text" | "email"
  maxLength?: number
}

const describedBy = (id: string, error?: string, hint?: string) =>
  error ? `${id}-error` : hint ? `${id}-hint` : undefined

function FieldFooter({
  id,
  error,
  errorAction,
  hint,
}: Pick<FieldProps, "id" | "error" | "errorAction" | "hint">) {
  if (error)
    return (
      <p
        id={`${id}-error`}
        className="mt-1.5 text-xs text-red-600 dark:text-red-400"
      >
        {error}
        {errorAction && <> {errorAction}</>}
      </p>
    )
  if (hint)
    return (
      <p
        id={`${id}-hint`}
        className="mt-1.5 text-xs text-gray-500 dark:text-gray-400"
      >
        {hint}
      </p>
    )
  return null
}

function TextField({
  id,
  label,
  value,
  onChange,
  autoComplete,
  inputRef,
  error,
  errorAction,
  hint,
  type = "text",
  maxLength,
}: TextFieldProps) {
  return (
    <div>
      <label htmlFor={id} className="label">
        {label}
      </label>
      <input
        ref={inputRef}
        id={id}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        autoComplete={autoComplete}
        maxLength={maxLength}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, error, hint)}
        className={`input ${error ? invalidInput : ""}`}
      />
      <FieldFooter
        id={id}
        error={error}
        errorAction={errorAction}
        hint={hint}
      />
    </div>
  )
}

function PasswordField({
  id,
  label,
  value,
  onChange,
  autoComplete,
  inputRef,
  error,
  hint,
}: FieldProps) {
  const [visible, setVisible] = useState(false)
  return (
    <div>
      <label htmlFor={id} className="label">
        {label}
      </label>
      <div className="relative">
        <input
          ref={inputRef}
          id={id}
          type={visible ? "text" : "password"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          autoComplete={autoComplete}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(id, error, hint)}
          className={`input pr-11 ${error ? invalidInput : ""}`}
        />
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? "Hide password" : "Show password"}
          className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-xl text-gray-400 transition-colors hover:text-gray-700 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary-500 dark:hover:text-gray-200"
        >
          {visible ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
      <FieldFooter id={id} error={error} hint={hint} />
    </div>
  )
}

interface LearnerAuthProps {
  view: LearnerView
  redirectTo: string
  onSwitch: (view: View) => void
  onSuccess: (message: string, warning?: string) => void
}

function LearnerAuth({
  view,
  redirectTo,
  onSwitch,
  onSuccess,
}: LearnerAuthProps) {
  const { signIn, signUp, signInWithGoogle, configured } = useAuth()
  const [name, setName] = useState("")
  // Shared by both forms, so switching between sign in and sign up keeps it.
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [errors, setErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState("")
  const [accountExists, setAccountExists] = useState(false)
  const [pending, setPending] = useState<"form" | "google" | null>(null)
  const nameRef = useRef<HTMLInputElement>(null)
  const emailRef = useRef<HTMLInputElement>(null)
  const passwordRef = useRef<HTMLInputElement>(null)
  const confirmRef = useRef<HTMLInputElement>(null)
  const refs: Record<AuthField, RefObject<HTMLInputElement | null>> = {
    name: nameRef,
    email: emailRef,
    password: passwordRef,
    confirm: confirmRef,
  }
  const signingUp = view === "signup"
  const busy = pending !== null

  // Editing a field clears its error and any form-level message.
  const edit =
    (field: AuthField, setValue: (value: string) => void) =>
    (value: string) => {
      setValue(value)
      setErrors((current) => ({ ...current, [field]: undefined }))
      setFormError("")
      if (field === "email") setAccountExists(false)
    }

  const switchTo = (next: LearnerView) => {
    if (next === view || busy) return
    setPassword("")
    setConfirm("")
    setErrors({})
    setFormError("")
    setAccountExists(false)
    onSwitch(next)
  }

  const showFailure = (result: AuthFailure) => {
    if (!result.field) return setFormError(result.error)
    setErrors({ [result.field]: result.error })
    setAccountExists(result.code === "account-exists")
    refs[result.field].current?.focus()
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (busy) return
    const next: FieldErrors = {}
    if (signingUp && !name.trim()) next.name = "Enter your name."
    if (!EMAIL_PATTERN.test(email.trim()))
      next.email = "Enter a valid email address."
    if (signingUp) {
      if (password.length < 8) next.password = "Use at least 8 characters."
      if (!confirm) next.confirm = "Confirm your password."
      else if (confirm !== password) next.confirm = "Passwords don't match."
    } else if (!password) next.password = "Enter your password."
    setErrors(next)
    setFormError("")
    setAccountExists(false)
    const firstInvalid = FIELD_ORDER.find((field) => next[field])
    if (firstInvalid) return refs[firstInvalid].current?.focus()

    setPending("form")
    const result = signingUp
      ? await signUp({ name, email, password })
      : await signIn(email, password)
    setPending(null)
    if (!result.ok) return showFailure(result)
    const first = firstName(result.user.name)
    onSuccess(
      signingUp
        ? `Account created — welcome, ${first}`
        : `Welcome back, ${first}`,
      result.warning,
    )
  }

  const continueWithGoogle = async () => {
    if (busy) return
    setErrors({})
    setFormError("")
    setAccountExists(false)
    setPending("google")
    const result = await signInWithGoogle(redirectTo)
    setPending(null)
    if ("redirecting" in result) return
    if (result.ok) onSuccess("Signed in with Google", result.warning)
    else setFormError(result.error)
  }

  return (
    <>
      <AuthHeader
        icon={<Sparkles size={24} />}
        tone="from-primary-600 via-primary-500 to-accent-500"
        title={signingUp ? "Create your account" : "Welcome back"}
        subtitle={
          signingUp
            ? "Join NPTEL Quiz to practise every course."
            : "Sign in to continue to NPTEL Quiz."
        }
      />

      <div
        role="group"
        aria-label="Account"
        className="mt-6 grid grid-cols-2 gap-1 rounded-xl bg-gray-100 p-1 dark:bg-white/5"
      >
        {(["signin", "signup"] as const).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => switchTo(key)}
            aria-pressed={view === key}
            disabled={busy}
            className={`rounded-lg py-2 text-sm font-semibold transition-colors ${focusRing} ${disabledState} ${
              view === key
                ? "bg-white text-gray-900 shadow-sm dark:bg-white/15 dark:text-white"
                : "text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white"
            }`}
          >
            {key === "signin" ? "Sign in" : "Sign up"}
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={continueWithGoogle}
        disabled={busy}
        className={`btn-outline mt-5 w-full py-3 text-sm ${disabledState}`}
      >
        <GoogleIcon />
        {pending === "google"
          ? "Connecting to Google…"
          : "Continue with Google"}
      </button>
      {!configured && (
        <FormAlert message="Firebase authentication is not configured for this deployment." />
      )}

      <div className="my-5 flex items-center gap-3 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
        <span
          className="h-px flex-1 bg-gray-200 dark:bg-white/10"
          aria-hidden="true"
        />
        or
        <span
          className="h-px flex-1 bg-gray-200 dark:bg-white/10"
          aria-hidden="true"
        />
      </div>

      <form onSubmit={submit} noValidate className="space-y-4">
        {signingUp && (
          <TextField
            id="signup-name"
            label="Full name"
            value={name}
            onChange={edit("name", setName)}
            autoComplete="name"
            maxLength={60}
            inputRef={nameRef}
            error={errors.name}
          />
        )}
        <TextField
          id="auth-email"
          label="Email"
          type="email"
          value={email}
          onChange={edit("email", setEmail)}
          autoComplete="email"
          inputRef={emailRef}
          error={errors.email}
          errorAction={
            accountExists ? (
              <button
                type="button"
                onClick={() => switchTo("signin")}
                className={textLink}
              >
                Sign in instead
              </button>
            ) : undefined
          }
        />
        <PasswordField
          id="auth-password"
          label="Password"
          value={password}
          onChange={edit("password", setPassword)}
          autoComplete={signingUp ? "new-password" : "current-password"}
          inputRef={passwordRef}
          error={errors.password}
          hint={signingUp ? "At least 8 characters" : undefined}
        />
        {signingUp && (
          <PasswordField
            id="signup-confirm"
            label="Confirm password"
            value={confirm}
            onChange={edit("confirm", setConfirm)}
            autoComplete="new-password"
            inputRef={confirmRef}
            error={errors.confirm}
          />
        )}
        <FormAlert message={formError} />
        <button
          type="submit"
          disabled={busy}
          className={`btn-primary w-full py-3 text-sm ${disabledState}`}
        >
          {pending === "form"
            ? signingUp
              ? "Creating account…"
              : "Signing in…"
            : signingUp
              ? "Create account"
              : "Sign in"}
        </button>
      </form>

      <p className="mt-5 text-center text-sm text-gray-500 dark:text-gray-400">
        {signingUp ? "Already have an account? " : "New to NPTEL Quiz? "}
        <button
          type="button"
          onClick={() => switchTo(signingUp ? "signin" : "signup")}
          disabled={busy}
          className={textLink}
        >
          {signingUp ? "Sign in" : "Create an account"}
        </button>
      </p>

      <p className="mt-4 flex items-start gap-2 rounded-xl bg-gray-50 px-3 py-2.5 text-xs text-gray-500 dark:bg-white/[0.035] dark:text-gray-400">
        <Info size={14} className="mt-0.5 shrink-0" />
        Your account is managed securely by Firebase. You can browse published
        courses without signing in.
      </p>
    </>
  )
}

interface AdminAuthProps {
  /** A learner who is signed in right now; signing in as admin replaces that session. */
  signedInAs?: string
  onBack: () => void
  onSuccess: () => void
}

function AdminAuth({ signedInAs, onBack, onSuccess }: AdminAuthProps) {
  const { signInAdmin } = useAuth()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [errors, setErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState("")
  const [pending, setPending] = useState(false)
  const emailRef = useRef<HTMLInputElement>(null)
  const passwordRef = useRef<HTMLInputElement>(null)

  const edit =
    (field: AuthField, setValue: (value: string) => void) =>
    (value: string) => {
      setValue(value)
      setErrors((current) => ({ ...current, [field]: undefined }))
      setFormError("")
    }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (pending) return
    const next: FieldErrors = {}
    if (!EMAIL_PATTERN.test(email.trim()))
      next.email = "Enter a valid email address."
    if (!password) next.password = "Enter your password."
    setErrors(next)
    setFormError("")
    if (next.email) return emailRef.current?.focus()
    if (next.password) return passwordRef.current?.focus()

    setPending(true)
    const result = await signInAdmin(email, password)
    setPending(false)
    if (result.ok) onSuccess()
    else setFormError(result.error)
  }

  return (
    <>
      <AuthHeader
        icon={<ShieldCheck size={26} />}
        tone="from-primary-500 to-fuchsia-500"
        title="Admin sign in"
        subtitle="Manage courses, weeks and questions."
      />

      {signedInAs && (
        <p className="mt-5 flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2.5 text-xs text-amber-800 dark:bg-amber-500/10 dark:text-amber-200">
          <Info size={14} className="mt-0.5 shrink-0" />
          You're signed in as {signedInAs}. Signing in as admin switches
          accounts.
        </p>
      )}

      <div className="mt-6 rounded-xl border border-dashed border-gray-300 px-3 py-2.5 text-xs text-gray-500 dark:border-white/15 dark:text-gray-400">
        Admin access is granted by a trusted administrator and verified by
        Firebase. A regular account cannot access the dashboard.
      </div>

      <form onSubmit={submit} noValidate className="mt-5 space-y-4">
        <TextField
          id="admin-email"
          label="Admin email"
          type="email"
          value={email}
          onChange={edit("email", setEmail)}
          autoComplete="username"
          inputRef={emailRef}
          error={errors.email}
        />
        <PasswordField
          id="admin-password"
          label="Password"
          value={password}
          onChange={edit("password", setPassword)}
          autoComplete="current-password"
          inputRef={passwordRef}
          error={errors.password}
        />
        <FormAlert message={formError} />
        <button
          type="submit"
          disabled={pending}
          className={`btn-primary w-full py-3 text-sm ${disabledState}`}
        >
          {pending ? "Signing in…" : "Sign in to dashboard"}
        </button>
      </form>

      <div className="mt-6 flex justify-center border-t border-gray-200/80 pt-4 dark:border-white/10">
        <button
          type="button"
          onClick={onBack}
          className="btn-ghost px-3 py-1.5 text-xs"
        >
          <ArrowLeft size={14} />
          Back to learner sign in
        </button>
      </div>
    </>
  )
}

interface SignedInCardProps {
  user: SessionUser
  onContinue: () => void
  onDashboard: () => void
  onSignOut: () => void
}

function SignedInCard({
  user,
  onContinue,
  onDashboard,
  onSignOut,
}: SignedInCardProps) {
  const admin = user.role === "admin"
  return (
    <div className="text-center">
      <span className="auth-account-avatar mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-primary-600 to-accent-500 font-display text-xl font-bold text-white shadow-lg shadow-primary-600/30">
        {initialOf(user.name)}
      </span>
      <h1 className="mt-4 text-xl font-bold font-display tracking-tight text-gray-800 dark:text-white">
        You're signed in as {user.name}
      </h1>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        {user.email}
      </p>
      <div className="mt-6 grid gap-2">
        {admin && (
          <button
            type="button"
            onClick={onDashboard}
            className="btn-primary w-full py-2.5 text-sm"
          >
            <LayoutDashboard size={16} />
            Open dashboard
          </button>
        )}
        <button
          type="button"
          onClick={onContinue}
          className={`${
            admin ? "btn-outline" : "btn-primary"
          } w-full py-2.5 text-sm`}
        >
          Continue
          <ArrowRight size={16} />
        </button>
        <button
          type="button"
          onClick={onSignOut}
          className="btn-outline w-full py-2.5 text-sm"
        >
          <LogOut size={16} />
          Sign out
        </button>
      </div>
    </div>
  )
}

export default function SignInPage() {
  const [params, setParams] = useSearchParams()
  const location = useLocation()
  const navigate = useNavigate()
  const {
    user,
    loading,
    signOut,
    googleRedirectResult,
    acknowledgeGoogleRedirect,
  } = useAuth()
  const { toast } = useApp()
  const [redirectError, setRedirectError] = useState("")
  const handledRedirect = useRef(false)
  const requested = params.get("view") as View | null
  const view = requested && VIEWS.includes(requested) ? requested : "signin"

  // Leaving mid-request (e.g. through the navbar) must not cause a late redirect.
  const alive = useRef(true)
  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
    }
  }, [])

  // Views replace each other in history, so Back leaves the page; `from` rides along.
  const switchView = (next: View) =>
    setParams(next === "signin" ? {} : { view: next }, {
      replace: true,
      state: location.state,
    })

  const finish = (message: string, to: string, warning?: string) => {
    if (!alive.current) return
    toast(message)
    if (warning) toast(warning, "error")
    navigate(to, { replace: true })
  }

  useEffect(() => {
    if (
      loading ||
      !user ||
      view === "admin" ||
      googleRedirectResult?.status === "success"
    )
      return

    navigate(takeGoogleRedirectTarget() ?? learnerTarget(location.state), {
      replace: true,
    })
  }, [googleRedirectResult, loading, location.state, navigate, user, view])

  useEffect(() => {
    if (loading || !googleRedirectResult || handledRedirect.current) return
    handledRedirect.current = true
    acknowledgeGoogleRedirect()

    if (googleRedirectResult.status === "error") {
      setRedirectError(googleRedirectResult.error)
      return
    }

    const target = takeGoogleRedirectTarget() ?? learnerTarget(location.state)
    finish("Signed in with Google", target, googleRedirectResult.warning)
  }, [
    acknowledgeGoogleRedirect,
    googleRedirectResult,
    loading,
    location.state,
    navigate,
    toast,
  ])

  if (loading)
    return (
      <div
        className="learner-page learner-auth mx-auto max-w-md px-4 py-12 sm:py-16"
        role="status"
      >
        <div className="card p-6 text-center text-sm text-gray-500 dark:text-gray-400">
          Checking your sign-in…
        </div>
      </div>
    )

  if (view === "admin" && user?.role === "admin")
    return <Navigate to={adminTarget(location.state)} replace />

  return (
    <div className="learner-page learner-auth mx-auto max-w-md px-4 py-12 sm:py-16">
      <motion.div
        key={view === "admin" ? "admin" : "learner"}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="card p-6 sm:p-8"
      >
        {view === "admin" ? (
          <AdminAuth
            signedInAs={user?.name}
            onBack={() => switchView("signin")}
            onSuccess={() =>
              finish("Signed in as admin", adminTarget(location.state))
            }
          />
        ) : (
          <>
            {redirectError && <FormAlert message={redirectError} />}
            {user ? (
              <SignedInCard
                user={user}
                onContinue={() =>
                  navigate(learnerTarget(location.state), { replace: true })
                }
                onDashboard={() => navigate("/admin/dashboard")}
                onSignOut={() => {
                  void signOut().then((error) =>
                    error ? toast(error, "error") : toast("Signed out"),
                  )
                }}
              />
            ) : (
              <LearnerAuth
                view={view}
                redirectTo={learnerTarget(location.state)}
                onSwitch={switchView}
                onSuccess={(message, warning) =>
                  finish(message, learnerTarget(location.state), warning)
                }
              />
            )}
            {/* Admin sign-in stays hidden until this button is pressed. */}
            {user?.role !== "admin" && (
              <div className="mt-6 flex justify-center border-t border-gray-200/80 pt-4 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => switchView("admin")}
                  title="Sign in as an admin"
                  className="btn-ghost px-3 py-1.5 text-xs"
                >
                  <ShieldCheck size={14} />
                  Admin
                </button>
              </div>
            )}
          </>
        )}
      </motion.div>
    </div>
  )
}
