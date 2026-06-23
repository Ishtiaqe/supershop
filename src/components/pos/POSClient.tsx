"use client";

import { memo, useState, useEffect, useMemo, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { InventoryItem } from "@/types";
import {
  Select,
  InputNumber,
  Button,
  Table,
  Row,
  Col,
  Typography,
  message,
  Alert,
  Input,
  Switch,
  Tooltip,
} from "antd";
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
        // parsed.__ttl stores the TTL in ms
        if (parsed.__ts && parsed.__ttl && now - parsed.__ts < parsed.__ttl) {
          return Promise.resolve(parsed.data);
        }
        // If expired, fall through and fetch from server
      }
    }

    return api
      .get("/inventory", { params: q ? { q } : {}, signal })
      .then((r) => {
      if (typeof window !== "undefined" && q && q.length > 0) {
        // store TTL of 2 minutes in sessionStorage
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
    // Fallback to direct request
    return api
      .get("/inventory", { params: q ? { q } : {}, signal })
      .then((r) => r.data);
  }
}

function POSClient() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const selectRef = useRef<React.ComponentRef<typeof Select>>(null);

  // Customer state moved from POSPageWrapper
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const customerNameRef = useRef("");
  const customerPhoneRef = useRef("");
  const { user, loading } = useAuth();

  // Keyboard shortcut: focus the Select field when pressing '/'
  // Double Shift: focus the "Complete Sale" button
  const completeSaleBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Slash to focus search
      if (
        event.key === "/" &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.altKey
      ) {
        event.preventDefault();
        try {
          selectRef.current?.focus();
        } catch {
          // ignore
        }
      }

      // Ctrl + / to focus Complete Sale
      if (event.key === "/" && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        completeSaleBtnRef.current?.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown, true);
    return () => document.removeEventListener("keydown", handleKeyDown, true);
  }, []);

  // debounce input so we don't call the API on every keystroke
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

  // Aggregate items by variant/product
  const aggregatedItems = useMemo(() => {
    const map = new Map<
      string,
      {
        key: string;
        name: string;
        sku: string;
        totalQty: number;
        retailPrice: number; // Using the price of the first batch (usually oldest or latest depending on sort)
        batches: InventoryItem[];
      }
    >();

    // Sort raw items by expiry date (FIFO)
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
      // Key: prefer variantId, fallback to itemName for ad-hoc
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
  // customerName, customerPhone, and setters are now provided by parent (page)
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

      // clear local sessionStorage cache for POS so search reflects new quantities
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
      message.success("Sale completed successfully!");
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
      message.error(error.response?.data?.message || "Sale failed");
    },
  });

  function addToCart() {
    if (!selectedKey) return;
    const item = aggregatedItems.find((i) => i.key === selectedKey);
    if (!item) return;

    // Calculate average purchase price
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

    // Check if already in cart
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
          discount: 0, // percentage
          maxDiscount: maxDiscountPercent,
          batches: item.batches,
        },
      ]);
    }

    setSelectedKey(null);
    setQty(1);
    setSearch(""); // Clear search

    // Focus back to the item select
    setTimeout(() => {
      selectRef.current?.focus();
    }, 0);
  }

  function removeFromCart(key: string) {
    setCart((prev) => prev.filter((item) => item.key !== key));
  }

  function checkout() {
    if (isCreditSale) {
      if (!customerName.trim()) {
        message.error("Customer name is required for credit sales");
        return;
      }
      if (!customerPhone.trim()) {
        message.error("Customer phone number is required for credit sales");
        return;
      }
    }

    const violations = cart.filter((item) => {
      const maxAllowed = getMaxAllowedDiscount(item.unitPrice, item.purchasePrice, item.maxDiscount);
      return item.discount > maxAllowed;
    });
    if (violations.length > 0) {
      message.error(`${violations.length} item(s) have discounts exceeding the minimum 4% profit. Please reduce them.`);
      return;
    }

    const payloadItems: Array<{
      inventoryId: string;
      quantity: number;
      unitPrice: number;
      discount: number;
    }> = [];

    // Allocate stock from batches (FIFO)
    for (const cartItem of cart) {
      let remainingQty = cartItem.quantity;

      // Batches are already sorted by expiry (FIFO) in aggregation
      for (const batch of cartItem.batches) {
        if (remainingQty <= 0) break;

        const take = Math.min(remainingQty, batch.quantity);
        if (take > 0) {
          payloadItems.push({
            inventoryId: batch.id,
            quantity: take,
            unitPrice: batch.retailPrice, // Use batch specific price
            discount: cartItem.discount, // Apply per item discount
          });
          remainingQty -= take;
        }
      }

      if (remainingQty > 0) {
        message.error(
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
  const selectOptions = useMemo(
    () =>
      aggregatedItems.map((it) => ({
        label: (
          <div className="flex justify-between items-center w-full">
            <div className="flex flex-col">
              <span className="font-medium text-theme-foreground">{it.name}</span>
              <span className="text-xs text-theme-muted">SKU: {it.sku}</span>
            </div>
            <div className="flex flex-col items-end">
              <span className="font-bold text-theme-primary">৳{it.retailPrice}</span>
              <span
                className={`text-xs ${
                  it.totalQty > 0
                    ? "text-theme-success"
                    : "text-theme-destructive"
                }`}
              >
                {it.totalQty > 0 ? `${it.totalQty} in stock` : "Out of stock"}
              </span>
            </div>
          </div>
        ),
        value: it.key,
        displayLabel: it.name,
        disabled: it.totalQty <= 0,
      })),
    [aggregatedItems]
  );

  return (
    <div className="space-y-4">
      <Row gutter={16} align="stretch">
        <Col xs={24} md={16} lg={16}>
          {/* Left: Select, Quantity, Add to Cart */}
          <div className="surface-card p-4 md:p-6 h-full">
            <Row gutter={16}>
              <Col span={24}>
                {itemsError && (
                  <div style={{ marginBottom: 8 }}>
                    <Alert
                      type="error"
                      showIcon
                      message={
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        (itemsErrorObj as any)?.response?.status === 401
                          ? "Not signed in — please login to access inventory"
                          : "Failed to load inventory"
                      }
                    />
                  </div>
                )}
                <Typography.Text>Select Item</Typography.Text>
                <Select
                  className="pos-select"
                  classNames={{ popup: { root: "pos-select-dropdown" } }}
                  ref={selectRef}
                  showSearch
                  filterOption={false}
                  allowClear
                  placeholder="Type to search inventory or SKU..."
                  style={{ width: "100%" }}
                  value={selectedKey ?? undefined}
                  onSearch={(val) => setSearch(val)}
                  onChange={(val) => setSelectedKey(val)}
                  notFoundContent={itemsLoading ? "Searching..." : "No results"}
                  options={selectOptions}
                  optionLabelProp="displayLabel"
                />
              </Col>
              <Col span={8} className="mt-2">
                <Typography.Text>Quantity</Typography.Text>
                <InputNumber
                  variant="outlined"
                  className="w-full"
                  min={1}
                  value={qty}
                  onChange={(value) => setQty(Number(value))}
                  onPressEnter={addToCart}
                  changeOnWheel
                />
              </Col>
              <Col span={24} style={{ marginTop: 12 }}>
                <Button
                  type="primary"
                  onClick={addToCart}
                  disabled={!selectedKey}
                >
                  Add to cart
                </Button>
              </Col>
            </Row>
          </div>
        </Col>

        <Col xs={24} md={8} lg={8}>
          <div className="surface-card p-4 md:p-6 h-full">
            <Typography.Text>Customer Name (Optional)</Typography.Text>
            <Input
              placeholder="Enter customer name"
              value={customerName}
              onChange={(e) => {
                const value = e.target.value;
                customerNameRef.current = value;
                setCustomerName(value);
              }}
            />

            <div style={{ marginTop: 12 }}>
              <Typography.Text>Customer Phone (Optional)</Typography.Text>
              <Input
                placeholder="Enter phone number"
                value={customerPhone}
                onChange={(e) => {
                  const value = e.target.value;
                  customerPhoneRef.current = value;
                  setCustomerPhone(value);
                }}
              />
            </div>
          </div>
        </Col>
      </Row>

      {/* Add to cart button is included in the left column above */}

      <div className="surface-card p-4 md:p-6">
        <div className="overflow-x-auto">
          <Table<CartItem>
            dataSource={displayCart}
            rowKey="key"
            pagination={false}
          >
            <Table.Column title="Item" dataIndex="name" key="name" />
            <Table.Column
              title="Quantity"
              dataIndex="quantity"
              key="quantity"
              render={(qty: number, record: CartItem) => (
                <InputNumber
                  min={1}
                  value={qty}
                  onChange={(value) => {
                    const newQty = Number(value) || 1;
                    setCart((prev) =>
                      prev.map((item) =>
                        item.key === record.key
                          ? { ...item, quantity: newQty }
                          : item
                      )
                    );
                  }}
                  style={{ width: 80 }}
                />
              )}
            />
            <Table.Column
              title="Unit Price"
              dataIndex="unitPrice"
              key="unitPrice"
              render={(v: number) => `৳${v.toFixed(2)}`}
            />
            <Table.Column
              title="Discount (%)"
              dataIndex="discount"
              key="discount"
              render={(discount: number, record: CartItem) => {
                const maxAllowed = getMaxAllowedDiscount(
                  record.unitPrice,
                  record.purchasePrice,
                  record.maxDiscount,
                );
                const isViolating = discount > maxAllowed;
                return (
                  <Tooltip
                    title={isViolating ? 'Exceeds minimum 4% profit — discount will be capped' : undefined}
                    color="red"
                  >
                    <InputNumber
                      min={0}
                      max={maxAllowed}
                      value={discount}
                      status={isViolating ? 'error' : undefined}
                      onChange={(value) => {
                        const newDiscount = Math.min(Number(value) ?? 0, maxAllowed);
                        setCart((prev) =>
                          prev.map((item) =>
                            item.key === record.key ? { ...item, discount: newDiscount } : item,
                          ),
                        );
                      }}
                      style={{ width: 80 }}
                      suffix="%"
                    />
                  </Tooltip>
                );
              }}
            />
            <Table.Column
              title="Sub Total"
              dataIndex="total"
              key="total"
              render={(
                v: number,
                record: {
                  quantity: number;
                  unitPrice: number;
                  discount: number;
                }
              ) => {
                const effectivePrice =
                  record.unitPrice * (1 - record.discount / 100);
                return `৳${(record.quantity * effectivePrice).toFixed(2)}`;
              }}
            />
            <Table.Column
              title="Action"
              key="action"
              render={(_, record: CartItem) => (
                <Button
                  danger
                  size="small"
                  onClick={() => removeFromCart(record.key)}
                >
                  Remove
                </Button>
              )}
            />
          </Table>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mt-4">
        <div className="flex-1">
          <div style={{ fontWeight: 700, fontSize: "1.2em" }} className="mb-3">
            Total: ৳{total.toFixed(2)}
          </div>

          {/* Credit Sale toggle */}
          <div className="flex items-center gap-3">
            <Switch
              checked={isCreditSale}
              onChange={(checked) => {
                setIsCreditSale(checked);
                if (!checked) setCashReceived(0);
              }}
              size="small"
            />
            <span className="text-sm font-medium">Credit Sale (Due)</span>
          </div>

          {isCreditSale && (
            <div className="mt-3 space-y-1">
              <label className="text-xs text-muted-foreground">
                Cash Received (৳)
              </label>
              <InputNumber
                min={0}
                max={total}
                value={cashReceived}
                onChange={(val) => setCashReceived(val ?? 0)}
                className="w-full"
                placeholder="0"
              />
              <div className="text-sm font-medium text-destructive">
                Due Amount: ৳{Math.max(0, total - cashReceived).toFixed(2)}
              </div>
            </div>
          )}
        </div>

        <Button
          ref={completeSaleBtnRef}
          type="primary"
          size="large"
          onClick={checkout}
          className="sm:self-end complete-sale-btn"
          color="lime"
          variant="solid"
          disabled={cart.length === 0 || saleMutation.isPending}
          loading={saleMutation.isPending}
          style={{ minWidth: "200px" }}
        >
          {saleMutation.isPending ? "Processing Sale..." : "Complete Sale"}
        </Button>
      </div>
    </div>
  );
}

export default memo(POSClient);
