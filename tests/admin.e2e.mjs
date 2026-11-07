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
  VITE_FIREBASE_PROJECT_ID: "demo-nptel",
  VITE_FIREBASE_AUTH_EMULATOR_URL: "http://127.0.0.1:9099",
  VITE_FIREBASE_FIRESTORE_EMULATOR_HOST: "127.0.0.1:8080",
  VITE_FIREBASE_FUNCTIONS_EMULATOR_HOST: "127.0.0.1:5001",
}
process.env.FIREBASE_AUTH_EMULATOR_HOST = env.FIREBASE_AUTH_EMULATOR_HOST
process.env.FIRESTORE_EMULATOR_HOST = env.FIRESTORE_EMULATOR_HOST
process.env.GCLOUD_PROJECT = env.VITE_FIREBASE_PROJECT_ID
process.env.GOOGLE_CLOUD_PROJECT = env.VITE_FIREBASE_PROJECT_ID

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
  "auth,firestore,functions",
  "--project",
  "demo-nptel",
])
const vite = start("npx", ["vite", "--host", "127.0.0.1", "--port", "4174"])

try {
  await Promise.all([
    waitFor("http://127.0.0.1:8080"),
    waitFor("http://127.0.0.1:9099"),
    waitFor("http://127.0.0.1:5001"),
    waitFor("http://127.0.0.1:4174"),
  ])
  const adminApp = getApps().length
    ? getApps()[0]
    : initializeApp({ projectId: "demo-nptel" })
  const auth = getAuth(adminApp)
  const database = getFirestore(adminApp)
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
  await page
    .getByRole("button", { name: /^Add Course$/ })
    .first()
    .click()
  await page.getByLabel("Course title").fill("E2E Course")
  await page
    .locator("form")
    .getByRole("button", { name: /^Add course$/i })
    .click()
  await page.waitForTimeout(500)
  await assert.ok(
    (await page.getByText("E2E Course", { exact: true }).count()) > 0,
  )
  await page.getByRole("button", { name: /^Weeks/ }).click()
  await page
    .getByRole("button", { name: /^Add Week$/ })
    .first()
    .click()
  await page.getByLabel("Week title").fill("E2E Week")
  await page
    .locator("form")
    .getByRole("button", { name: /^Add Week$/i })
    .click()
  await page.waitForTimeout(500)
  await assert.ok(
    (await page.getByText("E2E Week", { exact: true }).count()) > 0,
  )
  await database.collection("feedback").doc("e2e-feedback").set({
    courseId: "e2e-course",
    type: "feedback",
    status: "pending",
    message: "Admin can reply to this feedback",
    createdAt: new Date().toISOString(),
    age: "0h old",
    ownerId: "e2e-learner",
  })
  await page.getByRole("button", { name: /Requests & feedback/i }).click()
  const requestCard = page
    .locator("article")
    .filter({ hasText: "Admin can reply to this feedback" })
  await requestCard.waitFor()
  await requestCard
    .getByRole("textbox", { name: /Reply to Admin can reply/i })
    .fill("Thanks for the feedback")
  await requestCard.getByRole("button", { name: "Reply", exact: true }).click()
  await requestCard.getByText("Replied", { exact: true }).waitFor()
  const savedFeedback = await database
    .collection("feedback")
    .doc("e2e-feedback")
    .get()
  assert.equal(savedFeedback.data().status, "replied")
  assert.equal(savedFeedback.data().reply, "Thanks for the feedback")
  await database.collection("courses").doc("quality-course").set({
    title: "Quality Checks Course",
    status: "draft",
    contentReady: false,
    sample: false,
  })
  await database.collection("weeks").doc("quality-week").set({
    courseId: "quality-course",
    weekNumber: 1,
    title: "Quality Checks Week",
    status: "draft",
    contentReady: false,
  })
  const qualityQuestion = {
    courseId: "quality-course",
    weekId: "quality-week",
    questionText: "Repeated quality question",
    options: ["One", "Two"],
    optionCount: 2,
    correctAnswerIndex: 0,
    difficulty: "",
    status: "draft",
    contentReady: false,
  }
  await database
    .collection("questions")
    .doc("quality-question-1")
    .set(qualityQuestion)
  await database
    .collection("questions")
    .doc("quality-question-2")
    .set(qualityQuestion)
  await page.getByRole("button", { name: /Content quality/i }).click()
  await page
    .getByText("Duplicate question text", { exact: true })
    .first()
    .waitFor()
  await page.getByText("Missing explanation", { exact: true }).first().waitFor()
  await page.getByLabel("Search quality findings").fill("quality-question-1")
  await page
    .getByText("Duplicate question text", { exact: true })
    .first()
    .waitFor()
  assert.equal(
    await page.getByText("Missing explanation", { exact: true }).count(),
    1,
  )
  await page.getByRole("button", { name: "Clear filters" }).click()
  await page.getByRole("button", { name: "Open content" }).first().click()
  await page.waitForURL(/section=weeks/)
  await page.getByText("Log out", { exact: true }).click()
  await page.goto("http://127.0.0.1:4174/admin/dashboard")
  await page.waitForURL(/\/signin\?view=admin/)
  await browser.close()
  console.log("admin E2E passed")
} finally {
  firebase.kill("SIGTERM")
  vite.kill("SIGTERM")
}
