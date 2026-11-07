import {
  collection,
  doc,
  getDoc,
  limit,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  where,
  writeBatch,
  type Unsubscribe,
  type DocumentData,
  type Query,
} from "firebase/firestore"
import { httpsCallable } from "firebase/functions"
import type { AdminQuestion, Course, Paper, Status, Week } from "./data"
import { isValidQuestion } from "./question-validation"
import { firebaseFunctions, firestore } from "./firebase"

export { isValidQuestion } from "./question-validation"

export interface CloudContent {
  courses: Course[]
  weeks: Week[]
  papers: Paper[]
  questions: Record<string, AdminQuestion[]>
}

export type BulkOperationStatus = "completed" | "partial" | "failed" | "rolled_back"

export type BulkOperation = {
  id: string
  type: "import" | "edit" | "publish" | "unpublish" | "archive" | "restore"
  sourceType?: "csv" | "json"
  fileName?: string
  courseId: string
  ownerId: string
  ownerType: "week" | "paper"
  createdAt: string
  completedAt?: string
  actorId?: string
  total: number
  succeeded: number
  failed: number
  skipped: number
  rejected: number
  retryable: number
  status: BulkOperationStatus
  questionIds: string[]
  results: Array<{
    row: number
    questionId?: string
    status: "created" | "updated" | "rejected" | "skipped" | "failed"
    reason: string
    retryable: boolean
  }>
}

const asStatus = (value: unknown): Status =>
  value === "review" || value === "published" || value === "archived"
    ? value
    : "draft"

const asCourse = (id: string, value: DocumentData): Course => ({
  ...value,
  id,
  title: typeof value.title === "string" ? value.title : "",
  description:
    typeof value.description === "string" ? value.description : undefined,
  status: asStatus(value.status),
  sample: value.sample === true,
})

const asWeek = (id: string, value: DocumentData): Week => ({
  ...value,
  id,
  courseId: typeof value.courseId === "string" ? value.courseId : "",
  weekNumber:
    typeof value.weekNumber === "number" && Number.isInteger(value.weekNumber)
      ? value.weekNumber
      : 0,
  title: typeof value.title === "string" ? value.title : "",
  questionCount: 0,
  status: asStatus(value.status),
})

const asPaper = (id: string, value: DocumentData): Paper => ({
  ...value,
  id,
  courseId: typeof value.courseId === "string" ? value.courseId : "",
  title: typeof value.title === "string" ? value.title : "",
  year: typeof value.year === "number" ? value.year : 0,
  session: typeof value.session === "string" ? value.session : "",
  questionCount: 0,
  status: asStatus(value.status),
})

const asQuestion = (id: string, value: DocumentData): AdminQuestion => {
  const options = Array.isArray(value.options)
    ? value.options.filter(
        (option: unknown): option is string => typeof option === "string",
      )
    : undefined
  return {
    id,
    questionText:
      typeof value.questionText === "string" ? value.questionText : "",
    options,
    optionCount:
      options?.length ??
      (typeof value.optionCount === "number" ? value.optionCount : 0),
    correctAnswerIndex:
      typeof value.correctAnswerIndex === "number"
        ? value.correctAnswerIndex
        : -1,
    difficulty: typeof value.difficulty === "string" ? value.difficulty : "",
    contentReady: value.contentReady === true,
    topic: typeof value.topic === "string" ? value.topic : undefined,
    explanation:
      typeof value.explanation === "string" ? value.explanation : undefined,
    reviewNote:
      typeof value.reviewNote === "string" ? value.reviewNote : undefined,
    status: asStatus(value.status),
  }
}

const requireFirestore = () => {
  if (!firestore) throw new Error("Firebase Firestore is not configured.")
  return firestore
}

function documentPayload<T extends { id: string }>(value: T) {
  const { id: _id, ...data } = value
  return data
}

function withoutUndefined(value: object): DocumentData {
  return Object.fromEntries(
    Object.entries(value).filter(([, field]) => field !== undefined),
  )
}

export function newQuestionId() {
  return doc(collection(requireFirestore(), "questions")).id
}

export function newContentId(collectionName: "weeks" | "papers") {
  return doc(collection(requireFirestore(), collectionName)).id
}

