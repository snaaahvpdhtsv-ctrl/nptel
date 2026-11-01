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
}

export interface AuthFailure {
  ok: false
  error: string
  /** The field the error belongs to; the error is form-level when omitted. */
  field?: AuthField
  /** Lets the sign-up form offer "Sign in instead" for an existing account. */
  code?: "account-exists"
}

export type AuthResult = AuthSuccess | AuthFailure

export interface AuthState {
  /** The signed-in learner or admin, or null when signed out. */
  user: SessionUser | null
  signIn: (email: string, password: string) => Promise<AuthResult>
  signUp: (input: SignUpInput) => Promise<AuthResult>
  signInWithGoogle: () => Promise<AuthResult>
  signInAdmin: (email: string, password: string) => Promise<AuthResult>
  signOut: () => void
}

/** Preview-only admin account. It ships in the bundle, so it is public by design. */
export const PREVIEW_ADMIN = {
  name: "Admin",
  email: "admin@nptelquiz.app",
  password: "admin123",
} as const

/** Identity used by the simulated "Continue with Google". */
export const PREVIEW_GOOGLE = {
  name: "Google Learner",
  email: "learner@gmail.com",
} as const

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
