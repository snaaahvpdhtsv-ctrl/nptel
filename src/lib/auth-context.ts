import { createContext, useContext } from "react"

export type Role = "learner" | "admin"
export type AuthMethod = "password" | "google"
export type AuthField = "name" | "email" | "password" | "confirm"

export interface SessionUser {
  id: string
  name: string
  email: string
  role: Role
  method: AuthMethod
}

export interface SignUpInput {
  name: string
  email: string
  password: string
}

export interface AuthSuccess {
  ok: true
  user: SessionUser
  warning?: string
}

export interface AuthFailure {
  ok: false
  error: string
  /** The field the error belongs to; the error is form-level when omitted. */
  field?: AuthField
  /** Lets the sign-up form offer "Sign in instead" for an existing account. */
  code?: "account-exists"
}

export interface AuthRedirecting {
  redirecting: true
}

export type AuthResult = AuthSuccess | AuthFailure
export type GoogleAuthResult = AuthResult | AuthRedirecting

export interface GoogleRedirectSuccess {
  status: "success"
  warning?: string
}

export interface GoogleRedirectFailure {
  status: "error"
  error: string
}

export type GoogleRedirectResult = GoogleRedirectSuccess | GoogleRedirectFailure

export interface AuthState {
  /** The signed-in learner or admin, or null when signed out. */
  user: SessionUser | null
  loading: boolean
  configured: boolean
  googleRedirectResult: GoogleRedirectResult | null
  signIn: (email: string, password: string) => Promise<AuthResult>
  signUp: (input: SignUpInput) => Promise<AuthResult>
  signInWithGoogle: (redirectTo: string) => Promise<GoogleAuthResult>
  acknowledgeGoogleRedirect: () => void
  signInAdmin: (email: string, password: string) => Promise<AuthResult>
  signOut: () => Promise<string | null>
}

export const firstName = (name: string) => name.trim().split(/\s+/)[0] || name

export const initialOf = (name: string) =>
  name.trim().charAt(0).toUpperCase() || "?"

// Lives apart from AuthProvider so hot-reloading the provider never creates a second context object.
export const AuthContext = createContext<AuthState | null>(null)

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error("useAuth must be used within AuthProvider")
  return context
}
