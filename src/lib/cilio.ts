/**
 * Cilio API Client
 *
 * Base URL: https://cilioapimgmt.azure-api.net/gatewayqa
 * Auth: Ocp-Apim-Subscription-Key header
 *
 * This client handles all communication with the Cilio Gateway QA API
 * for job/order data, chargebacks, and attachments.
 */

const CILIO_BASE_URL = process.env.CILIO_API_BASE_URL || "https://cilioapimgmt.azure-api.net/gatewayqa"
const CILIO_SUBSCRIPTION_KEY = process.env.CILIO_SUBSCRIPTION_KEY || ""

function getHeaders(): HeadersInit {
  if (!CILIO_SUBSCRIPTION_KEY) {
    throw new Error("CILIO_SUBSCRIPTION_KEY is not configured. Please set it in your environment variables.")
  }
  return {
    "Ocp-Apim-Subscription-Key": CILIO_SUBSCRIPTION_KEY,
    "Content-Type": "application/json",
  }
}

async function cilioFetch<T>(path: string, options?: RequestInit, retriesRemaining: number = 3): Promise<T> {
  const url = `${CILIO_BASE_URL}${path}`
  const headers = getHeaders()

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 10000)

  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        ...headers,
        ...(options?.headers || {}),
      },
    })

    const text = await res.text()

    if (res.status === 429 && retriesRemaining > 0) {
      // Rate limited — extract Retry-After or use exponential backoff
      let waitSec = 5 // default backoff
      try {
        const parsed = JSON.parse(text)
        // Cilio returns "Rate limit is exceeded. Try again in X seconds."
        const match = (parsed.message || "").match(/(\d+)\s*seconds?/i)
        if (match) waitSec = parseInt(match[1], 10)
      } catch {
        // use default backoff
      }
      console.log(`[cilio] 429 rate-limited. Retrying in ${waitSec}s (${retriesRemaining} retries left)`)
      await new Promise(resolve => setTimeout(resolve, waitSec * 1000))
      return cilioFetch<T>(path, options, retriesRemaining - 1)
    }

    if (!res.ok) {
      let errorDetail = text
      try {
        const parsed = JSON.parse(text)
        errorDetail = parsed.message || parsed.title || text
      } catch {
        // use raw text
      }
      throw new Error(`Cilio API error ${res.status}: ${errorDetail}`)
    }

    try {
      return JSON.parse(text) as T
    } catch {
      return text as unknown as T
    }
  } finally {
    clearTimeout(timeout)
  }
}

// ── Types ──────────────────────────────────────────────────

export interface CilioJob {
  orderNumber: number
  accountTags: string
  additionalLaborAmount: number | null
  budgetedAmount: number | null
  budgetedYear: number | null
  sitePreBuiltInfo: string | null
  cod: unknown | null
  orderStatusId: number
  orderSourceId: number
  orderStatusDescription: string
  currentOrderStatusDate: string
  deliveryInfoSchedulingNotes: string
  siteDetailsDistanceToSeller: number
  storeDistrict: string | null
  estTimeToComplete: number | null
  hasJobAttachments: string
  invoiceComment: string | null
  invoiceNumber: string
  jobDuration: string
  jobNumber: string
  orderTypeId: string
  orderTypeDescription: string
  laborAmount: number | null
  laborCategoryId: string | null
  laborCategoryDescription: string | null
  scheduledUserLeadCertificationNumber: string | null
  leadSafeJob: string | null
  paidInFull: unknown | null
  paymentsLastTransStatus: unknown | null
  paymentsRemainingDue: unknown | null
  paymentsTotalPaid: unknown | null
  paymentsPendingAmount: unknown | null
  permitNumber: string | null
  attachmentCount: string
  productAmount: number | null
  projectNumber: string
  projectUmbrella: string | null
  orderStorePO: string
  poAmount: number
  poAmountDailyTotal: number
  taxAmount: number | null
  reasonChanged: string | null
  salesAssociate: string | null
  salesAssociateEmail: string | null
  salesAssociatePhone: string | null
  salesOrderNumber: string | null
  scopeOfWorkNotes: string
  lastTextResponse: string | null
  totalJobDuration: string
  yearBuilt: string | null
  enterpriseGroupNumber: string | null
  enterpriseShipmentLocationNumber: string | null
  purchaserPO: string | null
  storeNumber: string
  storeName: string
  customerLastName: string
  customerFirstName: string
  orderItemStatusId: number
}

