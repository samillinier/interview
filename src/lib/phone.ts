const NUMBER_WORD_TO_DIGIT: Record<string, string> = {
  zero: '0',
  oh: '0',
  o: '0',
  one: '1',
  two: '2',
  three: '3',
  four: '4',
  five: '5',
  six: '6',
  seven: '7',
  eight: '8',
  nine: '9',
  cero: '0',
  uno: '1',
  una: '1',
  dos: '2',
  tres: '3',
  cuatro: '4',
  cinco: '5',
  seis: '6',
  siete: '7',
  ocho: '8',
  nueve: '9',
}

export function extractLikelyPhone(input: string): string | null {
  const trimmed = (input || '').trim()
  if (!trimmed) return null

  // First pass: keep existing numeric input (e.g. +1 (407) 555-1212)
  const normalizedNumeric = trimmed
    .replace(/[^\d+]/g, '')
    .replace(/(?!^)\+/g, '')
  const numericDigits = normalizedNumeric.replace(/\D/g, '').length
  if (numericDigits >= 7) return normalizedNumeric

  // Second pass: parse spoken numbers (english/spanish basic digits)
  const tokens = trimmed
    .toLowerCase()
    .replace(/[^a-z0-9+\s-]/g, ' ')
    .split(/[\s-]+/)
    .filter(Boolean)

  let spokenDigits = ''
  for (const token of tokens) {
    if (/^\d+$/.test(token)) {
      spokenDigits += token
      continue
    }
    const mapped = NUMBER_WORD_TO_DIGIT[token]
    if (mapped) spokenDigits += mapped
  }

  if (spokenDigits.length >= 7) return spokenDigits
  return null
}

