import NextAuth from 'next-auth'
import AzureADProvider from 'next-auth/providers/azure-ad'

// Allowed email addresses
const ALLOWED_EMAILS = [
  'amunoz@fiscorponline.com',
  'aclass@fiscorponline.com',
  'sbiru@fiscorponline.com',
]

const handler = NextAuth({
  providers: [
    AzureADProvider({
      clientId: process.env.AZURE_AD_CLIENT_ID!,
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
      tenantId: 'common',
      authorization: {
        params: {
          scope: 'openid profile email User.Read',
        },
      },
    }),
  ],
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  callbacks: {
    async signIn({ user }) {
      // Check if user's email is in the allowed list
      const email = user.email?.toLowerCase()
      if (email && ALLOWED_EMAILS.includes(email)) {
        return true
      }
      // Redirect to access denied page
      return '/auth/access-denied'
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