export interface CilioJobAttachment {
  orderAttachmentNumber: number
  orderNumber: number
  lastModifiedDate: string
  filename: string
  orderAttachmentTypeId: number
  orderAttachmentTypeDescription: string
}

export interface CilioAttachmentType {
  orderAttachmentTypeId: number
  description: string
}

export interface CilioJobType {
  orderTypeId: number
  description: string
}

export interface CilioJobStatus {
  orderStatusId: number
  description: string
}

export interface CilioLaborCategory {
  laborCategoryId: number
  description: string
}

export interface CilioJobLineItem {
  orderLineItemNumber: number
  orderNumber: number
  productNumber: string
  productDescription: string
  quantity: number
  unitPrice: number
  extendedPrice: number
  unitOfMeasure: string
}

export interface CilioInvoice {
  invoiceNumber: string
  orderNumber: number
  invoiceDate: string
  totalAmount: number
  status: string
}

export interface CilioEnterpriseGroup {
  enterpriseGroupNumber: number
  company: string | null
  groupAddress: {
    address: string | null
    addressTwo: string | null
    fullAddress: string | null
    city: string | null
    country: string | null
    state: string | null
    zip: string | null
  } | null
  phone: string | null
  email: string | null
  creditLimit: number | null
  openBalance: number | null
  pastDueBalance: number | null
  creditHold: boolean | null
  pastDueInvoices: boolean | null
  paymentTerm: string | null
  currencyCode: string | null
  shipmentLocations: Array<{
    enterpriseShipmentLocationNumber: number
    company: string | null
    shipmentAddress: {
      address: string | null
      addressTwo: string | null
      fullAddress: string | null
      city: string | null
      country: string | null
      state: string | null
      zip: string | null
    } | null
    phone: string | null
    email: string | null
    externalIds: Array<{ name: string | null; value: string | null }> | null
  }> | null
  externalIds: Array<{ name: string | null; value: string | null }> | null
}

export interface CilioNote {
  noteNumber: number
  orderNoteNumber: number
  orderNumber: number
  note: string
  createdOn: string
  noteSource: string | null
  orderNoteTypeDescription: string
}

// ── Jobs ───────────────────────────────────────────────────

// ── Full Job Detail (GET /job/{orderNumber}) ──────────────

export interface CilioAddress {
  address: string | null
  addressTwo: string | null
  fullAddress: string | null
  city: string | null
  country: string | null
  state: string | null
  zip: string | null
}

export interface CilioUserInfo {
  address: CilioAddress | null
  firstName: string | null
  lastName: string | null
  department: string | null
  email: string | null
  jobTitle: string | null
  phone: string | null
}

