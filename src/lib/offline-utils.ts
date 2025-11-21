import { OfflineAuthState, CachedApiResponse } from '@/types/offline';

/**
 * Advanced network detection with multiple fallback methods
 */
export class NetworkDetector {
  private static instance: NetworkDetector;
  private listeners: ((online: boolean) => void)[] = [];
  private currentStatus: boolean = true;

  private constructor() {
    if (typeof window !== 'undefined') {
      this.currentStatus = navigator.onLine;

      window.addEventListener('online', () => this.updateStatus(true));
      window.addEventListener('offline', () => this.updateStatus(false));

      // Periodic connectivity check
      setInterval(() => this.checkConnectivity(), 30000);
    }
  }

  static getInstance(): NetworkDetector {
    if (!NetworkDetector.instance) {
      NetworkDetector.instance = new NetworkDetector();
    }
    return NetworkDetector.instance;
  }

  private updateStatus(online: boolean) {
    if (this.currentStatus !== online) {
      this.currentStatus = online;
      this.listeners.forEach(listener => listener(online));
    }
  }

  private async checkConnectivity(): Promise<void> {
    try {
      // Try to fetch the backend health endpoint
      const healthUrl = `${process.env.NEXT_PUBLIC_API_URL}/health`;
      const response = await fetch(healthUrl, {
        method: 'HEAD',
        cache: 'no-cache',
        signal: AbortSignal.timeout(5000)
      });
      this.updateStatus(response.ok);
    } catch {
      this.updateStatus(false);
    }
  }

  isOnline(): boolean {
    return this.currentStatus;
  }

  onStatusChange(callback: (online: boolean) => void): () => void {
    this.listeners.push(callback);
    return () => {
      const index = this.listeners.indexOf(callback);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }
}

/**
 * Storage quota management and monitoring
 */
export class StorageManager {
  static async getQuota(): Promise<{ used: number; available: number } | null> {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      try {
        const estimate = await navigator.storage.estimate();
        return {
          used: estimate.usage || 0,
          available: estimate.quota || 0
        };
      } catch {
        return null;
      }
    }
    return null;
  }

  static async isStorageFull(): Promise<boolean> {
    const quota = await this.getQuota();
    if (!quota) return false;

    // Consider storage full if less than 10MB available
    return quota.available - quota.used < 10 * 1024 * 1024;
  }

  static async cleanupOldData(): Promise<void> {
    // Clean up old cached API responses
    const cacheKeys = Object.keys(localStorage).filter(key =>
      key.startsWith('api_cache_')
    );

    const now = Date.now();
    cacheKeys.forEach(key => {
      try {
        const data = JSON.parse(localStorage.getItem(key) || '{}') as CachedApiResponse;
        if (data.expiresAt && data.expiresAt < now) {
          localStorage.removeItem(key);
        }
      } catch {
        localStorage.removeItem(key);
      }
    });
  }
}

/**
 * Offline authentication utilities
 */
export class OfflineAuth {
  private static readonly TOKEN_KEY = 'offline_auth_tokens';
  private static readonly USER_KEY = 'offline_auth_user';
  private static readonly VALIDATION_PERIOD = 24 * 60 * 60 * 1000; // 24 hours

  static saveAuthState(state: OfflineAuthState): void {
    localStorage.setItem(this.TOKEN_KEY, JSON.stringify(state.tokens));
    localStorage.setItem(this.USER_KEY, JSON.stringify({
      user: state.user,
      tenant: state.tenant,
      lastValidated: state.lastValidated
    }));
  }

  static getAuthState(): OfflineAuthState | null {
    try {
      const tokensStr = localStorage.getItem(this.TOKEN_KEY);
      const userStr = localStorage.getItem(this.USER_KEY);

      if (!tokensStr || !userStr) return null;

      const tokens = JSON.parse(tokensStr);
      const userData = JSON.parse(userStr);

      // Check if tokens are still valid
      if (Date.now() > tokens.expiresAt) {
        this.clearAuthState();
        return null;
      }

      return {
        isAuthenticated: true,
        user: userData.user,
        tenant: userData.tenant,
        tokens,
        lastValidated: userData.lastValidated
      };
    } catch {
      this.clearAuthState();
      return null;
    }
  }

  static clearAuthState(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
  }

  static isTokenValid(): boolean {
    const state = this.getAuthState();
    return state !== null && Date.now() < state.tokens.expiresAt;
  }

  static shouldRefreshToken(): boolean {
    const state = this.getAuthState();
    if (!state) return false;

    // Refresh if token expires within next hour
    return Date.now() > (state.tokens.expiresAt - 60 * 60 * 1000);
  }
}

/**
 * Data validation utilities for offline operations
 */
export class DataValidator {
  static validateInventoryItem(data: Record<string, unknown>): boolean {
    return !!(
      data.tenantId &&
      data.quantity !== undefined &&
      data.purchasePrice !== undefined &&
      data.retailPrice !== undefined
    );
  }

  static validateSale(data: Record<string, unknown>): boolean {
    return !!(
      data.tenantId &&
      data.employeeId &&
      data.totalAmount !== undefined &&
      data.saleTime
    );
  }

  static validateSaleItem(data: Record<string, unknown>): boolean {
    return !!(
      data.saleId &&
      data.inventoryId &&
      data.quantity !== undefined &&
      data.unitPrice !== undefined
    );
  }

  static sanitizeData(data: Record<string, unknown>): Record<string, unknown> {
    const sanitized = { ...data };

    // Remove any undefined values
    Object.keys(sanitized).forEach(key => {
      if (sanitized[key] === undefined) {
        delete sanitized[key];
      }
    });

    return sanitized;
  }
}

/**
 * Utility functions for offline operations
 */
export const offlineUtils = {
  generateId: (): string => {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  },

  debounce: <T extends (...args: unknown[]) => unknown>(
    func: T,
    wait: number
  ): ((...args: Parameters<T>) => void) => {
    let timeout: NodeJS.Timeout;
    return (...args: Parameters<T>) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  },

  retry: async <T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    delay: number = 1000
  ): Promise<T> => {
    let lastError: Error;

    for (let i = 0; i < maxRetries; i++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        if (i < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
        }
      }
    }

    throw lastError!;
  },

  formatBytes: (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  },

  isValidDate: (date: unknown): boolean => {
    return date instanceof Date && !isNaN(date.getTime());
  },

  deepClone: <T>(obj: T): T => {
    return JSON.parse(JSON.stringify(obj));
  }
};