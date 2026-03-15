"use client";

import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import Link from "next/link";
import { debounce } from "lodash";
import { Select } from "antd";

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

  // Debounce inventory search
  const debouncedInventorySearch = useCallback(
    debounce((term: string) => {
      setDebouncedSearchTerm(term);
    }, 300),
    []
  );

  // Debounce shortlist search
  const debouncedTableSearch = useCallback(
    debounce((term: string) => {
      setDebouncedShortlistSearch(term);
    }, 300),
    []
  );

  useEffect(() => {
    debouncedInventorySearch(searchTerm);
  }, [searchTerm, debouncedInventorySearch]);

  useEffect(() => {
    debouncedTableSearch(shortlistSearchTerm);
  }, [shortlistSearchTerm, debouncedTableSearch]);

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
  const { data: inventorySearchResults = [], isLoading: isSearching } = useQuery({
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
        (item.inventory.variant?.sku || "").toLowerCase().includes(searchLower) ||
        (item.inventory.variant?.product?.productName || "").toLowerCase().includes(searchLower)
      );
    });
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="page-header mb-2">Short List</h1>
          <p className="text-muted-foreground">
            Items that need restocking based on the 50% rule or slow item
            detection
          </p>
        </div>

        {/* Statistics Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="rounded-lg border border-border bg-card p-6">
              <div className="text-muted-foreground text-sm font-medium">
                Total Items
              </div>
              <div className="text-2xl font-bold text-foreground mt-2">
                {stats.total}
              </div>
            </div>
            <div className="rounded-lg border border-border bg-card p-6">
              <div className="text-muted-foreground text-sm font-medium">
                50% Rule Items
              </div>
              <div className="text-2xl font-bold text-primary mt-2">
                {stats.autoRuleItems}
              </div>
            </div>
            <div className="rounded-lg border border-border bg-card p-6">
              <div className="text-muted-foreground text-sm font-medium">
                Slow Items
              </div>
              <div className="text-2xl font-bold text-warning mt-2">
                {stats.slowItems}
              </div>
            </div>
            <div className="rounded-lg border border-border bg-card p-6">
              <div className="text-muted-foreground text-sm font-medium">Total Qty</div>
              <div className="text-2xl font-bold text-success mt-2">
                {stats.totalQuantity}
              </div>
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="rounded-lg border border-border bg-card p-6 mb-6">
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
                placeholder="Type to search inventory or SKU..."
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
                          className={`text-xs ${
                            item.quantity > 0
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
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="w-full px-3 py-2 border border-border bg-background text-foreground rounded-md text-sm"
              >
                <option value="quantity">Lowest Stock First</option>
                <option value="addedAt">Recently Added</option>
                <option value="name">Item Name</option>
              </select>
            </div>

            {/* Filter */}
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-2">
                Filter
              </label>
              <select
                value={filterSlow === null ? "" : filterSlow.toString()}
                onChange={(e) =>
                  setFilterSlow(
                    e.target.value === "" ? null : e.target.value === "true",
                  )
                }
                className="w-full px-3 py-2 border border-border bg-background text-foreground rounded-md text-sm"
              >
                <option value="">All Items</option>
                <option value="true">Slow Items Only</option>
                <option value="false">50% Rule Only</option>
              </select>
            </div>
          </div>

          {/* Export Buttons */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => exportPdf("shortlist")}
              className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-md hover:bg-primary/90"
            >
              Download Shortlist
            </button>
            <button
              onClick={() => exportPdf("inventory")}
              className="px-4 py-2 bg-success text-success-foreground text-sm font-medium rounded-md hover:bg-success/90"
            >
              Download Inventory
            </button>
            <button
              onClick={() => exportPdf("analytics")}
              className="px-4 py-2 bg-info text-info-foreground text-sm font-medium rounded-md hover:bg-info/90"
            >
              Download Analytics
            </button>
            <button
              onClick={() => exportBackup()}
              className="px-4 py-2 bg-warning text-warning-foreground text-sm font-medium rounded-md hover:bg-warning/90"
            >
              Download Backup
            </button>
          </div>
        </div>



        {/* Shortlist Items Table */}
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Loading...</div>
        ) : error ? (
          <div className="text-center py-12 text-destructive">
            Error loading short list
          </div>
        ) : !data?.data || data.data.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            No items in short list
          </div>
        ) : (
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            <div className="p-4 border-b border-border">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-foreground">
                  Shortlist Items ({filteredShortlistItems(data.data).length})
                </h3>
              </div>
              <div className="mt-3 relative">
                <input
                  type="text"
                  placeholder="Search shortlist by item name, SKU, or product..."
                  value={shortlistSearchTerm}
                  onChange={(e) => setShortlistSearchTerm(e.target.value)}
                  className="w-full px-3 py-2 border border-border bg-background text-foreground rounded-md text-sm"
                />
                {shortlistSearchTerm && (
                  <button
                    onClick={() => setShortlistSearchTerm("")}
                    className="absolute right-3 top-10 text-muted-foreground hover:text-foreground"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
            <table className="w-full">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                    Item Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                    SKU
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                    Current Qty
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                    Last Restock
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                    Reason
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredShortlistItems(data.data).length === 0 && shortlistSearchTerm ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">
                      No items found matching "{shortlistSearchTerm}"
                    </td>
                  </tr>
                ) : (
                  filteredShortlistItems(data.data).map((item: ShortListItem) => (
                    <tr key={item.id} className="hover:bg-muted/40 transition-colors">
                    <td className="px-6 py-4 text-sm text-foreground">
                      <Link
                        href={`/inventory?id=${item.inventoryId}`}
                        className="text-primary hover:underline"
                      >
                        {item.inventory.itemName}
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">
                      {item.inventory.variant?.sku || "N/A"}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-foreground">
                      {item.inventory.quantity}
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">
                      {item.inventory.lastRestockQty || "N/A"}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          item.isSlowItem
                            ? "bg-warning/15 text-warning"
                            : "bg-primary/15 text-primary"
                        }`}
                      >
                        {item.isSlowItem ? "🐢 Slow Item" : "📊 50% Rule"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <button
                        onClick={() => removeMutation.mutate(item.inventoryId)}
                        disabled={removeMutation.isPending}
                        className="text-destructive hover:text-destructive/80 text-sm font-medium disabled:opacity-50"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
