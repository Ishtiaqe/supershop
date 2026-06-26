import { NextRequest, NextResponse } from 'next/server'

/**
 * CORS configuration
 * Allows same-origin web requests (no CORS needed)
 * Allows mobile app cross-origin requests via httpOnly cookies + Bearer token
 */

// Allowed origins for mobile and external clients
const ALLOWED_ORIGINS = [
  // Mobile app origins
  'capacitor://localhost',
  'ionic://localhost',

  // Development
  ...(process.env.NODE_ENV === 'development' ? [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:3002',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3001',
    'http://127.0.0.1:3002',
  ] : []),

  // Production
  process.env.FRONTEND_URL || '',
  process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '',
].filter(Boolean)

/**
 * Check if origin is allowed
 */
export function isOriginAllowed(origin: string | null): boolean {
  if (!origin) return false
  return ALLOWED_ORIGINS.includes(origin)
}

/**
 * Apply CORS headers to response
 */
export function applyCorsHeaders(req: NextRequest, res: NextResponse): NextResponse {
  const origin = req.headers.get('origin')

  if (isOriginAllowed(origin)) {
    res.headers.set('Access-Control-Allow-Origin', origin!)
    res.headers.set('Access-Control-Allow-Credentials', 'true')
    res.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS')
    res.headers.set(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization, X-Requested-With'
    )
    res.headers.set('Access-Control-Max-Age', '86400') // 24 hours
  }

  return res
}

/**
 * Handle preflight OPTIONS request
 */
export function handleCorsPreFlight(req: NextRequest): NextResponse | null {
  if (req.method !== 'OPTIONS') {
    return null
  }

  const origin = req.headers.get('origin')
  if (!isOriginAllowed(origin)) {
    return new NextResponse(null, { status: 403 })
  }

  return applyCorsHeaders(req, new NextResponse(null, { status: 204 }))
}

/**
 * Middleware to apply CORS to all API responses
 */
export function withCors(handler: (req: NextRequest) => Promise<NextResponse | any>) {
  return async (req: NextRequest): Promise<NextResponse> => {
    // Handle preflight
    const preFlightResponse = handleCorsPreFlight(req)
    if (preFlightResponse) {
      return preFlightResponse
    }

    // Call handler
    const response = await handler(req)

    // Apply CORS headers to response
    if (response instanceof NextResponse) {
      return applyCorsHeaders(req, response)
    }

    // If handler returns plain object, convert to response and apply CORS
    return applyCorsHeaders(req, NextResponse.json(response))
  }
}
