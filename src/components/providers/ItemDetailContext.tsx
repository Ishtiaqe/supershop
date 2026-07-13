'use client';
import { Suspense, createContext, useCallback, useContext, useState } from 'react';
import { lazyWithRetry, LazyImportErrorBoundary } from '@/components/LazyImportErrorBoundary';

interface ItemDetailOptions {
  showBatches?: boolean;
}

interface ItemDetailContextValue {
  openItem: (variantId: string, options?: ItemDetailOptions) => void;
  closeItem: () => void;
}

const ItemDetailContext = createContext<ItemDetailContextValue>({
  openItem: () => {},
  closeItem: () => {},
});

export function useItemDetail() {
  return useContext(ItemDetailContext);
}

const ItemDetailModalLazy = lazyWithRetry(() => import('@/components/shared/ItemDetailModal'));

export function ItemDetailProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<{ variantId: string | null; showBatches: boolean }>({
    variantId: null,
    showBatches: false,
  });

  const openItem = useCallback((variantId: string, options: ItemDetailOptions = {}) => {
    setState({ variantId, showBatches: options.showBatches ?? false });
  }, []);

  const closeItem = useCallback(() => {
    setState({ variantId: null, showBatches: false });
  }, []);

  return (
    <ItemDetailContext.Provider value={{ openItem, closeItem }}>
      {children}
      {state.variantId && (
        <LazyImportErrorBoundary>
          <Suspense fallback={null}>
            <ItemDetailModalLazy
              variantId={state.variantId}
              showBatches={state.showBatches}
              onClose={closeItem}
            />
          </Suspense>
        </LazyImportErrorBoundary>
      )}
    </ItemDetailContext.Provider>
  );
}
