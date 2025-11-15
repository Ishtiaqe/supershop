import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateTenantDto, SetupTenantDto, UpdateTenantDto, UpdateTenantStatusDto } from './dto/tenant.dto';

@Injectable()
export class TenantsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.tenant.findMany({
      include: {
        _count: {
          select: {
            users: true,
            inventoryItems: true,
            sales: true,
          },
        },
      },
    });
  }

  async findOne(id: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    return tenant;
  }

  async findByUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { tenant: true },
    });

    if (!user?.tenant) {
      throw new NotFoundException('Tenant not found for this user');
    }

    return user.tenant;
  }

  async create(createTenantDto: CreateTenantDto) {
    const { ownerId, ...tenantData } = createTenantDto;

    // Verify owner exists
    const owner = await this.prisma.user.findUnique({ where: { id: ownerId } });
    if (!owner) {
      throw new BadRequestException('Owner not found');
    }

    if (owner.tenantId) {
      throw new BadRequestException('Owner already has a tenant');
    }

    const tenant = await this.prisma.tenant.create({
      data: tenantData,
    });

    // Link owner to tenant
    await this.prisma.user.update({
      where: { id: ownerId },
      data: { tenantId: tenant.id },
    });

    return tenant;
  }

  async setup(userId: string, setupTenantDto: SetupTenantDto) {
    // Verify user is owner without a tenant
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.role !== 'OWNER') {
      throw new ForbiddenException('Only owners can setup a tenant');
    }

    if (user.tenantId) {
      throw new BadRequestException('User already belongs to a tenant');
    }

    // Create tenant
    const tenant = await this.prisma.tenant.create({
      data: setupTenantDto,
    });

    // Link user to tenant
    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: { tenantId: tenant.id },
    });

    return {
      tenant,
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        role: updatedUser.role,
        tenantId: updatedUser.tenantId,
      },
    };
  }

  async update(id: string, updateTenantDto: UpdateTenantDto, userTenantId: string, userRole: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id } });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    // Only super admin or owner of the tenant can update
    if (userRole !== 'SUPER_ADMIN' && userTenantId !== id) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return this.prisma.tenant.update({
      where: { id },
      data: updateTenantDto,
    });
  }

  async updateStatus(id: string, updateStatusDto: UpdateTenantStatusDto) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id } });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    return this.prisma.tenant.update({
      where: { id },
      data: { status: updateStatusDto.status },
    });
  }

  async getStats(tenantId: string) {
    const [inventoryCount, sales] = await Promise.all([
      this.prisma.inventoryItem.count({ where: { tenantId } }),
      this.prisma.sale.aggregate({
        where: { tenantId },
        _sum: { totalAmount: true },
      }),
    ]);

    const lowStockCount = await this.prisma.inventoryItem.count({
      where: {
        tenantId,
        quantity: { lt: 20 },
      },
    });

    const expiringSoonCount = await this.prisma.inventoryItem.count({
      where: {
        tenantId,
        expiryDate: {
          lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          gte: new Date(),
        },
      },
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todaySales = await this.prisma.sale.aggregate({
      where: {
        tenantId,
        saleTime: { gte: today },
      },
      _sum: { totalAmount: true },
    });

    const thisMonth = new Date();
    thisMonth.setDate(1);
    thisMonth.setHours(0, 0, 0, 0);

    const monthSales = await this.prisma.sale.aggregate({
      where: {
        tenantId,
        saleTime: { gte: thisMonth },
      },
      _sum: { totalAmount: true },
    });

    return {
      totalInventoryItems: inventoryCount,
      lowStockCount,
      expiringSoonCount,
      totalSalesToday: todaySales._sum.totalAmount || 0,
      totalSalesThisMonth: monthSales._sum.totalAmount || 0,
    };
  }

  async getDashboardMetrics(tenantId: string) {
    // This is a simplified version. In production, you'd add more complex calculations
    const stats = await this.getStats(tenantId);
    
    return {
      overview: {
        totalRevenue: stats.totalSalesThisMonth,
        totalSales: await this.prisma.sale.count({ where: { tenantId } }),
      },
      inventory: {
        totalItems: stats.totalInventoryItems,
        lowStockItems: stats.lowStockCount,
        expiringItems: stats.expiringSoonCount,
      },
    };
  }
}