export interface CilioJobDetail {
  orderNumber: number
  customerInformation: {
    customerAltContact: string | null
    customerEmail: string | null
    customerFirstName: string | null
    customerFirstLast: string | null
    customerLastName: string | null
    customerNumber: string | null
    customerPhone: string | null
    customerPortalLink: string | null
    customerAddress: CilioAddress | null
  } | null
  dateInformation: {
    orderNumber: number
    currentDate: string | null
    currentPromiseDate: string | null
    fullyReceivedDate: string | null
    invoiceDate: string | null
    statusDate: string | null
    pickupDate: string | null
    followUpDate: string | null
    etaDate: string | null
    desiredInstallDate: string | null
    leadCreationDate: string | null
    importDate: string | null
    originalPromiseDate: string | null
  } | null
  schedulingInformation: {
    orderNumber: number
    taskOneEndDate: string | null
    taskOneResource: string | null
    taskOneStartDate: string | null
    taskTwoEndDate: string | null
    taskTwoResource: string | null
    taskTwoStartDate: string | null
    taskThreeEndDate: string | null
    taskThreeResource: string | null
    taskThreeStartDate: string | null
    scheduleDate: string | null
    scheduledResource: CilioUserInfo | null
    scheduledResources: string | null
    scheduledUserFirmCertificationNumber: string | null
    scheduledUserFirmName: string | null
    scheduledUserLeadCertificationNumber: string | null
    scheduledUserRenovatorName: string | null
    siteDetailsAvgTimeToSeller: string | null
  } | null
  companyInformation: {
    name: string | null
    email: string | null
    fax: string | null
    phone: string | null
    address: CilioAddress | null
  } | null
  crewPayInformation: {
    orderNumber: number
    crewPayJobTotal: number | null
    crewPayDailyTotal: number | null
    crewPayComplete: boolean | null
  } | null
  responsibleUserInformation: CilioUserInfo | null
  storeInformation: {
    storeName: string | null
    region: string | null
    storeNumber: string | null
    address: CilioAddress | null
    email: string | null
    phone: string | null
    fax: string | null
  } | null
  generalInformation: {
    orderNumber: number
    accountTags: string | null
    additionalLaborAmount: string | null
    budgetedAmount: string | null
    budgetedYear: string | null
    sitePreBuiltInfo: string | null
    cod: string | null
    orderStatusEnum: string | null
    currentOrderStatusDate: string | null
    deliveryInfoSchedulingNotes: string | null
    siteDetailsDistanceToSeller: number | null
    storeDistrict: string | null
    estTimeToComplete: string | null
    hasJobAttachments: string | null
    invoiceComment: string | null
    invoiceNumber: string | null
    jobDuration: string | null
    jobNumber: string | null
    orderTypeEnum: string | null
    laborAmount: string | null
    constructionTypeEnum: string | null
    scheduledUserLeadCertificationNumber: string | null
    leadSafeJob: string | null
    paidInFull: string | null
    paymentsLastTransStatus: string | null
    paymentsRemainingDue: string | null
    paymentsTotalPaid: string | null
    paymentsPendingAmount: string | null
    permitNumber: string | null
    attachmentCount: string | null
    productAmount: string | null
    projectNumber: string | null
    projectUmbrella: string | null
    orderStorePO: string | null
    poAmount: number | null
    poAmountDailyTotal: number | null
    reasonChanged: string | null
    salesAssociate: string | null
    salesAssociateEmail: string | null
    salesAssociatePhone: string | null
    salesOrderNumber: string | null
    scopeOfWorkNotes: string | null
    lastTextResponse: string | null
    totalJobDuration: string | null
    yearBuilt: string | null
  } | null
}

/** Get a single job by order number (flat fields from search) */
export async function getJob(orderNumber: number): Promise<CilioJob> {
  return cilioFetch<CilioJob>(`/job/${orderNumber}`)
}

/** Get full job detail with all nested objects (GET /job/{orderNumber}) */
export async function getJobDetail(orderNumber: number): Promise<CilioJobDetail> {
  return cilioFetch<CilioJobDetail>(`/job/${orderNumber}`)
}

/** Parameters for the Cilio /job/search endpoint */
export interface CilioJobSearchParams {
  orderStatusId?: number[]
  poJobNumber?: string
  address?: string
  storeLocation?: string
  city?: string
  zipCode?: string
  orderCreatedDateStart?: string  // RFC3339 date-time
  orderCreatedDateEnd?: string    // RFC3339 date-time
  orderModifiedDateStart?: string // RFC3339 date-time
  orderModifiedDateEnd?: string   // RFC3339 date-time
  page?: number
  pageSize?: number
}

/** Search jobs using the documented Cilio Gateway API parameters.
 *  Call with no params to fetch ALL jobs (capped at API default, typically 50). */
export async function searchJobs(params: CilioJobSearchParams = {}): Promise<CilioJob[]> {
  const q = new URLSearchParams()
  if (params.orderStatusId?.length) params.orderStatusId.forEach(id => q.append("OrderStatusId", String(id)))
  if (params.poJobNumber) q.set("POJobNumber", params.poJobNumber)
  if (params.address) q.set("Address", params.address)
  if (params.storeLocation) q.set("StoreLocation", params.storeLocation)
  if (params.city) q.set("City", params.city)
  if (params.zipCode) q.set("ZipCode", params.zipCode)
  if (params.orderCreatedDateStart) q.set("OrderCreatedDateStart", params.orderCreatedDateStart)
  if (params.orderCreatedDateEnd) q.set("OrderCreatedDateEnd", params.orderCreatedDateEnd)
  if (params.orderModifiedDateStart) q.set("OrderModifiedDateStart", params.orderModifiedDateStart)
  if (params.orderModifiedDateEnd) q.set("OrderModifiedDateEnd", params.orderModifiedDateEnd)
  if (params.page != null) q.set("PageNumber", String(params.page))
  if (params.pageSize != null) q.set("PageSize", String(params.pageSize))
  // Cilio API does NOT handle %3A-encoded colons in date params.
  // URLSearchParams encodes ":" → "%3A", so we decode them back.
  const query = q.toString().replace(/%3A/g, ":")
  return cilioFetch<CilioJob[]>(`/job/search${query ? `?${query}` : ""}`)
}

