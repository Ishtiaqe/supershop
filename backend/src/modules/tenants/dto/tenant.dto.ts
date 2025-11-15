import {
  IsString,
  IsOptional,
  IsNumber,
  IsEnum,
  IsObject,
  IsUUID,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum TenantStatus {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  INACTIVE = 'INACTIVE',
}

export class CreateTenantDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  registrationNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  addressStreet?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  addressCity?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  addressZone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  latitude?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  longitude?: number;

  @ApiProperty()
  @IsUUID()
  ownerId: string;
}

export class SetupTenantDto {
  @ApiProperty({ example: 'My Super Shop' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 'REG-2025-0001' })
  @IsOptional()
  @IsString()
  registrationNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  addressStreet?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  addressCity?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  addressZone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  latitude?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  longitude?: number;
}

export class UpdateTenantDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  addressStreet?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  addressCity?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  addressZone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  preferences?: any;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  theme?: any;
}

export class UpdateTenantStatusDto {
  @ApiProperty({ enum: TenantStatus })
  @IsEnum(TenantStatus)
  status: TenantStatus;
}
