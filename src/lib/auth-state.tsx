import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"
import {
  AuthContext,
  PREVIEW_ADMIN,
  PREVIEW_GOOGLE,
  type AuthFailure,
  type AuthMethod,
  type AuthResult,
  type AuthState,
  type SessionUser,
  type SignUpInput,
} from "./auth-context"

// Preview auth: accounts and the session live in this browser's localStorage. There is no server.
const ACCOUNTS_KEY = "nptel-accounts"
const SESSION_KEY = "nptel-session"
const ADMIN_ID = "preview-admin"

interface StoredAccount {
  id: string
  name: string
  /** Trimmed and lowercased. */
  email: string
  method: AuthMethod
  /** Hex salt and SHA-256 hash; only password accounts have them. Plaintext is never stored. */
  salt?: string
  passwordHash?: string
  createdAt: string
}

const SECURE_CONTEXT_ERROR: AuthFailure = {
  ok: false,
  error: "Sign-in needs a secure (https) connection.",
}

const normalizeEmail = (email: string) => email.trim().toLowerCase()

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null

const isMethod = (value: unknown): value is AuthMethod =>
  value === "password" || value === "google"

function isAccount(value: unknown): value is StoredAccount {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    typeof value.email === "string" &&
    typeof value.createdAt === "string" &&
    isMethod(value.method) &&
    (value.method === "google" ||
      (typeof value.salt === "string" &&
        typeof value.passwordHash === "string"))
  )
}

function isSession(value: unknown): value is SessionUser {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    typeof value.email === "string" &&
    (value.role === "learner" || value.role === "admin") &&
    isMethod(value.method)
  )
}

function readJson(key: string): unknown {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

/** Storage can be blocked or full; the state then lives in memory for this tab only. */
function writeJson(key: string, value: unknown) {
  try {
    if (value === null) localStorage.removeItem(key)
    else localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Ignored on purpose: the in-memory state keeps working for this tab.
  }
}

function loadAccounts(): StoredAccount[] {
  const value = readJson(ACCOUNTS_KEY)
  return Array.isArray(value) ? value.filter(isAccount) : []
}

/** Drops corrupt sessions, learner sessions whose account is gone, and forged admin sessions. */
function loadSession(accounts: StoredAccount[]): SessionUser | null {
  const value = readJson(SESSION_KEY)
  if (!isSession(value)) return null
  if (value.role === "admin") return value.id === ADMIN_ID ? value : null
  return accounts.some((account) => account.id === value.id) ? value : null
}

const findAccount = (accounts: StoredAccount[], email: string) => {
  const key = normalizeEmail(email)
  return accounts.find((account) => account.email === key)
}

const learnerSession = (
  account: StoredAccount,
  method: AuthMethod,
): SessionUser => ({
  id: account.id,
  name: account.name,
  email: account.email,
  role: "learner",
  method,
})

const toHex = (bytes: Uint8Array) =>
  Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("")

// `crypto.subtle` only exists in secure contexts (https or localhost).
const canHash = () =>
  typeof crypto !== "undefined" && typeof crypto.subtle !== "undefined"

async function hashPassword(password: string, salt: string) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(`${salt}:${password}`),
  )
  return toHex(new Uint8Array(digest))
}

