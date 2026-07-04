import { registerUserRoutes } from './users'
import { registerCatalogRoutes } from './catalog'
import { registerInventoryRoutes } from './inventory'
import { registerSalesRoutes } from './sales-history'
import { registerExpensesRoutes } from './expenses'
import { registerCashRegisterRoutes } from './cashRegister'
import { registerCreditsRoutes } from './credits'
import { registerShortlistRoutes } from './shortlist'
import { registerBackupRoutes } from './backup'
import { registerAuthRoutes } from './auth'
import { registerTenantRoutes } from './tenants'
import { registerExportRoutes } from './export'
import { registerCustomersRoutes } from './customers'
import { registerSaleReturnsRoutes } from './saleReturns'
import { registerStockMovementsRoutes } from './stockMovements'
import { registerShiftRoutes } from './shifts'
import { RouteHandler } from '../types'

export function registerAllRoutes(router: { register: (method: string, pattern: string, handler: RouteHandler) => void }) {
  registerAuthRoutes(router)
  registerUserRoutes(router)
  registerTenantRoutes(router)
  registerCatalogRoutes(router)
  registerInventoryRoutes(router)
  registerSalesRoutes(router)
  registerExpensesRoutes(router)
  registerCashRegisterRoutes(router)
  registerCreditsRoutes(router)
  registerShortlistRoutes(router)
  registerBackupRoutes(router)
  registerExportRoutes(router)
  registerCustomersRoutes(router)
  registerSaleReturnsRoutes(router)
  registerStockMovementsRoutes(router)
  registerShiftRoutes(router)
}
