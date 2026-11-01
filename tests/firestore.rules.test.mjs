import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import { after, before, test } from "node:test"
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from "@firebase/rules-unit-testing"
import { doc, getDoc, setDoc } from "firebase/firestore"

const projectId = "demo-nptel"
let testEnv

before(async () => {
  const rules = await readFile(
    new URL("../firestore.rules", import.meta.url),
    "utf8",
  )
  testEnv = await initializeTestEnvironment({
    projectId,
    firestore: { rules },
  })
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const database = context.firestore()
    await setDoc(doc(database, "courses", "published"), { status: "published" })
    await setDoc(doc(database, "courses", "draft"), { status: "draft" })
    await setDoc(doc(database, "weeks", "published-week"), {
      courseId: "published",
      status: "published",
    })
    await setDoc(doc(database, "weeks", "draft-week"), {
      courseId: "published",
      status: "draft",
    })
    await setDoc(doc(database, "weeks", "week-in-draft-course"), {
      courseId: "draft",
      status: "published",
    })
    await setDoc(doc(database, "papers", "published-paper"), {
      courseId: "published",
      status: "published",
    })
    await setDoc(doc(database, "papers", "draft-paper"), {
      courseId: "published",
      status: "draft",
    })
    await setDoc(doc(database, "questions", "published-week-question"), {
      weekId: "published-week",
      status: "published",
    })
    await setDoc(doc(database, "questions", "draft-week-question"), {
      weekId: "draft-week",
      status: "published",
    })
    await setDoc(doc(database, "questions", "published-paper-question"), {
      paperId: "published-paper",
      status: "published",
    })
    await setDoc(doc(database, "questions", "draft-paper-question"), {
      paperId: "draft-paper",
      status: "published",
    })
    await setDoc(doc(database, "announcements", "published"), {
      draft: false,
    })
    await setDoc(doc(database, "announcements", "draft"), {
      draft: true,
    })
  })
})

after(async () => {
  await testEnv?.cleanup()
})

test("guests can read published content, not drafts", async () => {
  const database = testEnv.unauthenticatedContext().firestore()
  await assertSucceeds(getDoc(doc(database, "courses", "published")))
  await assertFails(getDoc(doc(database, "courses", "draft")))
})

test("published content requires a published parent course and week or paper", async () => {
  const database = testEnv.unauthenticatedContext().firestore()
  await assertSucceeds(getDoc(doc(database, "weeks", "published-week")))
  await assertFails(getDoc(doc(database, "weeks", "draft-week")))
  await assertFails(getDoc(doc(database, "weeks", "week-in-draft-course")))
  await assertSucceeds(getDoc(doc(database, "papers", "published-paper")))
  await assertFails(getDoc(doc(database, "papers", "draft-paper")))
  await assertSucceeds(
    getDoc(doc(database, "questions", "published-week-question")),
  )
  await assertFails(getDoc(doc(database, "questions", "draft-week-question")))
  await assertSucceeds(
    getDoc(doc(database, "questions", "published-paper-question")),
  )
  await assertFails(getDoc(doc(database, "questions", "draft-paper-question")))
})

test("users can read and write only their own progress", async () => {
  const ownDatabase = testEnv.authenticatedContext("learner-1").firestore()
  const otherDatabase = testEnv.authenticatedContext("learner-2").firestore()
  const attempt = {
    id: "attempt-1",
    courseId: "published",
    kind: "practice",
    weekIds: ["published-week"],
    startedAt: "2025-01-01T10:00:00.000Z",
    completedAt: "2025-01-01T10:01:00.000Z",
    durationSeconds: 60,
    shuffleQuestions: false,
    shuffleOptions: false,
    answers: [
      {
        questionId: "question-1",
        weekId: "published-week",
        chosenIndex: 0,
        correct: true,
      },
    ],
  }
  const ownAttempt = doc(
    ownDatabase,
    "users",
    "learner-1",
    "attempts",
    "attempt-1",
  )
  await assertSucceeds(setDoc(ownAttempt, attempt))
  await assertSucceeds(getDoc(ownAttempt))
  await assertFails(
    getDoc(doc(otherDatabase, "users", "learner-1", "attempts", "attempt-1")),
  )
  await assertFails(
    setDoc(
      doc(otherDatabase, "users", "learner-1", "bookmarks", "question-1"),
      {
        questionId: "question-1",
      },
    ),
  )
  await assertSucceeds(
    setDoc(doc(ownDatabase, "users", "learner-1", "bookmarks", "question-1"), {
      questionId: "question-1",
      createdAt: "2025-01-01T10:00:00.000Z",
    }),
  )
  await assertSucceeds(
    getDoc(doc(ownDatabase, "users", "learner-1", "bookmarks", "question-1")),
  )
  await assertFails(
    getDoc(doc(otherDatabase, "users", "learner-1", "bookmarks", "question-1")),
  )
  await assertFails(setDoc(ownAttempt, { ...attempt, durationSeconds: 30 }))
})