const newId = () =>
  typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`

/** Simulated network latency, like the app's other preview actions. */
const wait = (ms: number) =>
  new Promise<void>((resolve) => window.setTimeout(resolve, ms))

export function AuthProvider({ children }: { children: ReactNode }) {
  const [initial] = useState(() => {
    const accounts = loadAccounts()
    return { accounts, session: loadSession(accounts) }
  })
  // Accounts are only read inside actions, so they live in a ref instead of render state.
  const accountsRef = useRef(initial.accounts)
  const [user, setUser] = useState<SessionUser | null>(initial.session)

  // Signing in or out in another tab updates this one too.
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (
        event.key !== null &&
        event.key !== ACCOUNTS_KEY &&
        event.key !== SESSION_KEY
      )
        return
      accountsRef.current = loadAccounts()
      setUser(loadSession(accountsRef.current))
    }
    window.addEventListener("storage", onStorage)
    return () => window.removeEventListener("storage", onStorage)
  }, [])

  const startSession = useCallback((next: SessionUser): AuthResult => {
    writeJson(SESSION_KEY, next)
    setUser(next)
    return { ok: true, user: next }
  }, [])

  const addAccount = useCallback((account: StoredAccount) => {
    accountsRef.current = [...accountsRef.current, account]
    writeJson(ACCOUNTS_KEY, accountsRef.current)
  }, [])

  const signUp = useCallback(
    async ({ name, email, password }: SignUpInput): Promise<AuthResult> => {
      await wait(500)
      if (normalizeEmail(email) === PREVIEW_ADMIN.email)
        return {
          ok: false,
          field: "email",
          error: "This email is reserved for the admin account.",
        }
      const existing = findAccount(accountsRef.current, email)
      if (existing?.method === "google")
        return {
          ok: false,
          field: "email",
          error:
            "This email uses Google sign-in. Continue with Google instead.",
        }
      if (existing)
        return {
          ok: false,
          field: "email",
          code: "account-exists",
          error: "An account with this email already exists.",
        }
      if (!canHash()) return SECURE_CONTEXT_ERROR
      const salt = toHex(crypto.getRandomValues(new Uint8Array(16)))
      const account: StoredAccount = {
        id: newId(),
        name: name.trim(),
        email: normalizeEmail(email),
        method: "password",
        salt,
        passwordHash: await hashPassword(password, salt),
        createdAt: new Date().toISOString(),
      }
      addAccount(account)
      return startSession(learnerSession(account, "password"))
    },
    [addAccount, startSession],
  )

  const signIn = useCallback(
    async (email: string, password: string): Promise<AuthResult> => {
      await wait(500)
      if (normalizeEmail(email) === PREVIEW_ADMIN.email)
        return {
          ok: false,
          error: "Admins sign in with the Admin button below.",
        }
      const account = findAccount(accountsRef.current, email)
      if (account?.method === "google")
        return {
          ok: false,
          error:
            "This account uses Google sign-in. Continue with Google instead.",
        }
      if (!canHash()) return SECURE_CONTEXT_ERROR
      const matches =
        account?.salt !== undefined &&
        account.passwordHash !== undefined &&
        (await hashPassword(password, account.salt)) === account.passwordHash
      if (!account || !matches)
        return { ok: false, error: "Email or password is incorrect." }
      return startSession(learnerSession(account, "password"))
    },
    [startSession],
  )

  const signInWithGoogle = useCallback(async (): Promise<AuthResult> => {
    await wait(700)
    let account = findAccount(accountsRef.current, PREVIEW_GOOGLE.email)
    if (!account) {
      account = {
        id: newId(),
        name: PREVIEW_GOOGLE.name,
        email: PREVIEW_GOOGLE.email,
        method: "google",
        createdAt: new Date().toISOString(),
      }
      addAccount(account)
    }
    return startSession(learnerSession(account, "google"))
  }, [addAccount, startSession])

  const signInAdmin = useCallback(
    async (email: string, password: string): Promise<AuthResult> => {
      await wait(500)
      if (
        normalizeEmail(email) !== PREVIEW_ADMIN.email ||
        password !== PREVIEW_ADMIN.password
      )
        return { ok: false, error: "Admin email or password is incorrect." }
      return startSession({
        id: ADMIN_ID,
        name: PREVIEW_ADMIN.name,
        email: PREVIEW_ADMIN.email,
        role: "admin",
        method: "password",
      })
    },
    [startSession],
  )

  const signOut = useCallback(() => {
    writeJson(SESSION_KEY, null)
    setUser(null)
  }, [])

  const value = useMemo<AuthState>(
    () => ({ user, signIn, signUp, signInWithGoogle, signInAdmin, signOut }),
    [user, signIn, signUp, signInWithGoogle, signInAdmin, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
