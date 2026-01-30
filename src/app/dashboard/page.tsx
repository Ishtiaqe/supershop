import DashboardSummary from './DashboardSummary.server'
import DashboardClientLoader from '@/components/lazy/DashboardClientLoader'
// Client part will be dynamically (intersection) loaded via `DashboardClientLoader`


interface DashboardSummary {
  ordersCount: number;
  totalRevenue: number;
  totalProfit: number;
  totalAssetValue: number;
}

export default function DashboardPage() {
  const enableSSR = process.env.NEXT_PUBLIC_DASHBOARD_SSR_ENABLED === 'true'
  return (
    <div className="space-y-6">
      {/* Server-rendered summary (only if enabled via feature flag) */}
      {enableSSR ? <DashboardSummary /> : null}

      {/* Client dashboard for charts + interactivity (lazy loaded on intersection) */}
      <div className="pt-6">
        <div className="w-full">
          <div id="dashboard-client-loader">
            <DashboardClientLoader />
          </div>
        </div>
      </div>
    </div>
  );
}
