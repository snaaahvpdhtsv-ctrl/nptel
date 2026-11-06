import { applicationDefault, initializeApp } from "firebase-admin/app"
import { getAuth } from "firebase-admin/auth"

const email = process.argv[2]?.trim().toLowerCase()
if (!email || !email.includes("@")) {
  console.error("Usage: node --env-file=.env.admin scripts/provision-admin.mjs <email>")
  process.exit(1)
}

const projectId = process.env.FIREBASE_PROJECT_ID
if (!projectId) {
  console.error("Set FIREBASE_PROJECT_ID in the trusted admin environment.")
  process.exit(1)
}

initializeApp({ credential: applicationDefault(), projectId })

try {
  const auth = getAuth()
  const user = await auth.getUserByEmail(email)
  await auth.setCustomUserClaims(user.uid, {
    ...user.customClaims,
    admin: true,
  })
  await auth.revokeRefreshTokens(user.uid)
  console.log(`Admin claim granted to ${email} (${user.uid}). The user must sign in again.`)
} catch (error) {
  console.error("Could not provision admin:", error)
  process.exitCode = 1
}
