"use client";

import { useEffect, useMemo, useRef, type RefObject } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Minus, Plus, Trash2, ShoppingCart, User, Phone } from "lucide-react";
import { cn } from "@/lib/utils";
import type { InventoryItem } from "@/types";

type CartItem = {
  key: string;
  name: string;
  unitPrice: number;
  purchasePrice: number;
  quantity: number;
  discount: number;
  maxDiscount: number;
  batches: InventoryItem[];
};

type AggregatedItem = {
  key: string;
  name: string;
  sku: string;
  totalQty: number;
  retailPrice: number;
  batches: InventoryItem[];
};

interface MobilePOSProps {
  search: string;
  setSearch: (s: string) => void;
  isDropdownOpen: boolean;
  setIsDropdownOpen: (open: boolean) => void;
  inputRef: RefObject<HTMLInputElement>;
  aggregatedItems: AggregatedItem[];
  itemsLoading: boolean;
  selectedKey: string | null;
  setSelectedKey: (key: string | null) => void;
  selectedItemName: string;
  setSelectedItemName: (name: string) => void;
  qty: number | null;
  setQty: (qty: number | null) => void;
  itemDiscount: number;
  setItemDiscount: (discount: number) => void;
  addToCart: () => void;
  cart: CartItem[];
  setCart: React.Dispatch<React.SetStateAction<CartItem[]>>;
  removeFromCart: (key: string) => void;
  customerName: string;
  setCustomerName: (name: string) => void;
  customerPhone: string;
  setCustomerPhone: (phone: string) => void;
  isCreditSale: boolean;
  setIsCreditSale: (v: boolean) => void;
  cashReceived: number;
  setCashReceived: (v: number) => void;
  total: number;
  checkout: () => void;
  salePending: boolean;
}

function getMaxAllowedDiscount(
  retailPrice: number,
  purchasePrice: number,
  maxDiscountRate?: number
): number {
  if (!purchasePrice || purchasePrice <= 0 || !retailPrice || retailPrice <= 0) {
    return maxDiscountRate ?? 100;
  }
  const profitBasedMax = ((retailPrice - 1.04 * purchasePrice) / retailPrice) * 100;
  const floor = Math.max(0, profitBasedMax);
  return maxDiscountRate !== undefined ? Math.min(floor, maxDiscountRate) : floor;
}

