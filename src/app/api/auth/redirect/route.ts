import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.redirect(new URL('/property/login', request.url))
    }

    const userType = (session.user as any)?.userType

    // Redirect based on user type
    if (userType === 'property') {
      return NextResponse.redirect(new URL('/property/dashboard', request.url))
    } else if (userType === 'admin') {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    // Default fallback - try to determine from URL or redirect to login
    const referer = request.headers.get('referer') || ''
    if (referer.includes('/property')) {
      return NextResponse.redirect(new URL('/property/login', request.url))
    }
    
    return NextResponse.redirect(new URL('/login', request.url))
  } catch (error) {
    console.error('Error in redirect handler:', error)
    return NextResponse.redirect(new URL('/property/login', request.url))
  }
}
