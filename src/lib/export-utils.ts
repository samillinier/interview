import * as XLSX from 'xlsx'

/**
 * Downloads an array of objects as an Excel (.xlsx) file.
 * @param data - Array of row objects
 * @param filename - The downloaded filename (without extension)
 */
export function downloadExcel(data: Record<string, any>[], filename: string) {
  const worksheet = XLSX.utils.json_to_sheet(data)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1')
  XLSX.writeFile(workbook, `${filename}.xlsx`)
}
