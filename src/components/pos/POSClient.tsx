"use client";

import { memo, useState, useEffect, useMemo, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { InventoryItem } from "@/types";
import {
  Autocomplete,
  AutocompleteItem,
  Button,
  Card,
  CardBody,
  Table,
  TableHeader,
  TableBody,
  TableColumn,
  TableRow,
  TableCell,
  Input,
  Switch,
  Tooltip,
} from "@heroui/react";
import { toast } from "sonner";
import { useAuth } from "@/components/auth/AuthProvider";

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
  maxDiscountRate?: number,
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

function POSClient() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const autocompleteRef = useRef<HTMLInputElement>(null);

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const customerNameRef = useRef("");
  const customerPhoneRef = useRef("");
  const { user, loading } = useAuth();

  const completeSaleBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.key === "/" &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.altKey
      ) {
        event.preventDefault();
        try {
          autocompleteRef.current?.focus();
        } catch {
          // ignore
        }
      }

      if (event.key === "/" && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        completeSaleBtnRef.current?.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown, true);
    return () => document.removeEventListener("keydown", handleKeyDown, true);
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
          ? `${item.variant.product.name}${
              item.variant.variantName !== "Standard"
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
  const [qty, setQty] = useState<number>(1);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCreditSale, setIsCreditSale] = useState(false);
  const [cashReceived, setCashReceived] = useState<number>(0);

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
    }) => api.post("/sales", payload).then((r) => r.data),
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
        // ignore sessionStorage errors
      }
      toast.success("Sale completed successfully!");
      setCart([]);
      setCustomerName("");
      setCustomerPhone("");
      customerNameRef.current = "";
      customerPhoneRef.current = "";
      setIsCreditSale(false);
      setCashReceived(0);
    },
    onError(err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error.response?.data?.message || "Sale failed");
    },
  });

  function addToCart() {
    if (!selectedKey) return;
    const item = aggregatedItems.find((i) => i.key === selectedKey);
    if (!item) return;

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
      const newCart = [...cart];
      newCart[existingIdx].quantity += qty;
      setCart(newCart);
    } else {
      setCart([
        ...cart,
        {
          key: item.key,
          name: item.name,
          unitPrice: item.retailPrice,
          purchasePrice: avgPurchase,
          quantity: qty,
          discount: 0,
          maxDiscount: maxDiscountPercent,
          batches: item.batches,
        },
      ]);
    }

    setSelectedKey(null);
    setQty(1);
    setSearch("");

    setTimeout(() => {
      autocompleteRef.current?.focus();
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
      toast.error(`${violations.length} item(s) have discounts exceeding the minimum 4% profit. Please reduce them.`);
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

  return (
    <div className="space-y-4">
      {/* Top Row: Item search + customer info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Left: Select Item + Quantity */}
        <Card className="md:col-span-2">
          <CardBody className="space-y-3">
            {itemsError && (
              <div className="p-3 rounded-lg bg-danger-50 text-danger text-sm">
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {(itemsErrorObj as any)?.response?.status === 401
                  ? "Not signed in — please login to access inventory"
                  : "Failed to load inventory"}
              </div>
            )}

            <div className="space-y-1">
              <label className="text-sm font-medium">Select Item</label>
              <Autocomplete
                ref={autocompleteRef}
                inputValue={search}
                onInputChange={(val) => setSearch(val)}
                selectedKey={selectedKey}
                onSelectionChange={(key) => setSelectedKey(key as string | null)}
                placeholder="Type to search inventory or SKU..."
                isLoading={itemsLoading}
                variant="bordered"
                className="w-full"
                listboxProps={{
                  emptyContent: itemsLoading ? "Searching..." : "No results",
                }}
                aria-label="Select inventory item"
              >
                {aggregatedItems.map((it) => (
                  <AutocompleteItem
                    key={it.key}
                    isDisabled={it.totalQty <= 0}
                    textValue={it.name}
                  >
                    <div className="flex justify-between items-center w-full gap-2">
                      <div className="flex flex-col min-w-0">
                        <span className="font-medium truncate">{it.name}</span>
                        <span className="text-xs text-default-400">SKU: {it.sku}</span>
                      </div>
                      <div className="flex flex-col items-end shrink-0">
                        <span className="font-bold text-primary text-sm">
                          ৳{it.retailPrice}
                        </span>
                        <span className={`text-xs ${it.totalQty > 0 ? "text-success" : "text-danger"}`}>
                          {it.totalQty > 0 ? `${it.totalQty} in stock` : "Out of stock"}
                        </span>
                      </div>
                    </div>
                  </AutocompleteItem>
                ))}
              </Autocomplete>
            </div>

            <div className="flex items-end gap-3">
              <div className="space-y-1 w-32">
                <label className="text-sm font-medium">Quantity</label>
                <Input
                  type="number"
                  inputMode="numeric"
                  min="1"
                  value={qty.toString()}
                  onChange={(e) => setQty(Math.max(1, parseInt(e.target.value) || 1))}
                  onKeyDown={(e) => { if (e.key === "Enter") addToCart(); }}
                  variant="bordered"
                />
              </div>
              <Button color="primary" onPress={addToCart} isDisabled={!selectedKey}>
                Add to cart
              </Button>
            </div>
          </CardBody>
        </Card>

        {/* Right: Customer info */}
        <Card>
          <CardBody className="space-y-3">
            <div className="space-y-1">
              <label className="text-sm font-medium">Customer Name (Optional)</label>
              <Input
                placeholder="Enter customer name"
                value={customerName}
                onValueChange={(value) => {
                  customerNameRef.current = value;
                  setCustomerName(value);
                }}
                variant="bordered"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Customer Phone (Optional)</label>
              <Input
                placeholder="Enter phone number"
                value={customerPhone}
                onValueChange={(value) => {
                  customerPhoneRef.current = value;
                  setCustomerPhone(value);
                }}
                variant="bordered"
              />
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Cart Table */}
      <Card>
        <CardBody className="p-0 overflow-x-auto">
          <Table
            aria-label="Cart items"
            removeWrapper
          >
            <TableHeader>
              <TableColumn key="name">Item</TableColumn>
              <TableColumn key="quantity" align="center" width={120}>Quantity</TableColumn>
              <TableColumn key="unitPrice" align="end">Unit Price</TableColumn>
              <TableColumn key="discount" align="center" width={140}>Discount (%)</TableColumn>
              <TableColumn key="subtotal" align="end">Sub Total</TableColumn>
              <TableColumn key="action" align="center" width={90}>Action</TableColumn>
            </TableHeader>
            <TableBody
              items={displayCart}
              emptyContent={
                <div className="py-8 text-center text-default-400">
                  Cart is empty — add items above
                </div>
              }
            >
              {(record: CartItem) => (
                <TableRow key={record.key}>
                  <TableCell>{record.name}</TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      inputMode="numeric"
                      min="1"
                      value={record.quantity.toString()}
                      onChange={(e) => {
                        const newQty = Math.max(1, parseInt(e.target.value) || 1);
                        setCart((prev) =>
                          prev.map((item) =>
                            item.key === record.key ? { ...item, quantity: newQty } : item
                          )
                        );
                      }}
                      variant="bordered"
                      size="sm"
                      className="w-20"
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    ৳{record.unitPrice.toFixed(2)}
                  </TableCell>
                  <TableCell>
                    {(() => {
                      const maxAllowed = getMaxAllowedDiscount(record.unitPrice, record.purchasePrice, record.maxDiscount);
                      const isViolating = record.discount > maxAllowed;
                      return (
                        <Tooltip
                          content="Exceeds minimum 4% profit — discount will be capped"
                          isDisabled={!isViolating}
                          color="danger"
                        >
                          <Input
                            type="number"
                            inputMode="numeric"
                            min="0"
                            max={maxAllowed}
                            value={record.discount.toString()}
                            onChange={(e) => {
                              const newDiscount = Math.min(parseFloat(e.target.value) || 0, maxAllowed);
                              setCart((prev) =>
                                prev.map((item) =>
                                  item.key === record.key ? { ...item, discount: newDiscount } : item
                                )
                              );
                            }}
                            variant="bordered"
                            size="sm"
                            className="w-20"
                            isInvalid={isViolating}
                            endContent={<span className="text-default-400 text-xs">%</span>}
                          />
                        </Tooltip>
                      );
                    })()}
                  </TableCell>
                  <TableCell className="text-right">
                    ৳{(record.quantity * record.unitPrice * (1 - record.discount / 100)).toFixed(2)}
                  </TableCell>
                  <TableCell>
                    <Button size="sm" color="danger" variant="flat" onPress={() => removeFromCart(record.key)}>
                      Remove
                    </Button>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardBody>
      </Card>

      {/* Checkout Section */}
      <Card>
        <CardBody className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex-1 space-y-3">
            <div className="text-xl font-bold">
              Total: ৳{total.toFixed(2)}
            </div>

            <div className="flex items-center gap-3">
              <Switch
                isSelected={isCreditSale}
                onValueChange={(checked) => {
                  setIsCreditSale(checked);
                  if (!checked) setCashReceived(0);
                }}
                size="sm"
              />
              <span className="text-sm font-medium">Credit Sale (Due)</span>
            </div>

            {isCreditSale && (
              <div className="space-y-1 max-w-xs">
                <label className="text-xs text-default-500">Cash Received (৳)</label>
                <Input
                  type="number"
                  inputMode="numeric"
                  min="0"
                  max={total}
                  value={cashReceived.toString()}
                  onChange={(e) =>
                    setCashReceived(Math.min(total, Math.max(0, parseFloat(e.target.value) || 0)))
                  }
                  variant="bordered"
                  placeholder="0"
                  startContent={<span className="text-default-400">৳</span>}
                />
                <div className="text-sm font-medium text-danger">
                  Due Amount: ৳{Math.max(0, total - cashReceived).toFixed(2)}
                </div>
              </div>
            )}
          </div>

          <Button
            ref={completeSaleBtnRef}
            color="success"
            variant="solid"
            size="lg"
            onPress={checkout}
            className="sm:self-start min-w-[200px] text-white font-semibold"
            isDisabled={cart.length === 0 || saleMutation.isPending}
            isLoading={saleMutation.isPending}
          >
            {saleMutation.isPending ? "Processing Sale..." : "Complete Sale"}
          </Button>
        </CardBody>
      </Card>
    </div>
  );
}

export default memo(POSClient);
