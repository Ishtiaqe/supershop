import { NextRequest, NextResponse } from 'next/server'
import { ResponseHelper } from '@/server/response'
import { rotateRefreshToken } from '@/server/auth'
import { withCors } from '@/server/cors'

async function handler(req: NextRequest) {
  if (req.method !== 'POST') {
    return ResponseHelper.error('Method not allowed', undefined, 405)
  }

  try {
    // Get refresh token from cookie or body
    let refreshToken = req.cookies.get('refreshToken')?.value
    if (!refreshToken) {
      const body = await req.json().catch(() => ({}))
      refreshToken = body.refreshToken
    }

    if (!refreshToken) {
      return ResponseHelper.unauthorized('Refresh token is required')
    }

    const tokens = await rotateRefreshToken(refreshToken)
    if (!tokens) {
      return ResponseHelper.unauthorized('Invalid or expired refresh token')
    }

    const response = ResponseHelper.ok({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    })

    // Set new httpOnly cookies
    response.cookies.set('accessToken', tokens.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60,
      path: '/',
    })

    response.cookies.set('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    })

    return response
  } catch (error) {
    console.error('[Auth] Refresh error:', error)
    return ResponseHelper.serverError()
  }
}

export const POST = withCors(handler)
export const OPTIONS = () => new NextResponse(null, { status: 204 })
