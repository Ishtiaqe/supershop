import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TenantsService } from './tenants.service';
import {
  CreateTenantDto,
  SetupTenantDto,
  UpdateTenantDto,
  UpdateTenantStatusDto,
} from './dto/tenant.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '../auth/dto/auth.dto';

@ApiTags('Tenants')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('tenants')
export class TenantsController {
  constructor(private tenantsService: TenantsService) {}

  @Get()
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get all tenants (SUPER_ADMIN only)' })
  async findAll() {
    return this.tenantsService.findAll();
  }

  @Get('me')
  @Roles(UserRole.OWNER, UserRole.EMPLOYEE)
  @ApiOperation({ summary: 'Get current user tenant' })
  async getMyTenant(@CurrentUser() user: any) {
    return this.tenantsService.findByUser(user.id);
  }

  @Get('stats')
  @Roles(UserRole.OWNER, UserRole.EMPLOYEE)
  @ApiOperation({ summary: 'Get tenant statistics' })
  async getStats(@CurrentUser() user: any) {
    return this.tenantsService.getStats(user.tenantId);
  }

  @Get('metrics/dashboard')
  @Roles(UserRole.OWNER)
  @ApiOperation({ summary: 'Get dashboard metrics' })
  async getDashboardMetrics(@CurrentUser() user: any) {
    return this.tenantsService.getDashboardMetrics(user.tenantId);
  }

  @Post()
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Create new tenant (SUPER_ADMIN only)' })
  async create(@Body() createTenantDto: CreateTenantDto) {
    return this.tenantsService.create(createTenantDto);
  }

  @Post('setup')
  @Roles(UserRole.OWNER)
  @ApiOperation({ summary: 'Setup first tenant for owner' })
  async setup(@CurrentUser() user: any, @Body() setupTenantDto: SetupTenantDto) {
    return this.tenantsService.setup(user.id, setupTenantDto);
  }

  @Patch(':id')
  @Roles(UserRole.OWNER, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update tenant' })
  async update(
    @Param('id') id: string,
    @Body() updateTenantDto: UpdateTenantDto,
    @CurrentUser() user: any,
  ) {
    return this.tenantsService.update(id, updateTenantDto, user.tenantId, user.role);
  }

  @Patch(':id/status')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update tenant status (SUPER_ADMIN only)' })
  async updateStatus(@Param('id') id: string, @Body() updateStatusDto: UpdateTenantStatusDto) {
    return this.tenantsService.updateStatus(id, updateStatusDto);
  }
}
