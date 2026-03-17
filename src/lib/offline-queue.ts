import { OfflineQueueItem } from '@/types/offline';
import { offlineDb } from './offline-db';
import { offlineUtils } from './offline-utils';
import api from './api';

export class OfflineQueue {
  private static instance: OfflineQueue;
  private processing = false;
  private listeners: ((item: OfflineQueueItem, status: 'added' | 'processed' | 'failed') => void)[] = [];

  private constructor() { }

  static getInstance(): OfflineQueue {
    if (!OfflineQueue.instance) {
      OfflineQueue.instance = new OfflineQueue();
    }
    return OfflineQueue.instance;
  }

  async add(
    operation: OfflineQueueItem['operation'],
    entityType: OfflineQueueItem['entityType'],
    entityId: string,
    data: Record<string, unknown>,
    tenantId?: string
  ): Promise<void> {
    const queueItem: OfflineQueueItem = {
      id: offlineUtils.generateId(),
      operation,
      entityType,
      entityId,
      data,
      timestamp: Date.now(),
      retryCount: 0,
      tenantId
    };

    await offlineDb.addToQueue(queueItem);

    // Notify listeners
    this.listeners.forEach(listener => listener(queueItem, 'added'));

    // Try to process immediately if online
    if (navigator.onLine) {
      this.processQueue();
    }
  }

  async processQueue(): Promise<void> {
    if (this.processing) return;
    this.processing = true;

    try {
      const queueItems = await offlineDb.getQueueItems();

      for (const item of queueItems) {
        try {
          await this.processItem(item);
          await offlineDb.removeFromQueue(item.id);
          this.listeners.forEach(listener => listener(item, 'processed'));
        } catch (error) {
          console.error('Failed to process queue item:', error);
          item.retryCount++;
          item.lastError = (error as Error).message;

          if (item.retryCount >= 3) {
            // Remove after max retries
            await offlineDb.removeFromQueue(item.id);
          } else {
            // Update retry count
            await offlineDb.addToQueue(item);
          }

          this.listeners.forEach(listener => listener(item, 'failed'));
        }
      }
    } finally {
      this.processing = false;
    }
  }

  private async processItem(item: OfflineQueueItem): Promise<void> {
    if (!navigator.onLine) {
      throw new Error('Offline');
    }

    const { operation, entityType, entityId, data, tenantId } = item;
    const endpoint = this.getEndpoint(entityType);

    // Add tenantId to query params or body as needed.
    const payload = { ...data };
    if (tenantId) {
      payload.tenantId = tenantId;
    }

    

    try {
      switch (operation) {
        case 'CREATE':
          await api.post(endpoint, payload);
          break;
        case 'UPDATE':
          await api.put(`${endpoint}/${entityId}`, payload);
          break;
        case 'DELETE':
          await api.delete(`${endpoint}/${entityId}`);
          break;
        default:
          throw new Error(`Unknown operation: ${operation}`);
      }
    } catch (error) {
      // If 404 on delete/update, maybe it was already deleted?
      // For now, rethrow to trigger retry logic
      throw error;
    }
  }

  private getEndpoint(entityType: string): string {
    switch (entityType) {
      case 'inventory': return '/inventory';
      case 'sale': return '/sales';
      case 'product': return '/catalog/products';
      case 'customer': return '/customers';
      case 'variant': return '/catalog/variants';
      default: return `/${entityType}s`; // Fallback pluralization
    }
  }

  async getPendingItems(): Promise<OfflineQueueItem[]> {
    return offlineDb.getQueueItems();
  }

  async clearQueue(): Promise<void> {
    const items = await offlineDb.getQueueItems();
    for (const item of items) {
      await offlineDb.removeFromQueue(item.id);
    }
  }

  onQueueChange(callback: (item: OfflineQueueItem, status: 'added' | 'processed' | 'failed') => void): () => void {
    this.listeners.push(callback);
    return () => {
      const index = this.listeners.indexOf(callback);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  isProcessing(): boolean {
    return this.processing;
  }
}

// Export singleton instance
export const offlineQueue = OfflineQueue.getInstance();