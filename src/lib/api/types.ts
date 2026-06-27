export interface RouteContext {
  tenantId: string
  userId: string
  params: Record<string, string>
  query: URLSearchParams
  requestData?: any
  url: string
  method: string
}

export type RouteHandler = (ctx: RouteContext) => Promise<any>

export interface Route {
  method: string
  pattern: string
  handler: RouteHandler
}
