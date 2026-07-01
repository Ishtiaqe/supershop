"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import type { InventoryItem } from "@/types";
import { useAuth } from "@/components/auth/AuthProvider";
import { useIsMobile } from "@/hooks/useMediaQuery";
import { MobilePOS } from "./MobilePOS";
import { toast } from "sonner";

const CART_STORAGE_KEY = "supershop-pos-cart";

// Import shadcn UI components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";

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

function fetchInventory(q?: string, signal?: AbortSignal) {
  try {
    if (typeof window !== "undefined" && q && q.length > 0) {
      const key = `pos-inventory:${q}`;
      const cached = sessionStorage.getItem(key);
      if (cached) {
        const parsed = JSON.parse(cached);
        const now = Date.now();
        if (parsed.__ts && parsed.__ttl && now - parsed.__ts < parsed.__ttl) {
          return Promise.resolve(parsed.data);
        }
      }
    }

    return api
      .get("/inventory", { params: q ? { q } : {}, signal })
      .then((r) => {
        if (typeof window !== "undefined" && q && q.length > 0) {
          const key = `pos-inventory:${q}`;
          const payload = { __ts: Date.now(), __ttl: 120000, data: r.data };
          try {
            sessionStorage.setItem(key, JSON.stringify(payload));
          } catch {
            /* ignore session storage errors */
          }
        }
        return r.data;
      });
  } catch {
    return api
      .get("/inventory", { params: q ? { q } : {}, signal })
      .then((r) => r.data);
  }
}

