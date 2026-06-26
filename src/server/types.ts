import { NextRequest, NextResponse } from 'next/server'

/**
 * User context injected by auth guard
 */
export interface UserContext {
  id: string
  email: string
  fullName: string
  role: UserRole
  tenantId: string | null
}

export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  OWNER = 'OWNER',
  EMPLOYEE = 'EMPLOYEE',
}

/**
 * Request with user context (after auth guard)
 */
export interface AuthenticatedRequest extends NextRequest {
  user?: UserContext
  tenantId?: string
}

/**
 * Generic API response wrapper
 */
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  message?: string
  pagination?: PaginationMeta
  errors?: any[]
}

/**
 * Pagination metadata
 */
export interface PaginationMeta {
  skip: number
  take: number
  total: number
  page?: number
  totalPages?: number
  hasMore?: boolean
}

/**
 * Handler function type for API routes
 */
export type ApiHandler = (req: AuthenticatedRequest) => Promise<NextResponse | ApiResponse<any>>

/**
 * JWT payload structure
 */
export interface JwtPayload {
  sub: string // user id
  email: string
  role: UserRole
  tenantId: string | null
  iat?: number
  exp?: number
}
