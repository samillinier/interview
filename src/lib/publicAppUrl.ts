/** Public installer portal origin used in emails and deep links. */
export function publicAppUrl(): string {
  if (process.env.NODE_ENV === 'development') {
    return 'http://localhost:3000'
  }
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXTAUTH_URL ||
    'https://job.floorinteriorservices.com'
  ).replace(/\/$/, '')
}

/** Sender / brand name. Always uses the plural “Services”. */
export function companyDisplayName(): string {
  const name = process.env.RESEND_FROM_NAME || 'Floor Interior Services'
  return name.replace(/Floor Interior Service(?!s)/g, 'Floor Interior Services')
}