export default function POSPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const quantityRef = useRef<HTMLInputElement>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const isMobile = useIsMobile();

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const customerNameRef = useRef("");
  const customerPhoneRef = useRef("");
  const { user } = useAuth();

  const completeSaleBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isMobile) {
      inputRef.current?.focus();
    }
  }, [isMobile]);

  useEffect(() => {
    if (isMobile) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.key === "/" &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.altKey
      ) {
        const active = document.activeElement as HTMLElement;
        if (
          active &&
          (active.tagName === "INPUT" ||
            active.tagName === "TEXTAREA" ||
            active.contentEditable === "true")
        ) {
          return;
        }
        event.preventDefault();
        inputRef.current?.focus();
        setIsDropdownOpen(true);
      }

      if (event.key === "/" && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        completeSaleBtnRef.current?.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown, true);
    return () => document.removeEventListener("keydown", handleKeyDown, true);
  }, [isMobile]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  const {
    data: rawItems = [],
    isFetching: itemsLoading,
    isError: itemsError,
    error: itemsErrorObj,
  } = useQuery({
    queryKey: ["inventory", debouncedSearch],
    queryFn: ({ signal }) => fetchInventory(debouncedSearch, signal),
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  const aggregatedItems = useMemo(() => {
    const map = new Map<
      string,
      {
        key: string;
        name: string;
        sku: string;
        totalQty: number;
        retailPrice: number;
        batches: InventoryItem[];
      }
    >();

    const sortedRaw = [...(rawItems as InventoryItem[])].sort((a, b) => {
      if (!a.expiryDate) return 1;
      if (!b.expiryDate) return -1;
      return (
        new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime()
      );
    });

    sortedRaw.forEach((item) => {
      const variantId = item.variantId;
      const itemName = item.itemName;
      const key = variantId || itemName || "unknown";

      if (!map.has(key)) {
        const name = item.variant
          ? `${item.variant.product.name}${item.variant.variantName !== "Standard"
            ? ` - ${item.variant.variantName}`
            : ""
          }`
          : item.itemName || "Unknown Item";

        const sku = item.variant?.sku || "-";

        map.set(key, {
          key,
          name,
          sku,
          totalQty: 0,
          retailPrice: item.retailPrice,
          batches: [],
        });
      }

      const entry = map.get(key)!;
      entry.totalQty += item.quantity;
      entry.batches.push(item);
    });

    return Array.from(map.values());
  }, [rawItems]);

  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [selectedItemName, setSelectedItemName] = useState("");
  const [qty, setQty] = useState<number | null>(null);
  const [itemDiscount, setItemDiscount] = useState<number>(0);
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const stored = localStorage.getItem(CART_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      /* ignore corrupt storage */
    }
    return [];
  });
  const [isCreditSale, setIsCreditSale] = useState(false);
  const [cashReceived, setCashReceived] = useState<number>(0);

  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    } catch {
      /* ignore storage errors */
    }
  }, [cart]);

  const saleMutation = useMutation({
    mutationFn: (payload: {
      items: Array<{
        inventoryId: string;
        quantity: number;
        unitPrice: number;
        discount: number;
      }>;
      customerName?: string;
      customerPhone?: string;
      paymentMethod?: string;
      amountPaid?: number;
      dueAmount?: number;
    }) => api.post("/sales-history", payload).then((r) => r.data),
    onSuccess() {
      queryClient.invalidateQueries({
        queryKey: ["inventory", debouncedSearch],
        exact: true,
      });
      queryClient.removeQueries({ queryKey: ["inventory"], type: "inactive" });

      try {
        const keysToDelete: string[] = [];
        for (let i = 0; i < sessionStorage.length; i++) {
          const key = sessionStorage.key(i);
          if (key && key.startsWith("pos-inventory:")) keysToDelete.push(key);
        }
        keysToDelete.forEach((key) => sessionStorage.removeItem(key));
      } catch {
        /* ignore */
      }
      toast.success("Sale completed successfully!");
      setCart([]);
      try {
        localStorage.removeItem(CART_STORAGE_KEY);
      } catch {
        /* ignore */
      }
      setCustomerName("");
      setCustomerPhone("");
      customerNameRef.current = "";
      customerPhoneRef.current = "";
      setIsCreditSale(false);
      setCashReceived(0);
      setSelectedItemName("");
    },
    onError(err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error.response?.data?.message || "Sale failed");
    },
  });

  function addToCart() {
    if (!selectedKey) return;
    if (qty === null || qty < 1) return;
    const item = aggregatedItems.find((i) => i.key === selectedKey);
    if (!item) return;
    if (qty > item.totalQty) {
      toast.error(`Cannot add more than available stock (${item.totalQty})`);
      return;
    }

    const totalPurchase = item.batches.reduce(
      (sum, b) => sum + b.purchasePrice * b.quantity,
      0
    );
    const totalQty = item.batches.reduce((sum, b) => sum + b.quantity, 0);
    const avgPurchase = totalQty > 0 ? totalPurchase / totalQty : 0;
    const minPrice = avgPurchase * 1.04;
    const maxDiscountPercent =
      item.retailPrice > 0
        ? ((item.retailPrice - minPrice) / item.retailPrice) * 100
        : 0;

    const existingIdx = cart.findIndex((c) => c.key === selectedKey);
    if (existingIdx >= 0) {
      const existingQty = cart[existingIdx].quantity;
      if (existingQty + qty! > item.totalQty) {
        toast.error(`Cannot add more than available stock (${item.totalQty})`);
        return;
      }
      const newCart = [...cart];
      newCart[existingIdx].quantity += qty!;
      setCart(newCart);
    } else {
      setCart([
        ...cart,
        {
          key: item.key,
          name: item.name,
          unitPrice: item.retailPrice,
          purchasePrice: avgPurchase,
          quantity: qty!,
          discount: Math.min(itemDiscount, maxDiscountPercent),
          maxDiscount: maxDiscountPercent,
          batches: item.batches,
        },
      ]);
    }

    setSelectedKey(null);
    setSelectedItemName("");
    setQty(null);
    setItemDiscount(0);
    setSearch("");
    setIsDropdownOpen(false);

    setTimeout(() => {
      inputRef.current?.focus();
    }, 0);
  }

  function removeFromCart(key: string) {
    setCart((prev) => prev.filter((item) => item.key !== key));
  }

  function checkout() {
    if (isCreditSale) {
      if (!customerName.trim()) {
        toast.error("Customer name is required for credit sales");
        return;
      }
      if (!customerPhone.trim()) {
        toast.error("Customer phone number is required for credit sales");
        return;
      }
    }

    const violations = cart.filter((item) => {
      const maxAllowed = getMaxAllowedDiscount(item.unitPrice, item.purchasePrice, item.maxDiscount);
      return item.discount > maxAllowed;
    });
    if (violations.length > 0) {
      toast.error(`${violations.length} item(s) have discounts exceeding minimum profit margin.`);
      return;
    }

    const payloadItems: Array<{
      inventoryId: string;
      quantity: number;
      unitPrice: number;
      discount: number;
    }> = [];

    for (const cartItem of cart) {
      let remainingQty = cartItem.quantity;

      for (const batch of cartItem.batches) {
        if (remainingQty <= 0) break;

        const take = Math.min(remainingQty, batch.quantity);
        if (take > 0) {
          payloadItems.push({
            inventoryId: batch.id,
            quantity: take,
            unitPrice: batch.retailPrice,
            discount: cartItem.discount,
          });
          remainingQty -= take;
        }
      }

      if (remainingQty > 0) {
        toast.error(
          `Insufficient stock for ${cartItem.name}. Short by ${remainingQty}.`
        );
        return;
      }
    }

    saleMutation.mutate({
      items: payloadItems,
      customerName: customerName || undefined,
      customerPhone: customerPhone || undefined,
      paymentMethod: isCreditSale ? "CREDIT" : undefined,
      amountPaid: isCreditSale ? cashReceived : undefined,
      dueAmount: isCreditSale ? Math.max(0, total - cashReceived) : undefined,
    });
  }

  const total = useMemo(
    () =>
      cart.reduce(
        (s, it) => s + it.quantity * (it.unitPrice * (1 - it.discount / 100)),
        0
      ),
    [cart]
  );

  const displayCart = useMemo(() => [...cart].reverse(), [cart]);

  if (!user || (user.role !== "OWNER" && user.role !== "EMPLOYEE")) {
    return <div className="p-6">Access denied — Owners and employees only</div>;
  }

  return (
    <div className="space-y-4">
      {isMobile ? (
        <MobilePOS
          search={search}
          setSearch={setSearch}
          isDropdownOpen={isDropdownOpen}
          setIsDropdownOpen={setIsDropdownOpen}
          inputRef={inputRef}
          aggregatedItems={aggregatedItems}
          itemsLoading={itemsLoading}
          selectedKey={selectedKey}
          setSelectedKey={setSelectedKey}
          selectedItemName={selectedItemName}
          setSelectedItemName={setSelectedItemName}
          qty={qty}
          setQty={setQty}
          itemDiscount={itemDiscount}
          setItemDiscount={setItemDiscount}
          addToCart={addToCart}
          cart={cart}
          setCart={setCart}
          removeFromCart={removeFromCart}
          customerName={customerName}
          setCustomerName={setCustomerName}
          customerPhone={customerPhone}
          setCustomerPhone={setCustomerPhone}
          isCreditSale={isCreditSale}
          setIsCreditSale={setIsCreditSale}
          cashReceived={cashReceived}
          setCashReceived={setCashReceived}
          total={total}
          checkout={checkout}
          salePending={saleMutation.isPending}
        />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left/Middle: Select, Quantity, Add to Cart */}
        <Card className="md:col-span-2 shadow-sm border-border/60">
          <CardHeader className="pb-4 p-5">
            <CardTitle className="text-lg font-semibold">Add Item</CardTitle>
          </CardHeader>
          <CardContent className="p-5 pt-0 space-y-4">
          {itemsError && (
            <Alert variant="destructive">
              <AlertDescription>
                {
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  (itemsErrorObj as any)?.response?.status === 401
                    ? "Not signed in — please login to access inventory"
                    : "Failed to load inventory"
                }
              </AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
            <div className="sm:col-span-2 space-y-2 relative">
              <label htmlFor="pos-select-item" className="text-sm font-medium text-foreground">Select Item</label>
              <Input
                ref={inputRef}
                id="pos-select-item"
                placeholder="Type to search inventory or SKU..."
                value={selectedItemName || search}
                onChange={(e) => {
                  const value = e.target.value;
                  setSearch(value);
                  setSelectedItemName("");
                  setSelectedKey(null);
                  setIsDropdownOpen(value.length > 0);
                }}
                onFocus={() => setIsDropdownOpen(search.length > 0)}
                onKeyDown={(e) => {
                  if (e.key === "Tab") {
                    e.preventDefault();
                    setIsDropdownOpen(false);
                    quantityRef.current?.focus();
                  }
                }}
              />

              {isDropdownOpen && (
                <div
                  ref={dropdownRef}
                  className="absolute z-10 w-full mt-1 border rounded-lg shadow-lg max-h-60 overflow-y-auto bg-popover text-popover-foreground"
                >
                  {itemsLoading ? (
                    <div className="p-3 text-center text-sm text-muted-foreground">Searching...</div>
                  ) : aggregatedItems.length > 0 ? (
                    aggregatedItems.map((it) => (
                      <button
                        key={it.key}
                        type="button"
                        disabled={it.totalQty <= 0}
                        onClick={() => {
                          setSelectedKey(it.key);
                          setSelectedItemName(it.name);
                          setIsDropdownOpen(false);
                        }}
                        className="w-full flex justify-between items-center px-4 py-2 border-b border-border last:border-b-0 text-left hover:bg-accent disabled:opacity-50"
                      >
                        <div className="flex flex-col">
                          <span className="font-semibold text-sm">{it.name}</span>
                          <span className="text-xs text-muted-foreground">SKU: {it.sku}</span>
                        </div>
                        <div className="flex flex-col items-end">
                          <span className="font-bold text-sm">৳{it.retailPrice}</span>
                          <span className={`text-xs ${it.totalQty > 0 ? 'text-green-600 font-medium' : 'text-destructive'}`}>
                            {it.totalQty > 0 ? `${it.totalQty} in stock` : "Out of stock"}
                          </span>
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="p-3 text-center text-sm text-muted-foreground">No results</div>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="pos-quantity" className="text-sm font-medium text-foreground">Quantity</label>
              <Input
                ref={quantityRef}
                id="pos-quantity"
                type="number"
                min={1}
                value={qty ?? ""}
                onChange={(e) => setQty(parseInt(e.target.value) || null)}
                placeholder="Qty"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    addToCart();
                  }
                }}
              />
            </div>
          </div>

          <Button
            onClick={addToCart}
            disabled={!selectedKey || qty === null || qty < 1}
            className="w-full sm:w-auto"
          >
            Add to cart
          </Button>
          </CardContent>
        </Card>

        {/* Right: Customer Info */}
        <Card className="shadow-sm border-border/60">
          <CardHeader className="pb-4 p-5">
            <CardTitle className="text-lg font-semibold">Customer Info (Optional)</CardTitle>
          </CardHeader>
          <CardContent className="p-5 pt-0 space-y-4">
            <div className="space-y-1">
              <label htmlFor="pos-customer-name" className="text-xs text-muted-foreground">Customer Name</label>
              <Input
                id="pos-customer-name"
                placeholder="Enter customer name"
                value={customerName}
                onChange={(e) => {
                  setCustomerName(e.target.value);
                  customerNameRef.current = e.target.value;
                }}
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="pos-customer-phone" className="text-xs text-muted-foreground">Customer Phone</label>
              <Input
                id="pos-customer-phone"
                placeholder="Enter phone number"
                value={customerPhone}
                onChange={(e) => {
                  setCustomerPhone(e.target.value);
                  customerPhoneRef.current = e.target.value;
                }}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cart Items Table */}
      <Card className="shadow-sm border-border/60 overflow-hidden">
        <CardHeader className="pb-4 p-5 border-b border-border/60">
          <CardTitle className="text-lg font-semibold">Cart Items</CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Item</TableHead>
              <TableHead className="w-[120px]">Quantity</TableHead>
              <TableHead className="text-right">Unit Price</TableHead>
              <TableHead className="w-[150px]">Discount (%)</TableHead>
              <TableHead className="text-right">Sub Total</TableHead>
              <TableHead className="text-right w-[100px]">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayCart.length > 0 ? (
              displayCart.map((record) => {
                const maxAllowed = getMaxAllowedDiscount(
                  record.unitPrice,
                  record.purchasePrice,
                  record.maxDiscount
                );
                const isViolating = record.discount > maxAllowed;

                return (
                  <TableRow key={record.key}>
                    <TableCell className="font-medium">{record.name}</TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={1}
                        id={`cart-qty-${record.key}`}
                        value={record.quantity}
                        onChange={(e) => {
                          const newQty = parseInt(e.target.value) || 1;
                          setCart((prev) =>
                            prev.map((item) =>
                              item.key === record.key
                                ? { ...item, quantity: newQty }
                                : item
                            )
                          );
                        }}
                        className="h-8 w-20 px-2 py-1 text-xs"
                      />
                    </TableCell>
                    <TableCell className="text-right">৳{record.unitPrice.toFixed(2)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <Input
                          type="number"
                          min={0}
                          max={maxAllowed}
                          id={`cart-discount-${record.key}`}
                          value={record.discount}
                          onChange={(e) => {
                            const newDiscount = Math.floor(Math.min(parseFloat(e.target.value) || 0, maxAllowed) * 10) / 10;
                            setCart((prev) =>
                              prev.map((item) =>
                                item.key === record.key ? { ...item, discount: newDiscount } : item
                              )
                            );
                          }}
                          className={`h-8 w-20 px-2 py-1 text-xs ${isViolating ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                        />
                        <span className="text-xs text-muted-foreground">%</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      ৳{(record.quantity * (record.unitPrice * (1 - record.discount / 100))).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFromCart(record.key)}
                        className="h-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        Remove
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  Cart is empty. Select an item to add to cart.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        </CardContent>
      </Card>

      {/* Checkout and Complete Sale */}
      <Card className="shadow-sm border-border/60">
        <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
        <div className="space-y-4 flex-1">
          <div className="text-xl font-bold text-foreground">
            Total: ৳{total.toFixed(2)}
          </div>

          <div className="flex items-center gap-2">
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
            </label>
            <span className="text-sm font-medium text-foreground">Credit Sale (Due)</span>
          </div>

          {isCreditSale && (
            <div className="space-y-2 max-w-xs">
              <label htmlFor="pos-cash-received" className="text-xs font-semibold text-foreground">
                Cash Received (৳)
              </label>
              <Input
                id="pos-cash-received"
                type="number"
                min={0}
                max={total}
                value={cashReceived}
                onChange={(e) => setCashReceived(parseFloat(e.target.value) || 0)}
              />
              <div className="text-sm font-bold text-destructive">
                Due Amount: ৳{Math.max(0, total - cashReceived).toFixed(2)}
              </div>
            </div>
          )}
        </div>

        <Button
          ref={completeSaleBtnRef}
          size="lg"
          onClick={checkout}
          disabled={cart.length === 0 || saleMutation.isPending}
          className="w-full sm:w-[220px] h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
        >
          {saleMutation.isPending ? "Processing Sale..." : "Complete Sale"}
        </Button>
        </CardContent>
      </Card>
      </>
    )}
    </div>
  );
}
