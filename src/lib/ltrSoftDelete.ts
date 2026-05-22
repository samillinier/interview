import prisma from '@/lib/db'

let deletedAtColumnSupported: boolean | undefined

/** Exported for API routes that need a clear 503 when migration was not applied. */
export function isMissingDeletedAtColumnError(err: unknown): boolean {
  const msg = String((err as Error)?.message || err || '')
  return /42703|column\s+"deletedAt"|column deletedat does not exist|does not exist|P2022/i.test(msg)
}

/**
 * Admin UI hides batches with `deletedAt` set. If the DB has not been migrated yet
 * (`deletedAt` column missing), returns `{}` so queries still work.
 */
export async function activeLtrBatchFilter(): Promise<{ deletedAt: null } | Record<string, never>> {
  if (deletedAtColumnSupported === false) return {}
  if (deletedAtColumnSupported === true) return { deletedAt: null }
  try {
    await prisma.$queryRawUnsafe(`SELECT "deletedAt" FROM "LtrUploadBatch" LIMIT 1`)
    deletedAtColumnSupported = true
    return { deletedAt: null }
  } catch (e) {
    // Only pin "unsupported" when Postgres says the column is missing — not network blips.
    if (isMissingDeletedAtColumnError(e)) {
      deletedAtColumnSupported = false
      return {}
    }
    deletedAtColumnSupported = undefined
    return {}
  }
}

/** Migration applied: `LtrUploadBatch.deletedAt` exists (survey soft-delete / Drop button). */
export async function ltrSoftDeleteColumnReady(): Promise<boolean> {
  if (deletedAtColumnSupported === true) return true
  if (deletedAtColumnSupported === false) return false
  try {
    await prisma.$queryRawUnsafe(`SELECT "deletedAt" FROM "LtrUploadBatch" LIMIT 1`)
    deletedAtColumnSupported = true
    return true
  } catch (e) {
    if (isMissingDeletedAtColumnError(e)) {
      deletedAtColumnSupported = false
      return false
    }
    deletedAtColumnSupported = undefined
    return false
  }
}
