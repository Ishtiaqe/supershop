interface DashboardSummaryType {
  ordersCount: number;
  totalRevenue: number;
  totalProfit: number;
  totalAssetValue: number;
}

export default async function DashboardSummary() {
  const headers: Record<string, string> = { 
    Accept: 'application/json',
  };

  let summary: DashboardSummaryType | null = null;
  try {
    const res = await fetch(`/api/proxy/analytics/summary`, {
      headers,
      cache: 'no-store',
    });
    if (res.ok) {
      summary = await res.json();
    }
  } catch (err) {
    // fail silently; client will fetch on mount
    console.error('DashboardSummary server fetch failed', err);
  }

  if (!summary) {
    // Render fallback skeleton (server-side)
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="stat-card stat-card-muted h-28">
            <div className="h-full flex items-center justify-center">
              <div className="w-2/3">
                <div className="bg-surface/50 animate-pulse h-4 rounded mb-2" />
                <div className="bg-surface/30 animate-pulse h-8 rounded" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Render summary cards (server-side rendered)
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <div className="stat-card stat-card-primary">
        <div className="text-sm text-primary/90">Total Revenue</div>
        <div className="text-xl font-semibold text-primary">{summary.totalRevenue ?? 0}</div>
      </div>
      <div className="stat-card stat-card-success">
        <div className="text-sm text-success/90">Total Profit</div>
        <div className="text-xl font-semibold text-success">{summary.totalProfit ?? 0}</div>
      </div>
      <div className="stat-card stat-card-info">
        <div className="text-sm text-info/90">Asset Value</div>
        <div className="text-xl font-semibold text-info">{summary.totalAssetValue ?? 0}</div>
      </div>
      <div className="stat-card stat-card-warning">
        <div className="text-sm text-warning/95">Orders</div>
        <div className="text-xl font-semibold text-warning">{summary.ordersCount ?? 0}</div>
      </div>
    </div>
  );
}
