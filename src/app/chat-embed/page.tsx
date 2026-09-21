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
      <style>{`
        html, body, #__next {
          background: transparent !important;
          margin: 0 !important;
          padding: 0 !important;
          width: 100% !important;
          height: 100% !important;
          min-height: 100% !important;
          overflow: hidden !important;
        }
      `}</style>
      <Suspense fallback={null}>
        <ChatEmbedInner />
      </Suspense>
    </>
  )
}
