import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ResponseHelper } from '@/server/response'
import { hashPassword, generateAccessToken, generateRefreshToken, createRefreshTokenRecord } from '@/server/auth'
import { withCors } from '@/server/cors'
import type { UserRole } from '@/server/types'

async function handler(req: NextRequest) {
  if (req.method !== 'POST') {
    return ResponseHelper.error('Method not allowed', undefined, 405)
  }

  try {
    const { email, password, fullName, phone, role, tenantId } = await req.json()

    if (!email || !password || !fullName || !role) {
      return ResponseHelper.error('Email, password, fullName, and role are required')
    }

    if (password.length < 8) {
      return ResponseHelper.error('Password must be at least 8 characters')
    }

    const existingUser = await prisma.user.findUnique({ where: { email } })
    if (existingUser) {
      return ResponseHelper.conflict('User already exists')
    }

    if (tenantId) {
      const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } })
      if (!tenant) {
        return ResponseHelper.error('Invalid tenant ID', undefined, 400)
      }
    }

    const hashedPassword = await hashPassword(password)
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        fullName,
        phone,
        role: role as unknown as UserRole,
        tenantId,
      },
    })

    const accessToken = generateAccessToken(user.id, user.email, user.role as unknown as UserRole, user.tenantId)
    const refreshToken = generateRefreshToken(user.id)

    await createRefreshTokenRecord(user.id, refreshToken)

    const response = ResponseHelper.created({
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
    console.error('[Auth] Register error:', error)
    return ResponseHelper.serverError()
  }
}

export const POST = withCors(handler)
export const OPTIONS = () => new NextResponse(null, { status: 204 })
