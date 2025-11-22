import { openDB, DBSchema, IDBPDatabase, deleteDB } from 'idb';
import { OfflineQueueItem, SyncMetadata } from '@/types/offline';
import { User, Tenant, Product, ProductVariant, InventoryItem, Sale, SaleItem, Medicine, MedicineGeneric, MedicineManufacturer } from '@/types';

interface SuperShopDBSchema extends DBSchema {
  // Core entity stores
  users: {
    key: string;
    value: User & { _lastModified: number; _syncStatus: 'synced' | 'pending' | 'conflict' };
    indexes: { 'by-tenant': string };
  };
  tenants: {
    key: string;
    value: Tenant & { _lastModified: number; _syncStatus: 'synced' | 'pending' | 'conflict' };
  };
  products: {
    key: string;
    value: Product & { _lastModified: number; _syncStatus: 'synced' | 'pending' | 'conflict' };
    indexes: { 'by-tenant': string; 'by-category': string; 'by-brand': string };
  };
  variants: {
    key: string;
    value: ProductVariant & { _lastModified: number; _syncStatus: 'synced' | 'pending' | 'conflict' };
    indexes: { 'by-product': string; 'by-tenant': string };
  };
  inventory: {
    key: string;
    value: InventoryItem & { _lastModified: number; _syncStatus: 'synced' | 'pending' | 'conflict'; _serverVersion?: number };
    indexes: { 'by-tenant': string; 'by-variant': string; 'by-quantity': number; 'by-expiry': Date };
  };
  sales: {
    key: string;
    value: Sale & { _lastModified: number; _syncStatus: 'synced' | 'pending' | 'conflict'; _serverVersion?: number };
    indexes: { 'by-tenant': string; 'by-employee': string; 'by-date': Date; 'by-type': string };
  };
  saleItems: {
    key: string;
    value: SaleItem & { _lastModified: number; _syncStatus: 'synced' | 'pending' | 'conflict'; _serverVersion?: number };
    indexes: { 'by-sale': string; 'by-inventory': string; 'by-tenant': string };
  };

  // Medicine database stores
  medicines: {
    key: string;
    value: Medicine & { _lastModified: number; _syncStatus: 'synced' | 'pending' | 'conflict' };
    indexes: { 'by-brand': string; 'by-generic': string; 'by-manufacturer': string };
  };
  medicineGenerics: {
    key: string;
    value: MedicineGeneric & { _lastModified: number; _syncStatus: 'synced' | 'pending' | 'conflict' };
    indexes: { 'by-name': string; 'by-class': string };
  };
  medicineManufacturers: {
    key: string;
    value: MedicineManufacturer & { _lastModified: number; _syncStatus: 'synced' | 'pending' | 'conflict' };
    indexes: { 'by-name': string };
  };

  // Offline operation management
  offlineQueue: {
    key: string;
    value: OfflineQueueItem;
    indexes: { 'by-entity': [string, string]; 'by-timestamp': number; 'by-retry': number };
  };

  // Sync metadata
  syncMetadata: {
    key: string;
    value: SyncMetadata;
  };

  // API response cache
  apiCache: {
    key: string;
    value: { url: string; method: string; data: unknown; timestamp: number; expiresAt: number; etag?: string };
    indexes: { 'by-url': string; 'by-expires': number };
  };
}

class OfflineDatabase {
  private db: IDBPDatabase<SuperShopDBSchema> | null = null;
  private readonly dbName = 'SuperShopDB';
  private readonly dbVersion = 3; // Incremented to force medicine schema upgrade

