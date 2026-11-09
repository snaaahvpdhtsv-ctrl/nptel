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
const BULK_BATCH_SIZE = 200
const MAX_IMPORT_ROWS = 1000

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

function comparable(value) {
  if (Array.isArray(value)) return value.map(comparable)
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key]) => key !== "bulkOperationId")
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, field]) => [key, comparable(field)]),
    )
  }
  return value
}

function sameContent(left, right) {
  return JSON.stringify(comparable(left)) === JSON.stringify(comparable(right))
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
  if (isWeek && (!Number.isInteger(record.weekNumber) || record.weekNumber < 0))
    throw new Error("Week number must be a whole number starting at 0.")
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

export async function saveQuestionsWithOperation(
  db,
  owner,
  questions,
  metadata = {},
) {
  if (
    !Array.isArray(questions) ||
    questions.length < 1 ||
    questions.length > MAX_IMPORT_ROWS
  )
    throw new Error(
      `Bulk upload must contain between 1 and ${MAX_IMPORT_ROWS} questions.`,
    )
  const parentRef = ownerRef(db, owner)
  const entries = questions.map((question, index) => {
    if (question.status !== "draft")
      throw new Error("Bulk imports are saved as drafts for review.")
    return {
      row: index + 1,
      id: question.id,
      ref: db.collection("questions").doc(question.id),
      data: normalizedQuestion(owner, question),
    }
  })
  if (new Set(entries.map((entry) => entry.id)).size !== entries.length)
    throw new Error("The import contains duplicate question IDs.")
  const operationRef = metadata.operationId
    ? db.collection("bulkOperations").doc(metadata.operationId)
    : db.collection("bulkOperations").doc()
  const parent = await parentRef.get()
  if (!parent.exists || parent.get("courseId") !== owner.courseId)
    throw new Error("The question's parent content is missing or changed.")
  const existingOperation = await operationRef.get()
  if (existingOperation.exists) {
    if (existingOperation.get("type") !== "import")
      throw new Error("The operation ID belongs to another operation.")
    if (existingOperation.get("status") === "completed")
      return { operationId: operationRef.id, status: "completed" }
  } else {
    const now = new Date().toISOString()
    await operationRef.create({
      type: "import",
      sourceType: metadata.sourceType ?? "json",
      fileName: metadata.fileName ?? "import",
      courseId: owner.courseId,
      ownerId: owner.id,
      ownerType: owner.type,
      actorId: metadata.actorId ?? null,
      createdAt: now,
      total: entries.length,
      succeeded: 0,
      failed: 0,
      skipped: 0,
      rejected: 0,
      retryable: 0,
      status: "pending",
      questionIds: entries.map((entry) => entry.id),
      rows: entries.map((entry) => ({
        row: entry.row,
        questionId: entry.id,
        data: entry.data,
      })),
      results: entries.map((entry) => ({
        row: entry.row,
        questionId: entry.id,
        status: "pending",
        reason: "Waiting for execution.",
        retryable: true,
      })),
    })
  }
  await operationRef.update({
    status: "processing",
    startedAt: new Date().toISOString(),
  })
  const completedEntries = []
  let batchNumber = 0
  try {
    for (let offset = 0; offset < entries.length; offset += BULK_BATCH_SIZE) {
      batchNumber += 1
      const batchEntries = entries.slice(offset, offset + BULK_BATCH_SIZE)
      const existing = await db.getAll(
        ...batchEntries.map((entry) => entry.ref),
      )
      const completed = existing.filter(
        (snapshot) =>
          snapshot.exists &&
          snapshot.get("bulkOperationId") === operationRef.id,
      )
      completedEntries.push(
        ...batchEntries.filter((entry) =>
          completed.some((snapshot) => snapshot.id === entry.id),
        ),
      )
      const conflicts = existing.filter(
        (snapshot) =>
          snapshot.exists &&
          snapshot.get("bulkOperationId") !== operationRef.id,
      )
      if (conflicts.length > 0) {
        const conflictIds = new Set(conflicts.map((snapshot) => snapshot.id))
        const results = entries.map((entry) =>
          conflictIds.has(entry.id)
            ? {
                row: entry.row,
                questionId: entry.id,
                status: "failed",
                reason: "Question ID already exists.",
                retryable: false,
              }
            : null,
        )
        await operationRef.update({
          status: "failed",
          failed: conflicts.length,
          retryable: 0,
          results: results.map(
            (result, index) =>
              result ?? {
                row: entries[index].row,
                questionId: entries[index].id,
                status: "pending",
                reason: "Waiting for retry.",
                retryable: true,
              },
          ),
        })
        throw new Error("One or more imported question IDs already exist.")
      }
      const batch = db.batch()
      const newEntries = batchEntries.filter(
        (entry) => !completed.some((snapshot) => snapshot.id === entry.id),
      )
      for (const entry of newEntries)
        batch.create(entry.ref, {
          ...entry.data,
          bulkOperationId: operationRef.id,
        })
      await batch.commit()
      completedEntries.push(...newEntries)
      const results = entries.map((entry) =>
        completedEntries.some((item) => item.id === entry.id)
          ? {
              row: entry.row,
              questionId: entry.id,
              status: "created",
              reason: "Question created as draft.",
              retryable: false,
            }
          : {
              row: entry.row,
              questionId: entry.id,
              status: "pending",
              reason: "Waiting for execution.",
              retryable: true,
            },
      )
      await operationRef.update({
        status:
          completedEntries.length === entries.length
            ? "completed"
            : "partially_completed",
        completedAt:
          completedEntries.length === entries.length
            ? new Date().toISOString()
            : null,
        succeeded: completedEntries.length,
        failed: 0,
        retryable: entries.length - completedEntries.length,
        results,
        createdSnapshots: completedEntries.map((entry) => ({
          questionId: entry.id,
          data: entry.data,
        })),
      })
      if (
        process.env.FUNCTIONS_EMULATOR === "true" &&
        Number.isInteger(metadata.failAfterBatch) &&
        batchNumber === metadata.failAfterBatch
      )
        throw new Error("Deterministic test failure after batch completion.")
    }
  } catch (error) {
    await operationRef.update({
      status: completedEntries.length ? "partially_completed" : "failed",
      succeeded: completedEntries.length,
      failed: 0,
      retryable: entries.length - completedEntries.length,
      results: entries.map((entry) =>
        completedEntries.some((item) => item.id === entry.id)
          ? {
              row: entry.row,
              questionId: entry.id,
              status: "created",
              reason: "Question created as draft.",
              retryable: false,
            }
          : {
              row: entry.row,
              questionId: entry.id,
              status: "pending",
              reason: "Eligible for retry.",
              retryable: true,
            },
      ),
    })
    throw error
  }
  return {
    operationId: operationRef.id,
    status: "completed",
    succeeded: completedEntries.length,
  }
}

export async function previewQuestionPublication(db, owner, questionIds) {
  if (
    !Array.isArray(questionIds) ||
    questionIds.length < 1 ||
    questionIds.length > 450
  )
    throw new Error("Select between 1 and 450 questions.")
  const parent = await ownerRef(db, owner).get()
  if (!parent.exists || parent.get("courseId") !== owner.courseId)
    throw new Error("The selected parent content is missing or changed.")
  const snapshots = await db.getAll(
    ...questionIds.map((id) => db.collection("questions").doc(id)),
  )
  const results = snapshots.map((snapshot) => {
    if (!snapshot.exists)
      return {
        questionId: snapshot.id,
        eligible: false,
        errors: ["Question no longer exists."],
        warnings: [],
      }
    const question = snapshot.data()
    const errors = []
    const warnings = []
    const expectedOwner =
      owner.type === "week" ? question.weekId : question.paperId
    if (question.courseId !== owner.courseId || expectedOwner !== owner.id)
      errors.push("Question belongs to another parent.")
    if (question.status !== "review" && question.status !== "published")
      errors.push("Question must be submitted for review before publishing.")
    if (!validQuestion(question)) errors.push("Question is incomplete.")
    if (!question.explanation?.trim()) warnings.push("Explanation is missing.")
    if (!question.difficulty?.trim()) warnings.push("Difficulty is missing.")
    return {
      questionId: snapshot.id,
      eligible: errors.length === 0,
      errors,
      warnings,
    }
  })
  return {
    owner,
    results,
    eligible: results
      .filter((result) => result.eligible)
      .map((result) => result.questionId),
    blocked: results
      .filter((result) => !result.eligible)
      .map((result) => result.questionId),
  }
}

export async function rollbackImportOperation(db, operationId) {
  assertId(operationId)
  const operationRef = db.collection("bulkOperations").doc(operationId)
  await operationRef.update({ status: "rollback_in_progress" })
  await db.runTransaction(async (transaction) => {
    const operation = await transaction.get(operationRef)
    if (!operation.exists)
      throw new Error("The bulk operation no longer exists.")
    if (operation.get("type") !== "import")
      throw new Error("Only import operations can be rolled back.")
    if (
      operation.get("status") === "rolled_back" ||
      operation.get("status") === "rolled_back_with_conflicts"
    )
      return
    const questionIds = operation.get("questionIds") ?? []
    const snapshots = new Map(
      (operation.get("createdSnapshots") ?? []).map((item) => [
        item.questionId,
        item.data,
      ]),
    )
    const questions = await Promise.all(
      questionIds.map((id) =>
        transaction.get(db.collection("questions").doc(id)),
      ),
    )
    const conflicts = []
    questions.forEach((question) => {
      if (!question.exists || question.get("bulkOperationId") !== operationId)
        return
      if (!sameContent(question.data(), snapshots.get(question.id))) {
        conflicts.push(question.id)
        return
      }
      transaction.delete(question.ref)
    })
    transaction.update(operationRef, {
      status: conflicts.length ? "rolled_back_with_conflicts" : "rolled_back",
      conflicts,
      rolledBackAt: new Date().toISOString(),
    })
  })
  const updated = await operationRef.get()
  return {
    operationId,
    status: updated.get("status"),
    conflicts: updated.get("conflicts") ?? [],
  }
}

export async function updateQuestionsWithOperation(
  db,
  owner,
  questionIds,
  patch,
  metadata = {},
) {
  if (
    !Array.isArray(questionIds) ||
    questionIds.length < 1 ||
    questionIds.length > 450
  )
    throw new Error("Select between 1 and 450 questions.")
  const parentRef = ownerRef(db, owner)
  const refs = questionIds.map((id) => db.collection("questions").doc(id))
  const operationRef = db.collection("bulkOperations").doc()
  const auditRef = db.collection("auditLogs").doc()
  await db.runTransaction(async (transaction) => {
    const parent = await transaction.get(parentRef)
    const snapshots = await Promise.all(refs.map((ref) => transaction.get(ref)))
    if (!parent.exists || parent.get("courseId") !== owner.courseId)
      throw new Error("The selected parent content is missing or changed.")
    if (snapshots.some((snapshot) => !snapshot.exists))
      throw new Error("One or more selected questions no longer exists.")
    const before = snapshots.map((snapshot) => snapshot.data())
    const next = snapshots.map((snapshot) => ({ ...snapshot.data(), ...patch }))
    if (patch.status === "published") {
      if (next.some((question) => !validQuestion(question)))
        throw new Error("Incomplete questions cannot be published.")
      if (
        before.some(
          (question) =>
            question.status !== "review" && question.status !== "published",
        )
      )
        throw new Error(
          "Questions must be submitted for review before publishing.",
        )
    }
    snapshots.forEach((snapshot, index) => {
      const current = snapshot.data()
      const expectedOwner =
        owner.type === "week" ? current.weekId : current.paperId
      if (current.courseId !== owner.courseId || expectedOwner !== owner.id)
        throw new Error("A selected question belongs to another parent.")
      transaction.update(
        refs[index],
        clean({
          ...patch,
          contentReady:
            patch.status === "published"
              ? validQuestion(next[index])
              : patch.status
                ? false
                : current.contentReady,
        }),
      )
    })
    transaction.create(operationRef, {
      type:
        patch.status === "published"
          ? "publish"
          : patch.status === "draft"
            ? "unpublish"
            : "edit",
      courseId: owner.courseId,
      ownerId: owner.id,
      ownerType: owner.type,
      actorId: metadata.actorId ?? null,
      createdAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      total: refs.length,
      succeeded: refs.length,
      failed: 0,
      skipped: 0,
      rejected: 0,
      retryable: 0,
      status: "completed",
      questionIds,
      results: questionIds.map((id) => ({
        row: 0,
        questionId: id,
        status: "updated",
        reason: "Bulk update completed.",
        retryable: false,
      })),
      before,
      patch,
    })
    transaction.create(auditRef, {
      action:
        patch.status === "published"
          ? "Bulk publish"
          : patch.status === "draft"
            ? "Bulk unpublish"
            : "Bulk edit",
      resource: `${owner.type}:${owner.id}`,
      actorId: metadata.actorId ?? null,
      actorEmail: metadata.actorEmail ?? null,
      createdAt: new Date().toISOString(),
      outcome: "success",
      operationId: operationRef.id,
      questionIds,
    })
  })
  return { operationId: operationRef.id }
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
