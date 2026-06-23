'use client';
import dynamic from 'next/dynamic';
import { createContext, useCallback, useContext, useState } from 'react';

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

// Lazy import to avoid circular deps
const ItemDetailModalLazy = dynamic(
  () => import('@/components/shared/ItemDetailModal'),
  { ssr: false },
);

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
        <ItemDetailModalLazy
          variantId={state.variantId}
          showBatches={state.showBatches}
          onClose={closeItem}
        />
      )}
    </ItemDetailContext.Provider>
  );
}
