import prisma from '@/lib/db'

export type AdminAuditAction =
  | 'installer.status_change'
  | 'installer.delete'
  | 'installer.archive'
  | 'installer.restore'
  | 'installer.contract_generated'
  | 'installer.credentials_update'
  | 'admin.role_change'
  | 'admin.create'
  | 'property.user.create'
  | 'property.user.update'
  | 'property.user.delete'
  | 'property.vehicle.create'
  | 'property.vehicle.update'
  | 'property.vehicle.delete'
  | 'property.location.create'
  | 'property.location.update'
  | 'property.location.delete'
  | 'property.inventory.create'
  | 'property.inventory.update'
  | 'property.inventory.delete'

export async function writeAdminAuditLog(args: {
  adminEmail: string
  adminId?: string | null
  action: AdminAuditAction
  targetType: 'installer' | 'admin' | 'property_user' | 'vehicle' | 'location' | 'inventory'
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

export async function writePropertyAuditLog(args: {
  actorEmail: string
  action: AdminAuditAction
  targetType: 'property_user' | 'vehicle' | 'location' | 'inventory'
  targetId: string
  targetLabel?: unknown
  before?: unknown
  after?: unknown
}) {
  try {
    await writeAdminAuditLog({
      adminEmail: args.actorEmail,
      action: args.action,
      targetType: args.targetType,
      targetId: args.targetId,
      targetLabel: args.targetLabel,
      before: args.before,
      after: args.after,
    })
  } catch (e) {
    console.error('Failed to write property audit log:', e)
  }
}

export function fleetVehicleAuditLabel(v: {
  vehicleYear?: unknown
  vehicleMake?: unknown
  vehicleModel?: unknown
  plate?: unknown
}) {
  const name = [v.vehicleYear, v.vehicleMake, v.vehicleModel].filter(Boolean).join(' ').trim()
  return name || String(v.plate || '').trim() || 'Vehicle'
}

