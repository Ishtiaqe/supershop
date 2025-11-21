// Offline-specific types for SuperShop PWA
export interface OfflineQueueItem {
  id: string;
  operation: 'CREATE' | 'UPDATE' | 'DELETE';
  entityType: 'user' | 'tenant' | 'product' | 'variant' | 'inventory' | 'sale' | 'saleItem';
  entityId: string;
  data: Record<string, unknown>;
  timestamp: number;
  retryCount: number;
  lastError?: string;
  tenantId?: string;
}

export interface SyncMetadata {
  id: string;
  lastSyncTimestamp: number;
  lastSyncVersion: string;
  pendingOperations: number;
  conflicts: ConflictResolution[];
  entityVersions: Record<string, number>;
}

export interface ConflictResolution {
  entityType: string;
  entityId: string;
  localVersion: Record<string, unknown>;
  serverVersion: Record<string, unknown>;
  resolved: boolean;
  resolution: 'local' | 'server' | 'merge';
  timestamp: number;
}

export interface OfflineStatus {
  isOnline: boolean;
  lastOnline: number;
  syncInProgress: boolean;
  pendingOperations: number;
  lastSyncError?: string;
  storageQuota?: {
    used: number;
    available: number;
  };
}

export interface CachedApiResponse {
  url: string;
  method: string;
  data: Record<string, unknown>;
  timestamp: number;
  expiresAt: number;
  etag?: string;
}

export interface OfflineAuthState {
  isAuthenticated: boolean;
  user?: Record<string, unknown>;
  tenant?: Record<string, unknown>;
  tokens: {
    accessToken: string;
    refreshToken: string;
    expiresAt: number;
  };
  lastValidated: number;
}

// Extended interfaces for offline-capable entities
export interface OfflineInventoryItem extends InventoryItem {
  _offlineId?: string;
  _lastModified: number;
  _syncStatus: 'synced' | 'pending' | 'conflict';
  _serverVersion?: number;
}

export interface OfflineSale extends Sale {
  _offlineId?: string;
  _lastModified: number;
  _syncStatus: 'synced' | 'pending' | 'conflict';
  _serverVersion?: number;
  items?: OfflineSaleItem[];
}

export interface OfflineSaleItem extends SaleItem {
  _offlineId?: string;
  _lastModified: number;
  _syncStatus: 'synced' | 'pending' | 'conflict';
  _serverVersion?: number;
}

// Background sync event types
export interface BackgroundSyncEvent {
  type: 'sync-start' | 'sync-progress' | 'sync-complete' | 'sync-error';
  data?: Record<string, unknown>;
  timestamp: number;
}

// Storage event types
export interface StorageEventData {
  type: 'quota-exceeded' | 'storage-full' | 'cleanup-completed';
  data?: Record<string, unknown>;
  timestamp: number;
}

// Import existing types
import { InventoryItem, Sale, SaleItem } from './index';