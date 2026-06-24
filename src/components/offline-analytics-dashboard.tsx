import React, { useState } from 'react';
import { Card, CardBody, Button, Progress } from '@heroui/react';
import { Clock, Activity, AlertCircle, RotateCw, Trash2 } from 'lucide-react';
import { useOfflineAnalytics } from '../lib/offline-analytics';

export function OfflineAnalyticsDashboard() {
  const analytics = useOfflineAnalytics();
  const [stats, setStats] = useState(analytics.getStats());
  const [events, setEvents] = useState(analytics.getEvents(20));

  const refreshData = () => {
    setStats(analytics.getStats());
    setEvents(analytics.getEvents(20));
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
    <div className="p-6">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-foreground">Offline Analytics</h2>
          <div className="flex gap-2">
            <Button
              isIconOnly
              variant="bordered"
              onClick={refreshData}
              startContent={<RotateCw className="w-4 h-4" />}
            >
              Refresh
            </Button>
            <Button
              isIconOnly
              color="danger"
              variant="bordered"
              onClick={analytics.clearData}
              startContent={<Trash2 className="w-4 h-4" />}
            >
              Clear
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Offline Time */}
          <Card className="bg-default-50">
            <CardBody className="gap-2">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-default-400" />
                <span className="text-sm text-default-500 font-medium">Total Offline Time</span>
              </div>
              <div className="text-2xl font-bold text-foreground">
                {formatTime(stats.totalOfflineTime)}
              </div>
            </CardBody>
          </Card>

          {/* Sync Success Rate */}
          <Card className="bg-default-50">
            <CardBody className="gap-2">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-default-400" />
                <span className="text-sm text-default-500 font-medium">Sync Success Rate</span>
              </div>
              <div className={`text-2xl font-bold ${
                successRate > 80 ? 'text-success' : 'text-destructive'
              }`}>
                {successRate}%
              </div>
            </CardBody>
          </Card>

          {/* Total Syncs */}
          <Card className="bg-default-50">
            <CardBody className="gap-2">
              <div className="flex items-center gap-2">
                <RotateCw className="w-5 h-5 text-default-400" />
                <span className="text-sm text-default-500 font-medium">Total Syncs</span>
              </div>
              <div className="text-2xl font-bold text-foreground">
                {stats.syncAttempts}
              </div>
            </CardBody>
          </Card>

          {/* Storage Issues */}
          <Card className="bg-default-50">
            <CardBody className="gap-2">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-default-400" />
                <span className="text-sm text-default-500 font-medium">Storage Issues</span>
              </div>
              <div className={`text-2xl font-bold ${
                stats.storageErrors > 0 ? 'text-destructive' : 'text-warning'
              }`}>
                {stats.storageWarnings + stats.storageErrors}
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Performance & Recent Events */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Sync Performance */}
          <Card>
            <CardBody className="gap-4">
              <h3 className="text-lg font-semibold text-foreground">Sync Performance</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-default-600 font-medium">Successful Syncs</span>
                  <span className="text-lg font-semibold text-foreground">{stats.syncSuccesses}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-default-600 font-medium">Failed Syncs</span>
                  <span className="text-lg font-semibold text-foreground">{stats.syncFailures}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-default-600 font-medium">Average Sync Time</span>
                  <span className="text-lg font-semibold text-foreground">
                    {formatTime(stats.totalSyncTime / Math.max(1, stats.syncAttempts))}
                  </span>
                </div>
                <div className="pt-2">
                  <Progress
                    value={successRate}
                    color={successRate > 80 ? 'success' : 'danger'}
                    className="w-full"
                    showValueLabel={false}
                  />
                  <p className="text-xs text-default-500 mt-2 text-right">{successRate}%</p>
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Recent Events */}
          <Card>
            <CardBody className="gap-4">
              <h3 className="text-lg font-semibold text-foreground">Recent Events</h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {events.slice(-10).length > 0 ? (
                  events.slice(-10).map((event, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-3 py-2 px-2 hover:bg-default-100 rounded-lg transition-colors"
                    >
                      <span className="text-xs text-default-400 whitespace-nowrap font-mono">
                        {new Date(event.timestamp).toLocaleTimeString()}
                      </span>
                      <span className="text-sm text-default-600 font-medium">
                        {event.type.replace('_', ' ').toUpperCase()}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-default-400 text-center py-4">No events</p>
                )}
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