function validContent(
  collections: Map<string, Map<string, DocumentData>>,
): CloudContent {
  const collect = (
    keys: string[],
    map: (id: string, data: DocumentData) => unknown,
  ) =>
    keys.flatMap((key) =>
      [...(collections.get(key) ?? [])].map(([id, data]) => map(id, data)),
    )
  const courses = collect(
    [...collections.keys()].filter(
      (key) => key === "admin:courses" || key === "public:courses",
    ),
    asCourse,
  ) as Course[]
  const weeks = collect(
    [...collections.keys()].filter(
      (key) => key === "admin:weeks" || key.startsWith("weeks:"),
    ),
    asWeek,
  ) as Week[]
  const papers = collect(
    [...collections.keys()].filter(
      (key) => key === "admin:papers" || key.startsWith("papers:"),
    ),
    asPaper,
  ) as Paper[]
  const questionKeys = [...collections.keys()].filter(
    (key) =>
      key === "admin:questions" ||
      key.startsWith("weekQuestions:") ||
      key.startsWith("paperQuestions:"),
  )
  const questions: Record<string, AdminQuestion[]> = {}
  for (const key of questionKeys) {
    const records = collections.get(key)
    for (const [id, data] of records ?? []) {
      const ownerId =
        key === "admin:questions"
          ? typeof data.weekId === "string"
            ? data.weekId
            : typeof data.paperId === "string"
              ? data.paperId
              : ""
          : key.slice(key.indexOf(":") + 1)
      if (!ownerId) continue
      ;(questions[ownerId] ??= []).push(asQuestion(id, data))
    }
  }
  const counts = new Map<string, number>()
  for (const [ownerId, records] of Object.entries(questions)) {
    counts.set(
      ownerId,
      records.filter(
        (question) =>
          question.status === "published" && isValidQuestion(question),
      ).length,
    )
  }
  return {
    courses,
    weeks: weeks.map((week) => ({
      ...week,
      questionCount: counts.get(week.id) ?? 0,
    })),
    papers: papers.map((paper) => ({
      ...paper,
      questionCount: counts.get(paper.id) ?? 0,
    })),
    questions,
  }
}

export function subscribeToContent(
  isAdmin: boolean,
  onContent: (content: CloudContent) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  const database = requireFirestore()
  const subscriptions = new Map<string, Unsubscribe>()
  const snapshots = new Map<string, Map<string, DocumentData>>()
  let stopped = false

  const refresh = () => {
    if (stopped) return
    if (!isAdmin && snapshots.has("public:courses")) {
      const content = validContent(snapshots)
      const desiredWeeks = new Map<string, Query<DocumentData>>()
      const desiredPapers = new Map<string, Query<DocumentData>>()
      for (const course of content.courses) {
        desiredWeeks.set(
          `weeks:${course.id}`,
          query(
            collection(database, "weeks"),
            where("courseId", "==", course.id),
            where("status", "==", "published"),
            where("contentReady", "==", true),
          ),
        )
        desiredPapers.set(
          `papers:${course.id}`,
          query(
            collection(database, "papers"),
            where("courseId", "==", course.id),
            where("status", "==", "published"),
            where("contentReady", "==", true),
          ),
        )
      }
      reconcile("weeks:", desiredWeeks)
      reconcile("papers:", desiredPapers)

      const parentContent = validContent(snapshots)
      const desiredWeekQuestions = new Map<string, Query<DocumentData>>()
      const desiredPaperQuestions = new Map<string, Query<DocumentData>>()
      for (const week of parentContent.weeks) {
        desiredWeekQuestions.set(
          `weekQuestions:${week.id}`,
          query(
            collection(database, "questions"),
            where("weekId", "==", week.id),
            where("status", "==", "published"),
            where("contentReady", "==", true),
          ),
        )
      }
      for (const paper of parentContent.papers) {
        desiredPaperQuestions.set(
          `paperQuestions:${paper.id}`,
          query(
            collection(database, "questions"),
            where("paperId", "==", paper.id),
            where("status", "==", "published"),
            where("contentReady", "==", true),
          ),
        )
      }
      reconcile("weekQuestions:", desiredWeekQuestions)
      reconcile("paperQuestions:", desiredPaperQuestions)
    }

    if ([...subscriptions.keys()].some((key) => !snapshots.has(key))) return
    onContent(validContent(snapshots))
  }

  function reconcile(prefix: string, wanted: Map<string, Query<DocumentData>>) {
    for (const [key, unsubscribe] of subscriptions) {
      if (key.startsWith(prefix) && !wanted.has(key)) {
        unsubscribe()
        subscriptions.delete(key)
        snapshots.delete(key)
      }
    }
    for (const [key, ref] of wanted) watch(key, ref)
  }

  function watch(key: string, ref: Query<DocumentData>) {
    if (subscriptions.has(key)) return
    subscriptions.set(
      key,
      onSnapshot(
        ref,
        (snapshot) => {
          snapshots.set(
            key,
            new Map(snapshot.docs.map((item) => [item.id, item.data()])),
          )
          refresh()
        },
        onError,
      ),
    )
  }

  if (isAdmin) {
    watch("admin:courses", collection(database, "courses"))
    watch("admin:weeks", collection(database, "weeks"))
    watch("admin:papers", collection(database, "papers"))
    watch("admin:questions", collection(database, "questions"))
  } else {
    watch(
      "public:courses",
      query(
        collection(database, "courses"),
        where("status", "==", "published"),
        where("contentReady", "==", true),
      ),
    )
  }

  return () => {
    stopped = true
    for (const unsubscribe of subscriptions.values()) unsubscribe()
    subscriptions.clear()
  }
}

