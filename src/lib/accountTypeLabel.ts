/** User-facing labels for installer vs estimator accounts. Keep DB/API values as `installer`. */
export function accountRoleLabel(
  accountType?: string | null,
  opts?: { lowercase?: boolean; plural?: boolean }
): string {
  const isEstimator = String(accountType || '').trim().toLowerCase() === 'estimator'
  if (opts?.plural) {
    if (opts.lowercase) return isEstimator ? 'estimators' : 'subcontractors'
    return isEstimator ? 'Estimators' : 'Subcontractors'
  }
  if (opts?.lowercase) return isEstimator ? 'estimator' : 'subcontractor'
  return isEstimator ? 'Estimator' : 'Subcontractor'
}
