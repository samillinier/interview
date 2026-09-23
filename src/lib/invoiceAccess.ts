export const INVOICE_ACCESS_ROLES = ['ADMIN', 'SUPER_ADMIN', 'MANAGER', 'ACCOUNTING'] as const

export type InvoiceAccessRole = (typeof INVOICE_ACCESS_ROLES)[number]

export function canAccessInvoices(role: unknown): boolean {
  const normalized = String(role || '').toUpperCase()
  return (INVOICE_ACCESS_ROLES as readonly string[]).includes(normalized)
}

export function isAccountingRole(role: unknown): boolean {
  return String(role || '').toUpperCase() === 'ACCOUNTING'
}
