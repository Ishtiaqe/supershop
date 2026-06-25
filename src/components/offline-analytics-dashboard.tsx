'use client';

import React, { useState } from 'react';
import { Clock, RefreshCw, AlertTriangle } from 'lucide-react';
import { useOfflineAnalytics } from '../lib/offline-analytics';

// Import shadcn UI components
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function OfflineAnalyticsDashboard() {
  const analytics = useOfflineAnalytics();
  const [stats, setStats] = useState(analytics.getStats());
  const [events, setEvents] = useState(analytics.getEvents(20));

  const refreshData = () => {
    setStats(analytics.getStats());
    setEvents(analytics.getEvents(20));
  };

  const handleClear = () => {
    analytics.clearData();
    refreshData();
  };

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  const successRate = analytics.getSyncSuccessRate();

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold tracking-tight text-foreground">Offline Analytics</h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={refreshData}>
            Refresh
          </Button>
          <Button variant="destructive" onClick={handleClear}>
            Clear Data
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Total Offline Time
            </CardTitle>
            <Clock className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold text-foreground">{formatTime(stats.totalOfflineTime)}</div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Sync Success Rate
            </CardTitle>
            <RefreshCw className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-lg font-bold ${successRate > 80 ? 'text-emerald-600' : 'text-destructive'}`}>
              {successRate}%
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Total Syncs
            </CardTitle>
            <RefreshCw className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold text-foreground">{stats.syncAttempts}</div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Storage Issues
            </CardTitle>
            <AlertTriangle className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-lg font-bold ${stats.storageErrors > 0 ? 'text-destructive' : 'text-amber-500'}`}>
              {stats.storageWarnings + stats.storageErrors}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Sync Performance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between items-center border-b pb-1.5">
                <span className="text-muted-foreground font-medium">Successful Syncs:</span>
                <span className="text-foreground font-semibold">{stats.syncSuccesses}</span>
              </div>
              <div className="flex justify-between items-center border-b pb-1.5">
                <span className="text-muted-foreground font-medium">Failed Syncs:</span>
                <span className="text-foreground font-semibold">{stats.syncFailures}</span>
              </div>
              <div className="flex justify-between items-center pb-1.5">
                <span className="text-muted-foreground font-medium">Average Sync Time:</span>
                <span className="text-foreground font-semibold">{formatTime(stats.totalSyncTime / Math.max(1, stats.syncAttempts))}</span>
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs font-semibold text-muted-foreground uppercase">
                <span>Sync Health</span>
                <span>{successRate}%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${successRate > 80 ? 'bg-emerald-600' : 'bg-destructive'}`}
                  style={{ width: `${successRate}%` }}
                ></div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Recent Events</CardTitle>
          </CardHeader>
          <CardContent className="p-0 overflow-y-auto max-h-60">
            <div className="divide-y divide-border text-sm">
              {events.length > 0 ? (
                events.slice(-10).map((event, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-3 first:pt-0 last:pb-0">
                    <span className="text-xs text-muted-foreground">
                      {new Date(event.timestamp).toLocaleTimeString()}
                    </span>
                    <span className="font-semibold text-foreground uppercase tracking-wide text-xs">
                      {event.type.replace('_', ' ')}
                    </span>
                  </div>
                ))
              ) : (
                <div className="p-6 text-center text-muted-foreground text-sm">
                  No events recorded yet.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}