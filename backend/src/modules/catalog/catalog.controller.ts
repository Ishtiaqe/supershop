import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CatalogService } from './catalog.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Catalog')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('catalog')
export class CatalogController {
  constructor(private catalogService: CatalogService) {}

  @Get('search')
  @ApiOperation({ summary: 'Search products/SKUs' })
  async search(@Query('q') query: string, @Query('tenantId') tenantId?: string) {
    return this.catalogService.searchProducts(query, tenantId);
  }

  @Get('products')
  @ApiOperation({ summary: 'Get all products' })
  async getProducts() {
    return this.catalogService.findAllProducts();
  }

  @Get('categories')
  @ApiOperation({ summary: 'Get all categories' })
  async getCategories() {
    return this.catalogService.findAllCategories();
  }

  @Get('brands')
  @ApiOperation({ summary: 'Get all brands' })
  async getBrands() {
    return this.catalogService.findAllBrands();
  }

  @Get('suppliers')
  @ApiOperation({ summary: 'Get all suppliers' })
  async getSuppliers() {
    return this.catalogService.findAllSuppliers();
  }
}
