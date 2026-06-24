"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { debounce } from "lodash";
import {
  Select,
  SelectItem,
  Button,
  Input,
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@heroui/react";
import { useItemDetail } from "@/components/providers/ItemDetailContext";
import { Loader2, Download, Trash2 } from "lucide-react";
import { toast } from "sonner";

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
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [filterSlow, setFilterSlow] = useState<boolean | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [shortlistSearchTerm, setShortlistSearchTerm] = useState("");
  const [debouncedShortlistSearch, setDebouncedShortlistSearch] = useState("");
  const [openPopoverId, setOpenPopoverId] = useState<string | null>(null);

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
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(shortlistTableRef.current, { scale: 2 });
      const link = document.createElement('a');
      const today = new Date().toISOString().split('T')[0];
      link.download = `shortlist-${today}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      toast.success('Shortlist image downloaded successfully');
    } catch (err) {
      console.error('Failed to download shortlist as image:', err);
      toast.error('Failed to download shortlist as image. Please try again.');
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
      <div>
        <h1 className="page-header">Short List</h1>
        <p className="page-subheader">
          Items that need restocking
        </p>
      </div>

      {/* Controls */}
      <div className="surface-card p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {/* Add to Shortlist Search */}
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-muted-foreground mb-2">
              Add Item to Shortlist
            </label>
            <div className="space-y-2">
              <Input
                placeholder="Search inventory items..."
                value={searchTerm}
                onValueChange={setSearchTerm}
                isClearable
                className="w-full"
                disabled={isSearching}
                description={
                  debouncedSearchTerm.length < 2
                    ? "Type at least 2 characters"
                    : undefined
                }
                startContent={
                  isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : null
                }
              />
              {debouncedSearchTerm.length >= 2 && inventorySearchResults.length > 0 && (
                <div className="border rounded-lg overflow-hidden bg-white z-10">
                  {inventorySearchResults.map((item: any) => (
                    <button
                      key={item.id}
                      type="button"
                      className="w-full px-4 py-2 text-left hover:bg-gray-100 border-b last:border-b-0 flex justify-between items-center"
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
                        <span className="font-bold text-primary text-sm">
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
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sort By */}
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-2">
              Sort By
            </label>
            <Select
              selectedKeys={[sortBy]}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full"
            >
              <SelectItem key="quantity">
                Lowest Stock First
              </SelectItem>
              <SelectItem key="addedAt">
                Recently Added
              </SelectItem>
              <SelectItem key="name">
                Item Name
              </SelectItem>
            </Select>
          </div>
        </div>

        {/* Export Buttons */}
        <div className="flex flex-wrap gap-2 mb-2">
          <Button
            onPress={() => exportPdf("shortlist")}
            color="primary"
            startContent={<Download className="w-4 h-4" />}
          >
            Download Shortlist
          </Button>
          <Button
            onPress={() => exportPdf("inventory")}
            variant="bordered"
            startContent={<Download className="w-4 h-4" />}
          >
            Download Inventory
          </Button>
          <Button
            onPress={() => exportPdf("analytics")}
            variant="bordered"
            startContent={<Download className="w-4 h-4" />}
          >
            Download Analytics
          </Button>
          <Button
            onPress={() => exportBackup()}
            variant="bordered"
            startContent={<Download className="w-4 h-4" />}
          >
            Download Backup
          </Button>
          <Button
            onPress={downloadAsImage}
            variant="bordered"
            startContent={<Download className="w-4 h-4" />}
          >
            Download as Image
          </Button>
        </div>
      </div>

      {/* Shortlist Items Table */}
      {error ? (
        <div className="text-center py-12 text-destructive">
          Error loading short list
        </div>
      ) : (
        <div ref={shortlistTableRef} className="surface-card overflow-hidden rounded-lg">
          <div className="p-4 border-b border-border">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-foreground">
                Shortlist Items ({shortlistItems.length})
              </h3>
            </div>
            <div>
              <Input
                isClearable
                onClear={() => setShortlistSearchTerm("")}
                value={shortlistSearchTerm}
                onValueChange={setShortlistSearchTerm}
                placeholder="Search shortlist by item name, SKU, or product..."
                className="w-full"
              />
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : shortlistItems.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              {shortlistSearchTerm
                ? `No items found matching "${shortlistSearchTerm}"`
                : "No items in short list"}
            </div>
          ) : (
            <Table
              aria-label="Shortlist items table"
              className="w-full"
              removeWrapper
            >
              <TableHeader>
                <TableColumn>Item Name</TableColumn>
                <TableColumn>Current Qty</TableColumn>
                <TableColumn>Last Restock Qty</TableColumn>
                <TableColumn>Actions</TableColumn>
              </TableHeader>
              <TableBody items={shortlistItems}>
                {(item: ShortListItem) => {
                  const variantId = item.inventory?.variant?.id;
                  return (
                    <TableRow key={item.id}>
                      <TableCell>
                        {variantId ? (
                          <button
                            onClick={() =>
                              openItem(variantId, { showBatches: false })
                            }
                            className="text-primary hover:underline text-left font-medium"
                          >
                            {item.inventory.itemName}
                          </button>
                        ) : (
                          <span className="font-medium">
                            {item.inventory.itemName}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="font-medium text-foreground">
                          {item.inventory.quantity}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-muted-foreground">
                          {item.inventory.lastRestockQty || "N/A"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Popover
                          placement="left"
                          isOpen={openPopoverId === item.id}
                          onOpenChange={(open) =>
                            setOpenPopoverId(open ? item.id : null)
                          }
                        >
                          <PopoverTrigger asChild>
                            <Button
                              isIconOnly
                              color="danger"
                              variant="light"
                              isLoading={removeMutation.isPending}
                              size="sm"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-72">
                            <div className="px-1 py-2 space-y-3">
                              <div className="text-sm font-semibold">
                                Remove from shortlist
                              </div>
                              <div className="text-sm text-muted-foreground">
                                Are you sure you want to remove this item from
                                the shortlist?
                              </div>
                              <div className="flex gap-2 justify-end">
                                <Button
                                  size="sm"
                                  variant="light"
                                  onPress={() => setOpenPopoverId(null)}
                                >
                                  No
                                </Button>
                                <Button
                                  size="sm"
                                  color="danger"
                                  onPress={() => {
                                    removeMutation.mutate(item.inventoryId);
                                  }}
                                >
                                  Yes, Remove
                                </Button>
                              </div>
                            </div>
                          </PopoverContent>
                        </Popover>
                      </TableCell>
                    </TableRow>
                  );
                }}
              </TableBody>
            </Table>
          )}
        </div>
      )}
    </div>
  );
}
