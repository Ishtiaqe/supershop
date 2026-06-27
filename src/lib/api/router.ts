import { Route, RouteContext, RouteHandler } from './types'
import { matchPath } from './utils'

export class ApiRouter {
  private routes: Route[] = []

  register(method: string, pattern: string, handler: RouteHandler) {
    this.routes.push({ method, pattern, handler })
  }

  async dispatch(
    method: string,
    cleanUrl: string,
    url: string,
    query: URLSearchParams,
    requestData: any,
    baseContext: { tenantId: string; userId: string }
  ): Promise<any> {
    for (const route of this.routes) {
      if (route.method !== method) continue
      const { matched, params } = matchPath(cleanUrl, route.pattern)
      if (matched) {
        const ctx: RouteContext = { ...baseContext, params, query, requestData, url, method }
        return route.handler(ctx)
      }
    }
    throw new Error(`Unsupported API route: ${method} ${cleanUrl}`)
  }
}

export const router = new ApiRouter()
