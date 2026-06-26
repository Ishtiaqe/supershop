import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ResponseHelper } from '@/server/response'
import { withAuth } from '@/server/guard'
import { withCors } from '@/server/cors'
import type { AuthenticatedRequest } from '@/server/types'

async function handler(req: AuthenticatedRequest) {
  if (req.method !== 'GET') {
    return ResponseHelper.error('Method not allowed', undefined, 405)
  }

  try {
    if (!req.user) {
      return ResponseHelper.unauthorized()
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        role: true,
        tenantId: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    if (!user) {
      return ResponseHelper.notFound('User not found')
    }

    return ResponseHelper.ok(user)
  } catch (error) {
    console.error('[Users] Me error:', error)
    return ResponseHelper.serverError()
  }
}

export const GET = withCors(withAuth(handler))
export const OPTIONS = () => new NextResponse(null, { status: 204 })
