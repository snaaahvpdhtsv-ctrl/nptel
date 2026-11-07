import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
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
  const email = "qa-a11y@example.test"
  const password = "Qa-a11y-12345"
  let user
  try {
    user = await auth.getUserByEmail(email)
  } catch {
    user = await auth.createUser({ email, password })
  }
  await auth.setCustomUserClaims(user.uid, { admin: true })
  await database.collection("courses").doc("a11y-course").set({
    title: "Accessibility Course",
    status: "draft",
    contentReady: false,
    sample: false,
  })
  await database.collection("weeks").doc("a11y-week").set({
    courseId: "a11y-course",
    weekNumber: 1,
    title: "Accessibility Week",
    status: "draft",
    contentReady: false,
  })
  await database
    .collection("questions")
    .doc("a11y-question")
    .set({
      courseId: "a11y-course",
      weekId: "a11y-week",
      questionText: "Accessibility question",
      options: ["A", "B"],
      optionCount: 2,
      correctAnswerIndex: 0,
      difficulty: "",
      status: "draft",
      contentReady: false,
    })

  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  const consoleErrors = []
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text())
  })
  page.on("pageerror", (error) => consoleErrors.push(error.message))
  await page.goto("http://127.0.0.1:4174/admin")
  await page.getByLabel("Admin email").fill(email)
  await page.locator("#admin-password").fill(password)
  await page.getByRole("button", { name: /sign in to dashboard/i }).click()
  await page.waitForURL(/\/admin\/dashboard/)
  await page.getByRole("button", { name: /Content quality/i }).click()
  await page.getByText("Missing explanation", { exact: true }).first().waitFor()

  const axeSource = await readFile(
    new URL("../node_modules/axe-core/axe.min.js", import.meta.url),
    "utf8",
  )
  await page.addScriptTag({ content: axeSource })
  const axe = await page.evaluate(async () =>
    window.axe.run(document, {
      runOnly: { type: "tag", values: ["wcag2a", "wcag2aa"] },
    }),
  )
  assert.equal(axe.violations.length, 0, JSON.stringify(axe.violations))

  const focusOrder = []
  for (let index = 0; index < 12; index += 1) {
    await page.keyboard.press("Tab")
    focusOrder.push(
      await page.evaluate(() => ({
        tag: document.activeElement?.tagName,
        name:
          document.activeElement?.getAttribute("aria-label") ??
          document.activeElement?.textContent?.trim().slice(0, 60),
        outline: getComputedStyle(document.activeElement).outlineStyle,
      })),
    )
  }
  assert.ok(focusOrder.some((item) => item.name?.includes("Search quality")))
  assert.ok(
    focusOrder.some(
      (item) => item.outline !== "none" && item.outline !== "0px",
    ),
  )
  await page.getByLabel("Search quality findings").fill("a11y-question")
  await page.getByRole("button", { name: "Clear filters" }).waitFor()
  await page.setViewportSize({ width: 390, height: 844 })
  await page.keyboard.press("Tab")
  assert.equal(
    await page.evaluate(() => document.documentElement.scrollWidth),
    390,
  )
  assert.equal(consoleErrors.length, 0, consoleErrors.join("\n"))
  console.log(
    `axe accessibility passed: ${axe.passes.length} rules, 0 violations`,
  )
  await browser.close()
} finally {
  firebase.kill("SIGTERM")
  vite.kill("SIGTERM")
}
