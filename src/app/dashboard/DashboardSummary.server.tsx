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
          <div key={i} className="glass-card p-4 h-28">
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
      <div className="glass-card p-4">
        <div className="text-sm text-muted-foreground">Total Revenue2</div>
        <div className="text-xl font-semibold">{summary.totalRevenue ?? 0}</div>
      </div>
      <div className="glass-card p-4">
        <div className="text-sm text-muted-foreground">Total Profit</div>
        <div className="text-xl font-semibold">{summary.totalProfit ?? 0}</div>
      </div>
      <div className="glass-card p-4">
        <div className="text-sm text-muted-foreground">Asset Value</div>
        <div className="text-xl font-semibold">{summary.totalAssetValue ?? 0}</div>
      </div>
      <div className="glass-card p-4">
        <div className="text-sm text-muted-foreground">Orders</div>
        <div className="text-xl font-semibold">{summary.ordersCount ?? 0}</div>
      </div>
    </div>
  );
}
