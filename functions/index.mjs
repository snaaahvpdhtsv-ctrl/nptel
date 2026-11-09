import { initializeApp } from "firebase-admin/app"
import { getFirestore } from "firebase-admin/firestore"
import { HttpsError, onCall } from "firebase-functions/v2/https"
import {
  archiveContent,
  archiveQuestion,
  saveCourse,
  savePaper,
  saveQuestion,
  saveQuestions,
  saveQuestionsWithOperation,
  updateQuestionsWithOperation,
  rollbackImportOperation,
  previewQuestionPublication as getPublicationPreview,
  saveWeek,
} from "./content-service.mjs"

initializeApp()
const db = getFirestore()

function requireAdmin(request) {
  if (request.auth?.token.admin !== true)
    throw new HttpsError(
      "permission-denied",
      "Only administrators can change course content.",
    )
}

function callable(operation) {
  return onCall(
    {
      // App Check is opt-in because the web client may be deployed without a
      // site key. Admin custom claims remain the authorization boundary.
      enforceAppCheck: process.env.ENFORCE_APP_CHECK === "true",
      maxInstances: 10,
    },
    async (request) => {
      requireAdmin(request)
      try {
        return await operation(request.data, request)
      } catch (error) {
        if (error instanceof HttpsError) throw error
        throw new HttpsError(
          "failed-precondition",
          error instanceof Error ? error.message : "The content change failed.",
        )
      }
    },
  )
}

export const saveCourseContent = callable(({ course }) =>
  saveCourse(db, course),
)
export const saveWeekContent = callable(({ week }) => saveWeek(db, week))
export const savePaperContent = callable(({ paper }) => savePaper(db, paper))
export const saveQuestionContent = callable(({ owner, question }) =>
  saveQuestion(db, owner, question),
)
export const importQuestionContent = callable(({ owner, questions }) =>
  saveQuestions(db, owner, questions),
)
export const importQuestionOperation = callable(
  ({ owner, questions, metadata }, request) =>
    saveQuestionsWithOperation(db, owner, questions, {
      ...metadata,
      actorId: request.auth.uid,
      actorEmail: request.auth.token.email ?? null,
    }),
)
export const updateQuestionOperation = callable(
  ({ owner, questionIds, patch, metadata }, request) =>
    updateQuestionsWithOperation(db, owner, questionIds, patch, {
      ...metadata,
      actorId: request.auth.uid,
      actorEmail: request.auth.token.email ?? null,
    }),
)
export const previewQuestionPublication = callable(({ owner, questionIds }) =>
  getPublicationPreview(db, owner, questionIds),
)
export const writeAuditEntry = callable(
  async ({ action, resource }, request) => {
    if (
      typeof action !== "string" ||
      typeof resource !== "string" ||
      action.trim().length < 1 ||
      action.trim().length > 200 ||
      resource.trim().length < 1 ||
      resource.trim().length > 200
    )
      throw new Error("Audit entries require valid action and resource text.")
    const entry = await db.collection("auditLogs").add({
      action: action.trim(),
      resource: resource.trim(),
      actorId: request.auth.uid,
      actorEmail: request.auth.token.email ?? null,
      createdAt: new Date().toISOString(),
      outcome: "success",
    })
    return { id: entry.id }
  },
)
export const retryImportQuestionOperation = callable(
  ({ owner, questions, metadata }, request) =>
    saveQuestionsWithOperation(db, owner, questions, {
      ...metadata,
      actorId: request.auth.uid,
      actorEmail: request.auth.token.email ?? null,
    }),
)
export const rollbackImportOperationContent = callable(({ operationId }) =>
  rollbackImportOperation(db, operationId),
)
export const archiveQuestionContent = callable(({ owner, questionId }) =>
  archiveQuestion(db, owner, questionId),
)
export const archiveParentContent = callable(({ collection, id }) =>
  archiveContent(db, collection, id),
)
