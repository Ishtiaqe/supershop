import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class CatalogService {
  constructor(private prisma: PrismaService) {}

  async searchProducts(query: string, tenantId?: string) {
    const variants = await this.prisma.productVariant.findMany({
      where: {
        OR: [
          { sku: { contains: query, mode: 'insensitive' } },
          { variantName: { contains: query, mode: 'insensitive' } },
          { product: { name: { contains: query, mode: 'insensitive' } } },
        ],
      },
      include: {
        product: {
          include: {
            brand: true,
            category: true,
          },
        },
      },
      take: 20,
    });

    return variants.map((variant) => ({
      id: variant.id,
      productName: variant.product.name,
      variantName: variant.variantName,
      sku: variant.sku,
      category: variant.product.category?.name,
      brand: variant.product.brand?.name,
      retailPrice: variant.retailPrice,
    }));
  }

  async findAllProducts() {
    return this.prisma.product.findMany({
      include: {
        brand: true,
        category: true,
      },
    });
  }

  async findAllCategories() {
    return this.prisma.category.findMany();
  }

  async findAllBrands() {
    return this.prisma.brand.findMany();
  }

  async findAllSuppliers() {
    return this.prisma.supplier.findMany();
  }
}
