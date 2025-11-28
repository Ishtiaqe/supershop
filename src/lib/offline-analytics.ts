import { useEffect, useCallback } from 'react';
import { useOffline } from '@/hooks/useOffline';

interface OfflineAnalyticsEvent {
  type: 'offline_start' | 'offline_end' | 'sync_start' | 'sync_success' | 'sync_error' | 'storage_warning' | 'storage_error';
  timestamp: number;
  data?: Record<string, unknown>;
}

interface OfflineUsageStats {
  totalOfflineTime: number;
  totalSyncTime: number;
  syncAttempts: number;
  syncSuccesses: number;
  syncFailures: number;
  storageWarnings: number;
  storageErrors: number;
  lastOfflineStart?: number;
  lastSyncStart?: number;
}

class OfflineAnalytics {
  private static instance: OfflineAnalytics;
  private events: OfflineAnalyticsEvent[] = [];
  private stats: OfflineUsageStats = {
    totalOfflineTime: 0,
    totalSyncTime: 0,
    syncAttempts: 0,
    syncSuccesses: 0,
    syncFailures: 0,
    storageWarnings: 0,
    storageErrors: 0
  };

  private readonly STORAGE_KEY = 'offline_analytics';
  private readonly MAX_EVENTS = 1000;

  private constructor() {
    this.loadFromStorage();
  }

  static getInstance(): OfflineAnalytics {
    if (!OfflineAnalytics.instance) {
      OfflineAnalytics.instance = new OfflineAnalytics();
    }
    return OfflineAnalytics.instance;
  }

  trackEvent(type: OfflineAnalyticsEvent['type'], data?: Record<string, unknown>) {
    const event: OfflineAnalyticsEvent = {
      type,
      timestamp: Date.now(),
      data
    };

    this.events.push(event);

    // Keep only recent events
    if (this.events.length > this.MAX_EVENTS) {
      this.events = this.events.slice(-this.MAX_EVENTS);
    }

    // Update stats
    this.updateStats(event);

    // Save to storage
    this.saveToStorage();

    // Send to analytics service if online (future enhancement)
    this.sendToAnalytics(event);
  }

  private updateStats(event: OfflineAnalyticsEvent) {
    switch (event.type) {
      case 'offline_start':
        this.stats.lastOfflineStart = event.timestamp;
        break;

      case 'offline_end':
        if (this.stats.lastOfflineStart) {
          this.stats.totalOfflineTime += event.timestamp - this.stats.lastOfflineStart;
          this.stats.lastOfflineStart = undefined;
        }
        break;

      case 'sync_start':
        this.stats.lastSyncStart = event.timestamp;
        this.stats.syncAttempts++;
        break;

      case 'sync_success':
        if (this.stats.lastSyncStart) {
          this.stats.totalSyncTime += event.timestamp - this.stats.lastSyncStart;
          this.stats.syncSuccesses++;
          this.stats.lastSyncStart = undefined;
        }
        break;

      case 'sync_error':
        if (this.stats.lastSyncStart) {
          this.stats.totalSyncTime += event.timestamp - this.stats.lastSyncStart;
          this.stats.syncFailures++;
          this.stats.lastSyncStart = undefined;
        }
        break;

      case 'storage_warning':
        this.stats.storageWarnings++;
        break;

      case 'storage_error':
        this.stats.storageErrors++;
        break;
    }
  }

  private saveToStorage() {
    try {
      const data = {
        events: this.events.slice(-100), // Keep only last 100 events
        stats: this.stats,
        lastUpdated: Date.now()
      };
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.warn('Failed to save offline analytics:', error);
    }
  }

  private loadFromStorage() {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        this.events = parsed.events || [];
        this.stats = { ...this.stats, ...parsed.stats };
      }
    } catch (error) {
      console.warn('Failed to load offline analytics:', error);
    }
  }

  private sendToAnalytics(event: OfflineAnalyticsEvent) {
    // Future: Send to analytics service when online
    // For now, just log in development
    if (process.env.NODE_ENV === 'development') {
      console.log('Offline Analytics Event:', event);
    }
  }

  getStats(): OfflineUsageStats {
    return { ...this.stats };
  }

  getEvents(limit = 50): OfflineAnalyticsEvent[] {
    return this.events.slice(-limit);
  }

  getSyncSuccessRate(): number {
    if (this.stats.syncAttempts === 0) return 100;
    return (this.stats.syncSuccesses / this.stats.syncAttempts) * 100;
  }

  getAverageOfflineTime(): number {
    // Rough estimate - this would need more sophisticated tracking
    return this.stats.totalOfflineTime / Math.max(1, this.stats.syncAttempts);
  }

  clearData() {
    this.events = [];
    this.stats = {
      totalOfflineTime: 0,
      totalSyncTime: 0,
      syncAttempts: 0,
      syncSuccesses: 0,
      syncFailures: 0,
      storageWarnings: 0,
      storageErrors: 0
    };
    localStorage.removeItem(this.STORAGE_KEY);
  }
}

// Export singleton instance
export const offlineAnalytics = OfflineAnalytics.getInstance();

// React hook for offline analytics
export function useOfflineAnalytics() {
  const { isOnline, isSyncing, offlineStatus } = useOffline();

  const trackOfflineStart = useCallback(() => {
    offlineAnalytics.trackEvent('offline_start');
  }, []);

  const trackOfflineEnd = useCallback(() => {
    offlineAnalytics.trackEvent('offline_end');
  }, []);

  const trackSyncStart = useCallback(() => {
    offlineAnalytics.trackEvent('sync_start');
  }, []);

  const trackSyncSuccess = useCallback(() => {
    offlineAnalytics.trackEvent('sync_success');
  }, []);

  const trackSyncError = useCallback((error?: string) => {
    offlineAnalytics.trackEvent('sync_error', { error });
  }, []);

  const trackStorageWarning = useCallback(() => {
    offlineAnalytics.trackEvent('storage_warning');
  }, []);

  const trackStorageError = useCallback(() => {
    offlineAnalytics.trackEvent('storage_error');
  }, []);

  // Auto-track based on offline status
  useEffect(() => {
    if (!isOnline && !offlineStatus.lastOnline) {
      trackOfflineStart();
    } else if (isOnline && offlineStatus.lastOnline) {
      trackOfflineEnd();
    }
  }, [isOnline, offlineStatus.lastOnline, trackOfflineStart, trackOfflineEnd]);

  useEffect(() => {
    if (isSyncing) {
      trackSyncStart();
    }
  }, [isSyncing, trackSyncStart]);

  return {
    trackOfflineStart,
    trackOfflineEnd,
    trackSyncStart,
    trackSyncSuccess,
    trackSyncError,
    trackStorageWarning,
    trackStorageError,
    getStats: offlineAnalytics.getStats.bind(offlineAnalytics),
    getEvents: offlineAnalytics.getEvents.bind(offlineAnalytics),
    getSyncSuccessRate: offlineAnalytics.getSyncSuccessRate.bind(offlineAnalytics),
    clearData: offlineAnalytics.clearData.bind(offlineAnalytics)
  };
}