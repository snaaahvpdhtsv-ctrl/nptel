import assert from "node:assert/strict"
import { spawn } from "node:child_process"
import { createRequire } from "node:module"
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
  GCLOUD_PROJECT: "demo-nptel",
  GOOGLE_CLOUD_PROJECT: "demo-nptel",
  VITE_FIREBASE_PROJECT_ID: "demo-nptel",
  VITE_FIREBASE_AUTH_EMULATOR_URL: "http://127.0.0.1:9099",
  VITE_FIREBASE_FIRESTORE_EMULATOR_HOST: "127.0.0.1:8080",
}
process.env.FIREBASE_AUTH_EMULATOR_HOST = env.FIREBASE_AUTH_EMULATOR_HOST
process.env.FIRESTORE_EMULATOR_HOST = env.FIRESTORE_EMULATOR_HOST
process.env.GCLOUD_PROJECT = env.GCLOUD_PROJECT
process.env.GOOGLE_CLOUD_PROJECT = env.GOOGLE_CLOUD_PROJECT
const start = (command, args) => spawn(command, args, { env, stdio: "ignore" })
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
  const app = getApps().length
    ? getApps()[0]
    : initializeApp({ projectId: "demo-nptel" })
  const auth = getAuth(app)
  const database = getFirestore(app)
  const email = "qa-performance@example.test"
  const password = "Qa-performance-12345"
  let user
  try {
    user = await auth.getUserByEmail(email)
  } catch {
    user = await auth.createUser({ email, password })
  }
  await auth.setCustomUserClaims(user.uid, { admin: true })
  await database.collection("courses").doc("performance-course").set({
    title: "Performance Course",
    status: "draft",
    contentReady: false,
    sample: false,
  })
  await database.collection("weeks").doc("performance-week").set({
    courseId: "performance-course",
    weekNumber: 1,
    title: "Performance Week",
    status: "draft",
    contentReady: false,
  })

  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  const firestoreRequests = []
  page.on("request", (request) => {
    if (request.url().includes("127.0.0.1:8080"))
      firestoreRequests.push(request)
  })
  await page.goto("http://127.0.0.1:4174/admin")
  await page.getByLabel("Admin email").fill(email)
  await page.locator("#admin-password").fill(password)
  await page.getByRole("button", { name: /sign in to dashboard/i }).click()
  await page.waitForURL(/\/admin\/dashboard/)
  await page.getByRole("button", { name: /Content quality/i }).click()

  const results = []
  for (const size of [100, 500, 1000]) {
    for (let offset = 0; offset < size; offset += 400) {
      const batch = database.batch()
      for (
        let index = offset;
        index < Math.min(offset + 400, size);
        index += 1
      ) {
        batch.set(
          database.collection("questions").doc(`performance-${size}-${index}`),
          {
            courseId: "performance-course",
            weekId: "performance-week",
            questionText: `Performance question ${size}-${index}`,
            options: ["A", "B", "C", "D"],
            optionCount: 4,
            correctAnswerIndex: index % 4,
            difficulty: "",
            explanation: "Explanation",
            status: "draft",
            contentReady: false,
          },
        )
      }
      await batch.commit()
    }
    const started = performance.now()
    await page
      .getByText("Missing difficulty", { exact: true })
      .first()
      .waitFor()
    const initialMs = performance.now() - started
    const searchStart = performance.now()
    await page
      .getByLabel("Search quality findings")
      .fill(`performance-${size}-99`)
    const clear = page.getByRole("button", { name: "Clear filters" })
    await clear.waitFor()
    const searchMs = performance.now() - searchStart
    const filterStart = performance.now()
    await page.getByLabel("Filter quality severity").selectOption("warning")
    const filterMs = performance.now() - filterStart
    const visible = await page
      .getByText("Missing difficulty", { exact: true })
      .count()
    const scrollMs = await page.evaluate(() => {
      const started = performance.now()
      window.scrollTo({ top: document.body.scrollHeight, behavior: "instant" })
      window.scrollTo({ top: 0, behavior: "instant" })
      return performance.now() - started
    })
    results.push({
      size,
      initialMs,
      searchMs,
      filterMs,
      scrollMs,
      warningFindingsVisible: visible > 0,
    })
    await clear.click()
  }
  const memory = await page.evaluate(() =>
    performance.memory
      ? {
          usedJSHeapSize: performance.memory.usedJSHeapSize,
          totalJSHeapSize: performance.memory.totalJSHeapSize,
        }
      : null,
  )
  assert.equal(results.length, 3)
  assert.ok(results.every((item) => item.warningFindingsVisible))
  console.log(
    JSON.stringify({
      results,
      memory,
      firestoreRequestCount: firestoreRequests.length,
    }),
  )
  await browser.close()
} finally {
  firebase.kill("SIGTERM")
  vite.kill("SIGTERM")
}