export async function saveCourse(course: Course) {
  const database = requireFirestore()
  await setDoc(
    doc(database, "courses", course.id),
    withoutUndefined({
      ...documentPayload(course),
      contentReady: course.status === "published",
    }),
    { merge: true },
  )
}

export async function saveWeek(week: Week, questions: AdminQuestion[]) {
  const database = requireFirestore()
  if (
    week.status === "published" &&
    !questions.some(
      (question) =>
        question.status === "published" && isValidQuestion(question),
    )
  )
    throw new Error(
      "Publish at least one complete question before publishing this week.",
    )
  const { questionCount: _questionCount, ...data } = documentPayload(week)
  await setDoc(
    doc(database, "weeks", week.id),
    withoutUndefined({ ...data, contentReady: week.status === "published" }),
    { merge: true },
  )
}

export async function savePaper(paper: Paper, questions: AdminQuestion[]) {
  const database = requireFirestore()
  if (
    paper.status === "published" &&
    !questions.some(
      (question) =>
        question.status === "published" && isValidQuestion(question),
    )
  )
    throw new Error(
      "Publish at least one complete question before publishing this paper.",
    )
  const { questionCount: _questionCount, ...data } = documentPayload(paper)
  await setDoc(
    doc(database, "papers", paper.id),
    withoutUndefined({ ...data, contentReady: paper.status === "published" }),
    { merge: true },
  )
}

export async function saveQuestion(
  owner: {
    id: string
    courseId: string
    type: "week" | "paper"
  },
  question: AdminQuestion,
) {
  const database = requireFirestore()
  if (question.status === "published" && !isValidQuestion(question))
    throw new Error(
      "A published question needs text, 2–6 non-empty options, and a valid correct answer.",
    )
  const { id, ...data } = question
  await setDoc(
    doc(database, "questions", id),
    withoutUndefined({
      ...data,
      courseId: owner.courseId,
      ...(owner.type === "week"
        ? { weekId: owner.id, paperId: null }
        : { paperId: owner.id, weekId: null }),
      contentReady:
        question.status === "published" && isValidQuestion(question),
    }),
    { merge: true },
  )
}

export async function saveQuestions(
  owner: {
    id: string
    courseId: string
    type: "week" | "paper"
  },
  questions: AdminQuestion[],
) {
  const database = requireFirestore()
  const ids = new Set<string>()
  for (const question of questions) {
    if (ids.has(question.id))
      throw new Error("The import contains duplicate question IDs.")
    ids.add(question.id)
    if (question.status === "published" && !isValidQuestion(question))
      throw new Error(
        "A published question needs text, 2–6 non-empty options, and a valid correct answer.",
      )
  }

  const batch = writeBatch(database)
  for (const question of questions) {
    const { id, ...data } = question
    batch.set(
      doc(database, "questions", id),
      withoutUndefined({
        ...data,
        courseId: owner.courseId,
        ...(owner.type === "week"
          ? { weekId: owner.id, paperId: null }
          : { paperId: owner.id, weekId: null }),
        contentReady:
          question.status === "published" && isValidQuestion(question),
      }),
      { merge: true },
    )
  }
  await batch.commit()
}

export async function importQuestionOperation(
  owner: { id: string courseId: string type: "week" | "paper" },
  questions: AdminQuestion[],
  metadata: { sourceType: "csv" | "json" fileName: string },
) {
  if (!firebaseFunctions)
    throw new Error("Trusted bulk content service is not configured.")
  const callable = httpsCallable(firebaseFunctions, "importQuestionOperation")
  const result = await callable({ owner, questions, metadata })
  return result.data as { operationId: string }
}

