# Bulk Content Management

## Supported import formats

CSV imports use the existing six-column format:

```text
questionText,options,correctAnswer,explanation,difficulty,topic
```

Options are pipe-separated and `correctAnswer` accepts `A-F` or `1-6`.
Imports are draft-only and capped at 450 rows and 5 MB.

JSON question imports are separate from backup restoration. They accept either
an array or an envelope with a `questions` array:

```json
{
  "schemaVersion": 1,
  "destination": { "type": "week", "id": "week-id" },
  "questions": [
    {
      "id": "optional-stable-id",
      "questionText": "What is 2 + 2?",
      "options": ["3", "4"],
      "correctAnswer": "B",
      "explanation": "Basic addition.",
      "difficulty": "Easy",
      "topic": "Arithmetic"
    }
  ]
}
```

Unknown fields are reported as warnings. Invalid rows are never imported.
Question IDs are preserved when supplied, but an existing ID is rejected.
Imported questions always remain drafts.

## Preview and validation

The preview shows every row, options, status, duplicate state, and issue
details. Rows can be reviewed before any Firestore write. Validation reuses the
canonical `isValidQuestion` contract and the same normalized text rule used by
quality diagnostics. Missing explanations and difficulty are warnings for
draft imports; incomplete records, invalid answers, duplicate IDs, duplicate
text, and duplicate options are blocking errors.

## Bulk actions

The question inventory supports filtered selection and bulk actions for:

- Setting difficulty to Medium.
- Publishing reviewed, complete questions.
- Unpublishing to draft.
- Archiving selected questions.

The selection is revalidated for ownership and current state before mutation.
Publishing rejects incomplete or unreviewed questions.

## Trusted operation history and rollback

Firebase callable operations record import and bulk-edit metadata in the
admin-only `bulkOperations` collection. Import-created questions carry the
operation ID and an immutable creation snapshot. Rollback is transaction-backed
and idempotent: unchanged operation-owned records are deleted, while records
whose content changed later are preserved and reported as conflicts.

This is distinct from version history and from JSON backup restoration:
rollback undoes one tracked operation, while backup restoration restores a
validated backup into draft records.
