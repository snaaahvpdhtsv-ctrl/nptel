import {
  addDoc,
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
  type Unsubscribe,
} from "firebase/firestore"
import type { AuditEntry } from "../pages/admin/AuditPanel"
import { firestore } from "./firebase"

export function subscribeToAudit(
  onEntries: (entries: AuditEntry[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  if (!firestore) {
    onError(new Error("Firebase Firestore is not configured."))
    return () => {}
  }
  return onSnapshot(
    query(
      collection(firestore, "auditLogs"),
      orderBy("createdAt", "desc"),
      limit(100),
    ),
    (snapshot) => {
      onEntries(
        snapshot.docs.map((item) => {
          const value = item.data()
          return {
            id: item.id,
            action:
              typeof value.action === "string" ? value.action : "Admin action",
            resource:
              typeof value.resource === "string" ? value.resource : "Content",
            actorId:
              typeof value.actorId === "string" ? value.actorId : undefined,
            actorEmail:
              typeof value.actorEmail === "string" ? value.actorEmail : null,
            at:
              typeof value.createdAt === "string"
                ? new Date(value.createdAt)
                : new Date(0),
          }
        }),
      )
    },
    onError,
  )
}

export async function writeAudit(
  action: string,
  resource: string,
  actorId: string,
  actorEmail?: string | null,
) {
  if (!firestore) throw new Error("Firebase Firestore is not configured.")
  await addDoc(collection(firestore, "auditLogs"), {
    action: action.trim().slice(0, 200),
    resource: resource.trim().slice(0, 200),
    actorId,
    actorEmail: actorEmail?.trim().slice(0, 320) || null,
    createdAt: new Date().toISOString(),
    outcome: "success",
  })
}