  async init(): Promise<void> {
    if (this.db) return;

    this.db = await openDB<SuperShopDBSchema>(this.dbName, this.dbVersion, {
      upgrade(db, oldVersion, newVersion) {
        console.log(`🔄 Upgrading IndexedDB from version ${oldVersion} to ${newVersion}`);

        // Users store
        if (!db.objectStoreNames.contains('users')) {
          console.log('📦 Creating users store');
          const userStore = db.createObjectStore('users', { keyPath: 'id' });
          userStore.createIndex('by-tenant', 'tenantId');
        }

        // Tenants store
        if (!db.objectStoreNames.contains('tenants')) {
          console.log('📦 Creating tenants store');
          db.createObjectStore('tenants', { keyPath: 'id' });
        }

        // Products store
        if (!db.objectStoreNames.contains('products')) {
          console.log('📦 Creating products store');
          const productStore = db.createObjectStore('products', { keyPath: 'id' });
          productStore.createIndex('by-tenant', 'tenantId');
          productStore.createIndex('by-category', 'categoryId');
          productStore.createIndex('by-brand', 'brandId');
        }

        // Variants store
        if (!db.objectStoreNames.contains('variants')) {
          console.log('📦 Creating variants store');
          const variantStore = db.createObjectStore('variants', { keyPath: 'id' });
          variantStore.createIndex('by-product', 'productId');
          variantStore.createIndex('by-tenant', 'tenantId');
        }

        // Inventory store
        if (!db.objectStoreNames.contains('inventory')) {
          console.log('📦 Creating inventory store');
          const inventoryStore = db.createObjectStore('inventory', { keyPath: 'id' });
          inventoryStore.createIndex('by-tenant', 'tenantId');
          inventoryStore.createIndex('by-variant', 'variantId');
          inventoryStore.createIndex('by-quantity', 'quantity');
          inventoryStore.createIndex('by-expiry', 'expiryDate');
        }

        // Sales store
        if (!db.objectStoreNames.contains('sales')) {
          console.log('📦 Creating sales store');
          const salesStore = db.createObjectStore('sales', { keyPath: 'id' });
          salesStore.createIndex('by-tenant', 'tenantId');
          salesStore.createIndex('by-employee', 'employeeId');
          salesStore.createIndex('by-date', 'saleTime');
          salesStore.createIndex('by-type', 'saleType');
        }

        // Sale items store
        if (!db.objectStoreNames.contains('saleItems')) {
          console.log('📦 Creating saleItems store');
          const saleItemStore = db.createObjectStore('saleItems', { keyPath: 'id' });
          saleItemStore.createIndex('by-sale', 'saleId');
          saleItemStore.createIndex('by-inventory', 'inventoryId');
          saleItemStore.createIndex('by-tenant', 'tenantId');
        }

        // Medicine stores - Always create if upgrading to version 3+
        if (!db.objectStoreNames.contains('medicines')) {
          console.log('💊 Creating medicines store');
          const medicineStore = db.createObjectStore('medicines', { keyPath: 'id' });
          medicineStore.createIndex('by-brand', 'brandName');
          medicineStore.createIndex('by-generic', 'genericId');
          medicineStore.createIndex('by-manufacturer', 'manufacturerId');
        }

        if (!db.objectStoreNames.contains('medicineGenerics')) {
          console.log('💊 Creating medicineGenerics store');
          const genericStore = db.createObjectStore('medicineGenerics', { keyPath: 'id' });
          genericStore.createIndex('by-name', 'genericName');
          genericStore.createIndex('by-class', 'drugClassId');
        }

        if (!db.objectStoreNames.contains('medicineManufacturers')) {
          console.log('💊 Creating medicineManufacturers store');
          const manufacturerStore = db.createObjectStore('medicineManufacturers', { keyPath: 'id' });
          manufacturerStore.createIndex('by-name', 'manufacturerName');
        }

        // Offline queue store
        if (!db.objectStoreNames.contains('offlineQueue')) {
          console.log('📋 Creating offlineQueue store');
          const queueStore = db.createObjectStore('offlineQueue', { keyPath: 'id' });
          queueStore.createIndex('by-entity', ['entityType', 'entityId']);
          queueStore.createIndex('by-timestamp', 'timestamp');
          queueStore.createIndex('by-retry', 'retryCount');
        }

        // Sync metadata store
        if (!db.objectStoreNames.contains('syncMetadata')) {
          console.log('🔄 Creating syncMetadata store');
          db.createObjectStore('syncMetadata', { keyPath: 'id' });
        }

        // API cache store
        if (!db.objectStoreNames.contains('apiCache')) {
          console.log('💾 Creating apiCache store');
          const cacheStore = db.createObjectStore('apiCache', { keyPath: 'url' });
          cacheStore.createIndex('by-expires', 'expiresAt');
        }

        console.log('✅ IndexedDB upgrade completed');
      },
    });

    console.log('IndexedDB initialized with version', this.dbVersion);
  }