/** Fetch ALL jobs. Tries API pagination first; if the API still caps at its
 *  default page size (ignoring pagination params), falls back to time-window
 *  splitting to ensure we don't miss jobs.
 *  @param monthsBack How many months of history to fetch (default 6)
 *  @param pageSize Requested page size (default 100) */
export async function searchAllJobs(
  options?: { monthsBack?: number; pageSize?: number; onProgress?: (fetched: number, detail: string) => void }
): Promise<CilioJob[]> {
  const REQUESTED_PAGE_SIZE = options?.pageSize ?? 100
  const API_DEFAULT_CAP = 50 // Cilio hard-caps results at 50 without functional pagination
  const monthsBack = options?.monthsBack ?? 6
  const onProgress = options?.onProgress
  const now = new Date()
  const startDate = new Date(now)
  startDate.setMonth(startDate.getMonth() - monthsBack)

  const toISO = (d: Date) => d.toISOString()
  const allJobs = new Map<number, CilioJob>()

  // First try: paginated approach
  const page1 = await searchJobs({
    orderModifiedDateStart: toISO(startDate),
    orderModifiedDateEnd: toISO(now),
    pageSize: REQUESTED_PAGE_SIZE,
    page: 1,
  }).catch(() => [] as CilioJob[])

  // If pagination works (we get > API_DEFAULT_CAP), loop through pages
  if (page1.length > API_DEFAULT_CAP || page1.length === REQUESTED_PAGE_SIZE) {
    for (const j of page1) allJobs.set(j.orderNumber, j)
    onProgress?.(allJobs.size, `page 1 (paginated)`)

    let page = 2
    let hasMore = page1.length === REQUESTED_PAGE_SIZE
    while (hasMore) {
      const batch = await searchJobs({
        orderModifiedDateStart: toISO(startDate),
        orderModifiedDateEnd: toISO(now),
        pageSize: REQUESTED_PAGE_SIZE,
        page,
      }).catch(() => [] as CilioJob[])

      if (batch.length === 0) {
        hasMore = false
      } else {
        for (const j of batch) {
          if (!allJobs.has(j.orderNumber)) allJobs.set(j.orderNumber, j)
        }
        onProgress?.(allJobs.size, `page ${page} (paginated)`)
        if (batch.length < REQUESTED_PAGE_SIZE) hasMore = false
        else page++
      }
    }
    return Array.from(allJobs.values())
  }

  // Pagination didn't work — fall back to time-window splitting
  console.log(`[searchAllJobs] Pagination not supported (got ${page1.length}, expected >${API_DEFAULT_CAP}). Falling back to date-window splitting.`)
  for (const j of page1) allJobs.set(j.orderNumber, j)
  onProgress?.(allJobs.size, `window: initial fetch`)

  // Generate weekly windows
  const windows: { start: Date; end: Date }[] = []
  let cursor = new Date(startDate)
  while (cursor < now) {
    const wEnd = new Date(cursor)
    wEnd.setDate(wEnd.getDate() + 7)
    if (wEnd > now) wEnd.setTime(now.getTime())
    windows.push({ start: new Date(cursor), end: new Date(wEnd) })
    cursor = wEnd
  }

  async function fetchWindow(start: Date, end: Date, depth: number = 0): Promise<void> {
    const ms = end.getTime() - start.getTime()
    const label = `${start.toISOString().slice(0, 16)} → ${end.toISOString().slice(0, 16)}`
    const batch = await searchJobs({
      orderModifiedDateStart: toISO(start),
      orderModifiedDateEnd: toISO(end),
    }).catch((e) => {
      console.error(`[searchAllJobs] Error for window ${label}:`, e?.message || String(e))
      return [] as CilioJob[]
    })

    if (batch.length >= API_DEFAULT_CAP && ms > 3600000 && depth < 4) {
      const mid = new Date(start.getTime() + ms / 2)
      await fetchWindow(start, mid, depth + 1)
      await fetchWindow(mid, end, depth + 1)
      onProgress?.(allJobs.size, `${label} (split d${depth + 1})`)
    } else {
      for (const j of batch) {
        if (!allJobs.has(j.orderNumber)) allJobs.set(j.orderNumber, j)
      }
      onProgress?.(allJobs.size, label)
    }
  }

  for (const win of windows) {
    await fetchWindow(win.start, win.end)
    await new Promise(resolve => setTimeout(resolve, 300))
  }

  return Array.from(allJobs.values())
}

