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
  GCLOUD_PROJECT: "demo-nptel",
  GOOGLE_CLOUD_PROJECT: "demo-nptel",
}
Object.assign(process.env, {
  FIREBASE_AUTH_EMULATOR_HOST: env.FIREBASE_AUTH_EMULATOR_HOST,
  FIRESTORE_EMULATOR_HOST: env.FIRESTORE_EMULATOR_HOST,
  GCLOUD_PROJECT: env.GCLOUD_PROJECT,
  GOOGLE_CLOUD_PROJECT: env.GOOGLE_CLOUD_PROJECT,
})

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
const vite = start("npx", ["vite", "--host", "127.0.0.1", "--port", "4175"])

try {
  await Promise.all([
    waitFor("http://127.0.0.1:8080"),
    waitFor("http://127.0.0.1:9099"),
    waitFor("http://127.0.0.1:4175"),
  ])
  const app = getApps().length
    ? getApps()[0]
    : initializeApp({ projectId: "demo-nptel" })
  const auth = getAuth(app)
  const database = getFirestore(app)
  const email = "qa-learner@example.test"
  const password = "Qa-learner-12345"
  let user
  try {
    user = await auth.getUserByEmail(email)
  } catch {
    user = await auth.createUser({ email, password, displayName: "QA Learner" })
  }
  await database.collection("courses").doc("e2e-course").set({
    title: "E2E Published Course",
    description: "Published test content",
    status: "published",
    contentReady: true,
    sample: false,
  })
  await database.collection("papers").doc("e2e-paper").set({
    courseId: "e2e-course",
    title: "E2E Verified Paper",
    year: 2025,
    session: "July",
    status: "published",
    contentReady: true,
  })
  await database
    .collection("questions")
    .doc("e2e-paper-question")
    .set({
      courseId: "e2e-course",
      paperId: "e2e-paper",
      weekId: null,
      questionText: "Which option is verified?",
      options: ["Verified", "Unverified"],
      correctAnswerIndex: 0,
      status: "published",
      contentReady: true,
    })

  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()
  await page.goto("http://127.0.0.1:4175/signin")
  await page.locator("#auth-email").fill(email)
  await page.locator("#auth-password").fill(password)
  await page
    .locator("form")
    .getByRole("button", { name: /^Sign in$/ })
    .click()
  await page.waitForURL(/\/$/)

  await page.goto(
    "http://127.0.0.1:4175/courses/e2e-course/pyq/practice/run?papers=e2e-paper&shuffle=0",
  )
  await page.getByText("Which option is verified?", { exact: true }).waitFor()
  await page
    .getByRole("button", { name: /Verified/ })
    .first()
    .click()
  await page.getByText("Correct!", { exact: true }).waitFor()

  await page.goto("http://127.0.0.1:4175/courses/e2e-course/feedback")
  await page.locator("#request-message").fill("Persist this feedback")
  await page.getByRole("button", { name: "Submit", exact: true }).click()
  await page
    .getByText("Submitted! It will appear here once admin replies", {
      exact: true,
    })
    .waitFor()
  await assert.equal(
    await page.getByText("Persist this feedback", { exact: true }).count(),
    1,
  )
  await page.reload()
  await page.getByText("Persist this feedback", { exact: true }).waitFor()

  const saved = await database
    .collection("feedback")
    .where("ownerId", "==", user.uid)
    .get()
  assert.equal(saved.size, 1)
  await browser.close()
  console.log("learner feedback and PYQ E2E passed")
} finally {
  firebase.kill("SIGTERM")
  vite.kill("SIGTERM")
}
