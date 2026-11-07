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
const {
  connectFirestoreEmulator,
  getFirestore,
  collection,
  getDocs,
  query,
  where,
} = await import("firebase/firestore")
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
const clientDatabase = getFirestore(clientApp)
const functions = getFunctions(clientApp, "us-central1")
connectAuthEmulator(auth, "http://127.0.0.1:9099", {
  disableWarnings: true,
})
connectFunctionsEmulator(functions, "127.0.0.1", 5001)
connectFirestoreEmulator(clientDatabase, "127.0.0.1", 8080)

const suffix = Date.now().toString()
const courseId = `callable-course-${suffix}`
const weekId = `callable-week-${suffix}`
const questionId = `callable-question-${suffix}`
const conflictQuestionId = `callable-conflict-${suffix}`
const publishCourseId = `callable-publish-course-${suffix}`
const publishWeekId = `callable-publish-week-${suffix}`
const reviewQuestionId = `callable-review-${suffix}`
const draftQuestionId = `callable-draft-${suffix}`
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
await database.collection("courses").doc(publishCourseId).set({
  title: "Callable Published Course",
  status: "published",
  contentReady: true,
})
await database.collection("weeks").doc(publishWeekId).set({
  courseId: publishCourseId,
  weekNumber: 1,
  title: "Callable Published Week",
  status: "published",
  contentReady: true,
})
await database
  .collection("questions")
  .doc(reviewQuestionId)
  .set({
    courseId: publishCourseId,
    weekId: publishWeekId,
    paperId: null,
    questionText: "Ready for callable publication",
    options: ["Yes", "No"],
    optionCount: 2,
    correctAnswerIndex: 0,
    explanation: "This record is complete.",
    difficulty: "Easy",
    status: "review",
    contentReady: false,
  })
await database
  .collection("questions")
  .doc(draftQuestionId)
  .set({
    courseId: publishCourseId,
    weekId: publishWeekId,
    paperId: null,
    questionText: "Still a draft",
    options: ["Yes", "No"],
    optionCount: 2,
    correctAnswerIndex: 0,
    explanation: "This record remains private.",
    difficulty: "Easy",
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

  const publishOwner = {
    id: publishWeekId,
    courseId: publishCourseId,
    type: "week",
  }
  const preview = await httpsCallable(
    functions,
    "previewQuestionPublication",
  )({ owner: publishOwner, questionIds: [reviewQuestionId, draftQuestionId] })
  assert.deepEqual(preview.data.eligible, [reviewQuestionId])
  assert.deepEqual(preview.data.blocked, [draftQuestionId])
  await assert.rejects(
    () =>
      httpsCallable(
        functions,
        "updateQuestionOperation",
      )({
        owner: publishOwner,
        questionIds: [reviewQuestionId, draftQuestionId],
        patch: { status: "published" },
      }),
    (error) => error.code === "functions/failed-precondition",
  )
  await httpsCallable(
    functions,
    "updateQuestionOperation",
  )({
    owner: publishOwner,
    questionIds: [reviewQuestionId],
    patch: { status: "published" },
  })
  assert.equal(
    (await database.collection("questions").doc(reviewQuestionId).get()).get(
      "contentReady",
    ),
    true,
  )
  const guestVisible = await getDocs(
    query(
      collection(clientDatabase, "questions"),
      where("weekId", "==", publishWeekId),
      where("status", "==", "published"),
      where("contentReady", "==", true),
    ),
  )
  assert.deepEqual(
    guestVisible.docs.map((item) => item.id),
    [reviewQuestionId],
  )
  await signIn(learnerUser)
  const learnerVisible = await getDocs(
    query(
      collection(clientDatabase, "questions"),
      where("weekId", "==", publishWeekId),
      where("status", "==", "published"),
      where("contentReady", "==", true),
    ),
  )
  assert.deepEqual(
    learnerVisible.docs.map((item) => item.id),
    [reviewQuestionId],
  )
  await signIn(adminUser)
  await httpsCallable(
    functions,
    "updateQuestionOperation",
  )({
    owner: publishOwner,
    questionIds: [reviewQuestionId],
    patch: { status: "draft" },
  })
  const hiddenAfterUnpublish = await getDocs(
    query(
      collection(clientDatabase, "questions"),
      where("weekId", "==", publishWeekId),
      where("status", "==", "published"),
      where("contentReady", "==", true),
    ),
  )
  assert.equal(hiddenAfterUnpublish.empty, true)
  const audit = await database
    .collection("auditLogs")
    .where("operationId", "==", editResult.data.operationId)
    .get()
  assert.equal(audit.empty, false)

  const multiBatchIds = Array.from(
    { length: 401 },
    (_, index) => `callable-multi-${suffix}-${index}`,
  )
  const multiBatchQuestions = multiBatchIds.map((id, index) => ({
    id,
    status: "draft",
    questionText: `Multi-batch question ${index}`,
    options: ["A", "B"],
    optionCount: 2,
    correctAnswerIndex: 0,
    explanation: "Retryable import fixture.",
    difficulty: "Easy",
  }))
  const multiBatchOperationId = `multi-batch-${suffix}`
  await assert.rejects(
    () =>
      httpsCallable(
        functions,
        "importQuestionOperation",
      )({
        owner,
        questions: multiBatchQuestions,
        metadata: { operationId: multiBatchOperationId, failAfterBatch: 1 },
      }),
    (error) => error.code === "functions/failed-precondition",
  )
  let multiBatchOperation = await database
    .collection("bulkOperations")
    .doc(multiBatchOperationId)
    .get()
  assert.equal(multiBatchOperation.get("status"), "partially_completed")
  assert.equal(multiBatchOperation.get("succeeded"), 200)
  await httpsCallable(
    functions,
    "retryImportQuestionOperation",
  )({
    owner,
    questions: multiBatchQuestions,
    metadata: { operationId: multiBatchOperationId },
  })
  multiBatchOperation = await database
    .collection("bulkOperations")
    .doc(multiBatchOperationId)
    .get()
  assert.equal(multiBatchOperation.get("status"), "completed")
  assert.equal(multiBatchOperation.get("succeeded"), 401)
  assert.equal(
    (
      await database
        .collection("questions")
        .where("bulkOperationId", "==", multiBatchOperationId)
        .get()
    ).size,
    401,
  )
  await httpsCallable(
    functions,
    "retryImportQuestionOperation",
  )({
    owner,
    questions: multiBatchQuestions,
    metadata: { operationId: multiBatchOperationId },
  })
  assert.equal(
    (
      await database
        .collection("questions")
        .where("bulkOperationId", "==", multiBatchOperationId)
        .get()
    ).size,
    401,
  )
  await httpsCallable(
    functions,
    "rollbackImportOperationContent",
  )({
    operationId: multiBatchOperationId,
  })
  assert.equal(
    (
      await database
        .collection("questions")
        .where("bulkOperationId", "==", multiBatchOperationId)
        .get()
    ).size,
    0,
  )
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
  await database.collection("questions").doc(reviewQuestionId).delete()
  await database.collection("questions").doc(draftQuestionId).delete()
  await database.collection("weeks").doc(publishWeekId).delete()
  await database.collection("courses").doc(publishCourseId).delete()
  await adminAuth.deleteUser(adminUser.uid)
  await adminAuth.deleteUser(learnerUser.uid)
}
