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
Object.assign(process.env, {
  FIREBASE_AUTH_EMULATOR_HOST: env.FIREBASE_AUTH_EMULATOR_HOST,
  FIRESTORE_EMULATOR_HOST: env.FIRESTORE_EMULATOR_HOST,
  GCLOUD_PROJECT: env.GCLOUD_PROJECT,
  GOOGLE_CLOUD_PROJECT: env.GOOGLE_CLOUD_PROJECT,
})

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
const vite = start("npx", ["vite", "--host", "localhost", "--port", "4176"])

const suffix = Date.now().toString()
const courseId = `browser-functions-course-${suffix}`
const weekId = `browser-functions-week-${suffix}`
const questionId = `browser-functions-question-${suffix}`
const email = `browser-functions-admin-${suffix}@example.test`
const password = "Qa-browser-functions-12345"

try {
  await Promise.all([
    waitFor("http://127.0.0.1:9099"),
    waitFor("http://127.0.0.1:8080"),
    waitFor("http://127.0.0.1:5001"),
    waitFor("http://localhost:4176"),
  ])
  await delay(2000)
  const adminApp = getApps().length
    ? getApps()[0]
    : initializeApp({ projectId: "demo-nptel" })
  const auth = getAuth(adminApp)
  const database = getFirestore(adminApp)
  const user = await auth.createUser({
    email,
    password,
    displayName: "Functions QA Admin",
  })
  await auth.setCustomUserClaims(user.uid, { admin: true })
  await database.collection("courses").doc(courseId).set({
    title: "Functions Browser Course",
    status: "draft",
    contentReady: false,
  })
  await database.collection("weeks").doc(weekId).set({
    courseId,
    weekNumber: 1,
    title: "Functions Browser Week",
    status: "draft",
    contentReady: false,
  })

  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()
  await page.goto(
    `http://localhost:4176/admin?section=weeks&course=${courseId}`,
  )
  await page.getByLabel("Admin email").fill(email)
  await page.locator("#admin-password").fill(password)
  await page.getByRole("button", { name: /sign in to dashboard/i }).click()
  await page.waitForURL(/\/admin\/dashboard/)
  await page.getByRole("button", { name: "Weeks & questions" }).click()
  await page.getByText("Functions Browser Week", { exact: true }).last().click()
  await page.getByRole("button", { name: "Bulk Upload" }).click()
  await page.getByRole("button", { name: "Upload JSON file" }).waitFor()
  const chooser = page.waitForEvent("filechooser")
  await page.getByRole("button", { name: "Upload JSON file" }).click()
  await (await chooser).setFiles({
    name: "browser-import.json",
    mimeType: "application/json",
    buffer: Buffer.from(
      JSON.stringify({
        schemaVersion: 1,
        questions: [
          {
            id: questionId,
            questionText: "Browser callable import question",
            options: ["Correct", "Wrong"],
            correctAnswer: "A",
            explanation: "Imported through the browser and Functions emulator.",
            difficulty: "Easy",
            unknownField: "warning",
          },
          {
            id: `${questionId}-invalid`,
            questionText: "Invalid browser row",
            options: ["Only one option"],
            correctAnswer: "A",
          },
        ],
      }),
    ),
  })
  await page.getByText(/JSON preview — browser-import\.json/).waitFor()
  await page.getByText(/1 valid/).waitFor()
  await page.getByRole("button", { name: "Import valid JSON rows" }).click()
  await page
    .getByText(/JSON preview — browser-import\.json/)
    .waitFor({ state: "hidden" })

  let imported
  for (let attempt = 0; attempt < 20; attempt += 1) {
    imported = await database.collection("questions").doc(questionId).get()
    if (imported.exists) break
    await delay(250)
  }
  assert.equal(imported.get("status"), "draft")
  assert.ok(imported.get("bulkOperationId"))
  const operationId = imported.get("bulkOperationId")
  const operation = await database
    .collection("bulkOperations")
    .doc(operationId)
    .get()
  assert.equal(operation.get("sourceType"), "json")
  assert.equal(operation.get("succeeded"), 1)

  await page.getByLabel("Select question 1").check()
  await page.getByLabel("Bulk question action").selectOption("difficulty:Hard")
  await page.getByRole("button", { name: /Apply selected action/i }).click()
  await page.getByText("1 question updated").waitFor()
  assert.equal(
    (await database.collection("questions").doc(questionId).get()).get(
      "difficulty",
    ),
    "Hard",
  )

  await page.getByRole("button", { name: "Bulk operations" }).click()
  const importOperation = page
    .locator("article")
    .filter({ hasText: "import · browser-import.json" })
  await importOperation.waitFor()
  await importOperation.getByText(/1\/1 successful/).waitFor()
  await importOperation.locator("summary").click()
  await importOperation.getByText(/Row 1 .* created/).waitFor()
  await importOperation.getByRole("button", { name: "Roll back" }).click()
  await page.waitForTimeout(300)
  const preserved = await database.collection("questions").doc(questionId).get()
  assert.equal(preserved.exists, true)
  assert.equal(preserved.get("difficulty"), "Hard")
  await browser.close()
  console.log("bulk Functions browser E2E passed")
} finally {
  const adminApp = getApps().length ? getApps()[0] : null
  if (adminApp) {
    const auth = getAuth(adminApp)
    const database = getFirestore(adminApp)
    await database
      .collection("questions")
      .doc(questionId)
      .delete()
      .catch(() => {})
    await database
      .collection("bulkOperations")
      .where("courseId", "==", courseId)
      .get()
      .then((snapshot) =>
        Promise.all(snapshot.docs.map((item) => item.ref.delete())),
      )
      .catch(() => {})
    await database
      .collection("weeks")
      .doc(weekId)
      .delete()
      .catch(() => {})
    await database
      .collection("courses")
      .doc(courseId)
      .delete()
      .catch(() => {})
    await auth
      .getUserByEmail(email)
      .then((item) => auth.deleteUser(item.uid))
      .catch(() => {})
  }
  firebase.kill("SIGTERM")
  vite.kill("SIGTERM")
}
