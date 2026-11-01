import { FirebaseError, getApp, getApps, initializeApp } from "firebase/app"
import {
  browserPopupRedirectResolver,
  browserLocalPersistence,
  connectAuthEmulator,
  getAuth,
  initializeAuth,
  type Auth,
} from "firebase/auth"
import {
  connectFirestoreEmulator,
  getFirestore,
  type Firestore,
} from "firebase/firestore"
import { recordAuthDiagnostic } from "./auth-diagnostics"

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

const requiredConfig = Object.entries(config).filter(([, value]) => !value)
export const firebaseConfigured = requiredConfig.length === 0
export const firebaseConfigError = firebaseConfigured
  ? ""
  : `Firebase configuration is missing: ${requiredConfig.map(([key]) => key).join(", ")}.`

function browserStorageAvailable(kind: "local" | "session") {
  try {
    const storage =
      kind === "local" ? window.localStorage : window.sessionStorage
    const key = "__nptel_auth_storage_check__"
    storage.setItem(key, "1")
    storage.removeItem(key)
    return true
  } catch {
    return false
  }
}

recordAuthDiagnostic("firebase.initialize", {
  configured: firebaseConfigured,
  missingConfigCount: requiredConfig.length,
  authDomain: config.authDomain || null,
  origin: typeof window === "undefined" ? null : window.location.origin,
  localStorageAvailable:
    typeof window !== "undefined" && browserStorageAvailable("local"),
  sessionStorageAvailable:
    typeof window !== "undefined" && browserStorageAvailable("session"),
})

const app = firebaseConfigured
  ? getApps().length
    ? getApp()
    : initializeApp(config)
  : null

let authInstance: Auth | null = null
if (app) {
  try {
    authInstance = initializeAuth(app, {
      persistence: browserLocalPersistence,
      popupRedirectResolver: browserPopupRedirectResolver,
    })
  } catch (error) {
    if (
      error instanceof FirebaseError &&
      error.code === "auth/already-initialized"
    ) {
      authInstance = getAuth(app)
      recordAuthDiagnostic("firebase.auth.reused", {
        persistenceConfiguredByThisModule: false,
      })
    } else {
      recordAuthDiagnostic("firebase.auth.initialize.error", {
        errorCode: error instanceof FirebaseError ? error.code : "unknown",
      })
      throw error
    }
  }
}

export const firebaseApp = app
export const firebaseAuth = authInstance
export const firestore = app ? getFirestore(app) : null

recordAuthDiagnostic("firebase.auth.initialized", {
  available: Boolean(firebaseAuth),
  persistence: firebaseAuth ? "browserLocalPersistence" : null,
  popupRedirectResolver: Boolean(firebaseAuth),
})

if (import.meta.env.DEV && firebaseAuth) {
  const authEmulatorUrl = import.meta.env.VITE_FIREBASE_AUTH_EMULATOR_URL
  if (authEmulatorUrl)
    connectAuthEmulator(firebaseAuth, authEmulatorUrl, {
      disableWarnings: true,
    })
}

if (import.meta.env.DEV && firestore) {
  const firestoreEmulatorHost = import.meta.env
    .VITE_FIREBASE_FIRESTORE_EMULATOR_HOST
  if (firestoreEmulatorHost) {
    const [host, rawPort] = firestoreEmulatorHost.split(":")
    const port = Number(rawPort)
    if (host && Number.isInteger(port) && port > 0)
      connectFirestoreEmulator(firestore, host, port)
    else
      throw new Error(
        "VITE_FIREBASE_FIRESTORE_EMULATOR_HOST must be formatted as host:port.",
      )
  }
}
