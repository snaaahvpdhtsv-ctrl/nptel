import assert from "node:assert/strict"
import { createRequire } from "node:module"
import { spawn } from "node:child_process"
import { setTimeout as delay } from "node:timers/promises"
import { chromium } from "playwright"

const require = createRequire(import.meta.url)
const { getApps, initializeApp } = require("firebase-admin/app")
const { getAuth } = require("firebase-admin/auth")
const { getFirestore } = require("firebase-admin/firestore")

const env = {
  ...process.env,
  FIREBASE_AUTH_EMULATOR_HOST: "127.0.0.1:9099",
  FIRESTORE_EMULATOR_HOST: "127.0.0.1:8080",
  VITE_FIREBASE_PROJECT_ID: "demo-nptel",
  VITE_FIREBASE_AUTH_EMULATOR_URL: "http://127.0.0.1:9099",
  VITE_FIREBASE_FIRESTORE_EMULATOR_HOST: "127.0.0.1:8080",
  VITE_FIREBASE_FUNCTIONS_EMULATOR_HOST: "localhost:5001",
  GCLOUD_PROJECT: "demo-nptel",
  GOOGLE_CLOUD_PROJECT: "demo-nptel",
}
process.env.FIREBASE_AUTH_EMULATOR_HOST = env.FIREBASE_AUTH_EMULATOR_HOST
process.env.FIRESTORE_EMULATOR_HOST = env.FIRESTORE_EMULATOR_HOST
process.env.GCLOUD_PROJECT = env.GCLOUD_PROJECT
process.env.GOOGLE_CLOUD_PROJECT = env.GOOGLE_CLOUD_PROJECT

const start = (command, args) => spawn(command, args, { env, stdio: "ignore" })
const waitFor = async (url) => {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    try {
      const response = await fetch(url)
      if (response.status < 500) return
    } catch {}
    await delay(500)
  }
  throw new Error(`Timed out waiting for ${url}`)
}

const firebase = start("npx", [
  "firebase",
  "emulators:start",
  "--only",
  "auth,firestore,functions",
  "--project",
  "demo-nptel",
])
const vite = start("npx", ["vite", "--host", "localhost", "--port", "4177"])

const suffix = Date.now().toString()
const email = `audit-admin-${suffix}@example.test`
const password = "Qa-audit-admin-12345"
const auditId = `audit-history-${suffix}`
let database

try {
  await Promise.all([
    waitFor("http://127.0.0.1:9099"),
    waitFor("http://127.0.0.1:8080"),
    waitFor("http://127.0.0.1:5001"),
    waitFor("http://localhost:4177"),
  ])
  await delay(1500)

  const adminApp = getApps().length
    ? getApps()[0]
    : initializeApp({ projectId: "demo-nptel" })
  const auth = getAuth(adminApp)
  database = getFirestore(adminApp)
  const user = await auth.createUser({ email, password })
  await auth.setCustomUserClaims(user.uid, { admin: true })
  await database.collection("auditLogs").doc(auditId).set({
    action: "Content health check",
    resource: "Audit QA Course · Content",
    actorId: user.uid,
    actorEmail: email,
    createdAt: new Date().toISOString(),
    outcome: "success",
  })

  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()
  await page.goto("http://localhost:4177/admin")
  await page.getByLabel("Admin email").fill(email)
  await page.locator("#admin-password").fill(password)
  await page.getByRole("button", { name: /sign in to dashboard/i }).click()
  await page.waitForURL(/\/admin\/dashboard/)
  await page.getByRole("button", { name: "Audit history" }).click()
  await page.getByText("Content health check", { exact: true }).waitFor()
  assert.equal(
    await page.getByText("Missing or insufficient permissions.").count(),
    0,
  )
  assert.equal(
    await page.getByText("1 entry from Firestore", { exact: true }).count(),
    1,
  )
  await page.getByLabel("Search audit history").fill("Content health check")
  assert.equal(
    await page.getByText("Content health check", { exact: true }).count(),
    1,
  )
  await page.getByRole("button", { name: "Refresh" }).click()
  await page.getByText("Content health check", { exact: true }).waitFor()
  assert.equal(
    await page.getByText("Missing or insufficient permissions.").count(),
    0,
  )
  await browser.close()
  console.log("audit history E2E passed")
} finally {
  await database
    ?.collection("auditLogs")
    .doc(auditId)
    .delete()
    .catch(() => {})
  firebase.kill()
  vite.kill()
}
