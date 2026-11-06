import { FieldValue } from "firebase-admin/firestore"

const statuses = new Set(["draft", "published", "archived"])
const contentCollections = new Set(["courses", "weeks", "papers", "questions"])
const questionFields = [
  "questionText",
  "options",
  "optionCount",
  "correctAnswerIndex",
  "difficulty",
  "topic",
  "explanation",
  "status",
]

function assertId(id) {
  if (
    typeof id !== "string" ||
    !id.trim() ||
    id.includes("/") ||
    id.length > 150
  )
    throw new Error("A valid content record ID is required.")
}

function assertStatus(status) {
  if (!statuses.has(status))
    throw new Error("Choose a valid publication status.")
}

function validQuestion(question) {
  return (
    typeof question.questionText === "string" &&
    question.questionText.trim().length > 0 &&
    Array.isArray(question.options) &&
    question.options.length >= 2 &&
    question.options.length <= 6 &&
    question.options.every(
      (option) => typeof option === "string" && option.trim().length > 0,
    ) &&
    Number.isInteger(question.correctAnswerIndex) &&
    question.correctAnswerIndex >= 0 &&
    question.correctAnswerIndex < question.options.length
  )
}

function completeQuestionCount(snapshot) {
  return snapshot.docs.filter(
    (item) =>
      item.get("status") === "published" &&
      item.get("contentReady") === true &&
      validQuestion(item.data()),
  ).length
}

function questionQuery(db, owner) {
  return db
    .collection("questions")
    .where(owner.type === "week" ? "weekId" : "paperId", "==", owner.id)
    .where("status", "==", "published")
    .where("contentReady", "==", true)
}

function ownerRef(db, owner) {
  assertId(owner.id)
  if (owner.type !== "week" && owner.type !== "paper")
    throw new Error("Questions must belong to a week or paper.")
  return db.collection(owner.type === "week" ? "weeks" : "papers").doc(owner.id)
}

function clean(value) {
  return Object.fromEntries(
    Object.entries(value).filter(([, field]) => field !== undefined),
  )
}

function contentReady(status) {
  return status === "published"
}

export async function saveCourse(db, course) {
  assertId(course?.id)
  assertStatus(course.status)
  if (typeof course.title !== "string" || !course.title.trim())
    throw new Error("Enter a course title before saving.")
  const data = clean({
    title: course.title.trim(),
    description:
      typeof course.description === "string" && course.description.trim()
        ? course.description.trim()
        : undefined,
    sample: course.sample === true,
    status: course.status,
    contentReady: contentReady(course.status),
  })
  await db.collection("courses").doc(course.id).set(data, { merge: true })
}

async function saveParent(db, type, record) {
  assertId(record?.id)
  assertStatus(record.status)
  const isWeek = type === "week"
  if (typeof record.courseId !== "string" || !record.courseId.trim())
    throw new Error("Select a course for this content.")
  if (typeof record.title !== "string" || !record.title.trim())
    throw new Error(`Enter a ${isWeek ? "week" : "paper"} title.`)
  if (isWeek && (!Number.isInteger(record.weekNumber) || record.weekNumber < 1))
    throw new Error("Week number must be a positive whole number.")
  if (
    !isWeek &&
    (!Number.isInteger(record.year) || record.year < 1950 || record.year > 2100)
  )
    throw new Error("Enter a valid paper year.")

  const collectionName = isWeek ? "weeks" : "papers"
  const ref = db.collection(collectionName).doc(record.id)
  const courseRef = db.collection("courses").doc(record.courseId)
  await db.runTransaction(async (transaction) => {
    const courseSnapshot = await transaction.get(courseRef)
    if (!courseSnapshot.exists)
      throw new Error("The selected course no longer exists.")
    if (record.status === "published") {
      if (
        courseSnapshot.get("status") !== "published" ||
        courseSnapshot.get("contentReady") !== true
      )
        throw new Error("Publish the course before publishing its content.")
      const questions = await transaction.get(
        questionQuery(db, { id: record.id, type }),
      )
      if (completeQuestionCount(questions) === 0)
        throw new Error(
          `Publish at least one complete question before publishing this ${
            isWeek ? "week" : "paper"
          }.`,
        )
    }
    const data = isWeek
      ? {
          courseId: record.courseId,
          weekNumber: record.weekNumber,
          title: record.title.trim(),
          status: record.status,
          contentReady: contentReady(record.status),
        }
      : clean({
          courseId: record.courseId,
          title: record.title.trim(),
          year: record.year,
          session: record.session ?? "",
          course: record.course,
          status: record.status,
          contentReady: contentReady(record.status),
        })
    transaction.set(ref, data, { merge: true })
  })
}

