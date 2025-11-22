import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import { offlineDb } from './offline-db';
import { offlineQueue } from './offline-queue';
import { NetworkDetector } from './offline-utils';
import { OfflineAuth } from './offline-utils';
import { InventoryItem, Sale } from '../types';

interface ApiResponse<T = unknown> {
  data: T;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  config: AxiosRequestConfig;
}

class OfflineApiClient {
  private networkDetector = NetworkDetector.getInstance();
  private baseURL: string;
  private fallbackURL?: string;

  constructor(baseURL: string, fallbackURL?: string) {
    this.baseURL = baseURL;
    this.fallbackURL = fallbackURL;
  }

  async request<T = unknown>(config: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const isOnline = this.networkDetector.isOnline();

    // If online, try primary API first, then fallback
    if (isOnline) {
      try {
        const response = await this.makeRequest<T>(config, this.baseURL);
        return response;
      } catch (primaryError) {
        if (this.fallbackURL) {
          console.warn('Primary API failed, trying fallback...');
          try {
            const response = await this.makeRequest<T>(config, this.fallbackURL);
            return response;
          } catch {
            console.warn('Fallback API also failed, going offline...');
          }
        }
        throw primaryError;
      }
    }

    // Offline mode - handle with local database
    return this.handleOfflineRequest<T>(config);
  }

  private async makeRequest<T>(config: AxiosRequestConfig, baseURL: string): Promise<ApiResponse<T>> {
    const fullConfig = {
      ...config,
      baseURL,
      headers: {
        ...config.headers,
        ...this.getAuthHeaders()
      }
    };

    const response: AxiosResponse<T> = await axios(fullConfig);
    return {
      data: response.data,
      status: response.status,
      statusText: response.statusText,
      headers: response.headers as Record<string, string>,
      config: response.config
    };
  }

  private getAuthHeaders(): Record<string, string> {
    const authState = OfflineAuth.getAuthState();
    if (authState?.tokens?.accessToken) {
      return { Authorization: `Bearer ${authState.tokens.accessToken}` };
    }
    return {};
  }

  private async handleOfflineRequest<T>(config: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const { method, url, data } = config;
    const tenantId = this.getTenantId();

    // Check cache first for GET requests
    if (method?.toLowerCase() === 'get' && url) {
      const cached = await offlineDb.getCachedResponse(url);
      if (cached !== null) {
        return {
          data: cached as T,
          status: 200,
          statusText: 'OK',
          headers: {},
          config
        };
      }
    }

    // Handle different entity types
    const entityType = this.getEntityTypeFromUrl(url || '');

    switch (entityType) {
      case 'inventory':
        return this.handleInventoryRequest<T>(method, data, tenantId);
      case 'sales':
        return this.handleSalesRequest<T>(method, data, tenantId);
      case 'products':
        return this.handleProductRequest<T>(method, data, tenantId);
      case 'medicine':
        return this.handleMedicineRequest<T>(method, data, config);
      default:
        // For other requests, queue them for later
        if (method && ['post', 'put', 'delete'].includes(method.toLowerCase())) {
          await offlineQueue.add(
            method.toUpperCase() as 'CREATE' | 'UPDATE' | 'DELETE',
            'inventory' as const,
            this.generateTempId(),
            data || {},
            tenantId
          );
        }

        // Return mock response for offline mode
        return {
          data: { message: 'Request queued for offline processing' } as T,
          status: 202,
          statusText: 'Accepted',
          headers: {},
          config
        };
    }
  }

