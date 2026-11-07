import assert from "node:assert/strict"
import { createRequire } from "node:module"

process.env.FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9099"
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080"
process.env.GCLOUD_PROJECT = "demo-nptel"
process.env.GOOGLE_CLOUD_PROJECT = "demo-nptel"

const require = createRequire(import.meta.url)
const {
  getApps,
  initializeApp: initializeAdmin,
} = require("firebase-admin/app")
const { getAuth: getAdminAuth } = require("firebase-admin/auth")
const { getFirestore: getAdminFirestore } = require("firebase-admin/firestore")
const { initializeApp } = await import("firebase/app")
const { connectAuthEmulator, getAuth, signInWithCustomToken, signOut } =
  await import("firebase/auth")
const { connectFunctionsEmulator, getFunctions, httpsCallable } = await import(
  "firebase/functions"
)

const app = getApps().length
  ? getApps()[0]
  : initializeAdmin({ projectId: "demo-nptel" })
const adminAuth = getAdminAuth(app)
const database = getAdminFirestore(app)
const clientApp = initializeApp(
  {
    apiKey: "demo-api-key",
    authDomain: "demo-nptel.local",
    projectId: "demo-nptel",
    appId: "demo-app",
  },
  "functions-callable-test",
)
const auth = getAuth(clientApp)
const functions = getFunctions(clientApp, "us-central1")
connectAuthEmulator(auth, "http://127.0.0.1:9099", {
  disableWarnings: true,
})
connectFunctionsEmulator(functions, "127.0.0.1", 5001)

const suffix = Date.now().toString()
const courseId = `callable-course-${suffix}`
const weekId = `callable-week-${suffix}`
const questionId = `callable-question-${suffix}`
const conflictQuestionId = `callable-conflict-${suffix}`
const adminEmail = `callable-admin-${suffix}@example.test`
const learnerEmail = `callable-learner-${suffix}@example.test`

async function createUser(email, admin = false) {
  const user = await adminAuth.createUser({
    email,
    password: "Qa-callable-12345",
  })
  await adminAuth.setCustomUserClaims(user.uid, admin ? { admin: true } : {})
  return user
}

async function signIn(user) {
  await signInWithCustomToken(auth, await adminAuth.createCustomToken(user.uid))
}

const adminUser = await createUser(adminEmail, true)
const learnerUser = await createUser(learnerEmail)
await database.collection("courses").doc(courseId).set({
  title: "Callable QA Course",
  status: "draft",
  contentReady: false,
})
await database.collection("weeks").doc(weekId).set({
  courseId,
  weekNumber: 1,
  title: "Callable QA Week",
  status: "draft",
  contentReady: false,
})

const owner = { id: weekId, courseId, type: "week" }
const question = {
  id: questionId,
  questionText: "Callable import question",
  options: ["Correct", "Wrong"],
  optionCount: 2,
  correctAnswerIndex: 0,
  explanation: "Imported through the Functions emulator.",
  difficulty: "Easy",
  status: "draft",
}

try {
  await signOut(auth)
  await assert.rejects(
    () =>
      httpsCallable(
        functions,
        "importQuestionOperation",
      )({ owner, questions: [question] }),
    (error) => error.code === "functions/permission-denied",
  )

  await signIn(learnerUser)
  await assert.rejects(
    () =>
      httpsCallable(
        functions,
        "importQuestionOperation",
      )({ owner, questions: [question] }),
    (error) => error.code === "functions/permission-denied",
  )

  await signIn(adminUser)
  const importResult = await httpsCallable(
    functions,
    "importQuestionOperation",
  )({
    owner,
    questions: [question],
    metadata: { sourceType: "json", fileName: "callable.json" },
  })
  const operationId = importResult.data.operationId
  assert.ok(operationId)
  const imported = await database.collection("questions").doc(questionId).get()
  assert.equal(imported.get("status"), "draft")
  assert.equal(imported.get("bulkOperationId"), operationId)
  const operation = await database
    .collection("bulkOperations")
    .doc(operationId)
    .get()
  assert.equal(operation.get("succeeded"), 1)

  const editResult = await httpsCallable(
    functions,
    "updateQuestionOperation",
  )({
    owner,
    questionIds: [questionId],
    patch: { difficulty: "Hard" },
  })
  assert.ok(editResult.data.operationId)
  assert.equal(
    (await database.collection("questions").doc(questionId).get()).get(
      "difficulty",
    ),
    "Hard",
  )

  const conflictImport = await httpsCallable(
    functions,
    "importQuestionOperation",
  )({
    owner,
    questions: [{ ...question, id: conflictQuestionId }],
    metadata: { sourceType: "json", fileName: "conflict.json" },
  })
  const conflictOperationId = conflictImport.data.operationId
  await database.collection("questions").doc(conflictQuestionId).update({
    explanation: "A newer administrator edit.",
  })
  const rollback = await httpsCallable(
    functions,
    "rollbackImportOperationContent",
  )({ operationId: conflictOperationId })
  assert.equal(rollback.data.status, "rolled_back_with_conflicts")
  assert.deepEqual(rollback.data.conflicts, [conflictQuestionId])
  assert.equal(
    (await database.collection("questions").doc(conflictQuestionId).get()).get(
      "explanation",
    ),
    "A newer administrator edit.",
  )
  const secondRollback = await httpsCallable(
    functions,
    "rollbackImportOperationContent",
  )({ operationId: conflictOperationId })
  assert.equal(secondRollback.data.status, "rolled_back_with_conflicts")
  console.log("callable Functions integration passed")
} finally {
  await signOut(auth).catch(() => {})
  await database.collection("questions").doc(questionId).delete()
  await database.collection("questions").doc(conflictQuestionId).delete()
  const operations = await database
    .collection("bulkOperations")
    .where("courseId", "==", courseId)
    .get()
  await Promise.all(operations.docs.map((item) => item.ref.delete()))
  await database.collection("weeks").doc(weekId).delete()
  await database.collection("courses").doc(courseId).delete()
  await adminAuth.deleteUser(adminUser.uid)
  await adminAuth.deleteUser(learnerUser.uid)
}
