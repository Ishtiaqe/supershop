import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ResponseHelper } from '@/server/response'
import { verifyFirebaseToken, generateAccessToken, generateRefreshToken, createRefreshTokenRecord, hashPassword } from '@/server/auth'
import { withCors } from '@/server/cors'
import type { UserRole } from '@/server/types'

async function handler(req: NextRequest) {
  if (req.method !== 'POST') {
    return ResponseHelper.error('Method not allowed', undefined, 405)
  }

  try {
    const { idToken } = await req.json()

    if (!idToken) {
      return ResponseHelper.error('ID token is required')
    }

    const firebaseUser = await verifyFirebaseToken(idToken)
    if (!firebaseUser) {
      return ResponseHelper.unauthorized('Invalid Firebase token')
    }

    let user = await prisma.user.findUnique({
      where: { email: firebaseUser.email! },
    })

    // Create user if doesn't exist
    if (!user) {
      user = await prisma.user.create({
        data: {
          email: firebaseUser.email!,
          fullName: firebaseUser.email!,
          password: await hashPassword(Math.random().toString(36)),
          role: 'EMPLOYEE' as UserRole,
        },
      })
    }

    const accessToken = generateAccessToken(user.id, user.email, user.role as unknown as UserRole, user.tenantId)
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
      maxAge: 15 * 60,
      path: '/',
    })

    response.cookies.set('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    })

    return response
  } catch (error) {
    console.error('[Auth] Firebase error:', error)
    return ResponseHelper.serverError()
  }
}

export const POST = withCors(handler)
export const OPTIONS = () => new NextResponse(null, { status: 204 })
