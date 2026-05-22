import prisma from '@/lib/db'

export type AdminAuditAction =
  | 'installer.status_change'
  | 'installer.delete'
  | 'installer.contract_generated'
  | 'installer.credentials_update'
  | 'admin.role_change'
  | 'admin.create'

export async function writeAdminAuditLog(args: {
  adminEmail: string
  adminId?: string | null
  action: AdminAuditAction
  targetType: 'installer' | 'admin'
  targetId: string
  targetLabel?: any
  before?: any
  after?: any
}) {
  const prismaAny = prisma as any
  await prismaAny.adminAuditLog.create({
    data: {
      adminEmail: args.adminEmail,
      adminId: args.adminId ?? null,
      action: args.action,
      targetType: args.targetType,
      targetId: args.targetId,
      targetLabel: args.targetLabel !== undefined && args.targetLabel !== null ? String(args.targetLabel) : null,
      before: args.before ?? null,
      after: args.after ?? null,
    },
  })
}

