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
    { enforceAppCheck: true, maxInstances: 10 },
    async (request) => {
      requireAdmin(request)
      try {
        return await operation(request.data)
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
  ({ owner, questions, metadata }) =>
    saveQuestionsWithOperation(db, owner, questions, {
      ...metadata,
    }),
)
export const updateQuestionOperation = callable(
  ({ owner, questionIds, patch, metadata }) =>
    updateQuestionsWithOperation(db, owner, questionIds, patch, {
      ...metadata,
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
