/**
 * Mapping of store numbers to workroom names.
 * The store number comes from Cilio's storeNumber field or is parsed from storeName.
 */
const STORE_TO_WORKROOM: Record<number, string> = {
  // Lakeland
  2253: 'Lakeland', 2438: 'Lakeland', 2363: 'Lakeland', 2282: 'Lakeland',
  2457: 'Lakeland', 2240: 'Lakeland', 2224: 'Lakeland', 1854: 'Lakeland',
  2702: 'Lakeland', 2531: 'Lakeland', 1652: 'Lakeland', 1592: 'Lakeland',
  1079: 'Lakeland', 783: 'Lakeland',
  // Tampa
  2360: 'Tampa', 2238: 'Tampa', 1911: 'Tampa', 3477: 'Tampa',
  2777: 'Tampa', 2639: 'Tampa', 771: 'Tampa', 740: 'Tampa',
  724: 'Tampa', 573: 'Tampa', 564: 'Tampa', 1714: 'Tampa',
  1701: 'Tampa', 1629: 'Tampa', 1190: 'Tampa', 1003: 'Tampa',
  // Panama City
  2367: 'Panama Cit', 1924: 'Panama Cit', 2886: 'Panama Cit', 448: 'Panama Cit',
  // Gainesville
  2365: 'Gainesville', 3278: 'Gainesville', 2984: 'Gainesville', 2462: 'Gainesville', 179: 'Gainesville',
  // Naples
  2362: 'Naples', 2361: 'Naples', 2261: 'Naples', 582: 'Naples', 613: 'Naples', 592: 'Naples',
  // Dothan
  2212: 'Dothan', 2884: 'Dothan', 606: 'Dothan', 281: 'Dothan',
  // Sarasota
  1935: 'Sarasota', 3453: 'Sarasota', 2933: 'Sarasota', 2727: 'Sarasota',
  772: 'Sarasota', 1843: 'Sarasota', 1732: 'Sarasota', 1683: 'Sarasota',
  // Ocala
  1855: 'Ocala', 2753: 'Ocala', 3351: 'Ocala', 2577: 'Ocala',
  569: 'Ocala', 440: 'Ocala', 1853: 'Ocala', 1827: 'Ocala', 1685: 'Ocala', 1605: 'Ocala',
  // Albany
  2621: 'Albany', 491: 'Albany', 1564: 'Albany',
  // Tallahassee
  716: 'Tallahassee', 417: 'Tallahassee',
}

/** Extract the store number from a Cilio storeName like "0448-LOWES OF PANAMA CITY, FL". */
export function getStoreNumber(storeName?: string): number | null {
  if (!storeName) return null
  const m = storeName.match(/^(\d+)-/)
  return m ? parseInt(m[1], 10) : null
}

/** Get the workroom name for a raw store number (string or number). */
export function getWorkroomByStoreNumber(storeNumber?: string | number | null): string | null {
  if (storeNumber == null || storeNumber === '') return null
  const num = typeof storeNumber === 'number' ? storeNumber : parseInt(String(storeNumber), 10)
  if (isNaN(num)) return null
  return STORE_TO_WORKROOM[num] ?? null
}

/** Get the workroom name from a Cilio storeName (parses the number prefix). */
export function getWorkroom(storeName?: string): string | null {
  const storeNum = getStoreNumber(storeName)
  if (storeNum === null) return null
  return STORE_TO_WORKROOM[storeNum] ?? null
}

/** All unique workroom names (sorted) for filter dropdowns. */
export function allWorkrooms(): string[] {
  return Array.from(new Set(Object.values(STORE_TO_WORKROOM))).sort()
}
