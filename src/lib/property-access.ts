/**
 * Property Portal Access Control
 * 
 * All ADMIN role users can see all shared data.
 * Non-admin users can only see their own property's data.
 */

import prisma from './db'

export const SUPER_ADMIN_EMAIL = 'sbiru@fiscorponline.com'

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
    
    // Only ADMIN role (not MODERATOR or MANAGER) can see all data
    return admin?.isActive === true && admin?.role === 'ADMIN'
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
    
    return admin?.isActive === true && admin?.role === 'MANAGER'
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
    
    return admin?.isActive === true && (admin?.role === 'ADMIN' || admin?.role === 'MANAGER')
  } catch (error) {
    console.error('Error checking admin/manager status:', error)
    return false
  }
}

/**
 * Get the admin role for a user
 */
export async function getAdminRole(userEmail: string | null | undefined): Promise<'ADMIN' | 'MODERATOR' | 'MANAGER' | null> {
  if (!userEmail) return null
  
  try {
    const admin = await prisma.admin.findUnique({
      where: { email: userEmail.toLowerCase().trim() },
    })
    
    if (!admin?.isActive) return null
    return admin.role as 'ADMIN' | 'MODERATOR' | 'MANAGER' | null
  } catch (error) {
    console.error('Error getting admin role:', error)
    return null
  }
}
