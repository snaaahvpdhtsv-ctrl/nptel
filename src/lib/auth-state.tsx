import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  onAuthStateChanged,
  getRedirectResult,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  signOut as firebaseSignOut,
  updateProfile,
  getIdTokenResult,
  type Auth,
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
  type GoogleAuthResult,
  type GoogleRedirectResult,
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
import { recordAuthDiagnostic } from "./auth-diagnostics"

const configFailure: AuthFailure = {
  ok: false,
  error: firebaseConfigError || "Firebase is not configured.",
}
const profileSyncWarning =
  "Your account is signed in, but your profile couldn't sync. Check your connection."
const googleRedirectTargetKey = "nptel-google-redirect-target"
const googleProvider = new GoogleAuthProvider()
let redirectResultPromise: ReturnType<typeof getRedirectResult> | null = null

function getInitialRedirectResult(auth: Auth) {
  redirectResultPromise ??= getRedirectResult(auth)
  return redirectResultPromise
}

function errorCode(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error
    ? String(error.code)
    : ""
}

function authFailure(error: unknown): AuthFailure {
  const code = errorCode(error)

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

function toSessionUser(
  user: User,
  role: SessionUser["role"] = "learner",
): SessionUser {
  const method = user.providerData.some(
    (provider) => provider.providerId === GoogleAuthProvider.PROVIDER_ID,
  )
    ? "google"
    : "password"
  return {
    id: user.uid,
    name: user.displayName || user.email?.split("@")[0] || "Learner",
    email: user.email ?? "",
    role,
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
  const [adminClaimsLoading, setAdminClaimsLoading] = useState(false)
  const [googleRedirectResult, setGoogleRedirectResult] =
    useState<GoogleRedirectResult | null>(null)

  const refreshAdminClaims = useCallback(async () => {
    const firebaseUser = firebaseAuth?.currentUser
    if (!firebaseUser) return false
    setAdminClaimsLoading(true)
    try {
      const token = await getIdTokenResult(firebaseUser, true)
      const isAdmin = token.claims.admin === true
      recordAuthDiagnostic("admin.claims.refresh.completed", {
        adminClaim: isAdmin,
      })
      setUser((current) =>
        current?.id === firebaseUser.uid
          ? { ...current, role: isAdmin ? "admin" : "learner" }
          : current,
      )
      return isAdmin
    } catch (error) {
      recordAuthDiagnostic("admin.claims.refresh.error", {
        errorCode: errorCode(error) || "unknown",
      })
      return false
    } finally {
      setAdminClaimsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!firebaseAuth) {
      recordAuthDiagnostic("auth.initialization.unavailable", {
        firebaseConfigured,
      })
      setLoading(false)
      return
    }

    const auth = firebaseAuth
    let active = true
    let authEventSequence = 0
    let initializationCompleted = false
    const syncingProfiles = new Set<string>()
    recordAuthDiagnostic("auth.initialization.started", {
      currentUserPresent: Boolean(auth.currentUser),
      persistence: "browserLocalPersistence",
    })
    recordAuthDiagnostic("auth.state-listener.registered")
    const unsubscribe = onAuthStateChanged(
      auth,
      (firebaseUser) => {
        if (!active) return
        const eventSequence = ++authEventSequence
        const userPresent = Boolean(firebaseUser)
        recordAuthDiagnostic("auth.state.changed", {
          userPresent,
          providerIds:
            firebaseUser?.providerData
              .map(({ providerId }) => providerId)
              .join(",") || null,
          currentUserPresent: Boolean(auth.currentUser),
          eventSequence,
        })

        // Publish the Firebase session before any network-dependent claim or profile work.
        setUser(firebaseUser ? toSessionUser(firebaseUser) : null)
        setLoading(false)
        setAdminClaimsLoading(Boolean(firebaseUser))
        recordAuthDiagnostic("auth.state.processed", {
          userPresent,
          currentUserPresent: Boolean(auth.currentUser),
          eventSequence,
        })
        if (!initializationCompleted) {
          initializationCompleted = true
          recordAuthDiagnostic("auth.initialization.completed", {
            userPresent,
            eventSequence,
          })
        }

        if (!firebaseUser) return

        const uid = firebaseUser.uid
        recordAuthDiagnostic("auth.id-token.started", {
          eventSequence,
        })
        void getIdTokenResult(firebaseUser, true)
          .then((token) => {
            const isAdmin = token.claims.admin === true
            recordAuthDiagnostic("auth.id-token.completed", {
              adminClaim: isAdmin,
              eventSequence,
            })
            if (active && authEventSequence === eventSequence)
              setUser((current) =>
                current?.id === uid
                  ? { ...current, role: isAdmin ? "admin" : "learner" }
                  : current,
              )
          })
          .catch((error: unknown) => {
            recordAuthDiagnostic("auth.id-token.error", {
              errorCode: errorCode(error) || "unknown",
              eventSequence,
            })
          })
          .finally(() => {
            if (active && authEventSequence === eventSequence)
              setAdminClaimsLoading(false)
          })

        if (syncingProfiles.has(uid)) return
        syncingProfiles.add(uid)
        recordAuthDiagnostic("auth.profile-sync.started", {
          eventSequence,
        })
        void createUserProfile(
          firebaseUser,
          firebaseUser.displayName || "Learner",
        )
          .then(() =>
            recordAuthDiagnostic("auth.profile-sync.completed", {
              eventSequence,
            }),
          )
          .catch((error: unknown) => {
            recordAuthDiagnostic("auth.profile-sync.error", {
              errorCode: errorCode(error) || "unknown",
              eventSequence,
            })
            console.warn(profileSyncWarning)
          })
          .finally(() => syncingProfiles.delete(uid))
      },
      (error) => {
        if (!active) return
        recordAuthDiagnostic("auth.state.error", {
          errorCode: errorCode(error) || "unknown",
          currentUserPresent: Boolean(auth.currentUser),
        })
        const currentUser = auth.currentUser
        if (currentUser) setUser(toSessionUser(currentUser))
        setLoading(false)
        setAdminClaimsLoading(false)
        if (!initializationCompleted) {
          initializationCompleted = true
          recordAuthDiagnostic("auth.initialization.completed", {
            userPresent: Boolean(currentUser),
            observerError: true,
          })
        }
      },
    )

    recordAuthDiagnostic("auth.redirect-result.started", {
      currentUserPresent: Boolean(auth.currentUser),
    })
    void getInitialRedirectResult(auth)
      .then((credential) => {
        if (!active) return
        recordAuthDiagnostic("auth.redirect-result.completed", {
          returnedUser: Boolean(credential?.user),
          currentUserPresent: Boolean(auth.currentUser),
        })
        if (credential) setGoogleRedirectResult({ status: "success" })
      })
      .catch((error: unknown) => {
        if (!active) return
        recordAuthDiagnostic("auth.redirect-result.error", {
          errorCode: errorCode(error) || "unknown",
          currentUserPresent: Boolean(auth.currentUser),
        })
        try {
          sessionStorage.removeItem(googleRedirectTargetKey)
        } catch {
          // The visible authentication error is more useful than a storage error.
        }
        setGoogleRedirectResult({
          status: "error",
          error: authFailure(error).error,
        })
      })

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
        const sessionUser = toSessionUser(credential.user)
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
        } catch (error) {
          warning = profileSyncWarning
        }
        void createUserProfile(credential.user, displayName)
          .then(() =>
            recordAuthDiagnostic("auth.profile-sync.completed", {
              stage: "sign-up",
            }),
          )
          .catch((error: unknown) => {
            recordAuthDiagnostic("auth.profile-sync.error", {
              errorCode: errorCode(error) || "unknown",
              stage: "sign-up",
            })
          })
        const sessionUser = {
          ...toSessionUser(credential.user),
          name: displayName,
        }
        return { ok: true, user: sessionUser, warning }
      } catch (error) {
        return authFailure(error)
      }
    },
    [],
  )

  const signInWithGoogle = useCallback(
    async (redirectTo: string): Promise<GoogleAuthResult> => {
      if (!firebaseAuth) return configFailure
      recordAuthDiagnostic("google.button.requested", {
        currentUserPresent: Boolean(firebaseAuth.currentUser),
      })
      try {
        recordAuthDiagnostic("google.popup.invoked", {
          currentUserPresent: Boolean(firebaseAuth.currentUser),
        })
        const credential = await signInWithPopup(firebaseAuth, googleProvider)
        recordAuthDiagnostic("google.popup.completed", {
          returnedUser: Boolean(credential.user),
          currentUserPresent: Boolean(firebaseAuth.currentUser),
        })
        return { ok: true, user: toSessionUser(credential.user) }
      } catch (error) {
        const code = errorCode(error)
        recordAuthDiagnostic("google.popup.error", {
          errorCode: code || "unknown",
          currentUserPresent: Boolean(firebaseAuth.currentUser),
        })
        if (
          code === "auth/popup-blocked" ||
          code === "auth/operation-not-supported-in-this-environment"
        ) {
          try {
            sessionStorage.setItem(googleRedirectTargetKey, redirectTo)
          } catch {
            recordAuthDiagnostic("google.redirect-target-storage.error", {
              stage: "before-redirect",
            })
            return {
              ok: false,
              error:
                "Google sign-in couldn't open a pop-up, and this browser couldn't save your return page for redirect sign-in.",
            }
          }
          try {
            recordAuthDiagnostic("google.redirect.invoked", {
              currentUserPresent: Boolean(firebaseAuth.currentUser),
            })
            await signInWithRedirect(firebaseAuth, googleProvider)
            recordAuthDiagnostic("google.redirect.returned", {
              currentUserPresent: Boolean(firebaseAuth.currentUser),
            })
            return { redirecting: true }
          } catch (redirectError) {
            recordAuthDiagnostic("google.redirect.error", {
              errorCode: errorCode(redirectError) || "unknown",
              currentUserPresent: Boolean(firebaseAuth.currentUser),
            })
            try {
              sessionStorage.removeItem(googleRedirectTargetKey)
            } catch {
              // Preserve the Firebase redirect error for the user.
            }
            return authFailure(redirectError)
          }
        }
        return authFailure(error)
      }
    },
    [],
  )

  const acknowledgeGoogleRedirect = useCallback(
    () => setGoogleRedirectResult(null),
    [],
  )

  const signInAdmin = useCallback(
    async (email: string, password: string): Promise<AuthResult> => {
      const result = await signIn(email, password)
      if (!result.ok || !firebaseAuth?.currentUser) return result
      try {
        recordAuthDiagnostic("admin.claims.refresh.started", {
          currentUserPresent: true,
        })
        const token = await getIdTokenResult(firebaseAuth.currentUser, true)
        const isAdmin = token.claims.admin === true
        recordAuthDiagnostic("admin.claims.refresh.completed", {
          adminClaim: isAdmin,
        })
        if (isAdmin) {
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
        recordAuthDiagnostic("admin.claims.refresh.error", {
          errorCode: errorCode(error) || "unknown",
        })
        return authFailure(error)
      }
    },
    [signIn],
  )

  const signOut = useCallback(async (): Promise<string | null> => {
    if (!firebaseAuth) return configFailure.error
    try {
      recordAuthDiagnostic("auth.sign-out.requested", {
        currentUserPresent: Boolean(firebaseAuth.currentUser),
      })
      await firebaseSignOut(firebaseAuth)
      recordAuthDiagnostic("auth.sign-out.completed", {
        currentUserPresent: Boolean(firebaseAuth.currentUser),
      })
      return null
    } catch (error) {
      recordAuthDiagnostic("auth.sign-out.error", {
        errorCode: errorCode(error) || "unknown",
      })
      return authFailure(error).error
    }
  }, [])

  const value = useMemo<AuthState>(
    () => ({
      user,
      loading,
      adminClaimsLoading,
      configured: firebaseConfigured,
      googleRedirectResult,
      signIn,
      signUp,
      signInWithGoogle,
      acknowledgeGoogleRedirect,
      signInAdmin,
      refreshAdminClaims,
      signOut,
    }),
    [
      user,
      loading,
      adminClaimsLoading,
      googleRedirectResult,
      signIn,
      signUp,
      signInWithGoogle,
      acknowledgeGoogleRedirect,
      refreshAdminClaims,
      signInAdmin,
      signOut,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
