import assert from "node:assert/strict"
import test from "node:test"
import { getApps, initializeApp } from "firebase-admin/app"
import { getFirestore } from "firebase-admin/firestore"
import {
  archiveQuestion,
  saveCourse,
  saveQuestion,
  saveWeek,
  saveQuestions,
} from "../functions/content-service.mjs"

const app =
  getApps()[0] ??
  initializeApp({
    projectId: process.env.GCLOUD_PROJECT ?? "demo-nptel",
  })
const db = getFirestore(app)

const course = {
  id: "course-1",
  title: "Course 1",
  sample: false,
  status: "draft",
}
const week = {
  id: "week-1",
  courseId: course.id,
  weekNumber: 1,
  title: "Week 1",
  status: "draft",
}
const owner = { id: week.id, courseId: course.id, type: "week" }
const question = {
  id: "question-1",
  questionText: "What is 2 + 2?",
  options: ["3", "4"],
  optionCount: 2,
  correctAnswerIndex: 1,
  difficulty: "easy",
  status: "published",
}

test("content service enforces publication and preserves stable question IDs", async () => {
  await saveCourse(db, course)
  await assert.rejects(
    () => saveWeek(db, { ...week, status: "published" }),
    /Publish the course before publishing/,
  )

  await saveWeek(db, week)
  await saveQuestion(db, owner, { ...question, status: "draft" })
  await saveCourse(db, { ...course, status: "published" })
  await assert.rejects(
    () => saveWeek(db, { ...week, status: "published" }),
    /at least one complete published question/,
  )

  await saveQuestion(db, owner, question)
  await saveWeek(db, { ...week, status: "published" })
  await assert.rejects(
    () => archiveQuestion(db, owner, question.id),
    /last complete published question/,
  )

  await saveQuestion(db, owner, {
    ...question,
    questionText: "Updated question",
  })
  const stored = await db.collection("questions").doc(question.id).get()
  assert.equal(stored.get("questionText"), "Updated question")
})

test("bulk imports reject empty lists and duplicate IDs without writes", async () => {
  await assert.rejects(
    () => saveQuestions(db, owner, []),
    /between 1 and 450 questions/,
  )
  await assert.rejects(
    () =>
      saveQuestions(db, owner, [
        { ...question, id: "duplicate", status: "draft" },
        { ...question, id: "duplicate", status: "draft" },
      ]),
    /duplicate question IDs/,
  )
  assert.equal(
    (await db.collection("questions").doc("duplicate").get()).exists,
    false,
  )
})
