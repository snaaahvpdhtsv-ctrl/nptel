import assert from "node:assert/strict"
import { spawn } from "node:child_process"
import { createRequire } from "node:module"
import { setTimeout as delay } from "node:timers/promises"
import { chromium } from "playwright"

const require = createRequire(import.meta.url)
const { getApps, initializeApp } = require("firebase-admin/app")
const { getAuth } = require("firebase-admin/auth")

const env = {
  ...process.env,
  FIREBASE_AUTH_EMULATOR_HOST: "127.0.0.1:9099",
  FIRESTORE_EMULATOR_HOST: "127.0.0.1:8080",
  VITE_FIREBASE_PROJECT_ID: "demo-nptel",
  VITE_FIREBASE_AUTH_EMULATOR_URL: "http://127.0.0.1:9099",
  VITE_FIREBASE_FIRESTORE_EMULATOR_HOST: "127.0.0.1:8080",
}
process.env.FIREBASE_AUTH_EMULATOR_HOST = env.FIREBASE_AUTH_EMULATOR_HOST
process.env.FIRESTORE_EMULATOR_HOST = env.FIRESTORE_EMULATOR_HOST
process.env.GCLOUD_PROJECT = env.VITE_FIREBASE_PROJECT_ID
process.env.GOOGLE_CLOUD_PROJECT = env.VITE_FIREBASE_PROJECT_ID

const start = (command, args) =>
  spawn(command, args, { env, stdio: "ignore" })

const waitFor = async (url) => {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      await fetch(url)
      return
    } catch {
      await delay(500)
    }
  }
  throw new Error(`Timed out waiting for ${url}`)
}

const firebase = start("npx", [
  "firebase",
  "emulators:start",
  "--only",
  "auth,firestore",
  "--project",
  "demo-nptel",
])
const vite = start("npx", ["vite", "--host", "127.0.0.1", "--port", "4174"])

try {
  await Promise.all([
    waitFor("http://127.0.0.1:8080"),
    waitFor("http://127.0.0.1:9099"),
    waitFor("http://127.0.0.1:4174"),
  ])
  const adminApp = getApps().length
    ? getApps()[0]
    : initializeApp({ projectId: "demo-nptel" })
  const auth = getAuth(adminApp)
  const email = "qa-admin@example.test"
  const password = "Qa-admin-12345"
  let user
  try {
    user = await auth.getUserByEmail(email)
  } catch {
    user = await auth.createUser({ email, password, displayName: "QA Admin" })
  }
  await auth.setCustomUserClaims(user.uid, { admin: true })

  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()
  await page.goto("http://127.0.0.1:4174/admin")
  await page.getByLabel("Admin email").fill(email)
  await page.locator("#admin-password").fill(password)
  await page.getByRole("button", { name: /sign in to dashboard/i }).click()
  await page.waitForURL(/\/admin\/dashboard/)
  await page.getByRole("button", { name: /^Courses/ }).click()
  await page.getByRole("button", { name: /^Add Course$/ }).first().click()
  await page.getByLabel("Course title").fill("E2E Course")
  await page.locator("form").getByRole("button", { name: /^Add course$/i }).click()
  await page.waitForTimeout(500)
  await assert.ok((await page.getByText("E2E Course", { exact: true }).count()) > 0)
  await page.getByRole("button", { name: /^Weeks/ }).click()
  await page.getByRole("button", { name: /^Add Week$/ }).first().click()
  await page.getByLabel("Week title").fill("E2E Week")
  await page.locator("form").getByRole("button", { name: /^Add Week$/i }).click()
  await page.waitForTimeout(500)
  await assert.ok((await page.getByText("E2E Week", { exact: true }).count()) > 0)
  await page.getByText("Log out", { exact: true }).click()
  await page.goto("http://127.0.0.1:4174/admin/dashboard")
  await page.waitForURL(/\/signin\?view=admin/)
  await browser.close()
  console.log("admin E2E passed")
} finally {
  firebase.kill("SIGTERM")
  vite.kill("SIGTERM")
}
