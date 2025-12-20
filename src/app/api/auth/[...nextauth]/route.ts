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
  console.error('Azure AD is not properly configured. Missing CLIENT_ID or CLIENT_SECRET')
}

const handler = NextAuth({
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
      // Check if user's email is in the allowed list
      const email = user.email?.toLowerCase()
      if (email && ALLOWED_EMAILS.includes(email)) {
        return true
      }
      // Return false to deny access - NextAuth will redirect to error page
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
})

export { handler as GET, handler as POST }