  private async handleInventoryRequest<T>(method: string | undefined, data: unknown, tenantId: string): Promise<ApiResponse<T>> {
    switch (method?.toLowerCase()) {
      case 'get':
        const inventory = await offlineDb.getAllInventory(tenantId);
        return {
          data: { data: inventory, total: inventory.length } as T,
          status: 200,
          statusText: 'OK',
          headers: {},
          config: {} as AxiosRequestConfig
        };

      case 'post':
        const inventoryData = data as Omit<InventoryItem, 'id' | 'tenantId' | '_lastModified' | '_syncStatus'>;
        const newItem: InventoryItem & { _lastModified: number; _syncStatus: 'pending' | 'synced' | 'conflict' } = {
          ...inventoryData,
          id: this.generateTempId(),
          tenantId,
          _lastModified: Date.now(),
          _syncStatus: 'pending' as const
        };
        await offlineDb.putInventoryItem(newItem);
        await offlineQueue.add('CREATE', 'inventory', newItem.id, newItem as unknown as Record<string, unknown>, tenantId);
        return {
          data: newItem as T,
          status: 201,
          statusText: 'Created',
          headers: {},
          config: {} as AxiosRequestConfig
        };

      case 'put':
        const updateData = data as Partial<InventoryItem> & { id: string };
        const allInventory = await offlineDb.getAllInventory(tenantId);
        const existingItem = allInventory.find(item => item.id === updateData.id);
        if (!existingItem) {
          throw new Error('Inventory item not found');
        }
        const updatedItem: InventoryItem & { _lastModified: number; _syncStatus: 'pending' | 'synced' | 'conflict' } = {
          ...existingItem,
          ...updateData,
          _lastModified: Date.now(),
          _syncStatus: 'pending' as const
        };
        await offlineDb.putInventoryItem(updatedItem);
        await offlineQueue.add('UPDATE', 'inventory', updatedItem.id, updatedItem as unknown as Record<string, unknown>, tenantId);
        return {
          data: updatedItem as T,
          status: 200,
          statusText: 'OK',
          headers: {},
          config: {} as AxiosRequestConfig
        };

      default:
        throw new Error(`Unsupported method: ${method}`);
    }
  }

  private async handleSalesRequest<T>(method: string | undefined, data: unknown, tenantId: string): Promise<ApiResponse<T>> {
    switch (method?.toLowerCase()) {
      case 'get':
        const sales = await offlineDb.getAllSales(tenantId);
        return {
          data: { data: sales, total: sales.length } as T,
          status: 200,
          statusText: 'OK',
          headers: {},
          config: {} as AxiosRequestConfig
        };

      case 'post':
        const saleData = data as Omit<Sale, 'id' | 'tenantId' | '_lastModified' | '_syncStatus'>;
        const newSale: Sale & { _lastModified: number; _syncStatus: 'pending' | 'synced' | 'conflict' } = {
          ...saleData,
          id: this.generateTempId(),
          tenantId,
          _lastModified: Date.now(),
          _syncStatus: 'pending' as const
        };
        await offlineDb.putSale(newSale);
        await offlineQueue.add('CREATE', 'sale', newSale.id, newSale as unknown as Record<string, unknown>, tenantId);
        return {
          data: newSale as T,
          status: 201,
          statusText: 'Created',
          headers: {},
          config: {} as AxiosRequestConfig
        };

      default:
        throw new Error(`Unsupported method: ${method}`);
    }
  }

  private async handleProductRequest<T>(method: string | undefined, data: unknown, tenantId: string): Promise<ApiResponse<T>> {
    switch (method?.toLowerCase()) {
      case 'get':
        const products = await offlineDb.getAllProducts(tenantId);
        return {
          data: { data: products, total: products.length } as T,
          status: 200,
          statusText: 'OK',
          headers: {},
          config: {} as AxiosRequestConfig
        };

      default:
        throw new Error(`Unsupported method: ${method}`);
    }
  }

  private async handleMedicineRequest<T>(method: string | undefined, data: unknown, config: AxiosRequestConfig): Promise<ApiResponse<T>> {
    switch (method?.toLowerCase()) {
      case 'get':
        // Extract search parameter from config
        const search = config.params?.search as string;
        const medicines = await offlineDb.getAllMedicines(search);
        return {
          data: medicines as T,
          status: 200,
          statusText: 'OK',
          headers: {},
          config
        };

      default:
        throw new Error(`Unsupported method: ${method}`);
    }
  }

  private getEntityTypeFromUrl(url: string): string {
    if (url.includes('/inventory')) return 'inventory';
    if (url.includes('/sales')) return 'sales';
    if (url.includes('/products')) return 'products';
    if (url.includes('/medicine')) return 'medicine';
    return 'unknown';
  }

  private getTenantId(): string {
    // Get tenant ID from localStorage or auth state
    const authState = OfflineAuth.getAuthState();
    return (authState?.tenant?.id as string) || 'default-tenant';
  }

  private generateTempId(): string {
    return `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Convenience methods
  async get<T = unknown>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>({ ...config, method: 'GET', url });
  }

  async post<T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>({ ...config, method: 'POST', url, data });
  }

  async put<T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>({ ...config, method: 'PUT', url, data });
  }

  async delete<T = unknown>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>({ ...config, method: 'DELETE', url });
  }
}

// Create instance with same config as main API
const PRIMARY_API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1';
const BACKUP_API_URL = process.env.NEXT_PUBLIC_API_URL_BACKUP || PRIMARY_API_URL;

export const offlineApi = new OfflineApiClient(PRIMARY_API_URL, BACKUP_API_URL);