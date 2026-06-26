import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ResponseHelper } from '@/server/response'
import {
  comparePassword,
  generateAccessToken,
  generateRefreshToken,
  createRefreshTokenRecord,
} from '@/server/auth'
import { withCors } from '@/server/cors'
import type { UserRole } from '@/server/types'

async function handler(req: NextRequest) {
  if (req.method !== 'POST') {
    return ResponseHelper.error('Method not allowed', undefined, 405)
  }

  try {
    const { email, password } = await req.json()

    if (!email || !password) {
      return ResponseHelper.error('Email and password are required')
    }

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
      return ResponseHelper.unauthorized('Invalid credentials')
    }

    const isPasswordValid = await comparePassword(password, user.password)
    if (!isPasswordValid) {
      return ResponseHelper.unauthorized('Invalid credentials')
    }

    const accessToken = generateAccessToken(
      user.id,
      user.email,
      user.role as unknown as UserRole,
      user.tenantId
    )
    const refreshToken = generateRefreshToken(user.id)

    await createRefreshTokenRecord(user.id, refreshToken)

    const response = ResponseHelper.ok({
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        tenantId: user.tenantId,
      },
      accessToken,
      refreshToken,
    })

    // Set httpOnly cookies
    response.cookies.set('accessToken', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60, // 15 minutes
      path: '/',
    })

    response.cookies.set('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/',
    })

    return response
  } catch (error) {
    console.error('[Auth] Login error:', error)
    return ResponseHelper.serverError()
  }
}

export const POST = withCors(handler)
export const OPTIONS = () => new NextResponse(null, { status: 204 })
