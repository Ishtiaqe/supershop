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

      const [sales, total] = await Promise.all([
        prisma.sale.findMany({
          where: { tenantId } as any,
          skip: skipNum,
          take: takeNum,
          include: { items: true },
          orderBy: { saleTime: 'desc' },
        }),
        prisma.sale.count({ where: { tenantId } }),
      ])

      return ResponseHelper.okWithPagination(
        sales,
        { skip: skipNum, take: takeNum, total },
        'Sales retrieved'
      )
    }

    if (req.method === 'POST') {
      const { receiptNumber, customerName, customerPhone, items, totalAmount, totalProfit, paymentMethod, status } =
        await req.json()

      if (!receiptNumber || !items || !items.length) {
        return ResponseHelper.error('receiptNumber and items are required')
      }

      // Create sale (transaction-like with side effects)
      const sale = await prisma.sale.create({
        data: {
          tenantId,
          receiptNumber,
          customerName,
          customerPhone,
          totalAmount,
          totalProfit,
          paymentMethod,
          status: status || 'COMPLETED',
          saleTime: new Date(),
          items: {
            create: items.map((item: any) => ({
              inventoryId: item.inventoryId,
              itemName: item.itemName,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              discount: item.discount || 0,
              lineTotal: item.lineTotal,
              profit: item.profit || 0,
            })),
          },
        },
        include: { items: true },
      })

      // Side effect 1: Check shortList for low stock
      for (const item of items) {
        const inventory = await prisma.inventoryItem.findUnique({
          where: { id: item.inventoryId },
        })
        if (inventory && inventory.quantity < 10) {
          await prisma.shortList.upsert({
            where: {
              tenantId_inventoryId: { tenantId, inventoryId: item.inventoryId },
            },
            update: { updatedAt: new Date() },
            create: {
              tenantId,
              inventoryId: item.inventoryId,
              reason: 'Low stock after sale',
            },
          })
        }
      }

      // Side effect 2: Record cash box entry if payment method is cash
      if (paymentMethod === 'CASH' || paymentMethod === 'cash') {
        await prisma.cashBoxEntry.create({
          data: {
            tenantId,
            entryType: 'SALES',
            amount: totalAmount,
            balance: 0, // Would calculate based on previous entries
            referenceId: sale.id,
            note: `Sale ${receiptNumber}`,
          },
        })
      }

      return ResponseHelper.created(sale)
    }

    return ResponseHelper.error('Method not allowed', undefined, 405)
  } catch (error) {
    console.error('[Sales] Error:', error)
    return ResponseHelper.serverError()
  }
}

export const GET = withCors(withAuth(handler))
export const POST = withCors(withAuth(handler, [UserRole.OWNER, UserRole.EMPLOYEE]))
export const OPTIONS = () => new NextResponse(null, { status: 204 })
