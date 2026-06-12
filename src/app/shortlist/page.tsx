"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import Link from "next/link";
import { debounce } from "lodash";
import { Select, Table, Button, Input, Space, Popconfirm } from "antd";

interface ShortListItem {
  id: string;
  inventoryId: string;
  tenantId: string;
  isSlowItem: boolean;
  reason: string;
  addedAt: string;
  inventory: {
    id: string;
    itemName: string;
    quantity: number;
    lastRestockQty: number | null;
    retailPrice: number;
    purchasePrice: number;
    variant: {
      sku: string;
      product: {
        productName: string;
      };
    };
  };
}

export default function ShortListPage() {
  const queryClient = useQueryClient();
  const [sortBy, setSortBy] = useState<"quantity" | "addedAt" | "name">(
    "quantity",
  );
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [filterSlow, setFilterSlow] = useState<boolean | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [shortlistSearchTerm, setShortlistSearchTerm] = useState("");
  const [debouncedShortlistSearch, setDebouncedShortlistSearch] = useState("");

  // Debounce inventory search (stable ref + cleanup)
  const debouncedInventorySearch = useRef(
    debounce((term: string) => {
      setDebouncedSearchTerm(term);
    }, 300),
  );

  // Debounce shortlist search (stable ref + cleanup)
  const debouncedTableSearch = useRef(
    debounce((term: string) => {
      setDebouncedShortlistSearch(term);
    }, 300),
  );

  useEffect(() => {
    debouncedInventorySearch.current(searchTerm);
  }, [searchTerm]);

  useEffect(() => {
    debouncedTableSearch.current(shortlistSearchTerm);
  }, [shortlistSearchTerm]);

  // Cancel debounced timers on unmount
  useEffect(() => {
    const inv = debouncedInventorySearch.current;
    const tab = debouncedTableSearch.current;
    return () => {
      inv.cancel?.();
      tab.cancel?.();
    };
  }, []);

  // Fetch short list items
  const { data, isLoading, error } = useQuery({
    queryKey: ["shortlist", sortBy, sortOrder, filterSlow],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filterSlow !== null)
        params.append("filterSlow", filterSlow.toString());
      params.append("sortBy", sortBy);
      params.append("sortOrder", sortOrder);

      const response = await api.get(`/shortlist?${params.toString()}`);
      return response.data;
    },
  });

  // Get statistics
  const { data: stats } = useQuery({
    queryKey: ["shortlist-stats"],
    queryFn: async () => {
      const response = await api.get("/shortlist/stats");
      return response.data;
    },
  });

  // Remove from short list
  const removeMutation = useMutation({
    mutationFn: async (inventoryId: string) => {
      await api.delete(`/shortlist/${inventoryId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shortlist"] });
      queryClient.invalidateQueries({ queryKey: ["shortlist-stats"] });
    },
  });

  // Export PDF
  const exportPdf = async (type: "shortlist" | "inventory" | "analytics") => {
    try {
      const response = await api.get(`/export/pdf/${type}`, {
        responseType: "blob",
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `${type}-${new Date().toISOString().split("T")[0]}.pdf`,
      );
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to export PDF:", err);
      alert("Failed to export PDF. Please try again.");
    }
  };

  // Export backup
  const exportBackup = async () => {
    try {
      const response = await api.get(`/backup/export`, {
        responseType: "blob",
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `backup-${new Date().toISOString().split("T")[0]}.sql`,
      );
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to export backup:", err);
      alert("Failed to export backup. Please try again.");
    }
  };

  // Search inventory items (not shortlist items)
  const { data: inventorySearchResults = [], isLoading: isSearching } =
    useQuery({
      queryKey: ["inventory-search", debouncedSearchTerm],
      queryFn: async () => {
        if (!debouncedSearchTerm || debouncedSearchTerm.length < 2) return [];
        const response = await api.get(
          `/inventory?q=${encodeURIComponent(debouncedSearchTerm)}`,
        );
        return response.data?.data ?? response.data ?? [];
      },
      enabled: debouncedSearchTerm.length >= 2,
    });

  // Add item to shortlist
  const addToShortlistMutation = useMutation({
    mutationFn: async (inventoryId: string) => {
      await api.post(`/shortlist/${inventoryId}/toggle`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shortlist"] });
      queryClient.invalidateQueries({ queryKey: ["shortlist-stats"] });
      setSearchTerm(""); // Clear search after adding
    },
  });

  // Filter shortlist items based on debounced search term
  const filteredShortlistItems = (items: ShortListItem[] | undefined) => {
    if (!items) return [];
    if (!debouncedShortlistSearch) return items;

    return items.filter((item) => {
      const searchLower = debouncedShortlistSearch.toLowerCase();
      return (
        item.inventory.itemName.toLowerCase().includes(searchLower) ||
        (item.inventory.variant?.sku || "")
          .toLowerCase()
          .includes(searchLower) ||
        (item.inventory.variant?.product?.productName || "")
          .toLowerCase()
          .includes(searchLower)
      );
    });
  };

  // Table column definitions
  const columns = [
    {
      title: "Item Name",
      dataIndex: ["inventory", "itemName"],
      key: "itemName",
      render: (text: string, record: ShortListItem) => (
        <Link
          href={`/inventory?id=${record.inventoryId}`}
          className="text-primary hover:underline"
        >
          {text}
        </Link>
      ),
    },
    {
      title: "Current Qty",
      dataIndex: ["inventory", "quantity"],
      key: "quantity",
      render: (qty: number) => <span className="font-medium text-foreground">{qty}</span>,
    },
    {
      title: "Last Restock Qty",
      dataIndex: ["inventory", "lastRestockQty"],
      key: "lastRestockQty",
      render: (qty: number | null) => <span className="text-muted-foreground">{qty || "N/A"}</span>,
    },
    {
      title: "Actions",
      key: "actions",
      render: (_: any, record: ShortListItem) => (
        <Popconfirm
          title="Remove from shortlist"
          description="Are you sure you want to remove this item?"
          onConfirm={() => removeMutation.mutate(record.inventoryId)}
          okText="Yes"
          cancelText="No"
        >
          <Button danger type="link" loading={removeMutation.isPending}>
            Remove
          </Button>
        </Popconfirm>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="page-header">Short List</h1>
        <p className="page-subheader">
          Items that need restocking
        </p>
      </div>
      {/* Controls */}
      <div className="surface-card p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            {/* Add to Shortlist Search */}
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-muted-foreground mb-2">
                Add Item to Shortlist
              </label>
              <Select
                showSearch
                allowClear
                filterOption={false}
                placeholder="Type to search"
                style={{ width: "100%" }}
                value={undefined}
                searchValue={searchTerm}
                onSearch={(val) => setSearchTerm(val)}
                onClear={() => setSearchTerm("")}
                notFoundContent={
                  debouncedSearchTerm.length >= 2
                    ? isSearching
                      ? "Searching..."
                      : "No results"
                    : "Type at least 2 characters"
                }
                options={inventorySearchResults.map((item: any) => ({
                  label: (
                    <div className="flex justify-between items-center w-full">
                      <div className="flex flex-col">
                        <span className="font-medium text-foreground">
                          {item.itemName || "Unnamed Item"}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          SKU: {item.variant?.sku || "N/A"}
                        </span>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="font-bold text-primary">
                          ৳{item.retailPrice ?? "-"}
                        </span>
                        <span
                          className={`text-xs ${item.quantity > 0
                            ? "text-success"
                            : "text-destructive"
                            }`}
                        >
                          {item.quantity > 0
                            ? `${item.quantity} in stock`
                            : "Out of stock"}
                        </span>
                      </div>
                    </div>
                  ),
                  value: item.id,
                  displayLabel: item.itemName || "Unnamed Item",
                }))}
                optionLabelProp="displayLabel"
                onSelect={(value) => {
                  addToShortlistMutation.mutate(String(value));
                  setSearchTerm("");
                }}
              />
            </div>

            {/* Sort By */}
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-2">
                Sort By
              </label>
              <Select
                value={sortBy}
                onChange={(value) => setSortBy(value as any)}
                className="w-full"
                size="large"
                options={[
                  { value: "quantity", label: "Lowest Stock First" },
                  { value: "addedAt", label: "Recently Added" },
                  { value: "name", label: "Item Name" },
                ]}
              />
            </div>
          </div>

          {/* Export Buttons */}
          <Space wrap className="mb-2">
            <Button
              type="primary"
              size="large"
              onClick={() => exportPdf("shortlist")}
            >
              Download Shortlist
            </Button>
            <Button
              size="large"
              onClick={() => exportPdf("inventory")}
            >
              Download Inventory
            </Button>
            <Button
              size="large"
              onClick={() => exportPdf("analytics")}
            >
              Download Analytics
            </Button>
            <Button
              size="large"
              onClick={() => exportBackup()}
            >
              Download Backup
            </Button>
          </Space>
        </div>

        {/* Shortlist Items Table */}
        {error ? (
          <div className="text-center py-12 text-destructive">
            Error loading short list
          </div>
        ) : (
          <div className="surface-card overflow-hidden">
            <div className="p-4 border-b border-border">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-foreground">
                  Shortlist Items ({filteredShortlistItems(data?.data).length})
                </h3>
              </div>
              <div className="mt-3">
                <Input.Search
                  placeholder="Search shortlist by item name, SKU, or product..."
                  value={shortlistSearchTerm}
                  onChange={(e) => setShortlistSearchTerm(e.target.value)}
                  allowClear
                  size="large"
                  className="w-full"
                />
              </div>
            </div>
            <Table
              columns={columns}
              dataSource={filteredShortlistItems(data?.data)}
              rowKey="id"
              loading={isLoading}
              pagination={{ pageSize: 10 }}
              scroll={{ x: 600 }}
              locale={{
                emptyText: shortlistSearchTerm
                  ? `No items found matching "${shortlistSearchTerm}"`
                  : "No items in short list",
              }}
            />
          </div>
        )}
    </div>
  );
}
