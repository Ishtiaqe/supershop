import { SyncMetadata, BackgroundSyncEvent } from '@/types/offline';
import { InventoryItem, Sale } from '@/types';
import { offlineDb } from './offline-db';
import { offlineQueue } from './offline-queue';
import { NetworkDetector } from './offline-utils';
import api from './api';

export class OfflineSync {
  private static instance: OfflineSync;
  private syncing = false;
  private listeners: ((event: BackgroundSyncEvent) => void)[] = [];
  private networkDetector = NetworkDetector.getInstance();

  private constructor() {
    // Listen for network changes
    this.networkDetector.onStatusChange((online) => {
      if (online) {
        this.startSync();
      }
    });

    // Register background sync if supported
    if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
      this.registerBackgroundSync();
    }
  }

  static getInstance(): OfflineSync {
    if (!OfflineSync.instance) {
      OfflineSync.instance = new OfflineSync();
    }
    return OfflineSync.instance;
  }

  private async registerBackgroundSync(): Promise<void> {
    try {
      const registration = await navigator.serviceWorker.ready;
      // Background sync registration - using type assertion for browser compatibility
      (registration as ServiceWorkerRegistration & { sync: { register: (tag: string) => Promise<void> } }).sync.register('background-sync');
    } catch (error) {
      console.warn('Background sync registration failed:', error);
    }
  }

  async startSync(tenantId?: string): Promise<void> {
    if (this.syncing || !navigator.onLine) return;

    this.syncing = true;
    this.emitEvent({ type: 'sync-start', timestamp: Date.now() });

    try {
      // Get all tenants if not specified
      const tenants = tenantId ? [tenantId] : await this.getAllTenantIds();

      for (const tid of tenants) {
        await this.syncTenantData(tid);
      }

      // Process offline queue
      await offlineQueue.processQueue();

      this.emitEvent({ type: 'sync-complete', timestamp: Date.now() });
    } catch (error) {
      console.error('Sync failed:', error);
      this.emitEvent({
        type: 'sync-error',
        data: { error: (error as Error).message },
        timestamp: Date.now()
      });
    } finally {
      this.syncing = false;
    }
  }

  private async syncTenantData(tenantId: string): Promise<void> {
    const metadata = await offlineDb.getSyncMetadata(tenantId) || {
      id: `sync_${tenantId}`,
      lastSyncTimestamp: 0,
      lastSyncVersion: '0',
      pendingOperations: 0,
      conflicts: [],
      entityVersions: {}
    };

    try {
      // Sync inventory data
      await this.syncInventory(tenantId, metadata);

      // Sync sales data
      await this.syncSales(tenantId, metadata);

      // Update sync metadata
      metadata.lastSyncTimestamp = Date.now();
      metadata.lastSyncVersion = Date.now().toString();
      await offlineDb.updateSyncMetadata(metadata);

    } catch (error) {
      console.error(`Failed to sync tenant ${tenantId}:`, error);
      throw error;
    }
  }

  private async syncInventory(tenantId: string, metadata: SyncMetadata): Promise<void> {
    const lastSync = metadata.lastSyncTimestamp;

    try {
      // Fetch server data since last sync
      const response = await api.get(`/inventory?tenantId=${tenantId}&since=${lastSync}`);
      const serverData = response.data;

      // Get local data
      const localData = await offlineDb.getAllInventory(tenantId) as Array<InventoryItem & { _lastModified: number; _syncStatus: 'synced' | 'pending' | 'conflict'; _serverVersion?: number }>;

      // Resolve conflicts and merge data
      const mergedData = await this.resolveInventoryConflicts(localData, serverData);

      // Update local database
      await offlineDb.bulkPutInventory(mergedData);

    } catch (error) {
      console.error('Failed to sync inventory:', error);
      throw error;
    }
  }

  private async syncSales(tenantId: string, metadata: SyncMetadata): Promise<void> {
    const lastSync = metadata.lastSyncTimestamp;

    try {
      // Fetch server data since last sync
      const response = await api.get(`/sales?tenantId=${tenantId}&since=${lastSync}`);
      const serverData = response.data;

      // Get local data
      const localData = await offlineDb.getAllSales(tenantId) as Array<Sale & { _lastModified: number; _syncStatus: 'synced' | 'pending' | 'conflict'; _serverVersion?: number }>;

      // Resolve conflicts and merge data
      const mergedData = await this.resolveSalesConflicts(localData, serverData);

      // Update local database
      await offlineDb.bulkPutSales(mergedData);

    } catch (error) {
      console.error('Failed to sync sales:', error);
      throw error;
    }
  }

  private async resolveInventoryConflicts(
    localData: Array<InventoryItem & { _lastModified: number; _syncStatus: 'synced' | 'pending' | 'conflict'; _serverVersion?: number }>,
    serverData: Array<InventoryItem & { _lastModified: number; _syncStatus: 'synced' | 'pending' | 'conflict'; _serverVersion?: number }>
  ): Promise<Array<InventoryItem & { _lastModified: number; _syncStatus: 'synced' | 'pending' | 'conflict'; _serverVersion?: number }>> {
    const mergedData: Array<InventoryItem & { _lastModified: number; _syncStatus: 'synced' | 'pending' | 'conflict'; _serverVersion?: number }> = [];

    const localMap = new Map(localData.map(item => [item.id, item]));
    const serverMap = new Map(serverData.map(item => [item.id, item]));

    // Process all unique IDs
    const allIds = new Set([...localMap.keys(), ...serverMap.keys()]);

    for (const id of allIds) {
      const localItem = localMap.get(id);
      const serverItem = serverMap.get(id);

      if (localItem && serverItem) {
        // Both exist - check for conflicts
        if (localItem._lastModified > serverItem._lastModified) {
          // Local is newer - keep local
          mergedData.push({ ...localItem, _syncStatus: 'synced' });
        } else if (serverItem._lastModified > localItem._lastModified) {
          // Server is newer - update local
          mergedData.push({ ...serverItem, _syncStatus: 'synced' });
        } else {
          // Same timestamp - no conflict
          mergedData.push({ ...serverItem, _syncStatus: 'synced' });
        }
      } else if (localItem) {
        // Only local exists
        mergedData.push(localItem);
      } else if (serverItem) {
        // Only server exists
        mergedData.push({ ...serverItem, _syncStatus: 'synced' });
      }
    }

    return mergedData;
  }

  private async resolveSalesConflicts(
    localData: Array<Sale & { _lastModified: number; _syncStatus: 'synced' | 'pending' | 'conflict'; _serverVersion?: number }>,
    serverData: Array<Sale & { _lastModified: number; _syncStatus: 'synced' | 'pending' | 'conflict'; _serverVersion?: number }>
  ): Promise<Array<Sale & { _lastModified: number; _syncStatus: 'synced' | 'pending' | 'conflict'; _serverVersion?: number }>> {
    const mergedData: Array<Sale & { _lastModified: number; _syncStatus: 'synced' | 'pending' | 'conflict'; _serverVersion?: number }> = [];

    const localMap = new Map(localData.map(item => [item.id, item]));
    const serverMap = new Map(serverData.map(item => [item.id, item]));

    // Process all unique IDs
    const allIds = new Set([...localMap.keys(), ...serverMap.keys()]);

    for (const id of allIds) {
      const localItem = localMap.get(id);
      const serverItem = serverMap.get(id);

      if (localItem && serverItem) {
        // Both exist - check for conflicts
        if (localItem._lastModified > serverItem._lastModified) {
          // Local is newer - keep local
          mergedData.push({ ...localItem, _syncStatus: 'synced' });
        } else if (serverItem._lastModified > localItem._lastModified) {
          // Server is newer - update local
          mergedData.push({ ...serverItem, _syncStatus: 'synced' });
        } else {
          // Same timestamp - no conflict
          mergedData.push({ ...serverItem, _syncStatus: 'synced' });
        }
      } else if (localItem) {
        // Only local exists
        mergedData.push(localItem);
      } else if (serverItem) {
        // Only server exists
        mergedData.push({ ...serverItem, _syncStatus: 'synced' });
      }
    }

    return mergedData;
  }

  private async getAllTenantIds(): Promise<string[]> {
    // This would typically come from the auth context
    // For now, return a default tenant
    return ['default-tenant'];
  }

  private emitEvent(event: BackgroundSyncEvent): void {
    this.listeners.forEach(listener => listener(event));
  }

  onSyncEvent(callback: (event: BackgroundSyncEvent) => void): () => void {
    this.listeners.push(callback);
    return () => {
      const index = this.listeners.indexOf(callback);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  isSyncing(): boolean {
    return this.syncing;
  }

  async forceSync(tenantId?: string): Promise<void> {
    await this.startSync(tenantId);
  }

  async preloadAllData(tenantId: string): Promise<void> {
    if (!navigator.onLine) {
      throw new Error('Cannot preload data while offline');
    }

    this.emitEvent({ type: 'sync-start', data: { preload: true }, timestamp: Date.now() });

    try {
      // Fetch all products
      const productsResponse = await api.get(`/catalog/products?tenantId=${tenantId}`);
      const products = productsResponse.data.data || productsResponse.data;
      for (const product of products) {
        await offlineDb.putProduct({
          ...product,
          _lastModified: Date.now(),
          _syncStatus: 'synced'
        });
      }

      // Fetch all inventory
      const inventoryResponse = await api.get(`/inventory?tenantId=${tenantId}`);
      const inventory = inventoryResponse.data.data || inventoryResponse.data;
      await offlineDb.bulkPutInventory(inventory.map((item: InventoryItem) => ({
        ...item,
        _lastModified: Date.now(),
        _syncStatus: 'synced'
      })));

      // Fetch recent sales (last 30 days)
      const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
      const salesResponse = await api.get(`/sales?tenantId=${tenantId}&since=${thirtyDaysAgo}`);
      const sales = salesResponse.data.data || salesResponse.data;
      await offlineDb.bulkPutSales(sales.map((sale: Sale) => ({
        ...sale,
        _lastModified: Date.now(),
        _syncStatus: 'synced'
      })));

      // Update sync metadata
      const metadata: SyncMetadata = {
        id: `sync_${tenantId}`,
        lastSyncTimestamp: Date.now(),
        lastSyncVersion: Date.now().toString(),
        pendingOperations: 0,
        conflicts: [],
        entityVersions: {}
      };
      await offlineDb.updateSyncMetadata(metadata);

      this.emitEvent({ type: 'sync-complete', data: { preload: true }, timestamp: Date.now() });
    } catch (error) {
      console.error('Failed to preload data:', error);
      this.emitEvent({
        type: 'sync-error',
        data: { error: (error as Error).message, preload: true },
        timestamp: Date.now()
      });
      throw error;
    }
  }  async getSyncStatus(tenantId: string): Promise<SyncMetadata | null> {
    const metadata = await offlineDb.getSyncMetadata(tenantId);
    return metadata ?? null;
  }
}

// Export singleton instance
export const offlineSync = OfflineSync.getInstance();