test("user profiles cannot grant roles or change account ownership", async () => {
  const ownDatabase = testEnv
    .authenticatedContext("learner-1", { email: "learner@example.com" })
    .firestore()
  const otherDatabase = testEnv.authenticatedContext("learner-2").firestore()
  const ownProfile = doc(ownDatabase, "users", "learner-1")

  await assertSucceeds(
    setDoc(ownProfile, {
      displayName: "Learner",
      email: "learner@example.com",
      createdAt: "2025-01-01T10:00:00.000Z",
      updatedAt: "2025-01-01T10:00:00.000Z",
    }),
  )
  await assertSucceeds(getDoc(ownProfile))
  await assertFails(getDoc(doc(otherDatabase, "users", "learner-1")))
  await assertFails(
    setDoc(ownProfile, {
      displayName: "Learner",
      email: "learner@example.com",
      admin: true,
    }),
  )
  await assertFails(setDoc(doc(ownDatabase, "users", "learner-2"), {}))
})

test("only custom-claim admins can write course content", async () => {
  const learner = testEnv.authenticatedContext("learner-1").firestore()
  const admin = testEnv
    .authenticatedContext("admin-1", { admin: true })
    .firestore()
  await assertFails(
    setDoc(doc(learner, "courses", "new-course"), { status: "published" }),
  )
  await assertSucceeds(
    setDoc(doc(admin, "courses", "new-course"), { status: "published" }),
  )
  await assertFails(
    setDoc(doc(learner, "announcements", "new"), {
      draft: false,
      message: "Unauthorized",
    }),
  )
  await assertSucceeds(
    setDoc(doc(admin, "announcements", "new"), {
      draft: false,
      message: "Authorized",
    }),
  )
  await assertSucceeds(
    getDoc(
      doc(
        testEnv.unauthenticatedContext().firestore(),
        "announcements",
        "published",
      ),
    ),
  )
  await assertFails(
    getDoc(
      doc(
        testEnv.unauthenticatedContext().firestore(),
        "announcements",
        "draft",
      ),
    ),
  )
})

test("feedback submissions are constrained", async () => {
  const database = testEnv.unauthenticatedContext().firestore()
  await assertSucceeds(
    setDoc(doc(database, "feedback", "valid"), {
      type: "feedback",
      status: "pending",
      message: "Please add more course filters.",
      createdAt: "2025-01-01T10:00:00.000Z",
    }),
  )
  await assertFails(
    setDoc(doc(database, "feedback", "invalid"), {
      type: "feedback",
      status: "replied",
      message: "Invalid status supplied by a guest.",
    }),
  )
  await assertFails(
    setDoc(doc(database, "feedback", "invalid-owner"), {
      type: "feedback",
      status: "pending",
      message: "Impersonation attempt.",
      createdAt: "2025-01-01T10:00:00.000Z",
      ownerId: "someone-else",
    }),
  )
  await assertSucceeds(
    setDoc(doc(database, "reports", "valid"), {
      type: "report",
      status: "pending",
      message: "The displayed answer seems incorrect.",
      contact: "learner@example.com",
      courseId: "published",
      createdAt: "1 Nov 2026",
      age: "0h old",
      report: {
        weekId: "published-week",
        weekNumber: 1,
        questionNumber: 1,
        questionText: "Sample?",
        issue: "answer",
        markedAnswer: 1,
        suggestedAnswer: 0,
        details: "",
      },
    }),
  )
  await assertFails(
    setDoc(doc(database, "reports", "invalid-week-id"), {
      type: "report",
      status: "pending",
      message: "Invalid week reference.",
      createdAt: "2025-01-01T10:00:00.000Z",
      report: {
        weekId: 1,
        weekNumber: 1,
        questionNumber: 1,
        issue: "answer",
        details: "",
      },
    }),
  )
  await assertFails(
    setDoc(doc(database, "reports", "invalid-answer-index"), {
      type: "report",
      status: "pending",
      message: "Invalid answer index.",
      createdAt: "2025-01-01T10:00:00.000Z",
      report: {
        weekId: "published-week",
        weekNumber: 1,
        questionNumber: 1,
        issue: "answer",
        markedAnswer: 8,
        details: "",
      },
    }),
  )
})

test("users can read only their own feedback and cannot moderate it", async () => {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), "feedback", "owned"), {
      type: "feedback",
      status: "pending",
      message: "My feedback.",
      createdAt: "2025-01-01T10:00:00.000Z",
      ownerId: "learner-1",
    })
  })

  const owner = testEnv.authenticatedContext("learner-1").firestore()
  const otherUser = testEnv.authenticatedContext("learner-2").firestore()
  const admin = testEnv
    .authenticatedContext("admin-1", { admin: true })
    .firestore()
  const feedback = doc(owner, "feedback", "owned")

  await assertSucceeds(getDoc(feedback))
  await assertFails(getDoc(doc(otherUser, "feedback", "owned")))
  await assertFails(
    setDoc(feedback, {
      type: "feedback",
      status: "replied",
      message: "My feedback.",
      createdAt: "2025-01-01T10:00:00.000Z",
      ownerId: "learner-1",
    }),
  )
  await assertSucceeds(getDoc(doc(admin, "feedback", "owned")))
})
