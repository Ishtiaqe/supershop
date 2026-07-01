import { supabase } from '@/lib/supabase'
import { idbCache } from './indexedDB'

interface Product {
  id: string
  tenantId: string
  name: string
  description?: string
  productType: string
  genericName?: string
  manufacturerName?: string
  createdAt: string
  updatedAt: string
}

interface ProductVariant {
  id: string
  tenantId: string
  productId: string
  variantName: string
  sku: string
  retailPrice: number
  createdAt: string
  updatedAt: string
}

const CACHE_TTL = 24 * 60 * 60 * 1000 // 24 hours

class MasterDataCache {
  private productsPromise: Promise<Product[]> | null = null
  private variantsPromise: Promise<ProductVariant[]> | null = null

  async getProducts(tenantId: string): Promise<Product[]> {
    // Check IndexedDB first
    const cached = await idbCache.getAll<Product>('products')
    if (cached.length > 0) {
      // Verify cache belongs to this tenant
      const tenantProducts = cached.filter(p => p.tenantId === tenantId)
      if (tenantProducts.length > 0) {
        return tenantProducts
      }
    }

    // Use in-flight promise to avoid duplicate fetches
    if (!this.productsPromise) {
      this.productsPromise = this.fetchAndCacheProducts(tenantId)
    }

    try {
      return await this.productsPromise
    } finally {
      this.productsPromise = null
    }
  }

  async getVariants(tenantId: string): Promise<ProductVariant[]> {
    // Check IndexedDB first
    const cached = await idbCache.getAll<ProductVariant>('variants')
    if (cached.length > 0) {
      // Verify cache belongs to this tenant
      const tenantVariants = cached.filter(v => v.tenantId === tenantId)
      if (tenantVariants.length > 0) {
        return tenantVariants
      }
    }

    // Use in-flight promise to avoid duplicate fetches
    if (!this.variantsPromise) {
      this.variantsPromise = this.fetchAndCacheVariants(tenantId)
    }

    try {
      return await this.variantsPromise
    } finally {
      this.variantsPromise = null
    }
  }

  private async fetchAndCacheProducts(tenantId: string): Promise<Product[]> {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('tenantId', tenantId)

    if (error) throw error

    const products = data || []
    
    // Cache each product in IndexedDB
    await Promise.all(
      products.map(product => 
        idbCache.set('products', product.id, product, CACHE_TTL)
      )
    )

    return products
  }

  private async fetchAndCacheVariants(tenantId: string): Promise<ProductVariant[]> {
    const { data, error } = await supabase
      .from('product_variants')
      .select('*')
      .eq('tenantId', tenantId)

    if (error) throw error

    const variants = data || []
    
    // Cache each variant in IndexedDB
    await Promise.all(
      variants.map(variant => 
        idbCache.set('variants', variant.id, variant, CACHE_TTL)
      )
    )

    return variants
  }

  async invalidateProducts(): Promise<void> {
    await idbCache.clear('products')
  }

  async invalidateVariants(): Promise<void> {
    await idbCache.clear('variants')
  }

  async invalidateAll(): Promise<void> {
    await Promise.all([
      this.invalidateProducts(),
      this.invalidateVariants()
    ])
  }

  // Helper to get variant with product embedded
  async getVariantsWithProducts(tenantId: string): Promise<(ProductVariant & { product: Product })[]> {
    const [variants, products] = await Promise.all([
      this.getVariants(tenantId),
      this.getProducts(tenantId)
    ])

    const productMap = new Map(products.map(p => [p.id, p]))

    return variants
      .map(variant => ({
        ...variant,
        product: productMap.get(variant.productId)!
      }))
      .filter(v => v.product) // Only return variants with valid products
  }
}

export const masterDataCache = new MasterDataCache()
export type { Product, ProductVariant }