export async function updateQuestionOperation(
  owner: { id: string courseId: string type: "week" | "paper" },
  questionIds: string[],
  patch: Partial<Pick<AdminQuestion, "difficulty" | "topic" | "explanation" | "status">>,
) {
  if (!firebaseFunctions)
    throw new Error("Trusted bulk content service is not configured.")
  const callable = httpsCallable(firebaseFunctions, "updateQuestionOperation")
  const result = await callable({ owner, questionIds, patch })
  return result.data as { operationId: string }
}

export async function rollbackImportOperation(operationId: string) {
  if (!firebaseFunctions)
    throw new Error("Trusted bulk content service is not configured.")
  const callable = httpsCallable(
    firebaseFunctions,
    "rollbackImportOperationContent",
  )
  const result = await callable({ operationId })
  return result.data as { operationId: string status: "rolled_back" }
}

export async function importQuestionsWithOperation(
  owner: {
    id: string
    courseId: string
    type: "week" | "paper"
  },
  questions: AdminQuestion[],
  operation: Omit<BulkOperation, "id" | "completedAt" | "questionIds" | "succeeded" | "failed" | "skipped" | "rejected" | "retryable" | "status"> & {
    results: BulkOperation["results"]
  },
) {
  const database = requireFirestore()
  if (questions.length < 1 || questions.length > 450)
    throw new Error(
      "Bulk import must contain between 1 and 450 valid questions.",
    )
  const operationRef = doc(collection(database, "bulkOperations"))
  const ids = new Set<string>()
  for (const question of questions) {
    if (ids.has(question.id))
      throw new Error("The import contains duplicate question IDs.")
    ids.add(question.id)
    if (question.status !== "draft")
      throw new Error("Imported questions must remain drafts.")
  }
  const batch = writeBatch(database)
  batch.set(operationRef, {
    ...operation,
    type: "import",
    status: "completed",
    completedAt: new Date().toISOString(),
    questionIds: questions.map((question) => question.id),
    succeeded: questions.length,
    failed: 0,
    skipped: 0,
    rejected: 0,
    retryable: 0,
    results: operation.results,
  })
  for (const question of questions) {
    const { id, ...data } = question
    batch.create(
      doc(database, "questions", id),
      withoutUndefined({
        ...data,
        courseId: owner.courseId,
        ...(owner.type === "week"
          ? { weekId: owner.id, paperId: null }
          : { paperId: owner.id, weekId: null }),
        status: "draft",
        contentReady: false,
      }),
    )
  }
  await batch.commit()
  return operationRef.id
}

export async function bulkUpdateQuestions(
  owner: {
    id: string
    courseId: string
    type: "week" | "paper"
  },
  questions: AdminQuestion[],
  patch: Partial<Pick<AdminQuestion, "difficulty" | "topic" | "explanation" | "status">>,
) {
  const database = requireFirestore()
  if (questions.length < 1 || questions.length > 450)
    throw new Error("Select between 1 and 450 questions.")
  if (patch.status === "published") {
    const invalid = questions.find((question) => !isValidQuestion(question))
    if (invalid)
      throw new Error(
        `Question ${invalid.id} is incomplete and cannot be published.`,
      )
    const notReviewed = questions.find(
      (question) =>
        question.status !== "review" && question.status !== "published",
    )
    if (notReviewed)
      throw new Error(
        `Question ${notReviewed.id} must be submitted for review before publishing.`,
      )
  }
  if (
    patch.status === "archived" &&
    questions.some((question) => question.status === "published")
  )
    throw new Error("Unpublish published questions before archiving them.")
  const parent = await getDoc(
    doc(database, owner.type === "week" ? "weeks" : "papers", owner.id),
  )
  if (!parent.exists() || parent.data().courseId !== owner.courseId)
    throw new Error(
      "The selected parent content is missing or belongs to another course.",
    )
  const stored = await Promise.all(
    questions.map((question) =>
      getDoc(doc(database, "questions", question.id)),
    ),
  )
  if (
    stored.some(
      (snapshot, index) =>
        !snapshot.exists() ||
        snapshot.data().courseId !== owner.courseId ||
        (owner.type === "week"
          ? snapshot.data().weekId !== owner.id
          : snapshot.data().paperId !== owner.id),
    )
  )
    throw new Error(
      "One or more selected questions no longer belongs to this content.",
    )
  const batch = writeBatch(database)
  for (const question of questions) {
    const next = { ...question, ...patch }
    batch.update(
      doc(database, "questions", question.id),
      withoutUndefined({
        ...(patch.difficulty !== undefined
          ? { difficulty: patch.difficulty }
          : {}),
        ...(patch.topic !== undefined
          ? { topic: patch.topic || undefined }
          : {}),
        ...(patch.explanation !== undefined
          ? { explanation: patch.explanation || undefined }
          : {}),
        ...(patch.status !== undefined
          ? {
              status: patch.status,
              contentReady:
                patch.status === "published" && isValidQuestion(next),
            }
          : {}),
        courseId: owner.courseId,
        ...(owner.type === "week"
          ? { weekId: owner.id, paperId: null }
          : { paperId: owner.id, weekId: null }),
      }),
    )
  }
  await batch.commit()
}

