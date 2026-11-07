import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  setDoc,
  where,
  type Unsubscribe,
} from "firebase/firestore"
import type { RequestItem } from "./data"
import { firestore } from "./firebase"

const requestCollection = (item: RequestItem) =>
  item.type === "report" ? "reports" : "feedback"

function withoutUndefined(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(withoutUndefined)
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, entry]) => entry !== undefined)
        .map(([key, entry]) => [key, withoutUndefined(entry)]),
    )
  }
  return value
}

const mapRequest = (
  id: string,
  value: Record<string, unknown>,
): RequestItem => ({
  id,
  courseId: typeof value.courseId === "string" ? value.courseId : undefined,
  type:
    value.type === "report" ||
    value.type === "question" ||
    value.type === "request"
      ? value.type
      : "feedback",
  status:
    value.status === "replied" || value.status === "invalid"
      ? value.status
      : "pending",
  message: typeof value.message === "string" ? value.message : "",
  contact: typeof value.contact === "string" ? value.contact : undefined,
  createdAt: typeof value.createdAt === "string" ? value.createdAt : "",
  age: typeof value.age === "string" ? value.age : "",
  reply: typeof value.reply === "string" ? value.reply : undefined,
  replyAt: typeof value.replyAt === "string" ? value.replyAt : undefined,
  replyVisible:
    typeof value.replyVisible === "boolean" ? value.replyVisible : undefined,
  report:
    typeof value.report === "object" && value.report !== null
      ? value.report as RequestItem["report"]
      : undefined,
})

export function subscribeToRequests(
  ownerId: string | null,
  isAdmin: boolean,
  onItems: (items: RequestItem[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  if (!firestore) {
    onError(new Error("Firebase Firestore is not configured."))
    return () => {}
  }
  const collections = ["feedback", "reports"]
  const snapshots = new Map<string, RequestItem[]>()
  const unsubscribers = collections.map((name) => {
    const ref = collection(firestore!, name)
    const request =
      isAdmin || !ownerId
        ? query(ref)
        : query(ref, where("ownerId", "==", ownerId))
    return onSnapshot(
      request,
      (snapshot) => {
        snapshots.set(
          name,
          snapshot.docs.map((item) => mapRequest(item.id, item.data())),
        )
        onItems(
          [...snapshots.values()]
            .flat()
            .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)),
        )
      },
      onError,
    )
  })
  return () => unsubscribers.forEach((unsubscribe) => unsubscribe())
}

export async function createRequest(item: RequestItem, ownerId?: string) {
  if (!firestore) throw new Error("Firebase Firestore is not configured.")
  const {
    id: _id,
    reply: _reply,
    replyAt: _replyAt,
    replyVisible: _visible,
    ...data
  } = item
  await addDoc(collection(firestore, requestCollection(item)), {
    ...withoutUndefined(data) as Record<string, unknown>,
    ...(ownerId ? { ownerId } : {}),
  })
}

export async function updateRequest(item: RequestItem) {
  if (!firestore) throw new Error("Firebase Firestore is not configured.")
  const { id, ...data } = item
  await setDoc(
    doc(firestore, requestCollection(item), id),
    withoutUndefined(data) as Record<string, unknown>,
    {
      merge: true,
    },
  )
}

export async function deleteRequest(item: RequestItem) {
  if (!firestore) throw new Error("Firebase Firestore is not configured.")
  await deleteDoc(doc(firestore, requestCollection(item), item.id))
}
