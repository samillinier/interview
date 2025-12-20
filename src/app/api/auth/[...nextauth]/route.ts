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
  debug: process.env.NODE_ENV === 'development',
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
    signIn: '/auth/signin',
    error: '/auth/access-denied',
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      console.log('🔐 SignIn callback triggered')
      console.log('📧 User email:', user?.email)
      console.log('🔑 Account provider:', account?.provider)
      
      // Check if user's email is in the allowed list
      const email = user.email?.toLowerCase()
      if (email && ALLOWED_EMAILS.includes(email)) {
        console.log('✅ User authorized:', email)
        return true
      }
      // Return false to deny access - NextAuth will redirect to error page
      console.log('❌ User not authorized:', email)
      console.log('📋 Allowed emails:', ALLOWED_EMAILS)
      return false
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
        // Get profile picture from Microsoft Graph API
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
            // Profile picture not available, use default
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
