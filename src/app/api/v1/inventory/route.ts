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

      const [items, total] = await Promise.all([
        prisma.inventoryItem.findMany({
          where: { tenantId } as any,
          skip: skipNum,
          take: takeNum,
          include: { variant: { include: { product: true } } },
          orderBy: { createdAt: 'desc' },
        }),
        prisma.inventoryItem.count({ where: { tenantId } }),
      ])

      return ResponseHelper.okWithPagination(
        items,
        { skip: skipNum, take: takeNum, total },
        'Inventory retrieved'
      )
    }

    if (req.method === 'POST') {
      const { variantId, quantity, purchasePrice, retailPrice, batchNo, expiryDate, notes } = await req.json()

      if (!variantId || quantity === undefined) {
        return ResponseHelper.error('variantId and quantity are required')
      }

      const item = await prisma.inventoryItem.create({
        data: {
          variantId,
          tenantId,
          quantity,
          purchasePrice,
          retailPrice,
          batchNo,
          expiryDate: expiryDate ? new Date(expiryDate) : null,
          notes,
        },
      })

      return ResponseHelper.created(item)
    }

    return ResponseHelper.error('Method not allowed', undefined, 405)
  } catch (error) {
    console.error('[Inventory] Error:', error)
    return ResponseHelper.serverError()
  }
}

export const GET = withCors(withAuth(handler))
export const POST = withCors(withAuth(handler, [UserRole.OWNER, UserRole.EMPLOYEE]))
export const OPTIONS = () => new NextResponse(null, { status: 204 })
