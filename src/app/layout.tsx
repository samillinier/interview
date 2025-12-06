import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Toaster } from 'sonner'
import AuthProvider from '@/components/AuthProvider'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const metadata: Metadata = {
  title: 'Floor Interior Service | AI-Powered Prescreening',
  description: 'Automated prescreening system for flooring installers powered by AI',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="bg-white text-primary-900 antialiased font-sans">
        <AuthProvider>
          {children}
        </AuthProvider>
        <Toaster 
          position="top-right"
          toastOptions={{
            style: {
              background: '#fff',
              border: '1px solid #e3e3e3',
              color: '#171717',
            },
          }}
        />
      </body>
    </html>
  )
}

