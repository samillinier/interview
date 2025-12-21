'use client'

import { signIn, getProviders } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import logo from '@/images/freepik_br_649d627d-2016-4108-ab09-0d2a0ad903d9.png'

export default function SignInPage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [providers, setProviders] = useState<any>(null)
  const [debugInfo, setDebugInfo] = useState<string[]>([])

  const addDebugInfo = (message: string) => {
    const timestamp = new Date().toLocaleTimeString()
    setDebugInfo(prev => [...prev.slice(-9), `[${timestamp}] ${message}`])
    console.log(`🔍 DEBUG: ${message}`)
  }

  useEffect(() => {
    addDebugInfo('Page loaded, checking providers...')
    if (typeof window !== 'undefined') {
      addDebugInfo(`Current URL: ${window.location.href}`)
      
      // Check for error in URL parameters
      const urlParams = new URLSearchParams(window.location.search)
      const errorParam = urlParams.get('error')
      if (errorParam) {
        const errorMsg = `OAuth Error detected: ${errorParam}`
        setError(errorMsg)
        addDebugInfo(`❌ ${errorMsg}`)
        
        // Provide specific guidance based on error type
        if (errorParam === 'OAuthSignin') {
          addDebugInfo('🔴 OAuthSignin error - Sign-in failed!')
          addDebugInfo('Common causes:')
          addDebugInfo('1. ❌ Redirect URI mismatch in Azure AD')
          addDebugInfo('2. ❌ Client ID or Secret incorrect')
          addDebugInfo('3. ❌ NEXTAUTH_URL not matching production URL')
          const expectedCallback = `${window.location.origin}/api/auth/callback/azure-ad`
          addDebugInfo(`Expected callback URL: ${expectedCallback}`)
          addDebugInfo('⚠️ Check Azure AD redirect URI matches EXACTLY!')
          addDebugInfo('⚠️ Check NEXTAUTH_URL in Vercel matches: ' + window.location.origin)
        } else if (errorParam === 'OAuthCallback') {
          addDebugInfo('OAuthCallback error: Callback processing failed')
        } else if (errorParam === 'OAuthCreateAccount') {
          addDebugInfo('OAuthCreateAccount error: Account creation failed')
        } else if (errorParam === 'Callback') {
          addDebugInfo('Callback error: General callback error')
        }
      }
    }
    
    getProviders().then((provs) => {
      addDebugInfo(`Providers received: ${provs ? Object.keys(provs).join(', ') : 'none'}`)
      console.log('Available providers:', provs)
      setProviders(provs)
      if (!provs || !provs['azure-ad']) {
        const errorMsg = 'Azure AD provider is not configured.'
        setError(errorMsg)
        addDebugInfo(`❌ ERROR: ${errorMsg}`)
        addDebugInfo('Check: AZURE_AD_CLIENT_ID and AZURE_AD_CLIENT_SECRET in environment variables')
      } else {
        addDebugInfo('✅ Azure AD provider is configured')
        addDebugInfo(`Provider ID: ${provs['azure-ad'].id}`)
        addDebugInfo(`Provider Name: ${provs['azure-ad'].name}`)
      }
    }).catch((err) => {
      const errorMsg = `Unable to check authentication providers: ${err.message}`
      console.error('Error getting providers:', err)
      setError(errorMsg)
      addDebugInfo(`❌ ERROR: ${errorMsg}`)
    })
  }, [])

  const handleMicrosoftSignIn = async (e: React.MouseEvent) => {
    e.preventDefault()
    try {
      setIsLoading(true)
      setError(null)
      setDebugInfo(prev => [...prev, '--- Sign-in Attempt Started ---'])
      addDebugInfo('Sign-in button clicked')
      addDebugInfo('Checking if Azure AD provider is available...')
      
      if (!providers?.['azure-ad']) {
        const errorMsg = 'Azure AD provider not available. Check environment variables.'
        setError(errorMsg)
        addDebugInfo(`❌ ERROR: ${errorMsg}`)
        addDebugInfo('Required: AZURE_AD_CLIENT_ID, AZURE_AD_CLIENT_SECRET')
        setIsLoading(false)
        return
      }
      
      addDebugInfo('✅ Azure AD provider found')
      addDebugInfo('Calling signIn() function...')
      addDebugInfo(`Callback URL: /dashboard`)
      addDebugInfo(`Redirect: true`)
      console.log('Attempting to sign in with Azure AD...')
      
      const result = await signIn('azure-ad', { 
        callbackUrl: '/dashboard',
        redirect: true
      })
      
      addDebugInfo(`Sign-in initiated. Result: ${result ? JSON.stringify(result) : 'redirecting...'}`)
      console.log('Sign in result:', result)
      
      setTimeout(() => {
        if (isLoading) {
          addDebugInfo('⚠️ WARNING: Still loading after 3 seconds')
          addDebugInfo('Possible issues:')
          addDebugInfo('1. Redirect URI mismatch in Azure AD')
          addDebugInfo('2. NEXTAUTH_URL not set correctly')
          addDebugInfo('3. Network/CORS issue')
          if (typeof window !== 'undefined') {
            addDebugInfo(`Current URL: ${window.location.href}`)
          }
          addDebugInfo('Expected callback: /api/auth/callback/azure-ad')
        }
      }, 3000)
      
    } catch (err: any) {
      const errorMsg = `Sign-in failed: ${err?.message || 'Unknown error'}`
      console.error('Sign-in error:', err)
      setError(errorMsg)
      addDebugInfo(`❌ ERROR: ${errorMsg}`)
      addDebugInfo(`Error type: ${err?.name || 'Unknown'}`)
      if (err?.stack) {
        addDebugInfo(`Stack: ${err.stack.substring(0, 200)}...`)
      }
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 flex items-center justify-center p-4">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-brand-green/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 -left-40 w-80 h-80 bg-brand-yellow/10 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative w-full max-w-md"
      >
        <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 p-8 md:p-10 border border-slate-100">
          <div className="flex justify-center mb-8">
            <Link href="/">
              <Image
                src={logo}
                alt="Floor Interior Service"
                width={64}
                height={64}
                className="w-16 h-16 object-contain"
              />
            </Link>
          </div>

          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-slate-900 mb-2">
              Welcome Back
            </h1>
            <p className="text-slate-500">
              Sign in to access the admin dashboard
            </p>
          </div>

          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm font-semibold text-red-700 mb-2">❌ Error:</p>
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {debugInfo.length > 0 && (
            <div className="mb-4 p-4 bg-slate-50 border border-slate-200 rounded-lg max-h-64 overflow-y-auto">
              <p className="text-xs font-semibold text-slate-700 mb-2 flex items-center gap-2">
                🔍 Debug Information:
                <button
                  onClick={() => setDebugInfo([])}
                  className="ml-auto text-xs text-slate-500 hover:text-slate-700"
                >
                  Clear
                </button>
              </p>
              <div className="space-y-1">
                {debugInfo.map((info, idx) => (
                  <p key={idx} className="text-xs text-slate-600 font-mono break-words">
                    {info}
                  </p>
                ))}
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={handleMicrosoftSignIn}
            disabled={isLoading || !providers?.['azure-ad']}
            className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-[#2F2F2F] hover:bg-[#1a1a1a] text-white rounded-xl font-medium transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-5 h-5" viewBox="0 0 21 21" fill="none">
              <rect x="1" y="1" width="9" height="9" fill="#F25022" />
              <rect x="11" y="1" width="9" height="9" fill="#7FBA00" />
              <rect x="1" y="11" width="9" height="9" fill="#00A4EF" />
              <rect x="11" y="11" width="9" height="9" fill="#FFB900" />
            </svg>
            {isLoading ? 'Signing in...' : 'Sign in with Microsoft'}
          </button>
          
          {!providers?.['azure-ad'] && !error && (
            <p className="text-xs text-amber-600 mt-2 text-center">
              Checking authentication configuration...
            </p>
          )}

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-slate-400">Admin access only</span>
            </div>
          </div>

          <p className="text-center text-sm text-slate-500">
            Use your company Microsoft account to sign in. 
            Contact your administrator if you need access.
          </p>

          <div className="mt-8 text-center">
            <Link
              href="/"
              className="text-brand-green hover:text-brand-green-dark font-medium transition-colors"
            >
              ← Back to Home
            </Link>
          </div>
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">
          Floor Interior Service © {new Date().getFullYear()}
        </p>
      </motion.div>
    </div>
  )
}
