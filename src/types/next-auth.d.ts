import 'next-auth'

declare module 'next-auth' {
  type AdminRole = 'ADMIN' | 'MODERATOR'

  interface Session {
    user?: {
      id?: string
      role?: AdminRole
      name?: string | null
      email?: string | null
      image?: string | null
    }
  }
}

