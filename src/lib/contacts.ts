import { CORPORATE_ADDRESS, CORPORATE_PHONE, WORKROOM_DIRECTORY } from '@/lib/compliance-knowledge-base'

export type SeedContact = {
  name: string
  email?: string
  phone?: string
  address?: string
  category?: string
  role?: string
  notes?: string
  sortOrder?: number
  externalId?: string
}

/** Built-in directory seed so the Contact page is never empty before the first external sync. */
export function defaultContacts(): SeedContact[] {
  const rows: SeedContact[] = [
    {
      name: 'Floor Interior Services',
      category: 'Corporate',
      role: 'Corporate Office',
      phone: CORPORATE_PHONE,
      address: CORPORATE_ADDRESS,
      externalId: 'corp-main',
      sortOrder: 10,
    },
    {
      name: 'Compliance',
      category: 'Compliance',
      role: 'Compliance Team',
      email: 'compliance@floorinteriorservices.com',
      externalId: 'compliance-team',
      sortOrder: 20,
    },
    {
      name: 'Compliance (Live Chat)',
      category: 'Compliance',
      role: 'Onboarding / Compliance',
      email: 'svudaru@fiscorponline.com',
      phone: 'O: (813) 867-4712 Ext: 441',
      externalId: 'compliance-livechat',
      sortOrder: 21,
    },
    {
      name: 'Adriana Vansickle',
      category: 'Scheduling',
      role: 'Scheduling & Measurement',
      email: 'avansickle@fiscorponline.com',
      phone: '(813) 867-7028',
      externalId: 'scheduling-adriana',
      sortOrder: 30,
    },
  ]

  WORKROOM_DIRECTORY.forEach((w, i) => {
    rows.push({
      name: `${w.name} Workroom`,
      category: 'Workroom',
      role: w.name,
      phone: w.phone,
      address: w.address,
      notes: `Hours: ${w.hours}`,
      externalId: `workroom-${w.name.toLowerCase().replace(/\s+/g, '-')}`,
      sortOrder: 100 + i * 10,
    })
  })

  return rows
}

/** Normalize an arbitrary object from an external sync source into a contact-like shape. */
function pick(obj: Record<string, any>, keys: string[]): string | undefined {
  for (const k of keys) {
    const v = obj[k]
    if (typeof v === 'string' && v.trim()) return v.trim()
    if (typeof v === 'number') return String(v)
  }
  return undefined
}

export type NormalizedContact = {
  name: string
  email?: string
  phone?: string
  address?: string
  category?: string
  role?: string
  notes?: string
  externalId?: string
}

/**
 * Tolerant parser: accepts an array of contacts or an object that wraps one
 * under a common key (contacts / data / results / items / records / values).
 */
export function extractContacts(payload: unknown): NormalizedContact[] {
  let list: unknown[] = []
  if (Array.isArray(payload)) {
    list = payload
  } else if (payload && typeof payload === 'object') {
    const obj = payload as Record<string, any>
    const wrapper = ['contacts', 'data', 'results', 'items', 'records', 'values'].find(
      (k) => Array.isArray(obj[k]),
    )
    if (wrapper) list = obj[wrapper] as unknown[]
  }
  if (!Array.isArray(list)) return []

  const out: NormalizedContact[] = []
  for (const raw of list) {
    if (!raw || typeof raw !== 'object') continue
    const o = raw as Record<string, any>

    const firstName = pick(o, ['firstName', 'first_name'])
    const lastName = pick(o, ['lastName', 'last_name'])
    let name =
      pick(o, ['name', 'fullName', 'full_name', 'contactName', 'contact_name', 'company', 'companyName']) ||
      [firstName, lastName].filter(Boolean).join(' ')

    const email = pick(o, ['email', 'emailAddress', 'email_address', 'mail', 'contactEmail'])
    const phone = pick(o, ['phone', 'phoneNumber', 'phone_number', 'telephone', 'mobile', 'tel', 'contactPhone'])
    const address =
      pick(o, ['address', 'fullAddress', 'full_address', 'streetAddress', 'street_address', 'location']) ||
      [pick(o, ['street', 'addressLine1', 'address_1']), pick(o, ['city']), [pick(o, ['state']), pick(o, ['zip', 'postalCode', 'postal_code'])].filter(Boolean).join(' ')]
        .filter(Boolean)
        .join(', ')
    const category = pick(o, ['category', 'type', 'department', 'group', 'workroom', 'branch'])
    const role = pick(o, ['role', 'title', 'jobTitle', 'job_title', 'position', 'department'])

    const externalId = pick(o, ['externalId', 'external_id', 'contactId', 'contact_id', 'id'])

    if (!name) continue
    out.push({
      name,
      email,
      phone,
      address,
      category,
      role,
      notes: pick(o, ['notes', 'note', 'description', 'hours']),
      externalId,
    })
  }
  return out
}
