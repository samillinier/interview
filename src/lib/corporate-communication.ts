// Canonical list of corporate request/document types that can trigger
// email notifications. Shared between the admin "Communication" settings
// and the corporate authorization email sender.

export type CorporateCommunicationKind =
  | 'bol'
  | 'pad-transfer'
  | 'inventory-cycle'
  | 'travel-request'
  | 'office-supplies'
  | 'purchase-request'
  | 'employee-apparel'
  | 'invoice'
  | 'btr'
  | 'firm-lead'
  | 'lrrp'
  | 'liability'
  | 'licences'
  | 'claims'

export type CorporateCommunicationKindDef = {
  slug: CorporateCommunicationKind
  label: string
  description: string
  path: string
}

export const CORPORATE_COMMUNICATION_KINDS: CorporateCommunicationKindDef[] = [
  { slug: 'bol', label: 'BOL', description: 'Pad orders and bill of lading', path: '/dashboard/corporate/bol' },
  { slug: 'pad-transfer', label: 'Pad Transfer', description: 'Pad transfers between workrooms', path: '/dashboard/corporate/pad-transfer' },
  { slug: 'inventory-cycle', label: 'Inventory Cycle', description: 'Cycle counts', path: '/dashboard/corporate/inventory-cycle' },
  { slug: 'travel-request', label: 'Travel Request', description: 'Employee business travel requests', path: '/dashboard/corporate/travel-request' },
  { slug: 'office-supplies', label: 'Office Supplies', description: 'Office, break room, and bath supply orders', path: '/dashboard/corporate/office-supplies' },
  { slug: 'purchase-request', label: 'Purchase Request', description: 'Requests to purchase items or equipment', path: '/dashboard/corporate/purchase-request' },
  { slug: 'employee-apparel', label: 'Employee Apparel', description: 'Company-branded apparel orders', path: '/dashboard/corporate/employee-apparel' },
  { slug: 'invoice', label: 'Invoice', description: 'Weekly invoices submitted by estimators', path: '/dashboard/corporate/invoice' },
  { slug: 'btr', label: 'BTR', description: 'Business Tax Receipt records', path: '/dashboard/corporate/btr' },
  { slug: 'firm-lead', label: 'Firm Lead', description: 'Firm lead records', path: '/dashboard/corporate/firm-lead' },
  { slug: 'lrrp', label: 'LRRP', description: 'LRRP records', path: '/dashboard/corporate/lrrp' },
  { slug: 'liability', label: 'Liability', description: 'Liability insurance records', path: '/dashboard/corporate/liability' },
  { slug: 'licences', label: 'Licences', description: 'Licence records', path: '/dashboard/corporate/licences' },
  { slug: 'claims', label: 'Claims', description: 'Claim records', path: '/dashboard/corporate/claims' },
]

const KIND_BY_SLUG = new Map(CORPORATE_COMMUNICATION_KINDS.map((k) => [k.slug, k]))

export function getCorporateCommunicationKind(slug: string): CorporateCommunicationKindDef | undefined {
  return KIND_BY_SLUG.get(slug as CorporateCommunicationKind)
}
