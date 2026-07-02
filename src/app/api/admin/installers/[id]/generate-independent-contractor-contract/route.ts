import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import {
  parseIcWidgetFieldMap,
  type IcWidgetSemanticKey,
} from '@/lib/adobeIcWidgetFieldMap'
import { writeAdminAuditLog } from '@/lib/audit'

const AGREEMENT_TYPE = 'independent-contractor-services-agreement'
const INDEPENDENT_CONTRACTOR_ADOBE_WIDGET_URL =
  'https://na2.documents.adobe.com/public/esignWidget?wid=CBFCIBAA3AAABLblqZhDs4AEhql4PJpxJSBr3jAUYbOPkCUDhFvx9stwDoWbP6-TE_Cn8JqgWp0ME6NGCegg*'

async function requireAdmin(request: NextRequest) {
  const session = await getServerSession(authOptions)
  const email = session?.user?.email?.toLowerCase()
  if (!email) return { ok: false as const, status: 401, error: 'Unauthorized' }

  const admin = await prisma.admin.findUnique({ where: { email } })
  if (!admin?.isActive) return { ok: false as const, status: 403, error: 'Admin access required' }
  if ((admin as any)?.role === 'MODERATOR') return { ok: false as const, status: 403, error: 'Admin role required' }

  return { ok: true as const, admin }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } },
) {
  try {
    const access = await requireAdmin(request)
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })

    const params = context.params
    const resolvedParams = params instanceof Promise ? await params : params
    const installerId = resolvedParams.id
    if (!installerId) return NextResponse.json({ error: 'Installer ID is required' }, { status: 400 })

    // Body is optional for now (reserved for future overrides)
    await request.json().catch(() => ({}))

    const installer = await prisma.installer.findUnique({
      where: { id: installerId },
      select: {
        firstName: true,
        lastName: true,
        email: true,
        companyName: true,
        companyTitle: true,
        companyStreetAddress: true,
        companyCity: true,
        companyState: true,
        companyZipCode: true,
        companyAddress: true,
      },
    })

    if (!installer) return NextResponse.json({ error: 'Installer not found' }, { status: 404 })

    const signerNameRaw = `${installer.firstName || ''} ${installer.lastName || ''}`.trim()
    const signerName = signerNameRaw || (installer.email ? installer.email.split('@')[0] : '')
    const signerTitle = installer.companyTitle || ''
    const companyName = installer.companyName || ''
    const signerEmail = installer.email || ''
    const firstName = installer.firstName || ''
    const lastName = installer.lastName || ''

    const addressLine =
      (installer.companyStreetAddress || installer.companyAddress || '').trim() || ''
    const city = (installer.companyCity || '').trim()
    const state = (installer.companyState || '').trim()
    const zip = (installer.companyZipCode || '').trim()
    const cityStateZip = [city, state ? `${state} ${zip}` : zip].filter(Boolean).join(', ').trim()
    const today = new Date()
    const effectiveDateHuman = new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(today)
    const effectiveDateIso = today.toISOString().slice(0, 10)

    // Always start from the current Independent Contractor Services Agreement widget.
    // Vercel env vars are intentionally not used here so an old env value cannot send installers to the wrong form.
    const widgetBaseUrl = INDEPENDENT_CONTRACTOR_ADOBE_WIDGET_URL
    // Adobe Sign public eSign widget prefill often uses URL *fragments* (`#key=value`)
    // instead of query params. We'll keep widget control params in the query string,
    // and move our form-field defaults into the `#...` fragment.
    let redirectUrl = widgetBaseUrl.split('#')[0]
    const fragmentParts: string[] = []

    // Important:
    // Do NOT use `new URL(widgetBaseUrl)` here.
    // Adobe widget `wid` values may include trailing `*` which can be percent-encoded
    // and cause Adobe to ignore prefill values.
    const appendQueryParam = (key: string, value: string) => {
      const k = encodeURIComponent(key)
      const v = encodeURIComponent(value)
      const hasQuery = redirectUrl.includes('?')
      if (!hasQuery) {
        redirectUrl += `?${k}=${v}`
        return
      }
      if (redirectUrl.endsWith('?') || redirectUrl.endsWith('&')) {
        redirectUrl += `${k}=${v}`
        return
      }
      redirectUrl += `&${k}=${v}`
    }

    const appendFragmentParam = (key: string, value: string) => {
      if (value === undefined || value === null) return
      // Fragment values should be percent-encoded to preserve spaces/commas/etc.
      const k = encodeURIComponent(key)
      const v = encodeURIComponent(value)
      fragmentParts.push(`${k}=${v}`)
    }

    const appendPrefillParam = (key: string, value: string) => {
      appendQueryParam(key, value)
      appendFragmentParam(key, value)
    }

    // Adobe web form prefill depends on exact field names configured in the form.
    // We send several common aliases so existing templates can match without extra app changes.
    // Note: Adobe web form filling still depends on the field being configured with
    // "Default value may come from URL" and/or URL prefill enabled.
    const signerAliases = [
      'signerName',
      'signername',
      'name',
      'printedName',
      'printedname',
      'contractorName',
      'contractorname',
      'fullName',
      'fullname',
      'Printed Name',
      'Printed Name:',
      'For Independent Contractor',
      'Independent Contractor Printed Name',
    ]
    const companyAliases = [
      'companyName',
      'companyname',
      'company',
      'businessName',
      'businessname',
      'Official Business Name',
      'Official Business Name:',
      'Official Business Name of Independent Contractor',
      'Official Business Name of Independent Contractor ("Independent Contractor")',
      'Official Business Name of Independent Contractor (“Independent Contractor”)',
    ]
    const titleAliases = ['signerTitle', 'signertitle', 'title', 'companyTitle', 'companytitle']
    const emailAliases = ['email', 'Email', 'Email:', 'signerEmail', 'signeremail']

    const addressAliases = [
      'address',
      'Address',
      'Address:',
      'streetAddress',
      'streetaddress',
      'companyStreetAddress',
      'companystreetaddress',
      'companyAddress',
      'companyaddress',
      'contractorAddress',
      'contractoraddress',
    ]
    const cityAliases = ['city', 'City', 'companyCity', 'companycity']
    const stateAliases = ['state', 'State', 'companyState', 'companystate']
    const zipAliases = ['zip', 'ZIP', 'zipCode', 'zipcode', 'companyZipCode', 'companyzipcode', 'postalCode', 'postalcode']
    const cityStateZipAliases = [
      'cityStateZip',
      'citystatezip',
      'city_state_zip',
      'city_state_zip_code',
      'City, State, Zip Code',
      'City, State, Zip Code:',
      'City State Zip Code',
    ]

    const effectiveDateAliases = ['effectiveDate', 'effectivedate', 'date', 'Date', 'Effective Date', 'Effective Date:', 'effective_date', 'effectivedateiso']

    // Floor Interior Services signature (you can change these constants later or source from admin profile)
    const floorPrintedName = 'Angela Medellin'
    const floorTitle = 'Executive Director'
    const floorNameAliases = ['floorSignerName', 'floorSignername', 'floorPrintedName', 'floorPrintedname', 'floorName', 'floorname']
    const floorTitleAliases = ['floorSignerTitle', 'floorSignertitle', 'floorTitle', 'floortitle']

    for (const key of signerAliases) appendPrefillParam(key, signerName)
    // Additionally provide firstName/lastName explicitly (some widgets use these to compose Printed Name)
    appendPrefillParam('firstName', firstName)
    appendPrefillParam('lastName', lastName)
    appendPrefillParam('name', signerName)
    for (const key of companyAliases) appendPrefillParam(key, companyName)
    for (const key of titleAliases) appendPrefillParam(key, signerTitle)
    for (const key of emailAliases) appendPrefillParam(key, signerEmail)
    for (const key of addressAliases) appendPrefillParam(key, addressLine)
    for (const key of cityStateZipAliases) appendPrefillParam(key, cityStateZip)
    for (const key of cityAliases) appendPrefillParam(key, city)
    for (const key of stateAliases) appendPrefillParam(key, state)
    for (const key of zipAliases) appendPrefillParam(key, zip)
    for (const key of effectiveDateAliases) {
      appendPrefillParam(key, effectiveDateHuman)
      // Also provide ISO for fields expecting machine-readable date
      if (key.toLowerCase().includes('iso')) appendPrefillParam(key, effectiveDateIso)
    }

    for (const key of floorNameAliases) appendPrefillParam(key, floorPrintedName)
    for (const key of floorTitleAliases) appendPrefillParam(key, floorTitle)

    /**
     * Exact-match prefill: Adobe ignores unknown hash keys. Set env `ADOBE_IC_WIDGET_FIELD_MAP`
     * to a JSON object mapping semantic keys → your web form’s **field names** (as shown in
     * Acrobat Sign authoring). Each target field must be a text field with
     * “Default value may come from URL” enabled.
     */
    const fieldMap = parseIcWidgetFieldMap(process.env.ADOBE_IC_WIDGET_FIELD_MAP)
    const fieldMapActive = Boolean(fieldMap && Object.keys(fieldMap).length > 0)
    if (fieldMap) {
      const semanticValues: Record<IcWidgetSemanticKey, string> = {
        contractorBusinessName: companyName,
        address: addressLine,
        cityStateZip,
        email: signerEmail,
        contractorTitle: signerTitle,
        contractorPrintedName: signerName,
        effectiveDate: effectiveDateHuman,
        floorPrintedName,
        floorTitle,
      }
      for (const semantic of Object.keys(semanticValues) as IcWidgetSemanticKey[]) {
        const adobeFieldName = fieldMap[semantic]?.trim()
        if (!adobeFieldName) continue
        const val = semanticValues[semantic]
        if (val === undefined || val === null) continue
        appendPrefillParam(adobeFieldName, val)
      }
    }

    // EchoSign snippet you provided expects nameEditable=true (and token is used by the widget).
    if (widgetBaseUrl.includes('echoSign') || widgetBaseUrl.includes('echosign.com') || widgetBaseUrl.includes('esignWidget')) {
      // Ensure printed name fields can be edited/shown by widget defaults.
      appendQueryParam('nameEditable', 'true')
      // EchoSign widget example you shared uses token as empty.
      // We'll match that to avoid widget logic overriding URL prefill.
      appendQueryParam('token', '')
    }

    // `hosted=false` is used by Adobe for widget/embedded modes.
    if (widgetBaseUrl.includes('esignWidget') || widgetBaseUrl.includes('embeddedWidget') || widgetBaseUrl.includes('echoSign')) {
      // Only append if it isn't already present
      if (!/([?&])hosted=/.test(redirectUrl)) appendQueryParam('hosted', 'false')
    }

    // Attach the fragment with all field defaults.
    if (fragmentParts.length > 0) {
      redirectUrl = `${redirectUrl}#${fragmentParts.join('&')}`
    }

    // Helpful for debugging: confirm the widget receives the values we think we sent.
    console.log('🧾 Adobe contract redirectUrl (prefill):', {
      installerId,
      signerName,
      signerTitle,
      companyName,
      email: signerEmail,
      url: redirectUrl,
    })

    const nowIso = new Date().toISOString()

    const existing = await prisma.installerAgreement.findUnique({
      where: { installerId_type: { installerId, type: AGREEMENT_TYPE } },
      select: { payload: true },
    })

    const createPayload = {
      signerName,
      signerTitle,
      companyName,
      generatedAt: nowIso,
      adobe: { redirectUrl },
    }

    // Merge on regenerate: keep unrelated payload keys, drop stale admin approval + completed Adobe link.
    const prev = (existing?.payload && typeof existing.payload === 'object' ? existing.payload : {}) as Record<
      string,
      unknown
    >
    const merged: Record<string, unknown> = { ...prev }
    delete merged.adminApproval
    merged.signerName = signerName
    merged.signerTitle = signerTitle
    merged.companyName = companyName
    merged.generatedAt = nowIso
    const prevAdobe =
      merged.adobe && typeof merged.adobe === 'object' && !Array.isArray(merged.adobe)
        ? { ...(merged.adobe as Record<string, unknown>) }
        : {}
    delete prevAdobe.signedDocumentUrl
    delete prevAdobe.signedDocumentSavedAt
    prevAdobe.redirectUrl = redirectUrl
    merged.adobe = prevAdobe

    const agreement = await prisma.installerAgreement.upsert({
      where: {
        installerId_type: { installerId, type: AGREEMENT_TYPE },
      },
      update: {
        status: 'draft',
        signedAt: null,
        payload: merged as object,
      },
      create: {
        installerId,
        type: AGREEMENT_TYPE,
        status: 'draft',
        payload: createPayload,
      },
      select: { id: true },
    })

    try {
      const adminEmail = String((access.admin as any)?.email || '').toLowerCase()
      const adminId = (access.admin as any)?.id ?? null
      const targetLabel = `${signerName}${signerEmail ? ` • ${signerEmail}` : ''}`.trim()
      await writeAdminAuditLog({
        adminEmail,
        adminId,
        action: 'installer.contract_generated',
        targetType: 'installer',
        targetId: installerId,
        targetLabel,
        after: {
          agreementId: agreement.id,
          agreementType: AGREEMENT_TYPE,
          generatedAt: nowIso,
        },
      })
    } catch (e) {
      console.error('Failed to write audit log (contract_generated):', e)
    }

    return NextResponse.json({
      success: true,
      redirectUrl,
      agreementId: agreement.id,
      /** When false, Adobe only prefills if your form field names happen to match generic hash keys—usually they don’t. Set `ADOBE_IC_WIDGET_FIELD_MAP`. */
      adobeFieldMapConfigured: fieldMapActive,
      prefill: {
        signerName,
        signerTitle,
        companyName,
        email: signerEmail,
        address: addressLine,
        cityStateZip,
        effectiveDate: effectiveDateHuman,
        floorPrintedName,
        floorTitle,
      },
    })
  } catch (e: any) {
    console.error('Error generating independent contractor contract:', e)
    return NextResponse.json(
      { error: e?.message || 'Failed to generate contract', details: e?.stack },
      { status: 500 }
    )
  }
}