export function subscribeToBulkOperations(
  onOperations: (operations: BulkOperation[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  const database = requireFirestore()
  return onSnapshot(
    query(
      collection(database, "bulkOperations"),
      orderBy("createdAt", "desc"),
      limit(100),
    ),
    (snapshot) =>
      onOperations(
        snapshot.docs.map((item) => ({
          id: item.id,
          ...item.data() as Omit<BulkOperation, "id">,
        })),
      ),
    onError,
  )
}

export async function restoreWeekBackup(
  courseId: string,
  weeks: Week[],
  questions: Record<string, AdminQuestion[]>,
) {
  const database = requireFirestore()
  const records = weeks.flatMap((week) => [
    { collection: "weeks", id: week.id },
    ...(questions[week.id] ?? []).map((question) => ({
      collection: "questions",
      id: question.id,
    })),
  ])
  if (records.length === 0) throw new Error("The backup contains no records.")
  if (records.length > 500)
    throw new Error("This backup is too large to restore atomically.")
  const ids = new Set<string>()
  for (const week of weeks) {
    if (
      week.courseId !== courseId ||
      !week.id ||
      !Number.isInteger(week.weekNumber) ||
      week.weekNumber <= 0 ||
      !week.title.trim()
    )
      throw new Error("The backup contains an invalid week.")
    if (ids.has(week.id)) throw new Error(`Duplicate backup ID: ${week.id}`)
    ids.add(week.id)
    for (const question of questions[week.id] ?? []) {
      if (ids.has(question.id))
        throw new Error(`Duplicate backup ID: ${question.id}`)
      if (!isValidQuestion({ ...question, status: "draft" }))
        throw new Error(`Backup question ${question.id} is invalid.`)
      ids.add(question.id)
    }
  }
  const batch = writeBatch(database)
  for (const week of weeks) {
    const { questionCount: _questionCount, ...data } = documentPayload(week)
    batch.set(
      doc(database, "weeks", week.id),
      withoutUndefined({
        ...data,
        courseId,
        status: "draft",
        contentReady: false,
      }),
      { merge: true },
    )
    for (const question of questions[week.id] ?? []) {
      const { id, ...questionData } = question
      batch.set(
        doc(database, "questions", id),
        withoutUndefined({
          ...questionData,
          courseId,
          weekId: week.id,
          paperId: null,
          status: "draft",
          contentReady: false,
        }),
        { merge: true },
      )
    }
  }
  await batch.commit()
}

export async function archiveCourse(course: Course) {
  const database = requireFirestore()
  await setDoc(
    doc(database, "courses", course.id),
    { status: "archived", contentReady: false },
    { merge: true },
  )
}

export async function archiveWeek(week: Week) {
  const database = requireFirestore()
  await setDoc(
    doc(database, "weeks", week.id),
    { status: "archived", contentReady: false },
    { merge: true },
  )
}

export async function archivePaper(paper: Paper) {
  const database = requireFirestore()
  await setDoc(
    doc(database, "papers", paper.id),
    { status: "archived", contentReady: false },
    { merge: true },
  )
}

export async function archiveQuestion(
  owner: {
    id: string
    courseId: string
    type: "week" | "paper"
  },
  questionId: string,
) {
  const database = requireFirestore()
  await setDoc(
    doc(database, "questions", questionId),
    {
      status: "archived",
      contentReady: false,
      courseId: owner.courseId,
      ...(owner.type === "week"
        ? { weekId: owner.id, paperId: null }
        : { paperId: owner.id, weekId: null }),
    },
    { merge: true },
  )
}
