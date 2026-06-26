import { NextRequest, NextResponse } from 'next/server'
import { verifyAccessToken } from './auth'
import { ResponseHelper } from './response'
import type { AuthenticatedRequest, ApiHandler, UserRole, UserContext } from './types'

/**
 * Extract JWT from Bearer token or cookies
 */
function extractToken(req: NextRequest): string | null {
  // Try Bearer token first
  const authHeader = req.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7)
  }

  // Try accessToken cookie (for same-origin web requests)
  const cookieToken = req.cookies.get('accessToken')?.value
  if (cookieToken) {
    return cookieToken
  }

  return null
}

/**
 * Higher-order function: wraps a handler with auth guard
 * Extracts user from Bearer token or cookie, verifies JWT, injects user context
 * Returns 401 if unauthorized, 403 if role check fails
 */
export function withAuth(handler: ApiHandler, allowedRoles?: UserRole[]) {
  return async (req: NextRequest): Promise<NextResponse | any> => {
    const token = extractToken(req)

    if (!token) {
      return ResponseHelper.unauthorized('Missing authentication token')
    }

    const payload = verifyAccessToken(token)
    if (!payload) {
      return ResponseHelper.unauthorized('Invalid or expired token')
    }

    // Role-based access control
    if (allowedRoles && !allowedRoles.includes(payload.role)) {
      return ResponseHelper.forbidden('Insufficient permissions')
    }

    // Inject user context into request
    const authReq = req as AuthenticatedRequest
    authReq.user = {
      id: payload.sub,
      email: payload.email,
      fullName: '', // Will be populated by looking up in DB if needed
      role: payload.role,
      tenantId: payload.tenantId,
    }
    authReq.tenantId = payload.tenantId || undefined

    return handler(authReq)
  }
}

/**
 * Guard for unauthenticated routes (no auth required)
 * Useful for consistency and explicit route types
 */
export function withoutAuth(handler: ApiHandler) {
  return async (req: NextRequest): Promise<NextResponse | any> => {
    return handler(req as AuthenticatedRequest)
  }
}

/**
 * Ensure tenantId is set (multi-tenant safety)
 * Used in data mutation handlers
 */
export function requireTenantId(req: AuthenticatedRequest): string | null {
  const tenantId = req.tenantId || req.user?.tenantId

  if (!tenantId) {
    throw new Error('User must have a tenantId for data operations')
  }

  return tenantId
}
