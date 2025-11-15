import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class InventoryService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string, q?: string) {
    // Allow filtering by query string for POS search/typeahead. We match itemName, variant SKU, variant name, and product name.
    const where: any = { tenantId }
    if (q && q.length > 0) {
      where.AND = [
        {
          OR: [
            { itemName: { contains: q, mode: 'insensitive' } },
            { variant: { sku: { contains: q, mode: 'insensitive' } } },
            { variant: { variantName: { contains: q, mode: 'insensitive' } } },
            { variant: { product: { name: { contains: q, mode: 'insensitive' } } } },
          ],
        },
      ];
    }

  // Limit results for typeahead performance
    if (q && q.length > 0) {
      return this.prisma.inventoryItem.findMany({
        where,
        include: {
          variant: {
            include: { product: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
      })
  }

    return this.prisma.inventoryItem.findMany({
      where,
      include: {
        variant: {
          include: {
            product: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(tenantId: string, data: any) {
    return this.prisma.inventoryItem.create({
      data: {
        ...data,
        tenantId,
      },
    });
  }

  async update(id: string, tenantId: string, data: any) {
    const item = await this.prisma.inventoryItem.findFirst({
      where: { id, tenantId },
    });

    if (!item) {
      throw new NotFoundException('Inventory item not found');
    }

    return this.prisma.inventoryItem.update({
      where: { id },
      data,
    });
  }

  async delete(id: string, tenantId: string) {
    const item = await this.prisma.inventoryItem.findFirst({
      where: { id, tenantId },
    });

    if (!item) {
      throw new NotFoundException('Inventory item not found');
    }

    await this.prisma.inventoryItem.delete({ where: { id } });
    return { message: 'Inventory item deleted successfully' };
  }

  async getLowStock(tenantId: string, threshold: number = 20) {
    return this.prisma.inventoryItem.findMany({
      where: {
        tenantId,
        quantity: { lte: threshold },
      },
    });
  }

  async getExpiring(tenantId: string, days: number = 30) {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);

    return this.prisma.inventoryItem.findMany({
      where: {
        tenantId,
        expiryDate: {
          lte: futureDate,
          gte: new Date(),
        },
      },
    });
  }

  async getExpired(tenantId: string) {
    return this.prisma.inventoryItem.findMany({
      where: {
        tenantId,
        expiryDate: {
          lt: new Date(),
        },
      },
    });
  }
}
