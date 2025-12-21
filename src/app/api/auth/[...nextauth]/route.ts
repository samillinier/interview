import NextAuth from 'next-auth'
import AzureADProvider from 'next-auth/providers/azure-ad'

// Allowed email addresses
const ALLOWED_EMAILS = [
  'amunoz@fiscorponline.com',
  'aclass@fiscorponline.com',
  'sbiru@fiscorponline.com',
]

// Check if Azure AD is properly configured
const isAzureADConfigured = 
  process.env.AZURE_AD_CLIENT_ID && 
  process.env.AZURE_AD_CLIENT_SECRET

if (!isAzureADConfigured) {
  console.error('❌ Azure AD is not properly configured. Missing CLIENT_ID or CLIENT_SECRET')
} else {
  console.log('✅ Azure AD configured with Client ID:', process.env.AZURE_AD_CLIENT_ID?.substring(0, 8) + '...')
}

const handler = NextAuth({
  debug: true,
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    ...(isAzureADConfigured
      ? [
          AzureADProvider({
            clientId: process.env.AZURE_AD_CLIENT_ID!,
            clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
            tenantId: process.env.AZURE_AD_TENANT_ID || 'common',
            authorization: {
              params: {
                scope: 'openid profile email User.Read',
              },
            },
          }),
        ]
      : []),
  ],
  pages: {
    signIn: '/login',
    error: '/auth/access-denied',
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      console.log('🔐 SignIn callback triggered')
      console.log('📧 User email:', user?.email)
      console.log('🔑 Account provider:', account?.provider)
      
      // TEMPORARILY DISABLED: Allow all users to sign in
      // TODO: Re-enable email restriction after testing
      console.log('⚠️ Email restriction temporarily disabled - allowing all users')
      return true
      
      // Original email restriction code (disabled):
      // const email = user.email?.toLowerCase()
      // if (email && ALLOWED_EMAILS.includes(email)) {
      //   console.log('✅ User authorized:', email)
      //   return true
      // }
      // console.log('❌ User not authorized:', email)
      // console.log('📋 Allowed emails:', ALLOWED_EMAILS)
      // return false
    },
    async jwt({ token, account, profile }) {
      if (account) {
        token.accessToken = account.access_token
      }
      if (profile) {
        token.picture = (profile as any).picture
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.sub
        if (token.accessToken) {
          try {
            const response = await fetch('https://graph.microsoft.com/v1.0/me/photo/$value', {
              headers: {
                Authorization: `Bearer ${token.accessToken}`,
              },
            })
            if (response.ok) {
              const arrayBuffer = await response.arrayBuffer()
              const base64 = Buffer.from(arrayBuffer).toString('base64')
              session.user.image = `data:image/jpeg;base64,${base64}`
            }
          } catch (error) {
            console.log('Could not fetch profile picture')
          }
        }
      }
      return session
    },
  },
  events: {
    async signIn({ user, account, profile, isNewUser }) {
      console.log('🎉 Sign in event:', { email: user.email, isNewUser })
    },
    async signOut() {
      console.log('👋 Sign out event')
    },
  },
  logger: {
    error(code, metadata) {
      console.error('❌ NextAuth Error:', code, metadata)
      if (code === 'OAuthCallback') {
        console.error('🔴 OAuthCallback Error Details:')
        console.error('  This means the OAuth flow started but callback failed')
        console.error('  Common causes:')
        console.error('  1. Redirect URI mismatch in Azure AD')
        console.error('  2. NEXTAUTH_SECRET missing or incorrect')
        console.error('  3. Session/cookie issues')
        console.error('  4. Client secret expired or incorrect')
        console.error('  5. Callback URL not matching exactly')
        if (metadata) {
          console.error('  Error metadata:', JSON.stringify(metadata, null, 2))
          console.error('  Full error object:', metadata)
        }
        // Log environment check
        console.error('  Environment check:')
        console.error('    NEXTAUTH_URL:', process.env.NEXTAUTH_URL)
        console.error('    NEXTAUTH_SECRET exists:', !!process.env.NEXTAUTH_SECRET)
        console.error('    AZURE_AD_CLIENT_ID:', process.env.AZURE_AD_CLIENT_ID?.substring(0, 8) + '...')
        console.error('    AZURE_AD_CLIENT_SECRET exists:', !!process.env.AZURE_AD_CLIENT_SECRET)
        console.error('    Expected callback:', process.env.NEXTAUTH_URL ? `${process.env.NEXTAUTH_URL}/api/auth/callback/azure-ad` : 'NEXTAUTH_URL not set')
      }
    },
    warn(code) {
      console.warn('⚠️ NextAuth Warning:', code)
    },
    debug(code, metadata) {
      console.log('🔍 NextAuth Debug:', code, metadata)
    },
  },
})

export { handler as GET, handler as POST }
