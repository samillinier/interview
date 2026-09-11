'use client'

import { SessionProvider } from 'next-auth/react'
import { AdminWebsiteChatPopup } from '@/components/AdminWebsiteChatPopup'

export default function AuthProvider({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SessionProvider basePath="/api/auth">
      {children}
      <AdminWebsiteChatPopup />
    </SessionProvider>
  )
}





