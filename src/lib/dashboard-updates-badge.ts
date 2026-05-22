import prisma from '@/lib/db'

export async function getDashboardUpdatesNavBadgeCount() {
  const rows = await prisma.dashboardUpdate.findMany({
    where: { isActive: true, showNavBadge: true },
    select: { navBadgeCount: true },
  })

  return rows.reduce((sum, row) => {
    const value = row.navBadgeCount == null ? 1 : Math.max(0, row.navBadgeCount)
    return sum + value
  }, 0)
}

export function dispatchDashboardUpdatesChanged() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('dashboard-updates-changed'))
  }
}
