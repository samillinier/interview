export const MATRIX_ROW_NOTE_KEY = '__rowNote'

export function getMatrixRowNote(overridesRaw: unknown): string | null {
  if (!overridesRaw || typeof overridesRaw !== 'object' || Array.isArray(overridesRaw)) return null
  const rowNote = (overridesRaw as Record<string, unknown>)[MATRIX_ROW_NOTE_KEY]
  if (!rowNote || typeof rowNote !== 'object' || Array.isArray(rowNote)) return null
  const text = (rowNote as Record<string, unknown>).text
  return typeof text === 'string' && text.trim() ? text.trim() : null
}

export function applyMatrixRowNoteToOverrides(
  prev: Record<string, unknown>,
  rowNote: string | null
): Record<string, unknown> {
  const next = { ...prev }
  if (rowNote === null || rowNote === '') {
    delete next[MATRIX_ROW_NOTE_KEY]
  } else {
    next[MATRIX_ROW_NOTE_KEY] = { text: rowNote }
  }
  return next
}
