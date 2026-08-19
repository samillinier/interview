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
