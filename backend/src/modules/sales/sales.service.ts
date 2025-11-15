import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class SalesService {
  constructor(private prisma: PrismaService) {}

  async create(tenantId: string, employeeId: string, data: any) {
    const { items, ...saleData } = data;

    // Calculate total
    let totalAmount = 0;
    let totalProfit = 0;

    for (const item of items) {
      const inventory = await this.prisma.inventoryItem.findUnique({
        where: { id: item.inventoryId },
      });

      if (!inventory || inventory.tenantId !== tenantId) {
        throw new BadRequestException('Invalid inventory item');
      }

      if (inventory.quantity < item.quantity) {
        throw new BadRequestException('Insufficient stock');
      }

      totalAmount += item.unitPrice * item.quantity;
      totalProfit += (item.unitPrice - inventory.purchasePrice) * item.quantity;
    }

    // Apply discount
    if (saleData.discountType === 'percentage') {
      totalAmount -= (totalAmount * saleData.discountValue) / 100;
    } else if (saleData.discountType === 'fixed') {
      totalAmount -= saleData.discountValue;
    }

    // Create sale with items
    const sale = await this.prisma.sale.create({
      data: {
        ...saleData,
        tenantId,
        employeeId,
        totalAmount,
        totalProfit,
        receiptNumber: `RCP-${Date.now()}`,
        items: {
          create: items.map((item: any) => ({
            inventoryId: item.inventoryId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            subtotal: item.unitPrice * item.quantity,
          })),
        },
      },
      include: {
        items: {
          include: {
            inventory: true,
          },
        },
      },
    });

    // Update inventory quantities
    for (const item of items) {
      await this.prisma.inventoryItem.update({
        where: { id: item.inventoryId },
        data: {
          quantity: {
            decrement: item.quantity,
          },
        },
      });
    }

    return sale;
  }

  async findAll(tenantId: string) {
    return this.prisma.sale.findMany({
      where: { tenantId },
      include: {
        employee: {
          select: { id: true, fullName: true },
        },
      },
      orderBy: { saleTime: 'desc' },
    });
  }

  async findOne(id: string, tenantId: string) {
    return this.prisma.sale.findFirst({
      where: { id, tenantId },
      include: {
        items: {
          include: {
            inventory: {
              include: {
                variant: {
                  include: {
                    product: true,
                  },
                },
              },
            },
          },
        },
        employee: {
          select: { id: true, fullName: true },
        },
      },
    });
  }

  async getTodaySummary(tenantId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const sales = await this.prisma.sale.findMany({
      where: {
        tenantId,
        saleTime: { gte: today },
      },
    });

    const totalSales = sales.length;
    const totalRevenue = sales.reduce((sum, sale) => sum + sale.totalAmount, 0);
    const totalProfit = sales.reduce((sum, sale) => sum + sale.totalProfit, 0);

    return {
      totalSales,
      totalRevenue,
      totalProfit,
      averageOrderValue: totalSales > 0 ? totalRevenue / totalSales : 0,
    };
  }
}
