import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/db'

function pickInstallerUpdatePayload(payload: any): Record<string, any> {
  // Server-side safety: only allow fields that installers are allowed to propose.
  // Keep this list aligned with `INSTALLER_ALLOWED_UPDATE_FIELDS` in /api/installers/[id].
  const allowed = new Set<string>([
    'firstName',
    'lastName',
    'phone',
    'digitalId',
    'workroom',
    'vehicleDescription',
    'companyName',
    'companyTitle',
    'companyStreetAddress',
    'companyCity',
    'companyState',
    'companyZipCode',
    'companyCounty',
    'companyAddress',
    'wantsToAddCarpet',
    'installsStretchInCarpet',
    'dailyStretchInCarpetSqft',
    'installsGlueDownCarpet',
    'wantsToAddHardwood',
    'installsNailDownSolidHardwood',
    'dailyNailDownSolidHardwoodSqft',
    'installsStapleDownEngineeredHardwood',
    'wantsToAddLaminate',
    'dailyLaminateSqft',
    'installsLaminateOnStairs',
    'wantsToAddVinyl',
    'installsSheetVinyl',
    'installsLuxuryVinylPlank',
    'dailyLuxuryVinylPlankSqft',
    'installsLuxuryVinylTile',
    'installsVinylCompositionTile',
    'dailyVinylCompositionTileSqft',
    'wantsToAddTile',
    'installsCeramicTile',
    'dailyCeramicTileSqft',
    'installsPorcelainTile',
    'dailyPorcelainTileSqft',
    'installsStoneTile',
    'dailyStoneTileSqft',
    'offersTileRemoval',
    'installsTileBacksplash',
    'dailyTileBacksplashSqft',
    'movesFurniture',
    'installsTrim',
    'paymentCompanyName',
    'paymentContactPerson',
    'paymentPhoneNumber',
    'paymentBusinessAddress',
    'paymentEmailAddress',
    'paymentBankName',
    'paymentAccountName',
    'paymentAccountNumber',
    'paymentRoutingNumber',
    'paymentAccountType',
    'paymentAuthorizationName',
    'paymentAuthorizationSignature',
    'paymentAuthorizationDate',
  ])

  const out: Record<string, any> = {}
  if (payload && typeof payload === 'object') {
    for (const [k, v] of Object.entries(payload)) {
      if (allowed.has(k)) out[k] = v
    }
  }

  // Convert ISO strings back to Date objects for DateTime fields
  const dateFields = new Set<string>([
    'llrpExpiry',
    'btrExpiry',
    'workersCompExemExpiry',
    'generalLiabilityExpiry',
    'automobileLiabilityExpiry',
    'employersLiabilityExpiry',
    'paymentAuthorizationDate',
    'preferredStartDate',
    'licenseExpiry',
  ])

  for (const key of Object.keys(out)) {
    if (dateFields.has(key) && typeof out[key] === 'string' && out[key].trim() !== '') {
      const d = new Date(out[key])
      if (!Number.isNaN(d.getTime())) out[key] = d
    }
  }

  return out
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    const email = session?.user?.email?.toLowerCase()
    if (!email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = await prisma.admin.findUnique({ where: { email } })
    if (!admin?.isActive) return NextResponse.json({ error: 'Admin access required' }, { status: 403 })

    const params = context.params
    const resolvedParams = params instanceof Promise ? await params : params
    const requestId = resolvedParams.id

    const body = await request.json().catch(() => ({}))
    const action = body.action as string | undefined
    const rejectionReason = body.rejectionReason as string | undefined

    const changeRequest = await prisma.installerChangeRequest.findUnique({
      where: { id: requestId },
    })

    if (!changeRequest) {
      return NextResponse.json({ error: 'Change request not found' }, { status: 404 })
    }

    if (changeRequest.status !== 'pending') {
      return NextResponse.json(
        { error: 'Change request is not pending', details: `Current status: ${changeRequest.status}` },
        { status: 400 }
      )
    }

    if (action === 'reject') {
      const updated = await prisma.installerChangeRequest.update({
        where: { id: requestId },
        data: {
          status: 'rejected',
          reviewedBy: email,
          reviewedAt: new Date(),
          rejectionReason: rejectionReason?.trim() || null,
        },
      })
      return NextResponse.json({ success: true, request: updated })
    }

    if (action !== 'approve') {
      return NextResponse.json({ error: 'Invalid action', details: 'Use action=approve or action=reject' }, { status: 400 })
    }

    const updatePayload = pickInstallerUpdatePayload(changeRequest.payload)
    if (Object.keys(updatePayload).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to apply', details: 'Payload is empty after filtering allowed fields.' },
        { status: 400 }
      )
    }

    const [installer, updatedRequest] = await prisma.$transaction([
      prisma.installer.update({
        where: { id: changeRequest.installerId },
        data: updatePayload,
      }),
      prisma.installerChangeRequest.update({
        where: { id: requestId },
        data: {
          status: 'approved',
          reviewedBy: email,
          reviewedAt: new Date(),
          rejectionReason: null,
        },
      }),
    ])

    return NextResponse.json({ success: true, installer, request: updatedRequest })
  } catch (error: any) {
    console.error('Error updating change request:', error)
    return NextResponse.json(
      { error: 'Failed to update change request', details: error.message },
      { status: 500 }
    )
  }
}

