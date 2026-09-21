'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { LandingChatWidget } from '@/components/LandingChatWidget'

function ChatEmbedInner() {
  const searchParams = useSearchParams()
  const initialToken = searchParams?.get('token') || ''
  return <LandingChatWidget embed initialToken={initialToken} />
}

export default function ChatEmbedPage() {
  return (
    <>
      <style>{`html, body { background: transparent !important; margin: 0 !important; }`}</style>
      <Suspense fallback={null}>
        <ChatEmbedInner />
      </Suspense>
    </>
  )
}
