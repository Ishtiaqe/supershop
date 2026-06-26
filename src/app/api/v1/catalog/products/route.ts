import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ResponseHelper } from '@/server/response'
import { withAuth, requireTenantId } from '@/server/guard'
import { withCors } from '@/server/cors'
import type { AuthenticatedRequest } from '@/server/types'
import { UserRole } from '@/server/types'

async function handler(req: AuthenticatedRequest) {
  const tenantId = requireTenantId(req)

  try {
    if (req.method === 'GET') {
      const { skip = '0', take = '50' } = Object.fromEntries(new URL(req.url).searchParams)
      const skipNum = Math.max(0, parseInt(skip) || 0)
      const takeNum = Math.min(100, Math.max(1, parseInt(take) || 50))

      const [products, total] = await Promise.all([
        prisma.product.findMany({
          where: { tenantId } as any,
          skip: skipNum,
          take: takeNum,
          orderBy: { createdAt: 'desc' },
        }),
        prisma.product.count({ where: { tenantId } }),
      ])

      return ResponseHelper.okWithPagination(
        products,
        { skip: skipNum, take: takeNum, total },
        'Products retrieved'
      )
    }

    if (req.method === 'POST') {
      if (!req.user || !['OWNER', 'EMPLOYEE'].includes(req.user.role)) {
        return ResponseHelper.forbidden('Only owner/employee can create products')
      }

      const { name, description, categoryId, brandId, productType } = await req.json()

      if (!name || !categoryId) {
        return ResponseHelper.error('Name and categoryId are required')
      }

      const product = await prisma.product.create({
        data: {
          name,
          description,
          categoryId,
          brandId,
          productType,
          tenantId,
        },
      })

      return ResponseHelper.created(product)
    }

    return ResponseHelper.error('Method not allowed', undefined, 405)
  } catch (error) {
    console.error('[Catalog] Products error:', error)
    return ResponseHelper.serverError()
  }
}

export const GET = withCors(withAuth(handler))
export const POST = withCors(withAuth(handler, [UserRole.OWNER, UserRole.EMPLOYEE]))
export const OPTIONS = () => new NextResponse(null, { status: 204 })
