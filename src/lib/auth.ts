import { NextAuthOptions } from 'next-auth'
import AzureADProvider from 'next-auth/providers/azure-ad'
import prisma from '@/lib/db'

// Fallback allowed email addresses (for initial setup or if database is unavailable)
const FALLBACK_ALLOWED_EMAILS = [
  'amunoz@fiscorponline.com',
  'aclass@fiscorponline.com',
  'sbiru@fiscorponline.com',
  'svudaru@fiscorponline.com',
].map(email => email.toLowerCase().trim())

// Check if Azure AD is properly configured
const isAzureADConfigured = 
  process.env.AZURE_AD_CLIENT_ID && 
  process.env.AZURE_AD_CLIENT_SECRET

export const authOptions: NextAuthOptions = {
  debug: true,
  secret: process.env.NEXTAUTH_SECRET,
  providers: isAzureADConfigured
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
    : [],
  pages: {
    signIn: '/login',
    error: '/auth/access-denied',
  },
  callbacks: {
    async redirect({ url, baseUrl }) {
      console.log('🔄 Redirect callback:', { url, baseUrl })
      
      // Parse the URL to check the path
      let targetPath = url
      try {
        const urlObj = new URL(url, baseUrl)
        targetPath = urlObj.pathname
      } catch (e) {
        // If URL parsing fails, treat url as path
        if (url.startsWith('/')) {
          targetPath = url
        }
      }
      
      // If callbackUrl contains /property, ensure we redirect there
      if (targetPath.includes('/property')) {
        const fullUrl = targetPath.startsWith('/') ? `${baseUrl}${targetPath}` : `${baseUrl}/${targetPath}`
        console.log('🔄 Property redirect to:', fullUrl)
        return fullUrl
      }
      
      // If url is a relative URL, make it absolute
      if (url.startsWith('/')) {
        const fullUrl = `${baseUrl}${url}`
        console.log('🔄 Redirecting to:', fullUrl)
        return fullUrl
      }
      
      // If url is on the same origin, allow it
      try {
        const urlObj = new URL(url)
        if (urlObj.origin === baseUrl) {
          console.log('🔄 Redirecting to same origin:', url)
          return url
        }
      } catch (e) {
        // Invalid URL, fall through
      }
      
      // Default redirect to baseUrl (shouldn't happen, but fallback)
      console.log('🔄 Default redirect to:', baseUrl)
      return baseUrl
    },
    async signIn({ user, account, profile }) {
      console.log('🔐 SignIn callback triggered')
      console.log('📧 User email:', user?.email)
      console.log('🔑 Account provider:', account?.provider)
      
      const email = user.email?.toLowerCase()
      if (!email) {
        console.log('❌ No email provided')
        return false
      }

      try {
        // Check database for admin
        const admin = await prisma.admin.findUnique({
          where: { email },
        })

        // Only allow ADMIN role (not MODERATOR) to access property portal
        if (admin && admin.isActive && (admin as any).role === 'ADMIN') {
          console.log('✅ Admin authorized (admin database):', email)
          return true
        }

        // Check database for property
        const property = await prisma.property.findUnique({
          where: { email },
        })

        if (property && property.status === 'active') {
          console.log('✅ User authorized (property database):', email)
          return true
        }
        
        // Auto-create property user if they don't exist but are trying to access property portal
        // This allows Microsoft-authenticated users to be automatically created as property users
        if (!property) {
          try {
            // Extract name from Microsoft profile if available
            const firstName = (profile as any)?.given_name || (user as any)?.name?.split(' ')[0] || 'Property'
            const lastName = (profile as any)?.family_name || (user as any)?.name?.split(' ').slice(1).join(' ') || 'User'
            
            const newProperty = await prisma.property.create({
              data: {
                email,
                firstName,
                lastName,
                status: 'active',
              },
            })
            console.log('✅ Auto-created property user:', email)
            return true
          } catch (dbError) {
            console.error('⚠️ Could not auto-create property:', dbError)
            // Continue to check other authorization methods
          }
        }

        // Fallback to hardcoded list (for initial setup)
        if (FALLBACK_ALLOWED_EMAILS.includes(email)) {
          console.log('✅ User authorized (fallback list):', email)
          
          // Auto-create admin in database if they're in fallback list
          try {
            await prisma.admin.upsert({
              where: { email },
              update: { isActive: true },
              create: {
                email,
                isActive: true,
                role: 'ADMIN',
              },
            })
            console.log('✅ Auto-created admin in database:', email)
          } catch (dbError) {
            console.error('⚠️ Could not auto-create admin:', dbError)
            // Continue anyway since they're in fallback list
          }
          
          return true
        }

        console.log('❌ User not authorized:', email)
        return false
      } catch (error) {
        console.error('❌ Error checking admin authorization:', error)
        
        // Fallback to hardcoded list if database check fails
        if (FALLBACK_ALLOWED_EMAILS.includes(email)) {
          console.log('✅ User authorized (fallback due to DB error):', email)
          return true
        }
        
        return false
      }
    },
    async jwt({ token, account, profile }) {
      if (account) {
        token.accessToken = account.access_token
      }
      if (profile) {
        token.picture = (profile as any).picture
      }

      // Attach RBAC role (ADMIN | MODERATOR) from DB to the token so APIs/UI can enforce permissions
      // Also check if user is a Property user
      // IMPORTANT: Check property first if callbackUrl contains /property
      try {
        const email = token.email?.toLowerCase()
        if (email) {
          // Check if user is a Property user first (for property portal logins)
          let property = await prisma.property.findUnique({
            where: { email },
          })
          
          // If property doesn't exist but user authenticated, try to create it
          if (!property) {
            try {
              const nameParts = (token.name || 'Property User').toString().split(' ')
              const firstName = nameParts[0] || 'Property'
              const lastName = nameParts.slice(1).join(' ') || 'User'
              
              property = await prisma.property.create({
                data: {
                  email,
                  firstName,
                  lastName,
                  status: 'active',
                },
              })
              console.log('✅ Auto-created property in JWT callback:', email)
            } catch (createError) {
              console.error('⚠️ Could not auto-create property in JWT:', createError)
            }
          }
          
          if (property && property.status === 'active') {
            ;(token as any).userType = 'property'
            ;(token as any).isProperty = true
          }
          
          // Check if user is also an Admin (only ADMIN role, not MODERATOR)
          const admin = (await prisma.admin.findUnique({
            where: { email },
          })) as any
          if (admin?.isActive && (admin.role === 'ADMIN' || admin.role === 'MANAGER' || admin.role === 'MODERATOR')) {
            ;(token as any).role = admin.role
            ;(token as any).isAdmin = admin.role === 'ADMIN'
            // Only set userType to admin if they're NOT a property user
            // This ensures property users go to property dashboard
            if (!(token as any).isProperty) {
              ;(token as any).userType = 'admin'
            }
          }
        }
      } catch (e) {
        // Don't block auth if role lookup fails; default handling happens in API guards
        console.error('Error in JWT callback:', e)
      }

      return token
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.sub
        ;(session.user as any).role = (token as any).role
        ;(session.user as any).userType = (token as any).userType // 'admin' or 'property'
        
        // Always try to fetch Microsoft profile photo if we have an access token
        // This ensures the photo is available on every session refresh
        if (token.accessToken) {
          try {
            const response = await fetch('https://graph.microsoft.com/v1.0/me/photo/$value', {
              headers: {
                Authorization: `Bearer ${token.accessToken}`,
              },
              // Add cache control to ensure fresh photo
              cache: 'no-store',
            })
            if (response.ok) {
              const arrayBuffer = await response.arrayBuffer()
              const base64 = Buffer.from(arrayBuffer).toString('base64')
              session.user.image = `data:image/jpeg;base64,${base64}`
              console.log('✅ Microsoft profile photo fetched successfully')
            } else {
              console.log('⚠️ Could not fetch profile picture:', response.status, response.statusText)
              // Try to use profile picture from token if available
              if ((token as any).picture && !session.user.image) {
                session.user.image = (token as any).picture
              }
            }
          } catch (error) {
            console.log('⚠️ Error fetching profile picture:', error)
            // Fallback to token picture if available
            if ((token as any).picture && !session.user.image) {
              session.user.image = (token as any).picture
            }
          }
        } else if ((token as any).picture) {
          // Fallback: use picture from token if no access token
          session.user.image = (token as any).picture
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
}
