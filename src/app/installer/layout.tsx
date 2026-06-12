import type { Metadata, Viewport } from 'next'
import InstallerLayoutClient from './InstallerLayoutClient'

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#003B2E',
}

export const metadata: Metadata = {
  title: 'FIS Installer',
  description: 'Floor Interior Services Installer Portal - Manage jobs, payments, and documents on the go',
  manifest: '/installer-manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'FIS Installer',
  },
  icons: {
    icon: '/favicon.png',
    shortcut: '/favicon.png',
    apple: [
      { url: '/logo.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  other: {
    'mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'black-translucent',
  },
}

export default function InstallerLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* iOS Splash Screen - shown while app loads from home screen */}
      <link rel="apple-touch-icon" href="/logo.png" />
      <InstallerLayoutClient>{children}</InstallerLayoutClient>
    </>
  )
}