export function MobilePOS({
  search,
  setSearch,
  isDropdownOpen,
  setIsDropdownOpen,
  inputRef,
  aggregatedItems,
  itemsLoading,
  selectedKey,
  setSelectedKey,
  selectedItemName,
  setSelectedItemName,
  qty,
  setQty,
  itemDiscount,
  setItemDiscount,
  addToCart,
  cart,
  setCart,
  removeFromCart,
  customerName,
  setCustomerName,
  customerPhone,
  setCustomerPhone,
  isCreditSale,
  setIsCreditSale,
  cashReceived,
  setCashReceived,
  total,
  checkout,
  salePending,
}: MobilePOSProps) {
  const displayCart = useMemo(() => [...cart].reverse(), [cart]);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isDropdownOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isDropdownOpen, setIsDropdownOpen]);

  function updateQty(key: string, delta: number) {
    setCart((prev) =>
      prev.map((item) => {
        if (item.key !== key) return item;
        const next = Math.max(1, item.quantity + delta);
        return { ...item, quantity: next };
      })
    );
  }

  function updateDiscount(key: string, value: number) {
    setCart((prev) =>
      prev.map((item) => {
        if (item.key !== key) return item;
        const maxAllowed = getMaxAllowedDiscount(
          item.unitPrice,
          item.purchasePrice,
          item.maxDiscount
        );
        return { ...item, discount: Math.min(value, maxAllowed) };
      })
    );
  }

  return (
    <div className="flex flex-col min-h-[calc(100dvh-4rem)] pb-24">
      {/* Sticky search bar with dropdown results */}
      <div className="sticky top-0 z-30 -mx-4 px-4 py-3 bg-background border-b border-border">
        <div className="relative" ref={dropdownRef}>
          <Input
            ref={inputRef}
            type="search"
            inputMode="search"
            placeholder="Search item or SKU..."
            className="h-12 text-base pr-10"
            value={selectedItemName || search}
            onChange={(e) => {
              const value = e.target.value;
              setSearch(value);
              setSelectedItemName("");
              setSelectedKey(null);
              setIsDropdownOpen(value.length > 0);
            }}
            onFocus={() => setIsDropdownOpen(search.length > 0)}
          />
          {cartCount > 0 && (
            <Badge
              variant="secondary"
              className="absolute right-3 top-1/2 -translate-y-1/2"
            >
              {cartCount}
            </Badge>
          )}

          {/* Search results dropdown */}
          {isDropdownOpen && (
            <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-popover border border-border rounded-lg shadow-xl max-h-[60vh] overflow-y-auto">
              {itemsLoading ? (
                <div className="p-4 text-center text-muted-foreground">Searching...</div>
              ) : aggregatedItems.length > 0 ? (
                aggregatedItems.map((it) => (
                  <button
                    key={it.key}
                    type="button"
                    disabled={it.totalQty <= 0}
                    onClick={() => {
                      setSelectedKey(it.key);
                      setSelectedItemName(it.name);
                      setQty(1);
                      setItemDiscount(0);
                      setIsDropdownOpen(false);
                    }}
                    className="w-full flex justify-between items-center p-3 border-b border-border last:border-b-0 text-left hover:bg-accent disabled:opacity-50"
                  >
                    <div className="flex flex-col">
                      <span className="font-semibold text-sm">{it.name}</span>
                      <span className="text-xs text-muted-foreground">SKU: {it.sku}</span>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="font-bold text-sm">৳{it.retailPrice.toFixed(2)}</span>
                      <span
                        className={cn(
                          "text-xs",
                          it.totalQty > 0 ? "text-green-600 font-medium" : "text-destructive"
                        )}
                      >
                        {it.totalQty > 0 ? `${it.totalQty} in stock` : "Out of stock"}
                      </span>
                    </div>
                  </button>
                ))
              ) : (
                <div className="p-4 text-center text-muted-foreground">No results</div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Selected item quantity controls */}
      {selectedKey && (
        <Card className="mt-3">
          <CardContent className="p-3 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="font-semibold text-sm">{selectedItemName}</div>
                <div className="text-xs text-muted-foreground">
                  {aggregatedItems.find((i) => i.key === selectedKey)?.totalQty} in stock
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-10 w-10"
                  onClick={() => setQty(Math.max(1, (qty ?? 1) - 1))}
                >
                  <Minus className="w-4 h-4" />
                </Button>
                <Input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  value={qty ?? 1}
                  onChange={(e) => setQty(parseInt(e.target.value) || 1)}
                  className="w-16 h-10 text-center"
                />
                <Button
                  variant="outline"
                  size="icon"
                  className="h-10 w-10"
                  onClick={() => {
                    const item = aggregatedItems.find((i) => i.key === selectedKey);
                    if (item) {
                      setQty(Math.min(item.totalQty, (qty ?? 1) + 1));
                    }
                  }}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div className="flex items-center justify-between gap-3">
              <label className="text-xs text-muted-foreground">Discount</label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  max={100}
                  value={itemDiscount}
                  onChange={(e) => setItemDiscount(Math.min(parseFloat(e.target.value) || 0, 100))}
                  className="w-24 h-10 text-center"
                />
                <span className="text-sm text-muted-foreground">%</span>
              </div>
            </div>

            <Button
              className="w-full h-12"
              onClick={() => {
                addToCart();
                setSelectedKey(null);
                setSelectedItemName("");
                setSearch("");
                setQty(1);
              }}
              disabled={
                !selectedKey ||
                qty === null ||
                qty < 1 ||
                (qty > (aggregatedItems.find((i) => i.key === selectedKey)?.totalQty ?? 0))
              }
            >
              Add to Cart
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Cart cards */}
      <div className="flex-1 py-4 space-y-3">
        {displayCart.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="p-6 text-center text-muted-foreground">
              <ShoppingCart className="w-8 h-8 mx-auto mb-2 opacity-50" />
              Cart is empty. Search an item to start a sale.
            </CardContent>
          </Card>
        ) : (
          displayCart.map((record) => {
            const maxAllowed = getMaxAllowedDiscount(
              record.unitPrice,
              record.purchasePrice,
              record.maxDiscount
            );
            const isViolating = record.discount > maxAllowed;
            const subtotal =
              record.quantity * (record.unitPrice * (1 - record.discount / 100));

            return (
              <Card key={record.key} className="overflow-hidden">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-semibold text-sm">{record.name}</div>
                      <div className="text-xs text-muted-foreground">
                        ৳{record.unitPrice.toFixed(2)} each
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => removeFromCart(record.key)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-9 w-9"
                        onClick={() => updateQty(record.key, -1)}
                      >
                        <Minus className="w-4 h-4" />
                      </Button>
                      <Input
                        type="number"
                        inputMode="numeric"
                        min={1}
                        value={record.quantity}
                        onChange={(e) => {
                          const newQty = parseInt(e.target.value) || 1;
                          setCart((prev) =>
                            prev.map((item) =>
                              item.key === record.key ? { ...item, quantity: newQty } : item
                            )
                          );
                        }}
                        className="w-16 h-9 text-center"
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-9 w-9"
                        onClick={() => updateQty(record.key, 1)}
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>

                    <div className="text-right">
                      <div className="font-bold text-sm">৳{subtotal.toFixed(2)}</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3 pt-2 border-t border-border">
                    <div className="space-y-0.5">
                      <span className="text-xs text-muted-foreground">Discount</span>
                      {isViolating && (
                        <span className="block text-xs text-destructive">Max {maxAllowed.toFixed(1)}%</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        inputMode="decimal"
                        min={0}
                        max={maxAllowed}
                        value={record.discount}
                        onChange={(e) =>
                          updateDiscount(record.key, parseFloat(e.target.value) || 0)
                        }
                        className={cn(
                          "w-24 h-10 text-center",
                          isViolating && "border-destructive focus-visible:ring-destructive"
                        )}
                      />
                      <span className="text-sm text-muted-foreground">%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Customer Info card - always visible */}
      <Card className="mt-3">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 font-semibold text-sm">
              <User className="w-4 h-4" />
              Customer Info
            </span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={isCreditSale}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setIsCreditSale(checked);
                  if (!checked) setCashReceived(0);
                }}
              />
              <div className="w-9 h-5 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-background after:border-border after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
              <span className="ml-2 text-xs text-muted-foreground">Credit Sale</span>
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Customer Name</label>
              <Input
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Name"
                className="h-11"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Phone</label>
              <Input
                type="tel"
                inputMode="tel"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="Phone"
                className="h-11"
              />
            </div>
          </div>

          {isCreditSale && (
            <div className="space-y-2 pt-1 border-t border-border">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Cash Received (৳)</label>
                <Input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  max={total}
                  value={cashReceived}
                  onChange={(e) => setCashReceived(parseFloat(e.target.value) || 0)}
                  className="h-11"
                />
              </div>
              <div className="text-sm font-bold text-destructive">
                Due: ৳{Math.max(0, total - cashReceived).toFixed(2)}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sticky checkout bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-background border-t border-border px-4 pt-3 pb-safe shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
        <div className="flex items-center justify-between gap-4 mb-2">
          <div>
            <div className="text-xs text-muted-foreground">Total</div>
            <div className="text-xl font-bold text-foreground">৳{total.toFixed(2)}</div>
          </div>
          <Button
            size="lg"
            onClick={checkout}
            disabled={cart.length === 0 || salePending}
            className="h-14 px-8 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-base"
          >
            {salePending ? "Processing..." : "Complete Sale"}
          </Button>
        </div>
      </div>
    </div>
  );
}
