import fs from "node:fs/promises"
import process from "node:process"
import { applicationDefault, initializeApp } from "firebase-admin/app"
import { getFirestore } from "firebase-admin/firestore"

const projectId = process.env.FIREBASE_PROJECT_ID
const allowlistPath =
  process.env.FIRESTORE_MIGRATION_ALLOWLIST ??
  new URL("./migration-allowlist.json", import.meta.url)
const apply = process.argv.includes("--apply")

if (!projectId)
  throw new Error("Set FIREBASE_PROJECT_ID before running migration.")
if (apply && process.env.FIRESTORE_MIGRATION_APPROVED !== "true")
  throw new Error(
    "Refusing to write: set FIRESTORE_MIGRATION_APPROVED=true after backup and review.",
  )

const allowlist = JSON.parse(await fs.readFile(allowlistPath, "utf8"))
const collections = ["courses", "weeks", "papers", "questions"]
for (const collection of collections) {
  if (!Array.isArray(allowlist[collection]))
    throw new Error(`Allowlist field '${collection}' must be an array.`)
}

initializeApp({ credential: applicationDefault(), projectId })
const db = getFirestore()

const snapshots = new Map()
for (const collection of collections) {
  const snapshot = await db.collection(collection).get()
  snapshots.set(
    collection,
    new Map(snapshot.docs.map((document) => [document.id, document.data()])),
  )
}

const summary = { created: 0, skipped: 0, conflicts: 0 }
for (const collection of collections) {
  for (const record of allowlist[collection]) {
    if (!record || typeof record.id !== "string" || !record.data)
      throw new Error(`Invalid ${collection} allowlist entry.`)
    const existing = snapshots.get(collection).get(record.id)
    if (existing) {
      if (JSON.stringify(existing) === JSON.stringify(record.data))
        summary.skipped++
      else {
        summary.conflicts++
        console.error(`CONFLICT ${collection}/${record.id}`)
      }
      continue
    }
    if (!apply) {
      summary.created++
      console.log(`DRY-RUN create ${collection}/${record.id}`)
      continue
    }
    await db.collection(collection).doc(record.id).create(record.data)
    summary.created++
    console.log(`CREATED ${collection}/${record.id}`)
  }
}

console.log(JSON.stringify({ projectId, apply, ...summary }, null, 2))
if (summary.conflicts > 0)
  throw new Error("Migration stopped because the allowlist contains conflicts.")
