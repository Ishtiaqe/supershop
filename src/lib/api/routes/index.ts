import { registerUserRoutes } from './users'
import { registerCatalogRoutes } from './catalog'
import { registerInventoryRoutes } from './inventory'
import { registerSalesRoutes } from './sales-history'
import { registerExpensesRoutes } from './expenses'
import { registerCashBoxRoutes } from './cashBox'
import { registerCreditsRoutes } from './credits'
import { registerShortlistRoutes } from './shortlist'
import { registerBackupRoutes } from './backup'
import { RouteHandler } from '../types'

export function registerAllRoutes(router: { register: (method: string, pattern: string, handler: RouteHandler) => void }) {
  registerUserRoutes(router)
  registerCatalogRoutes(router)
  registerInventoryRoutes(router)
  registerSalesRoutes(router)
  registerExpensesRoutes(router)
  registerCashBoxRoutes(router)
  registerCreditsRoutes(router)
  registerShortlistRoutes(router)
  registerBackupRoutes(router)
}