export interface UpdateJobStatusPayload {
  orderNumber: number
  orderStatusId: number
}

/** Update a single job status */
export async function updateJobStatus(payload: UpdateJobStatusPayload): Promise<void> {
  return cilioFetch<void>(`/job/${payload.orderNumber}/status`, {
    method: "PUT",
    body: JSON.stringify({ orderStatusId: payload.orderStatusId }),
  })
}

export interface UpdateMultipleJobStatusPayload {
  orderNumbers: number[]
  orderStatusId: number
}

/** Update multiple job statuses */
export async function updateMultipleJobStatus(payload: UpdateMultipleJobStatusPayload): Promise<void> {
  return cilioFetch<void>("/job/status/bulk", {
    method: "PUT",
    body: JSON.stringify(payload),
  })
}

/** Update sales order number on a job */
export async function updateSalesOrderNumber(orderNumber: number, salesOrderNumber: string): Promise<void> {
  return cilioFetch<void>(`/job/${orderNumber}/salesorder`, {
    method: "PUT",
    body: JSON.stringify({ salesOrderNumber }),
  })
}

/** 
 * Cilio does NOT support updating arbitrary job fields via API.
 * Only status (PUT /job/{id}/status) and sales-order (PUT /job/{id}/salesorder) 
 * are viable update endpoints. The /job/{id}/extension endpoint returns 500 
 * for all payloads and cannot be used.
 */
export async function updateOrderExtension(orderNumber: number, fields: Record<string, unknown>): Promise<void> {
  throw new Error(
    "Cilio does not support updating job extension fields. " +
    "Only status and sales-order-number can be changed via API."
  )
}

/** Update a job date */
export async function updateJobDate(orderNumber: number, dateTypeId: number, dateValue: string): Promise<void> {
  return cilioFetch<void>(`/job/${orderNumber}/date`, {
    method: "PUT",
    body: JSON.stringify({ dateTypeId, dateValue }),
  })
}

// ── Job Types / Statuses / Labor Categories ───────────────

/** Get available job types */
export async function getJobTypes(): Promise<CilioJobType[]> {
  return cilioFetch<CilioJobType[]>("/job/types")
}

/** Get available job statuses */
export async function getJobStatuses(): Promise<CilioJobStatus[]> {
  return cilioFetch<CilioJobStatus[]>("/job/statuses")
}

/** Get available job date types */
export async function getJobDateTypes(): Promise<{ dateTypeId: number; description: string }[]> {
  return cilioFetch("/job/datetypes")
}

/** Get labor categories for a job */
export async function getJobLaborCategories(orderNumber: number): Promise<CilioLaborCategory[]> {
  return cilioFetch<CilioLaborCategory[]>(`/job/${orderNumber}/laborcategories`)
}

// ── Line Items ─────────────────────────────────────────────

/** Get line items for a job */
export async function getJobLineItems(orderNumber: number): Promise<CilioJobLineItem[]> {
  return cilioFetch<CilioJobLineItem[]>(`/job/${orderNumber}/lineitems`)
}

export interface UpdateLineItemPayload {
  orderLineItemNumber: number
  quantity?: number
  unitPrice?: number
}

/** Update a line item */
export async function updateLineItem(orderNumber: number, payload: UpdateLineItemPayload): Promise<void> {
  return cilioFetch<void>(`/job/${orderNumber}/lineitem`, {
    method: "PUT",
    body: JSON.stringify(payload),
  })
}

export interface ShipLineItemPayload {
  orderLineItemNumber: number
  quantity: number
  shipDate: string
  trackingNumber?: string
}

