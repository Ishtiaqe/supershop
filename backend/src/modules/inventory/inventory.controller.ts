import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { InventoryService } from './inventory.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '../auth/dto/auth.dto';

@ApiTags('Inventory')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('inventory')
export class InventoryController {
  constructor(private inventoryService: InventoryService) {}

  @Get()
  @Roles(UserRole.OWNER, UserRole.EMPLOYEE)
  @ApiOperation({ summary: 'Get all inventory items' })
  async findAll(@CurrentUser() user: any, @Query('q') q?: string) {
    // if a query string is provided, the service will filter by itemName/product/variant
    return this.inventoryService.findAll(user.tenantId, q);
  }

  @Post()
  @Roles(UserRole.OWNER, UserRole.EMPLOYEE)
  @ApiOperation({ summary: 'Add inventory item' })
  async create(@CurrentUser() user: any, @Body() data: any) {
    return this.inventoryService.create(user.tenantId, data);
  }

  @Put(':id')
  @Roles(UserRole.OWNER, UserRole.EMPLOYEE)
  @ApiOperation({ summary: 'Update inventory item' })
  async update(@Param('id') id: string, @CurrentUser() user: any, @Body() data: any) {
    return this.inventoryService.update(id, user.tenantId, data);
  }

  @Delete(':id')
  @Roles(UserRole.OWNER, UserRole.EMPLOYEE)
  @ApiOperation({ summary: 'Delete inventory item' })
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.inventoryService.delete(id, user.tenantId);
  }

  @Get('alerts/low-stock')
  @Roles(UserRole.OWNER, UserRole.EMPLOYEE)
  @ApiOperation({ summary: 'Get low stock items' })
  async getLowStock(@CurrentUser() user: any, @Query('threshold') threshold?: number) {
    return this.inventoryService.getLowStock(user.tenantId, threshold);
  }

  @Get('alerts/expiring')
  @Roles(UserRole.OWNER, UserRole.EMPLOYEE)
  @ApiOperation({ summary: 'Get expiring items' })
  async getExpiring(@CurrentUser() user: any, @Query('days') days?: number) {
    return this.inventoryService.getExpiring(user.tenantId, days);
  }

  @Get('alerts/expired')
  @Roles(UserRole.OWNER, UserRole.EMPLOYEE)
  @ApiOperation({ summary: 'Get expired items' })
  async getExpired(@CurrentUser() user: any) {
    return this.inventoryService.getExpired(user.tenantId);
  }
}
