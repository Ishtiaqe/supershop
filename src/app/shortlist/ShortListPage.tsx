"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { debounce } from "lodash";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { useItemDetail } from "@/components/providers/ItemDetailContext";
import { Loader2, Download, Trash2, Check, X } from "lucide-react";
import { toast } from "sonner";
import { MobileTableCard, MobileTableCardRow } from "@/components/mobile/MobileTableCard";

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
      id: string;
      sku: string;
      product: {
        productName: string;
      };
    };
  };
}

export default function ShortListPage() {
  const queryClient = useQueryClient();
  const { openItem } = useItemDetail();
  const shortlistTableRef = useRef<HTMLDivElement>(null);
  const [sortBy, setSortBy] = useState<"quantity" | "addedAt" | "name">(
    "quantity",
  );
  const [sortOrder] = useState<"asc" | "desc">("asc");
  const [filterSlow] = useState<boolean | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [shortlistSearchTerm, setShortlistSearchTerm] = useState("");
  const [debouncedShortlistSearch, setDebouncedShortlistSearch] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

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

  // Remove from short list
  const removeMutation = useMutation({
    mutationFn: async (inventoryId: string) => {
      await api.delete(`/shortlist/${inventoryId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shortlist"] });
      queryClient.invalidateQueries({ queryKey: ["shortlist-stats"] });
      toast.success("Item removed from shortlist");
    },
    onError: () => {
      toast.error("Failed to remove item from shortlist");
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
      toast.success(`${type} downloaded successfully`);
    } catch (err) {
      console.error("Failed to export PDF:", err);
      toast.error("Failed to export PDF. Please try again.");
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
      toast.success("Backup downloaded successfully");
    } catch (err) {
      console.error("Failed to export backup:", err);
      toast.error("Failed to export backup. Please try again.");
    }
  };

  // Download shortlist as image
  const downloadAsImage = async () => {
    if (!shortlistTableRef.current) return;
    try {
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(shortlistTableRef.current, { scale: 2 });
      const link = document.createElement("a");
      const today = new Date().toISOString().split("T")[0];
      link.download = `shortlist-${today}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      toast.success("Shortlist image downloaded successfully");
    } catch (err) {
      console.error("Failed to download shortlist as image:", err);
      toast.error("Failed to download shortlist as image. Please try again.");
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
      toast.success("Item added to shortlist");
    },
    onError: () => {
      toast.error("Failed to add item to shortlist");
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

  const shortlistItems = filteredShortlistItems(data?.data);

  return (
    <div className="space-y-6">
      {/* Header */}


      {/* Controls */}
      <Card className="shadow-sm border-border/60">
        <CardContent className="p-5 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* Add to Shortlist Search */}
            <div className="md:col-span-2 relative">
              <label htmlFor="shortlist-add-item" className="block text-xs font-semibold text-muted-foreground mb-2">
                Add Item to Shortlist
              </label>
              <div className="relative">
                <Input
                  id="shortlist-add-item"
                  placeholder="Search inventory items..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pr-10"
                />
                {isSearching && (
                  <div className="absolute right-3 top-2.5">
                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                  </div>
                )}
              </div>
              {debouncedSearchTerm.length < 2 && (
                <div className="text-xs text-muted-foreground mt-1">
                  Type at least 2 characters
                </div>
              )}
              {debouncedSearchTerm.length >= 2 &&
                inventorySearchResults.length > 0 && (
                  <div className="absolute left-0 right-0 mt-1 border rounded-lg shadow-lg bg-popover text-popover-foreground z-50 max-h-60 overflow-y-auto">
                    {inventorySearchResults.map((item: any) => (
                      <button
                        key={item.id}
                        type="button"
                        className="w-full px-4 py-2 text-left hover:bg-muted border-b border-border last:border-b-0 flex justify-between items-center transition-colors"
                        onClick={() => {
                          addToShortlistMutation.mutate(item.id);
                          setSearchTerm("");
                        }}
                      >
                        <div className="flex flex-col">
                          <span className="font-medium text-sm">
                            {item.itemName}
                          </span>
                        </div>
                        <div className="flex flex-col items-end">
                          <span className="font-bold text-sm text-primary">
                            ৳{item.retailPrice ?? "-"}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {item.quantity > 0
                              ? `${item.quantity} in stock`
                              : "Out of stock"}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
            </div>

            {/* Sort By */}
            <div className="flex flex-col">
              <label htmlFor="shortlist-sort-by" className="block text-xs font-semibold text-muted-foreground mb-2">Sort By</label>
              <select
                id="shortlist-sort-by"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="quantity">Lowest Stock First</option>
                <option value="addedAt">Recently Added</option>
                <option value="name">Item Name</option>
              </select>
            </div>
          </div>

          {/* Export Buttons */}
          <div className="flex flex-wrap gap-2 pt-2">
            <Button
              onClick={() => exportPdf("shortlist")}
              className="flex items-center gap-2"
            >
              <Download className="w-4 h-4" /> Download Shortlist
            </Button>
            <Button
              variant="outline"
              onClick={() => exportPdf("inventory")}
              className="flex items-center gap-2"
            >
              <Download className="w-4 h-4" /> Download Inventory
            </Button>
            <Button
              variant="outline"
              onClick={() => exportPdf("analytics")}
              className="flex items-center gap-2"
            >
              <Download className="w-4 h-4" /> Download Analytics
            </Button>
            <Button
              variant="outline"
              onClick={() => exportBackup()}
              className="flex items-center gap-2"
            >
              <Download className="w-4 h-4" /> Download Backup
            </Button>
            <Button
              variant="outline"
              onClick={downloadAsImage}
              className="flex items-center gap-2"
            >
              <Download className="w-4 h-4" /> Download as Image
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Shortlist Items Table */}
      {error ? (
        <div className="text-center py-12 text-destructive font-medium">
          Error loading short list
        </div>
      ) : (
        <Card className="shadow-sm border-border/60" ref={shortlistTableRef}>
          <CardHeader className="pb-4 p-5 border-b border-border/60">
            <CardTitle className="text-lg font-semibold flex items-center justify-between flex-wrap gap-2">
              <span>Shortlist Items ({shortlistItems.length})</span>
              <Input
                id="shortlist-filter-search"
                value={shortlistSearchTerm}
                onChange={(e) => setShortlistSearchTerm(e.target.value)}
                placeholder="Search shortlist by item name, SKU, or product..."
                className="w-full md:max-w-md"
              />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="hidden md:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item Name</TableHead>
                    <TableHead>Current Qty</TableHead>
                    <TableHead>Last Restock Qty</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                      </TableCell>
                    </TableRow>
                  ) : shortlistItems.length > 0 ? (
                    shortlistItems.map((item) => {
                      const variantId = item.inventory?.variant?.id;
                      return (
                        <TableRow key={item.id}>
                          <TableCell>
                            {variantId ? (
                              <button
                                onClick={() => openItem(variantId, { showBatches: false })}
                                className="text-primary hover:underline text-left font-medium"
                              >
                                {item.inventory.itemName}
                              </button>
                            ) : (
                              <span className="font-medium">{item.inventory.itemName}</span>
                            )}
                          </TableCell>
                          <TableCell className="font-semibold">{item.inventory.quantity}</TableCell>
                          <TableCell>{item.inventory.lastRestockQty || "N/A"}</TableCell>
                          <TableCell className="text-right">
                            {confirmDeleteId === item.id ? (
                              <div className="flex items-center gap-1 bg-destructive/10 px-2 py-0.5 rounded border border-destructive/20 justify-end w-fit ml-auto">
                                <span className="text-xs text-destructive font-medium mr-1">Remove?</span>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-destructive hover:bg-destructive/20"
                                  onClick={() => {
                                    removeMutation.mutate(item.inventoryId);
                                    setConfirmDeleteId(null);
                                  }}
                                >
                                  <Check className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-muted-foreground hover:bg-muted"
                                  onClick={() => setConfirmDeleteId(null)}
                                >
                                  <X className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            ) : (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8"
                                onClick={() => setConfirmDeleteId(item.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                        {shortlistSearchTerm
                          ? `No items found matching "${shortlistSearchTerm}"`
                          : "No items in short list"}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="md:hidden p-4 space-y-3">
              {isLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                </div>
              ) : shortlistItems.length > 0 ? (
                shortlistItems.map((item) => {
                  const variantId = item.inventory?.variant?.id;
                  return (
                    <MobileTableCard key={item.id}>
                      <div className="font-semibold text-sm">
                        {variantId ? (
                          <button
                            onClick={() => openItem(variantId, { showBatches: false })}
                            className="text-primary hover:underline text-left"
                          >
                            {item.inventory.itemName}
                          </button>
                        ) : (
                          item.inventory.itemName
                        )}
                      </div>
                      <MobileTableCardRow label="Current Qty" value={item.inventory.quantity} />
                      <MobileTableCardRow label="Last Restock" value={item.inventory.lastRestockQty || "N/A"} />
                      <div className="pt-2 border-t border-border mt-2 flex justify-end">
                        {confirmDeleteId === item.id ? (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-destructive font-medium">Remove?</span>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-9 w-9 text-destructive"
                              onClick={() => {
                                removeMutation.mutate(item.inventoryId);
                                setConfirmDeleteId(null);
                              }}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-9 w-9"
                              onClick={() => setConfirmDeleteId(null)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-destructive"
                            onClick={() => setConfirmDeleteId(item.id)}
                          >
                            <Trash2 className="w-4 h-4 mr-2" /> Remove
                          </Button>
                        )}
                      </div>
                    </MobileTableCard>
                  );
                })
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  {shortlistSearchTerm
                    ? `No items found matching "${shortlistSearchTerm}"`
                    : "No items in short list"}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