/** Ship a single line item */
export async function shipLineItem(orderNumber: number, payload: ShipLineItemPayload): Promise<void> {
  return cilioFetch<void>(`/job/${orderNumber}/lineitem/ship`, {
    method: "PUT",
    body: JSON.stringify(payload),
  })
}

export interface ShipMultipleLineItemsPayload {
  lineItems: ShipLineItemPayload[]
}

/** Ship multiple line items */
export async function shipMultipleLineItems(orderNumber: number, payload: ShipMultipleLineItemsPayload): Promise<void> {
  return cilioFetch<void>(`/job/${orderNumber}/lineitems/ship`, {
    method: "PUT",
    body: JSON.stringify(payload),
  })
}

// ── Invoices ───────────────────────────────────────────────

export interface CreateInvoicePayload {
  orderNumber: number
  invoiceDate: string
  totalAmount: number
  lineItems?: Array<{
    productNumber: string
    description: string
    quantity: number
    unitPrice: number
  }>
}

/** Create a single invoice */
export async function createInvoice(payload: CreateInvoicePayload): Promise<CilioInvoice> {
  return cilioFetch<CilioInvoice>("/invoice", {
    method: "POST",
    body: JSON.stringify(payload),
  })
}

/** Create multiple invoices */
export async function createMultipleInvoices(payloads: CreateInvoicePayload[]): Promise<CilioInvoice[]> {
  return cilioFetch<CilioInvoice[]>("/invoices", {
    method: "POST",
    body: JSON.stringify(payloads),
  })
}

/** Get invoices (optionally filtered by orderNumber) */
export async function getInvoices(orderNumber?: number): Promise<CilioInvoice[]> {
  const query = orderNumber ? `?orderNumber=${orderNumber}` : ""
  return cilioFetch<CilioInvoice[]>(`/invoices${query}`)
}

// ── Attachments ────────────────────────────────────────────

/** Get attachments for a job */
export async function getAttachments(orderNumber: number): Promise<CilioJobAttachment[]> {
  return cilioFetch<CilioJobAttachment[]>(`/job/${orderNumber}/attachment`)
}

/** Get available attachment types */
export async function getAttachmentTypes(): Promise<CilioAttachmentType[]> {
  return cilioFetch<CilioAttachmentType[]>("/attachment/types")
}

/** Get attachment file bytes (returns base64 or blob URL) */
export async function getAttachmentFileBytes(orderNumber: number, attachmentNumber: number): Promise<ArrayBuffer> {
  return cilioFetch<ArrayBuffer>(`/job/${orderNumber}/attachment/${attachmentNumber}/file`)
}

// ── Notes ──────────────────────────────────────────────────

export interface CreateNotePayload {
  noteText: string
}

/** Create a note on a job */
export async function createNote(orderNumber: number, payload: CreateNotePayload): Promise<CilioNote> {
  return cilioFetch<CilioNote>(`/job/${orderNumber}/note`, {
    method: "POST",
    body: JSON.stringify(payload),
  })
}

/** Get notes for a job */
export async function getNotes(orderNumber: number): Promise<CilioNote[]> {
  return cilioFetch<CilioNote[]>(`/job/${orderNumber}/note`)
}

// ── Enterprise Groups ──────────────────────────────────────

/** Get all enterprise groups */
export async function getEnterpriseGroups(): Promise<CilioEnterpriseGroup[]> {
  return cilioFetch<CilioEnterpriseGroup[]>("/enterprise/groups")
}

/** Get a single enterprise group */
export async function getEnterpriseGroup(groupNumber: number): Promise<CilioEnterpriseGroup> {
  return cilioFetch<CilioEnterpriseGroup>(`/enterprise/groups/${groupNumber}`)
}

/** Update enterprise group credit */
export async function updateEnterpriseGroupCredit(groupNumber: number, creditLimit: number): Promise<void> {
  return cilioFetch<void>(`/enterprise/groups/${groupNumber}/credit`, {
    method: "PUT",
    body: JSON.stringify({ creditLimit }),
  })
}

/** Update multiple enterprise group credits */
export async function updateMultipleGroupCredit(
  updates: Array<{ groupNumber: number; creditLimit: number }>
): Promise<void> {
  return cilioFetch<void>("/enterprise/groups/credit", {
    method: "PUT",
    body: JSON.stringify(updates),
  })
}
