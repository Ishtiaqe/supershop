import { NextResponse } from 'next/server'
import type { ApiResponse, PaginationMeta } from './types'

/**
 * Response helper for consistent API response format
 * Matches NestJS ApiResponse contract exactly
 */
export class ResponseHelper {
  /**
   * Successful response with data
   */
  static ok<T>(data: T, message?: string, status = 200): NextResponse<ApiResponse<T>> {
    return NextResponse.json(
      {
        success: true,
        data,
        message,
      },
      { status }
    )
  }

  /**
   * Successful response with pagination
   */
  static okWithPagination<T>(
    data: T[],
    pagination: PaginationMeta,
    message?: string,
    status = 200
  ): NextResponse<ApiResponse<T[]>> {
    return NextResponse.json(
      {
        success: true,
        data,
        message,
        pagination: {
          ...pagination,
          page: Math.floor(pagination.skip / pagination.take) + 1,
          totalPages: Math.ceil(pagination.total / pagination.take),
          hasMore: pagination.skip + pagination.take < pagination.total,
        },
      },
      { status }
    )
  }

  /**
   * Created response (201)
   */
  static created<T>(data: T, message?: string): NextResponse<ApiResponse<T>> {
    return this.ok(data, message, 201)
  }

  /**
   * No content response (204)
   */
  static noContent(): NextResponse {
    return new NextResponse(null, { status: 204 })
  }

  /**
   * Error response
   */
  static error(message: string, errors?: any[], status = 400): NextResponse<ApiResponse<null>> {
    return NextResponse.json(
      {
        success: false,
        data: null,
        message,
        errors,
      },
      { status }
    )
  }

  /**
   * Unauthorized error (401)
   */
  static unauthorized(message = 'Unauthorized'): NextResponse<ApiResponse<null>> {
    return this.error(message, undefined, 401)
  }

  /**
   * Forbidden error (403)
   */
  static forbidden(message = 'Forbidden'): NextResponse<ApiResponse<null>> {
    return this.error(message, undefined, 403)
  }

  /**
   * Not found error (404)
   */
  static notFound(message = 'Not found'): NextResponse<ApiResponse<null>> {
    return this.error(message, undefined, 404)
  }

  /**
   * Conflict error (409)
   */
  static conflict(message = 'Conflict'): NextResponse<ApiResponse<null>> {
    return this.error(message, undefined, 409)
  }

  /**
   * Server error (500)
   */
  static serverError(message = 'Internal server error'): NextResponse<ApiResponse<null>> {
    return this.error(message, undefined, 500)
  }
}
