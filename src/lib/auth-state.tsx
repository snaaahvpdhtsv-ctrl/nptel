import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  updateProfile,
  getIdTokenResult,
  type User,
} from "firebase/auth"
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore"
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import {
  AuthContext,
  type AuthFailure,
  type AuthResult,
  type AuthState,
  type SessionUser,
  type SignUpInput,
} from "./auth-context"
import {
  firebaseAuth,
  firebaseConfigError,
  firebaseConfigured,
  firestore,
} from "./firebase"

const configFailure: AuthFailure = {
  ok: false,
  error: firebaseConfigError || "Firebase is not configured.",
}
const profileSyncWarning =
  "Your account is signed in, but your profile couldn't sync. Check your connection."

function authFailure(error: unknown): AuthFailure {
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? String(error.code)
      : ""

  switch (code) {
    case "auth/email-already-in-use":
      return {
        ok: false,
        field: "email",
        code: "account-exists",
        error: "An account with this email already exists. Sign in instead.",
      }
    case "auth/invalid-email":
      return {
        ok: false,
        field: "email",
        error: "Enter a valid email address.",
      }
    case "auth/weak-password":
      return {
        ok: false,
        field: "password",
        error: "Choose a stronger password with at least 6 characters.",
      }
    case "auth/invalid-credential":
    case "auth/user-not-found":
    case "auth/wrong-password":
      return { ok: false, error: "Email or password is incorrect." }
    case "auth/unauthorized-domain":
      return {
        ok: false,
        error: "This website is not authorized for Firebase sign-in.",
      }
    case "auth/operation-not-allowed":
      return {
        ok: false,
        error: "This sign-in method is not enabled for this Firebase project.",
      }
    case "auth/operation-not-supported-in-this-environment":
      return {
        ok: false,
        error:
          "Google sign-in pop-ups aren't supported in this browser. Try a current browser with pop-ups enabled.",
      }
    case "auth/invalid-api-key":
      return {
        ok: false,
        error: "Firebase configuration is invalid for this deployment.",
      }
    case "auth/app-not-authorized":
      return {
        ok: false,
        error: "This app isn't authorized for Firebase Authentication.",
      }
    case "auth/popup-closed-by-user":
      return { ok: false, error: "Google sign-in was cancelled." }
    case "auth/cancelled-popup-request":
      return {
        ok: false,
        error:
          "Another Google sign-in request is already in progress. Close it and try again.",
      }
    case "auth/popup-blocked":
      return {
        ok: false,
        error:
          "Your browser blocked the Google sign-in window. Allow pop-ups and try again.",
      }
    case "auth/network-request-failed":
      return {
        ok: false,
        error: "Couldn't reach Firebase. Check your connection and try again.",
      }
    default:
      return {
        ok: false,
        error: "Sign-in couldn't be completed. Please try again.",
      }
  }
}

async function toSessionUser(user: User): Promise<SessionUser> {
  const token = await getIdTokenResult(user)
  const method = user.providerData.some(
    (provider) => provider.providerId === GoogleAuthProvider.PROVIDER_ID,
  )
    ? "google"
    : "password"
  return {
    id: user.uid,
    name: user.displayName || user.email?.split("@")[0] || "Learner",
    email: user.email ?? "",
    role: token.claims.admin === true ? "admin" : "learner",
    method,
  }
}

async function createUserProfile(user: User, displayName: string) {
  if (!firestore) return
  const profileRef = doc(firestore, "users", user.uid)
  const existing = await getDoc(profileRef)
  if (existing.exists()) {
    await setDoc(profileRef, { displayName, updatedAt: serverTimestamp() }, {
      merge: true,
    })
    return
  }
  await setDoc(profileRef, {
    displayName,
    email: user.email,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null)
  const [loading, setLoading] = useState(firebaseConfigured)

  useEffect(() => {
    if (!firebaseAuth) {
      setLoading(false)
      return
    }

    let active = true
    const unsubscribe = onAuthStateChanged(
      firebaseAuth,
      async (firebaseUser) => {
        try {
          const next = firebaseUser ? await toSessionUser(firebaseUser) : null
          if (active) {
            setUser(next)
            setLoading(false)
          }
        } catch {
          if (active) {
            setUser(null)
            setLoading(false)
          }
        }
      },
      () => {
        if (active) {
          setUser(null)
          setLoading(false)
        }
      },
    )
    return () => {
      active = false
      unsubscribe()
    }
  }, [])

  const signIn = useCallback(
    async (email: string, password: string): Promise<AuthResult> => {
      if (!firebaseAuth) return configFailure
      try {
        const credential = await signInWithEmailAndPassword(
          firebaseAuth,
          email.trim(),
          password,
        )
        const sessionUser = await toSessionUser(credential.user)
        setUser(sessionUser)
        setLoading(false)
        return { ok: true, user: sessionUser }
      } catch (error) {
        return authFailure(error)
      }
    },
    [],
  )

  const signUp = useCallback(
    async ({ name, email, password }: SignUpInput): Promise<AuthResult> => {
      if (!firebaseAuth) return configFailure
      try {
        const credential = await createUserWithEmailAndPassword(
          firebaseAuth,
          email.trim(),
          password,
        )
        const displayName = name.trim()
        let warning: string | undefined
        try {
          await updateProfile(credential.user, { displayName })
          await createUserProfile(credential.user, displayName)
        } catch (error) {
          warning = profileSyncWarning
        }
        const sessionUser = {
          ...(await toSessionUser(credential.user)),
          name: displayName,
        }
        setUser(sessionUser)
        setLoading(false)
        return { ok: true, user: sessionUser, warning }
      } catch (error) {
        return authFailure(error)
      }
    },
    [],
  )

  const signInWithGoogle = useCallback(async (): Promise<AuthResult> => {
    if (!firebaseAuth) return configFailure
    try {
      const credential = await signInWithPopup(
        firebaseAuth,
        new GoogleAuthProvider(),
      )
      const sessionUser = await toSessionUser(credential.user)
      setUser(sessionUser)
      setLoading(false)
      let warning: string | undefined
      try {
        await createUserProfile(
          credential.user,
          credential.user.displayName || "Learner",
        )
      } catch (error) {
        warning = profileSyncWarning
      }
      return { ok: true, user: sessionUser, warning }
    } catch (error) {
      return authFailure(error)
    }
  }, [])

  const signInAdmin = useCallback(
    async (email: string, password: string): Promise<AuthResult> => {
      const result = await signIn(email, password)
      if (!result.ok || !firebaseAuth?.currentUser) return result
      try {
        const token = await getIdTokenResult(firebaseAuth.currentUser, true)
        if (token.claims.admin === true) {
          const adminUser = {
            ...result.user,
            role: "admin" as const,
          }
          setUser(adminUser)
          return {
            ok: true,
            user: adminUser,
          }
        }
        await firebaseSignOut(firebaseAuth)
        return {
          ok: false,
          error: "This account doesn't have admin access.",
        }
      } catch (error) {
        return authFailure(error)
      }
    },
    [signIn],
  )

  const signOut = useCallback(async (): Promise<string | null> => {
    if (!firebaseAuth) return configFailure.error
    try {
      await firebaseSignOut(firebaseAuth)
      return null
    } catch (error) {
      return authFailure(error).error
    }
  }, [])

  const value = useMemo<AuthState>(
    () => ({
      user,
      loading,
      configured: firebaseConfigured,
      signIn,
      signUp,
      signInWithGoogle,
      signInAdmin,
      signOut,
    }),
    [user, loading, signIn, signUp, signInWithGoogle, signInAdmin, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
