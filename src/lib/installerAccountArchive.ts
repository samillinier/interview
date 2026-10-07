import prisma from '@/lib/db'

export const ARCHIVED_INSTALLER_STATUS = 'deleted'

export function isInstallerArchived(installer: {
  accountDeletedAt?: Date | string | null
  status?: string | null
}): boolean {
  if (installer.accountDeletedAt) return true
  return String(installer.status || '').toLowerCase() === ARCHIVED_INSTALLER_STATUS
}

/** Prisma where-clause so archived accounts stay off installer lists and login. */
export const notArchivedInstallerWhere = {
  accountDeletedAt: null,
  status: { not: ARCHIVED_INSTALLER_STATUS },
} as const

export async function archiveInstallerAccount(installerId: string) {
  const installer = await prisma.installer.findUnique({
    where: { id: installerId },
    select: { id: true, status: true, accountDeletedAt: true },
  })
  if (!installer) return null
  if (isInstallerArchived(installer)) return installer

  const previousStatus = String(installer.status || 'pending')

  await prisma.$transaction([
    prisma.deviceToken.deleteMany({ where: { installerId } }),
    prisma.installer.update({
      where: { id: installerId },
      data: {
        status: ARCHIVED_INSTALLER_STATUS,
        accountDeletedAt: new Date(),
        accountDeletedPreviousStatus: previousStatus === ARCHIVED_INSTALLER_STATUS ? 'pending' : previousStatus,
        loginToken: null,
        loginTokenExpiresAt: null,
        passwordResetToken: null,
        passwordResetTokenExpiresAt: null,
        emailVerificationToken: null,
      },
    }),
  ])

  return installer
}

export async function restoreInstallerAccount(installerId: string) {
  const installer = await prisma.installer.findUnique({
    where: { id: installerId },
    select: {
      id: true,
      status: true,
      accountDeletedAt: true,
      accountDeletedPreviousStatus: true,
    },
  })
  if (!installer) return null
  if (!isInstallerArchived(installer)) return installer

  const restoredStatus =
    String(installer.accountDeletedPreviousStatus || '').trim() &&
    String(installer.accountDeletedPreviousStatus).toLowerCase() !== ARCHIVED_INSTALLER_STATUS
      ? installer.accountDeletedPreviousStatus
      : 'pending'

  await prisma.installer.update({
    where: { id: installerId },
    data: {
      status: restoredStatus,
      accountDeletedAt: null,
      accountDeletedPreviousStatus: null,
    },
  })

  return { ...installer, status: restoredStatus }
}