export const saveWeek = (db, week) => saveParent(db, "week", week)
export const savePaper = (db, paper) => saveParent(db, "paper", paper)

function normalizedQuestion(owner, question) {
  assertId(question?.id)
  assertStatus(question.status)
  if (question.status === "published" && !validQuestion(question))
    throw new Error(
      "A published question needs text, 2–6 non-empty options, and a valid correct answer.",
    )
  return clean({
    ...Object.fromEntries(
      questionFields.map((field) => [field, question[field]]),
    ),
    courseId: owner.courseId,
    weekId: owner.type === "week" ? owner.id : null,
    paperId: owner.type === "paper" ? owner.id : null,
    contentReady: question.status === "published" && validQuestion(question),
  })
}

export async function saveQuestion(db, owner, question) {
  assertId(owner?.courseId)
  const parentRef = ownerRef(db, owner)
  const questionRef = db.collection("questions").doc(question?.id)
  const data = normalizedQuestion(owner, question)

  await db.runTransaction(async (transaction) => {
    const [parent, existing, published] = await Promise.all([
      transaction.get(parentRef),
      transaction.get(questionRef),
      transaction.get(questionQuery(db, owner)),
    ])
    if (!parent.exists || parent.get("courseId") !== owner.courseId)
      throw new Error("The question's parent content is missing or changed.")
    if (existing.exists) {
      const storedOwner =
        owner.type === "week" ? existing.get("weekId") : existing.get("paperId")
      if (storedOwner !== owner.id)
        throw new Error("A question ID cannot be moved to another parent.")
    }
    if (parent.get("status") === "published") {
      const remaining = published.docs.filter(
        (item) => item.id !== question.id && validQuestion(item.data()),
      ).length
      const addsQuestion =
        question.status === "published" && validQuestion(question) ? 1 : 0
      if (remaining + addsQuestion === 0)
        throw new Error(
          `Unpublish this ${owner.type} before removing its last complete published question.`,
        )
    }
    transaction.set(questionRef, data, { merge: true })
  })
}

export async function saveQuestions(db, owner, questions) {
  if (
    !Array.isArray(questions) ||
    questions.length < 1 ||
    questions.length > 450
  )
    throw new Error("Bulk upload must contain between 1 and 450 questions.")
  const parentRef = ownerRef(db, owner)
  const entries = questions.map((question) => {
    if (question.status !== "draft")
      throw new Error("Bulk imports are saved as drafts for review.")
    return {
      id: question.id,
      ref: db.collection("questions").doc(question.id),
      data: normalizedQuestion(owner, question),
    }
  })
  const ids = new Set(entries.map((entry) => entry.id))
  if (ids.size !== entries.length)
    throw new Error("The import contains duplicate question IDs.")

  await db.runTransaction(async (transaction) => {
    const [parent, ...existing] = await Promise.all([
      transaction.get(parentRef),
      ...entries.map((entry) => transaction.get(entry.ref)),
    ])
    if (!parent.exists || parent.get("courseId") !== owner.courseId)
      throw new Error("The question's parent content is missing or changed.")
    if (existing.some((item) => item.exists))
      throw new Error(
        "An imported question ID already exists; no rows were saved.",
      )
    for (const entry of entries) transaction.create(entry.ref, entry.data)
  })
}

export async function archiveQuestion(db, owner, questionId) {
  const parentRef = ownerRef(db, owner)
  const questionRef = db.collection("questions").doc(questionId)
  await db.runTransaction(async (transaction) => {
    const [parent, question, published] = await Promise.all([
      transaction.get(parentRef),
      transaction.get(questionRef),
      transaction.get(questionQuery(db, owner)),
    ])
    if (!parent.exists || !question.exists)
      throw new Error("The question or its parent no longer exists.")
    const existingOwner =
      owner.type === "week" ? question.get("weekId") : question.get("paperId")
    if (existingOwner !== owner.id)
      throw new Error("The question is not part of this content.")
    if (
      parent.get("status") === "published" &&
      completeQuestionCount(published) -
        (question.get("status") === "published" &&
        question.get("contentReady") === true &&
        validQuestion(question.data())
          ? 1
          : 0) ===
        0
    )
      throw new Error(
        `Unpublish this ${owner.type} before removing its last complete published question.`,
      )
    transaction.update(questionRef, {
      status: "archived",
      contentReady: false,
      archivedAt: FieldValue.serverTimestamp(),
    })
  })
}

export async function archiveContent(db, collectionName, id) {
  if (!contentCollections.has(collectionName) || collectionName === "questions")
    throw new Error("Choose a course, week, or paper to archive.")
  assertId(id)
  const ref = db.collection(collectionName).doc(id)
  await ref.set(
    {
      status: "archived",
      contentReady: false,
      archivedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  )
}
