/**
 * Property Portal Access Control
 * 
 * All ADMIN role users can see all shared data.
 * Non-admin users can only see their own property's data.
 */

import prisma from './db'

export const SUPER_ADMIN_EMAIL = 'sbiru@fiscorponline.com'

function normalizeAdminRole(role: unknown): string {
  return String(role || '').trim().toUpperCase()
}

/**
 * Check if the user is the super admin (Sam) - kept for backwards compatibility
 */
export function isSuperAdmin(userEmail: string | null | undefined): boolean {
  if (!userEmail) return false
  return userEmail.toLowerCase().trim() === SUPER_ADMIN_EMAIL.toLowerCase().trim()
}

/**
 * Check if the user is an ADMIN role (can see all shared data)
 */
export async function isAdmin(userEmail: string | null | undefined): Promise<boolean> {
  if (!userEmail) return false
  
  try {
    const admin = await prisma.admin.findUnique({
      where: { email: userEmail.toLowerCase().trim() },
    })
    const role = normalizeAdminRole(admin?.role)
    
    // Only ADMIN role (not MODERATOR or MANAGER) can see all data
    return admin?.isActive === true && (role === 'ADMIN' || role === 'SUPER_ADMIN')
  } catch (error) {
    console.error('Error checking admin status:', error)
    return false
  }
}

/**
 * Check if the user is a MANAGER role (restricted access)
 */
export async function isManager(userEmail: string | null | undefined): Promise<boolean> {
  if (!userEmail) return false
  
  try {
    const admin = await prisma.admin.findUnique({
      where: { email: userEmail.toLowerCase().trim() },
    })
    const role = normalizeAdminRole(admin?.role)
    
    return admin?.isActive === true && role === 'MANAGER'
  } catch (error) {
    console.error('Error checking manager status:', error)
    return false
  }
}

/**
 * Check if the user is an admin or manager (has dashboard access)
 */
export async function isAdminOrManager(userEmail: string | null | undefined): Promise<boolean> {
  if (!userEmail) return false
  
  try {
    const admin = await prisma.admin.findUnique({
      where: { email: userEmail.toLowerCase().trim() },
    })
    const role = normalizeAdminRole(admin?.role)
    
    return admin?.isActive === true && (role === 'ADMIN' || role === 'SUPER_ADMIN' || role === 'MANAGER')
  } catch (error) {
    console.error('Error checking admin/manager status:', error)
    return false
  }
}

/**
 * Get the admin role for a user
 */
/**
 * Resolve a location for property portal document/photo routes.
 * Admins may manage locations across properties (location id only).
 * Property users must match both propertyId and locationId.
 */
export async function findLocationForPropertyRequest(
  propertyId: string,
  locationId: string,
  userEmail: string | null | undefined,
) {
  if (!locationId) return null

  if (await isAdminOrManager(userEmail)) {
    return prisma.location.findFirst({
      where: { id: locationId },
      select: { id: true, propertyId: true },
    })
  }

  if (!propertyId || !userEmail) return null

  const property = await prisma.property.findUnique({
    where: { email: userEmail.toLowerCase().trim() },
    select: { id: true },
  })

  if (!property || property.id !== propertyId) return null

  return prisma.location.findFirst({
    where: { id: locationId, propertyId },
    select: { id: true, propertyId: true },
  })
}

export async function getAdminRole(userEmail: string | null | undefined): Promise<'ADMIN' | 'MODERATOR' | 'MANAGER' | 'SUPER_ADMIN' | null> {
  if (!userEmail) return null
  
  try {
    const admin = await prisma.admin.findUnique({
      where: { email: userEmail.toLowerCase().trim() },
    })
    
    if (!admin?.isActive) return null
    return normalizeAdminRole(admin.role) as 'ADMIN' | 'MODERATOR' | 'MANAGER' | 'SUPER_ADMIN'
  } catch (error) {
    console.error('Error getting admin role:', error)
    return null
  }
}
