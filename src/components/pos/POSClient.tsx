"use client";

import { useState, useEffect, useMemo, useRef } from "react";
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
  Input,
} from "antd";

function fetchInventory(q?: string) {
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

    return api.get("/inventory", { params: q ? { q } : {} }).then((r) => {
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
      .get("/inventory", { params: q ? { q } : {} })
      .then((r) => r.data);
  }
}

export default function POSClient() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const selectRef = useRef<React.ComponentRef<typeof Select>>(null);

  // debounce input so we don't call the API on every keystroke
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data: rawItems = [], isFetching: itemsLoading } = useQuery({
    queryKey: ["inventory", debouncedSearch],
    queryFn: () => fetchInventory(debouncedSearch),
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
  const [customerName, setCustomerName] = useState<string>("");
  const [customerPhone, setCustomerPhone] = useState<string>("");
  const [cart, setCart] = useState<
    Array<{
      key: string;
      name: string;
      unitPrice: number;
      quantity: number;
      discount: number;
      maxDiscount: number;
      batches: InventoryItem[];
    }>
  >([]);

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
    }) => api.post("/sales", payload).then((r) => r.data),
    onSuccess() {
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      // clear local sessionStorage cache for POS so search reflects new quantities
      try {
        for (let i = 0; i < sessionStorage.length; i++) {
          const key = sessionStorage.key(i);
          if (key && key.startsWith("pos-inventory:")) {
            sessionStorage.removeItem(key);
          }
        }
      } catch {
        // ignore sessionStorage errors
      }
      message.success("Sale completed successfully!");
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
    const totalPurchase = item.batches.reduce((sum, b) => sum + b.purchasePrice * b.quantity, 0);
    const totalQty = item.batches.reduce((sum, b) => sum + b.quantity, 0);
    const avgPurchase = totalQty > 0 ? totalPurchase / totalQty : 0;
    const minPrice = avgPurchase * 1.04;
    const maxDiscountPercent = item.retailPrice > 0 ? ((item.retailPrice - minPrice) / item.retailPrice) * 100 : 0;

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

  function removeFromCart(index: number) {
    const newCart = [...cart];
    newCart.splice(index, 1);
    setCart(newCart);
  }

  function checkout() {
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
    });
    setCart([]);
    setCustomerName("");
    setCustomerPhone("");
  }

  const total = cart.reduce((s, it) => s + it.quantity * (it.unitPrice * (1 - it.discount / 100)), 0);

  return (
    <div>
      <Row gutter={16} className="mb-4">
        <Col span={12}>
          <Typography.Text>Customer Name (Optional)</Typography.Text>
          <Input
            placeholder="Enter customer name"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
          />
        </Col>
        <Col span={12}>
          <Typography.Text>Customer Phone (Optional)</Typography.Text>
          <Input
            placeholder="Enter phone number"
            value={customerPhone}
            onChange={(e) => setCustomerPhone(e.target.value)}
          />
        </Col>
      </Row>

      <Row gutter={16} align="bottom">
        <Col span={12}>
          <Typography.Text>Select Item</Typography.Text>
          <Select
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
            options={aggregatedItems.map((it) => ({
              label: (
                <div className="flex justify-between items-center w-full">
                  <div className="flex flex-col">
                    <span className="font-medium text-gray-900">{it.name}</span>
                    <span className="text-xs text-gray-500">SKU: {it.sku}</span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="font-bold text-blue-600">
                      ৳{it.retailPrice}
                    </span>
                    <span
                      className={`text-xs ${
                        it.totalQty > 0 ? "text-green-600" : "text-red-500"
                      }`}
                    >
                      {it.totalQty > 0
                        ? `${it.totalQty} in stock`
                        : "Out of stock"}
                    </span>
                  </div>
                </div>
              ),
              value: it.key,
              displayLabel: it.name,
              disabled: it.totalQty <= 0,
            }))}
            optionLabelProp="displayLabel"
          />
        </Col>

        <Col span={8}>
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
      </Row>

      <div style={{ marginTop: 16 }}>
        <Button type="primary" onClick={addToCart} disabled={!selectedKey}>
          Add to cart
        </Button>
      </div>

      <div style={{ marginTop: 16 }}>
        <div className="overflow-x-auto">
          <Table dataSource={cart} rowKey="key" pagination={false}>
            <Table.Column title="Item" dataIndex="name" key="name" />
            <Table.Column
              title="Quantity"
              dataIndex="quantity"
              key="quantity"
              render={(qty: number, _record: unknown, index: number) => (
                <InputNumber
                  min={1}
                  value={qty}
                  onChange={(value) => {
                    const newCart = [...cart];
                    newCart[index].quantity = Number(value) || 1;
                    setCart(newCart);
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
              render={(discount: number, _record: unknown, index: number) => (
                <InputNumber
                  min={0}
                  max={cart[index].maxDiscount}
                  value={discount}
                  onChange={(value) => {
                    const newCart = [...cart];
                    newCart[index].discount = Number(value) || 0;
                    setCart(newCart);
                  }}
                  style={{ width: 80 }}
                  suffix="%"
                />
              )}
            />
            <Table.Column
              title="Sub Total"
              dataIndex="total"
              key="total"
              render={(
                v: number,
                record: { quantity: number; unitPrice: number; discount: number }
              ) => {
                const effectivePrice = record.unitPrice * (1 - record.discount / 100);
                return `৳${(record.quantity * effectivePrice).toFixed(2)}`;
              }}
            />
            <Table.Column
              title="Action"
              key="action"
              render={(_, __, index) => (
                <Button
                  danger
                  size="small"
                  onClick={() => removeFromCart(index)}
                >
                  Remove
                </Button>
              )}
            />
          </Table>
        </div>
      </div>

      <div style={{ marginTop: 16 }}>
        <div style={{ fontWeight: 700, fontSize: "1.2em" }}>
          Total: ৳{total.toFixed(2)}
        </div>
        <Button
          type="primary"
          size="large"
          onClick={checkout}
          className="mt-4 w-full"
          disabled={cart.length === 0 || saleMutation.isPending}
          loading={saleMutation.isPending}
        >
          {saleMutation.isPending ? "Processing Sale..." : "Complete Sale"}
        </Button>
      </div>
    </div>
  );
}