  // Reset database for testing (deletes and recreates)
  async resetDatabase(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
    }

    // Delete the database
    await deleteDB(this.dbName);

    // Reinitialize
    await this.init();
    console.log('Database reset and reinitialized');
  }

  // Generic CRUD operations with specific store types
  async getUser(id: string): Promise<User & { _lastModified: number; _syncStatus: string } | undefined> {
    if (!this.db) await this.init();
    return this.db!.get('users', id);
  }

  async getTenant(id: string): Promise<Tenant & { _lastModified: number; _syncStatus: string } | undefined> {
    if (!this.db) await this.init();
    return this.db!.get('tenants', id);
  }

  async getProduct(id: string): Promise<Product & { _lastModified: number; _syncStatus: string } | undefined> {
    if (!this.db) await this.init();
    return this.db!.get('products', id);
  }

  async getAllUsers(tenantId?: string): Promise<Array<User & { _lastModified: number; _syncStatus: string }>> {
    if (!this.db) await this.init();
    if (tenantId) {
      return this.db!.getAllFromIndex('users', 'by-tenant', tenantId);
    }
    return this.db!.getAll('users');
  }

  async getAllProducts(tenantId?: string): Promise<Array<Product & { _lastModified: number; _syncStatus: string }>> {
    if (!this.db) await this.init();
    if (tenantId) {
      return this.db!.getAllFromIndex('products', 'by-tenant', tenantId);
    }
    return this.db!.getAll('products');
  }

  async getAllInventory(tenantId?: string): Promise<Array<InventoryItem & { _lastModified: number; _syncStatus: string; _serverVersion?: number }>> {
    if (!this.db) await this.init();
    if (tenantId) {
      return this.db!.getAllFromIndex('inventory', 'by-tenant', tenantId);
    }
    return this.db!.getAll('inventory');
  }

  async getAllSales(tenantId?: string): Promise<Array<Sale & { _lastModified: number; _syncStatus: string; _serverVersion?: number }>> {
    if (!this.db) await this.init();
    if (tenantId) {
      return this.db!.getAllFromIndex('sales', 'by-tenant', tenantId);
    }
    return this.db!.getAll('sales');
  }

  async putUser(user: User & { _lastModified: number; _syncStatus: 'synced' | 'pending' | 'conflict' }): Promise<void> {
    if (!this.db) await this.init();
    await this.db!.put('users', user);
  }

  async putTenant(tenant: Tenant & { _lastModified: number; _syncStatus: 'synced' | 'pending' | 'conflict' }): Promise<void> {
    if (!this.db) await this.init();
    await this.db!.put('tenants', tenant);
  }

  async putProduct(product: Product & { _lastModified: number; _syncStatus: 'synced' | 'pending' | 'conflict' }): Promise<void> {
    if (!this.db) await this.init();
    await this.db!.put('products', product);
  }

  async putInventoryItem(item: InventoryItem & { _lastModified: number; _syncStatus: 'synced' | 'pending' | 'conflict'; _serverVersion?: number }): Promise<void> {
    if (!this.db) await this.init();
    await this.db!.put('inventory', item);
  }

  async putSale(sale: Sale & { _lastModified: number; _syncStatus: 'synced' | 'pending' | 'conflict'; _serverVersion?: number }): Promise<void> {
    if (!this.db) await this.init();
    await this.db!.put('sales', sale);
  }

  async putSaleItem(item: SaleItem & { _lastModified: number; _syncStatus: 'synced' | 'pending' | 'conflict'; _serverVersion?: number }): Promise<void> {
    if (!this.db) await this.init();
    await this.db!.put('saleItems', item);
  }

  async deleteUser(id: string): Promise<void> {
    if (!this.db) await this.init();
    await this.db!.delete('users', id);
  }

  async deleteProduct(id: string): Promise<void> {
    if (!this.db) await this.init();
    await this.db!.delete('products', id);
  }

  async deleteInventoryItem(id: string): Promise<void> {
    if (!this.db) await this.init();
    await this.db!.delete('inventory', id);
  }

  async deleteSale(id: string): Promise<void> {
    if (!this.db) await this.init();
    await this.db!.delete('sales', id);
  }

  // Medicine CRUD operations
  async getMedicine(id: string): Promise<Medicine & { _lastModified: number; _syncStatus: string } | undefined> {
    if (!this.db) await this.init();
    return this.db!.get('medicines', id);
  }

  async getAllMedicines(search?: string): Promise<Array<Medicine & { _lastModified: number; _syncStatus: string }>> {
    if (!this.db) await this.init();
    if (search) {
      // Simple search implementation - in a real app, you might want more sophisticated search
      const allMedicines = await this.db!.getAll('medicines');
      return allMedicines.filter(med =>
        med.brandName.toLowerCase().includes(search.toLowerCase()) ||
        med.generic?.genericName.toLowerCase().includes(search.toLowerCase()) ||
        med.manufacturer?.manufacturerName.toLowerCase().includes(search.toLowerCase()) ||
        med.strength?.toLowerCase().includes(search.toLowerCase()) ||
        med.dosageForm?.toLowerCase().includes(search.toLowerCase())
      );
    }
    return this.db!.getAll('medicines');
  }

  async putMedicine(medicine: Medicine & { _lastModified: number; _syncStatus: 'synced' | 'pending' | 'conflict' }): Promise<void> {
    if (!this.db) await this.init();
    await this.db!.put('medicines', medicine);
  }

  async deleteMedicine(id: string): Promise<void> {
    if (!this.db) await this.init();
    await this.db!.delete('medicines', id);
  }

  async getMedicineGeneric(id: string): Promise<MedicineGeneric & { _lastModified: number; _syncStatus: string } | undefined> {
    if (!this.db) await this.init();
    return this.db!.get('medicineGenerics', id);
  }

  async getAllMedicineGenerics(): Promise<Array<MedicineGeneric & { _lastModified: number; _syncStatus: string }>> {
    if (!this.db) await this.init();
    return this.db!.getAll('medicineGenerics');
  }

  async putMedicineGeneric(generic: MedicineGeneric & { _lastModified: number; _syncStatus: 'synced' | 'pending' | 'conflict' }): Promise<void> {
    if (!this.db) await this.init();
    await this.db!.put('medicineGenerics', generic);
  }

  async getMedicineManufacturer(id: string): Promise<MedicineManufacturer & { _lastModified: number; _syncStatus: string } | undefined> {
    if (!this.db) await this.init();
    return this.db!.get('medicineManufacturers', id);
  }

  async getAllMedicineManufacturers(): Promise<Array<MedicineManufacturer & { _lastModified: number; _syncStatus: string }>> {
    if (!this.db) await this.init();
    return this.db!.getAll('medicineManufacturers');
  }

  async putMedicineManufacturer(manufacturer: MedicineManufacturer & { _lastModified: number; _syncStatus: 'synced' | 'pending' | 'conflict' }): Promise<void> {
    if (!this.db) await this.init();
    await this.db!.put('medicineManufacturers', manufacturer);
  }

  // Specialized methods for offline operations
  async addToQueue(item: OfflineQueueItem): Promise<void> {
    if (!this.db) await this.init();
    await this.db!.put('offlineQueue', item);
  }

  async getQueueItems(): Promise<OfflineQueueItem[]> {
    if (!this.db) await this.init();
    return this.db!.getAll('offlineQueue');
  }

  async removeFromQueue(id: string): Promise<void> {
    if (!this.db) await this.init();
    await this.db!.delete('offlineQueue', id);
  }

  async getSyncMetadata(tenantId: string): Promise<SyncMetadata | undefined> {
    if (!this.db) await this.init();
    return this.db!.get('syncMetadata', `sync_${tenantId}`);
  }

  async updateSyncMetadata(metadata: SyncMetadata): Promise<void> {
    if (!this.db) await this.init();
    await this.db!.put('syncMetadata', metadata);
  }

  // Cache management
  async getCachedResponse(url: string): Promise<unknown | null> {
    if (!this.db) await this.init();
    const cached = await this.db!.get('apiCache', url);
    if (!cached) return null;

    if (cached.expiresAt < Date.now()) {
      await this.db!.delete('apiCache', url);
      return null;
    }

    return cached.data;
  }

  async setCachedResponse(url: string, method: string, data: unknown, ttl: number = 300000): Promise<void> {
    if (!this.db) await this.init();
    const cacheEntry = {
      url,
      method,
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + ttl
    };
    await this.db!.put('apiCache', cacheEntry);
  }

  // Bulk operations for sync
  async bulkPutInventory(items: Array<InventoryItem & { _lastModified: number; _syncStatus: 'synced' | 'pending' | 'conflict'; _serverVersion?: number }>): Promise<void> {
    if (!this.db) await this.init();
    const tx = this.db!.transaction('inventory', 'readwrite');
    const store = tx.store;

    for (const item of items) {
      await store.put(item);
    }

    await tx.done;
  }

  async bulkPutSales(items: Array<Sale & { _lastModified: number; _syncStatus: 'synced' | 'pending' | 'conflict'; _serverVersion?: number }>): Promise<void> {
    if (!this.db) await this.init();
    const tx = this.db!.transaction('sales', 'readwrite');
    const store = tx.store;

    for (const item of items) {
      await store.put(item);
    }

    await tx.done;
  }

  // Cleanup operations
  async cleanupExpiredCache(): Promise<void> {
    if (!this.db) await this.init();
    const tx = this.db!.transaction('apiCache', 'readwrite');
    const store = tx.store;
    const index = store.index('by-expires');

    let cursor = await index.openCursor(IDBKeyRange.upperBound(Date.now()));

    while (cursor) {
      await cursor.delete();
      cursor = await cursor.continue();
    }

    await tx.done;
  }

  async clearAllData(): Promise<void> {
    if (!this.db) await this.init();
    const tx = this.db!.transaction(['users', 'tenants', 'products', 'variants', 'inventory', 'sales', 'saleItems', 'medicines', 'medicineGenerics', 'medicineManufacturers', 'offlineQueue', 'syncMetadata', 'apiCache'], 'readwrite');

    await tx.objectStore('users').clear();
    await tx.objectStore('tenants').clear();
    await tx.objectStore('products').clear();
    await tx.objectStore('variants').clear();
    await tx.objectStore('inventory').clear();
    await tx.objectStore('sales').clear();
    await tx.objectStore('saleItems').clear();
    await tx.objectStore('medicines').clear();
    await tx.objectStore('medicineGenerics').clear();
    await tx.objectStore('medicineManufacturers').clear();
    await tx.objectStore('offlineQueue').clear();
    await tx.objectStore('syncMetadata').clear();
    await tx.objectStore('apiCache').clear();

    await tx.done;
  }

  // Database maintenance
  async getDatabaseSize(): Promise<number> {
    if (!this.db) await this.init();

    const users = await this.db!.getAll('users');
    const tenants = await this.db!.getAll('tenants');
    const products = await this.db!.getAll('products');
    const variants = await this.db!.getAll('variants');
    const inventory = await this.db!.getAll('inventory');
    const sales = await this.db!.getAll('sales');
    const saleItems = await this.db!.getAll('saleItems');
    const medicines = await this.db!.getAll('medicines');
    const medicineGenerics = await this.db!.getAll('medicineGenerics');
    const medicineManufacturers = await this.db!.getAll('medicineManufacturers');
    const queue = await this.db!.getAll('offlineQueue');
    const metadata = await this.db!.getAll('syncMetadata');
    const cache = await this.db!.getAll('apiCache');

    const allData = [
      ...users, ...tenants, ...products, ...variants,
      ...inventory, ...sales, ...saleItems, ...medicines,
      ...medicineGenerics, ...medicineManufacturers, ...queue, ...metadata, ...cache
    ];

    return JSON.stringify(allData).length;
  }
}

// Export singleton instance
export const offlineDb = new OfflineDatabase();