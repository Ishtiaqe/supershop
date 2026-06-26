import { NextRequest, NextResponse } from 'next/server'
import { ResponseHelper } from '@/server/response'
import { invalidateRefreshToken } from '@/server/auth'
import { withCors } from '@/server/cors'

async function handler(req: NextRequest) {
  if (req.method !== 'POST') {
    return ResponseHelper.error('Method not allowed', undefined, 405)
  }

  try {
    const refreshToken = req.cookies.get('refreshToken')?.value

    if (refreshToken) {
      try {
        await invalidateRefreshToken(refreshToken)
      } catch (e) {
        // Ignore errors if token is already invalid
      }
    }

    const response = ResponseHelper.ok({ success: true })

    // Clear cookies
    response.cookies.set('refreshToken', '', {
      httpOnly: true,
      maxAge: 0,
      path: '/',
    })

    response.cookies.set('accessToken', '', {
      httpOnly: true,
      maxAge: 0,
      path: '/',
    })

    return response
  } catch (error) {
    console.error('[Auth] Logout error:', error)
    return ResponseHelper.serverError()
  }
}

export const POST = withCors(handler)
export const OPTIONS = () => new NextResponse(null, { status: 204 })
