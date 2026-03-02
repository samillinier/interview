import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/db'

function summarizeSections(sections: any): string {
  if (!sections) return ''
  if (Array.isArray(sections) && sections.length > 0) return sections.join(', ')
  return ''
}

function pickInstallerUpdatePayload(payload: any): Record<string, any> {
  // Server-side safety: only allow fields that installers are allowed to propose.
  // Keep this list aligned with `INSTALLER_ALLOWED_UPDATE_FIELDS` in /api/installers/[id].
  const allowed = new Set<string>([
    // Basic / company
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

    // Experience / operations
    'yearsOfExperience',
    'hasOwnCrew',
    'crewSize',
    'hasOwnTools',
    'toolsDescription',
    'hasVehicle',
    'hasInsurance',
    'hasGeneralLiability',
    'hasCommercialAutoLiability',
    'hasWorkersComp',
    'hasWorkersCompExemption',
    'isSunbizRegistered',
    'isSunbizActive',
    'hasBusinessLicense',
    'feiEin',
    'employerLiabilityPolicyNumber',

    // Compliance / expirations (installer-managed)
    'llrpExpiry',
    'btrExpiry',
    'workersCompExemExpiryDates',
    'workersCompExemExpiry',
    'generalLiabilityExpiry',
    'automobileLiabilityExpiryDates',
    'automobileLiabilityExpiry',
    'employersLiabilityExpiry',
    'canPassBackgroundCheck',
    'backgroundCheckDetails',
    'insuranceType',
    'hasLicense',
    'licenseNumber',
    'licenseExpiry',

    // Availability / travel
    'willingToTravel',
    'maxTravelDistance',
    'canStartImmediately',
    'preferredStartDate',
    'availability',
    'mondayToFridayAvailability',
    'saturdayAvailability',

    // Skills (subset used by installer portal)
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

    // Payment info (installer portal)
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
    if ((admin as any)?.role === 'MODERATOR') {
      return NextResponse.json({ error: 'Admin role required' }, { status: 403 })
    }

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
      // Agreement approval tasks: reject the agreement as well
      const payload = changeRequest.payload as any
      if (payload?.action === 'approve_agreement' && payload?.agreementId) {
        try {
          await prisma.installerAgreement.update({
            where: { id: String(payload.agreementId) },
            data: {
              status: 'rejected',
            },
            select: { id: true },
          })
        } catch (e) {
          console.error('Failed to mark agreement rejected:', e)
        }
      }

      const updated = await prisma.installerChangeRequest.update({
        where: { id: requestId },
        data: {
          status: 'rejected',
          reviewedBy: email,
          reviewedAt: new Date(),
          rejectionReason: rejectionReason?.trim() || null,
        },
      })

      // Notify installer
      try {
        const sectionsText = summarizeSections(changeRequest.sections)
        const reasonText = (rejectionReason || '').trim()
        const payloadForReject = changeRequest.payload as any
        const isAgreement = payloadForReject?.action === 'approve_agreement'
        await prisma.notification.create({
          data: {
            installerId: changeRequest.installerId,
            type: 'notification',
            title: isAgreement ? 'Agreement Rejected' : 'Update Rejected',
            content: isAgreement
              ? `Your submitted agreement was rejected.${reasonText ? ` Reason: ${reasonText}` : ''}`
              : `Your submitted update${sectionsText ? ` (${sectionsText})` : ''} was rejected.${reasonText ? ` Reason: ${reasonText}` : ''}`,
            priority: 'normal',
            link: isAgreement ? '/installer/agreements/background-authorization' : '/installer/profile',
            senderId: 'admin',
            senderType: 'admin',
          },
        })
      } catch (e) {
        console.error('Failed to notify installer about rejection:', e)
      }

      // If no pending requests remain, flip installer status back to active (only if currently pending).
      // (Skip this for agreement approvals; those shouldn't affect installer status.)
      const remaining = await prisma.installerChangeRequest.count({
        where: { installerId: changeRequest.installerId, status: 'pending' },
      })
      const isAgreementReject = (changeRequest.payload as any)?.action === 'approve_agreement'
      if (!isAgreementReject && remaining === 0) {
        await prisma.installer.updateMany({
          where: { id: changeRequest.installerId, status: 'pending' },
          data: { status: 'active' },
        })
      }
      return NextResponse.json({ success: true, request: updated })
    }

    if (action !== 'approve') {
      return NextResponse.json({ error: 'Invalid action', details: 'Use action=approve or action=reject' }, { status: 400 })
    }

    const payload = changeRequest.payload as any

    // Agreement approvals: capture admin signature and mark as approved
    if (payload?.action === 'approve_agreement') {
      const agreementId = payload?.agreementId ? String(payload.agreementId) : ''
      if (!agreementId) {
        return NextResponse.json({ error: 'Invalid agreement approval request', details: 'Missing agreementId' }, { status: 400 })
      }

      const bodyApprove = body || {}
      const adminSignature = String(bodyApprove.adminSignature || '').trim()
      const adminSignedDate = String(bodyApprove.adminSignedDate || '').trim()
      if (!adminSignature) {
        return NextResponse.json({ error: 'Admin signature is required' }, { status: 400 })
      }

      const now = new Date()
      const updated = await prisma.$transaction(async (tx) => {
        const existingAgreement = await tx.installerAgreement.findUnique({
          where: { id: agreementId },
          select: { payload: true },
        })
        const prevPayload = (existingAgreement?.payload || {}) as any
        const nextPayload = {
          ...(prevPayload && typeof prevPayload === 'object' ? prevPayload : {}),
          adminApproval: {
            signature: adminSignature,
            signedDate: adminSignedDate || now.toISOString().slice(0, 10),
            approvedAt: now.toISOString(),
            approvedBy: email,
            signerName: 'Angela Medellin',
            signerTitle: 'Executive Director',
          },
        }

        // IMPORTANT: do not reference new columns here (approvedAt/adminSignature/etc.)
        // so this works even if Prisma Client/DB hasn't been migrated yet.
        await tx.installerAgreement.update({
          where: { id: agreementId },
          data: {
            status: 'approved',
            payload: nextPayload,
          },
          select: { id: true },
        })

        const updatedRequest = await tx.installerChangeRequest.update({
          where: { id: requestId },
          data: {
            status: 'approved',
            reviewedBy: email,
            reviewedAt: now,
          },
        })

        return updatedRequest
      })

      // Notify installer
      try {
        await prisma.notification.create({
          data: {
            installerId: changeRequest.installerId,
            type: 'notification',
            title: 'Agreement Approved',
            content: 'Your Background Authorization and Release form was approved and is ready for download.',
            priority: 'normal',
            link: '/installer/agreements/background-authorization',
            senderId: 'admin',
            senderType: 'admin',
          },
        })
      } catch (e) {
        console.error('Failed to notify installer about agreement approval:', e)
      }

      return NextResponse.json({ success: true, request: updated })
    }

    // Handle staff member changes (Team Members section)
    if (payload?.action) {
      const { action: staffAction, staffId, staffData } = payload

      if (staffAction === 'create_staff') {
        // Create new staff member
        const staffMember = await prisma.staffMember.create({
          data: {
            installerId: changeRequest.installerId,
            firstName: staffData.firstName,
            lastName: staffData.lastName,
            digitalId: staffData.digitalId || null,
            email: staffData.email || null,
            phone: staffData.phone || null,
            location: staffData.location || null,
            photoUrl: staffData.photoUrl || null,
            title: staffData.title || null,
            yearsOfExperience: staffData.yearsOfExperience ? parseInt(staffData.yearsOfExperience) : null,
            notes: staffData.notes || null,
          },
        })

        const updatedRequest = await prisma.installerChangeRequest.update({
          where: { id: requestId },
          data: {
            status: 'approved',
            reviewedBy: email,
            reviewedAt: new Date(),
            rejectionReason: null,
          },
        })

        // Notify installer
        try {
          const sectionsText = summarizeSections(changeRequest.sections)
          await prisma.notification.create({
            data: {
              installerId: changeRequest.installerId,
              type: 'notification',
              title: 'Update Approved',
              content: `Your submitted update${sectionsText ? ` (${sectionsText})` : ''} was approved and applied.`,
              priority: 'normal',
              link: '/installer/profile',
              senderId: 'admin',
              senderType: 'admin',
            },
          })
        } catch (e) {
          console.error('Failed to notify installer about approval:', e)
        }

        const remaining = await prisma.installerChangeRequest.count({
          where: { installerId: changeRequest.installerId, status: 'pending' },
        })
        if (remaining === 0) {
          await prisma.installer.updateMany({
            where: { id: changeRequest.installerId, status: 'pending' },
            data: { status: 'active' },
          })
        }

        return NextResponse.json({ success: true, staffMember, request: updatedRequest })
      }

      if (staffAction === 'update_staff' && staffId) {
        // Update existing staff member
        const staffMember = await prisma.staffMember.update({
          where: { id: staffId },
          data: {
            firstName: staffData.firstName,
            lastName: staffData.lastName,
            digitalId: staffData.digitalId || null,
            email: staffData.email || null,
            phone: staffData.phone || null,
            location: staffData.location || null,
            photoUrl: staffData.photoUrl || null,
            title: staffData.title || null,
            yearsOfExperience: staffData.yearsOfExperience ? parseInt(staffData.yearsOfExperience) : null,
            notes: staffData.notes || null,
          },
        })

        const updatedRequest = await prisma.installerChangeRequest.update({
          where: { id: requestId },
          data: {
            status: 'approved',
            reviewedBy: email,
            reviewedAt: new Date(),
            rejectionReason: null,
          },
        })

        // Notify installer
        try {
          const sectionsText = summarizeSections(changeRequest.sections)
          await prisma.notification.create({
            data: {
              installerId: changeRequest.installerId,
              type: 'notification',
              title: 'Update Approved',
              content: `Your submitted update${sectionsText ? ` (${sectionsText})` : ''} was approved and applied.`,
              priority: 'normal',
              link: '/installer/profile',
              senderId: 'admin',
              senderType: 'admin',
            },
          })
        } catch (e) {
          console.error('Failed to notify installer about approval:', e)
        }

        const remaining = await prisma.installerChangeRequest.count({
          where: { installerId: changeRequest.installerId, status: 'pending' },
        })
        if (remaining === 0) {
          await prisma.installer.updateMany({
            where: { id: changeRequest.installerId, status: 'pending' },
            data: { status: 'active' },
          })
        }

        return NextResponse.json({ success: true, staffMember, request: updatedRequest })
      }

      if (staffAction === 'delete_staff' && staffId) {
        // Delete staff member
        await prisma.staffMember.delete({
          where: { id: staffId },
        })

        const updatedRequest = await prisma.installerChangeRequest.update({
          where: { id: requestId },
          data: {
            status: 'approved',
            reviewedBy: email,
            reviewedAt: new Date(),
            rejectionReason: null,
          },
        })

        // Notify installer
        try {
          const sectionsText = summarizeSections(changeRequest.sections)
          await prisma.notification.create({
            data: {
              installerId: changeRequest.installerId,
              type: 'notification',
              title: 'Update Approved',
              content: `Your submitted update${sectionsText ? ` (${sectionsText})` : ''} was approved and applied.`,
              priority: 'normal',
              link: '/installer/profile',
              senderId: 'admin',
              senderType: 'admin',
            },
          })
        } catch (e) {
          console.error('Failed to notify installer about approval:', e)
        }

        const remaining = await prisma.installerChangeRequest.count({
          where: { installerId: changeRequest.installerId, status: 'pending' },
        })
        if (remaining === 0) {
          await prisma.installer.updateMany({
            where: { id: changeRequest.installerId, status: 'pending' },
            data: { status: 'active' },
          })
        }

        return NextResponse.json({ success: true, request: updatedRequest })
      }
    }

    // Handle regular installer field updates
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

    // Notify installer
    try {
      const sectionsText = summarizeSections(changeRequest.sections)
      await prisma.notification.create({
        data: {
          installerId: changeRequest.installerId,
          type: 'notification',
          title: 'Update Approved',
          content: `Your submitted update${sectionsText ? ` (${sectionsText})` : ''} was approved and applied.`,
          priority: 'normal',
          link: '/installer/profile',
          senderId: 'admin',
          senderType: 'admin',
        },
      })
    } catch (e) {
      console.error('Failed to notify installer about approval:', e)
    }

    const remaining = await prisma.installerChangeRequest.count({
      where: { installerId: changeRequest.installerId, status: 'pending' },
    })
    if (remaining === 0) {
      await prisma.installer.updateMany({
        where: { id: changeRequest.installerId, status: 'pending' },
        data: { status: 'active' },
      })
    }

    return NextResponse.json({ success: true, installer, request: updatedRequest })
  } catch (error: any) {
    console.error('Error updating change request:', error)
    return NextResponse.json(
      { error: 'Failed to update change request', details: error.message },
      { status: 500 }
    )
  }
}

