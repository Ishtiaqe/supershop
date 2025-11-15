import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SalesService } from './sales.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '../auth/dto/auth.dto';

@ApiTags('Sales')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('sales')
export class SalesController {
  constructor(private salesService: SalesService) {}

  @Post()
  @Roles(UserRole.OWNER, UserRole.EMPLOYEE)
  @ApiOperation({ summary: 'Create new sale' })
  async create(@CurrentUser() user: any, @Body() data: any) {
    return this.salesService.create(user.tenantId, user.id, data);
  }

  @Get()
  @Roles(UserRole.OWNER, UserRole.EMPLOYEE)
  @ApiOperation({ summary: 'Get all sales' })
  async findAll(@CurrentUser() user: any) {
    return this.salesService.findAll(user.tenantId);
  }

  @Get('summary/today')
  @Roles(UserRole.OWNER, UserRole.EMPLOYEE)
  @ApiOperation({ summary: 'Get today\'s sales summary' })
  async getTodaySummary(@CurrentUser() user: any) {
    return this.salesService.getTodaySummary(user.tenantId);
  }

  @Get(':id')
  @Roles(UserRole.OWNER, UserRole.EMPLOYEE)
  @ApiOperation({ summary: 'Get sale by ID' })
  async findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.salesService.findOne(id, user.tenantId);
  }
}
