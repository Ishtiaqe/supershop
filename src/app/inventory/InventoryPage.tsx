"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, Controller, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import type { InventoryItem, ProductVariant, Product } from "@/types";
import api from "@/lib/api";
import { offlineApi } from "@/lib/api-offline";
import { useOffline } from "@/hooks/useOffline";
import { debounce } from "lodash";
import dayjs from "dayjs";
import { useAuth } from "@/components/auth/AuthProvider";
import { authStorage } from "@/lib/auth-storage";
import { useItemDetail } from "@/components/providers/ItemDetailContext";
import { MobileTableCard, MobileTableCardRow } from "@/components/mobile/MobileTableCard";

// Import shadcn UI components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";

interface CatalogItem {
  variantId: string;
  productName: string;
  variantName: string;
  sku: string;
  retailPrice: number;
  productType?: string;
  genericName?: string;
  manufacturerName?: string;
  purchasePrice?: number;
  stockQuantity?: number;
}

interface ApiClient {
  get: (url: string) => Promise<{ data: unknown }>;
  post: (url: string, data?: unknown) => Promise<{ data: unknown }>;
  put: (url: string, data?: unknown) => Promise<{ data: unknown }>;
  delete: (url: string) => Promise<{ data: unknown }>;
}

const addInventorySchema = z.object({
  itemName: z.string().min(1, "Please enter item name"),
  quantity: z.coerce.number().int().min(1, "Quantity must be at least 1"),
  purchasePrice: z.coerce.number().min(0, "Purchase price cannot be negative"),
  retailPrice: z.coerce.number().min(0, "Retail price cannot be negative"),
  maxDiscount: z.coerce.number().optional(),
  fundSource: z.enum(["CASH_BOX", "NEW_INVESTMENT", "LOAN"]),
  productType: z.string().optional(),
  genericName: z.string().optional(),
  manufacturerName: z.string().optional(),
  batchNo: z.string().optional(),
  expiryDate: z.string().optional(),
  mfgDate: z.string().optional(),
});

const editInventorySchema = z.object({
  itemName: z.string().min(1, "Please enter item name").optional(),
  quantity: z.coerce.number().int().min(1, "Quantity must be at least 1"),
  purchasePrice: z.coerce.number().min(0, "Purchase price cannot be negative"),
  retailPrice: z.coerce.number().min(0, "Retail price cannot be negative"),
});

type AddInventoryFormData = z.infer<typeof addInventorySchema>;
type EditInventoryFormData = z.infer<typeof editInventorySchema>;

function fetchInventory(isOnline: boolean): Promise<InventoryItem[]> {
  const client = (isOnline ? api : offlineApi) as unknown as ApiClient;
  return client.get("/inventory?limit=10000").then((r) => r.data as InventoryItem[]);
}

async function searchCatalog(
  query: string,
  isOnline: boolean
): Promise<CatalogItem[]> {
  if (!query || query.length < 2) return [];
  if (!isOnline) return [];
  const response = await api.get(
    `/catalog/search?q=${encodeURIComponent(query)}`
  );
  return response.data as CatalogItem[];
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <div className="text-xs text-destructive mt-1">{message}</div>;
}

export default function InventoryPage() {
  const { isOnline } = useOffline();
  const queryClient = useQueryClient();
  const itemNameRef = useRef<HTMLInputElement>(null);

  const addForm = useForm<AddInventoryFormData>({
    resolver: zodResolver(addInventorySchema) as Resolver<AddInventoryFormData>,
    defaultValues: {
      itemName: "",
      quantity: 1,
      purchasePrice: 0,
      retailPrice: 0,
      fundSource: "CASH_BOX",
      productType: "GENERAL",
      genericName: "",
      manufacturerName: "",
      batchNo: "",
    },
  });

  const editForm = useForm<EditInventoryFormData>({
    resolver: zodResolver(editInventorySchema) as Resolver<EditInventoryFormData>,
    defaultValues: {
      itemName: "",
      quantity: 1,
      purchasePrice: 0,
      retailPrice: 0,
    },
  });

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.key === "/" &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.altKey
      ) {
        const activeElement = document.activeElement as HTMLElement;
        if (
          activeElement &&
          (activeElement.tagName === "INPUT" ||
            activeElement.tagName === "TEXTAREA" ||
            activeElement.contentEditable === "true")
        ) {
          return;
        }
        event.preventDefault();
        itemNameRef.current?.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const tenantId = authStorage.getTenant()?.id || "unknown";
  const { data: items = [], isLoading } = useQuery<InventoryItem[], Error>({
    queryKey: ["inventory", tenantId, isOnline],
    queryFn: () => fetchInventory(isOnline),
    select: (data) => (Array.isArray(data) ? data : []),
  });

  const [editFormState, setEditFormState] = useState<{
    id?: string;
    variantId?: string;
  }>({
    id: undefined,
    variantId: undefined,
  });

  const [modalOpen, setModalOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [catalogOptions, setCatalogOptions] = useState<CatalogItem[]>([]);
  const [selectedFromCatalog, setSelectedFromCatalog] =
    useState<CatalogItem | null>(null);
  const [search, setSearch] = useState("");
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [addSuccessOpen, setAddSuccessOpen] = useState(false);
  const [addedItemName, setAddedItemName] = useState("");

  useEffect(() => {
    if (!addSuccessOpen) return;
    const timer = setTimeout(() => setAddSuccessOpen(false), 2500);
    return () => clearTimeout(timer);
  }, [addSuccessOpen]);

  const addMutation = useMutation<InventoryItem, Error, Partial<InventoryItem>>(
    {
      mutationFn: (payload: Partial<InventoryItem>) => {
        const client = (isOnline ? api : offlineApi) as unknown as ApiClient;
        return client
          .post("/inventory", payload)
          .then((r) => r.data as InventoryItem);
      },
      async onSuccess() {
        await queryClient.invalidateQueries({ queryKey: ["inventory"] });
        if (isOnline) {
          await queryClient.invalidateQueries({ queryKey: ["catalog"] });
        }
        await queryClient.invalidateQueries({ queryKey: ["shortlist"] });
        await queryClient.invalidateQueries({ queryKey: ["shortlist-stats"] });
      },
    }
  );

  const handleCatalogSearch = debounce(async (searchText: string) => {
    if (searchText && searchText.length >= 2) {
      const results = await searchCatalog(searchText, isOnline);
      setCatalogOptions(results);
    } else {
      setCatalogOptions([]);
    }
  }, 300);

  const handleCatalogSelect = (value: string) => {
    const selected = catalogOptions.find((item) => {
      const itemValue =
        item.variantName === "Standard"
          ? item.productName
          : `${item.productName} - ${item.variantName}`;
      return itemValue === value;
    });

    if (selected) {
      setSelectedFromCatalog(selected);
      addForm.setValue("retailPrice", selected.retailPrice);
      addForm.setValue("purchasePrice", selected.purchasePrice || 0);
      addForm.setValue("productType", selected.productType || "GENERAL");
      addForm.setValue("genericName", selected.genericName || "");
      addForm.setValue("manufacturerName", selected.manufacturerName || "");
    }
  };

  const submitAdd = async (values: AddInventoryFormData) => {
    const computed = computeMaxDiscount(
      values.purchasePrice,
      values.retailPrice
    );
    const maxDiscount =
      typeof values.maxDiscount === "number" && values.maxDiscount > computed
        ? computed
        : values.maxDiscount;

    const payload = {
      ...values,
      maxDiscount,
      variantId: selectedFromCatalog?.variantId,
      expiryDate: values.expiryDate
        ? dayjs(values.expiryDate).toISOString()
        : undefined,
      mfgDate: values.mfgDate ? dayjs(values.mfgDate).toISOString() : undefined,
    };

    setIsAddingItem(true);
    setAddedItemName(values.itemName || "New item");
    try {
      await new Promise((resolve) => setTimeout(resolve, 500));
      await addMutation.mutateAsync(payload as unknown as Partial<InventoryItem>);
      addForm.reset();
      setSelectedFromCatalog(null);
      setCatalogOptions([]);
      toast.success("Item added successfully");
      setAddSuccessOpen(true);

      setTimeout(() => {
        itemNameRef.current?.focus();
      }, 100);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to add item"
      );
    } finally {
      setIsAddingItem(false);
    }
  };

  const submitEdit = async (values: EditInventoryFormData) => {
    if (!editFormState.id) return;

    const payload: Partial<InventoryItem> & { id?: string } = {
      id: editFormState.id,
      ...values,
    };

    if (editFormState.variantId) {
      delete (payload as Partial<InventoryItem>).itemName;
    }

    try {
      await updateMutation.mutateAsync(payload);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update item"
      );
    }
  };

  const handleDelete = () => {
    if (!editFormState.id) return;
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    try {
      await deleteMutation.mutateAsync(editFormState.id!);
      setDeleteConfirmOpen(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete item"
      );
    }
  };

  const updateMutation = useMutation<
    InventoryItem,
    Error,
    Partial<InventoryItem>
  >({
    mutationFn: (payload: Partial<InventoryItem>) => {
      const client = (isOnline ? api : offlineApi) as unknown as ApiClient;
      return client
        .put(`/inventory/${payload.id}`, payload)
        .then((r) => r.data as InventoryItem);
    },
    async onSuccess() {
      await queryClient.invalidateQueries({ queryKey: ["inventory"] });
      toast.success("Item updated successfully");
      editForm.reset();
      setEditFormState({
        id: undefined,
        variantId: undefined,
      });
      setModalOpen(false);
    },
  });

  const deleteMutation = useMutation<void, Error, string>({
    mutationFn: (id: string) => {
      const client = (isOnline ? api : offlineApi) as unknown as ApiClient;
      return client.delete(`/inventory/${id}`).then((r) => r.data as void);
    },
    async onSuccess() {
      await queryClient.invalidateQueries({ queryKey: ["inventory"] });
      toast.success("Item deleted successfully");
      editForm.reset();
      setEditFormState({
        id: undefined,
        variantId: undefined,
      });
      setModalOpen(false);
    },
  });

  function computeMaxDiscount(
    purchasePrice?: number,
    retailPrice?: number
  ): number {
    const p = Number(purchasePrice ?? 0);
    const r = Number(retailPrice ?? 0);
    if (!r || r <= 0) return 0;
    const discount = ((r - p) / r) * 100;
    return Number.isFinite(discount) ? Math.max(0, Math.floor(discount)) : 0;
  }

  const { user } = useAuth();
  const { openItem } = useItemDetail();

  const dataSource = useMemo(() => {
    if (!accIsArray(items)) {
      console.error("Items is not an array:", items);
      return [];
    }

    function accIsArray(val: unknown): val is InventoryItem[] {
      return Array.isArray(val);
    }

    const grouped = items.reduce(
      (
        acc: Record<
          string,
          {
            key: string;
            itemName?: string;
            variant?: ProductVariant & { product: Product };
            subItems: InventoryItem[];
            totalQuantity: number;
            batches: string[];
          }
        >,
        item
      ) => {
        const key = item.variantId || item.itemName || "unknown";
        if (!acc[key]) {
          acc[key] = {
            key,
            itemName: item.itemName,
            variant: item.variant,
            subItems: [],
            totalQuantity: 0,
            batches: [],
          };
        }
        acc[key].subItems.push(item);
        acc[key].totalQuantity += item.quantity;
        if (item.batchNo && !acc[key].batches.includes(item.batchNo))
          acc[key].batches.push(item.batchNo);
        return acc;
      },
      {}
    );

    return Object.values(grouped)
      .map((item) => {
        const sortedByRestock = [...item.subItems].sort((a, b) => {
          const aTime = a.lastRestockDate ? new Date(a.lastRestockDate).getTime() : 0;
          const bTime = b.lastRestockDate ? new Date(b.lastRestockDate).getTime() : 0;
          return bTime - aTime;
        });
        const latest = sortedByRestock[0];
        return {
          ...item,
          batchInfo:
            item.batches.length > 1
              ? `${item.batches.length} Batches`
              : item.subItems[0]?.batchNo || "-",
          latestPurchasePrice: latest.purchasePrice,
          latestRetailPrice: latest.retailPrice,
          lastRestockDate: latest.lastRestockDate,
        };
      })
      .sort((a, b) => {
        const aTime = a.lastRestockDate ? new Date(a.lastRestockDate).getTime() : 0;
        const bTime = b.lastRestockDate ? new Date(b.lastRestockDate).getTime() : 0;
        return bTime - aTime;
      });
  }, [items]);

  type InventoryRow = (typeof dataSource)[number];

  const filteredDataSource = useMemo(() => {
    if (!search) return dataSource;
    const s = search.toLowerCase();
    return dataSource.filter((item) => {
      const name = item.variant
        ? `${item.variant.product.name} ${item.variant.variantName === "Standard"
          ? ""
          : item.variant.variantName
        }`
        : item.itemName || "";
      const itemName = item.itemName || "";
      const sku = item.variant?.sku || "";
      const genericName = item.variant?.product?.genericName || "";
      const manufacturerName = item.variant?.product?.manufacturerName || "";
      return (
        name.toLowerCase().includes(s) ||
        itemName.toLowerCase().includes(s) ||
        sku.toLowerCase().includes(s) ||
        genericName.toLowerCase().includes(s) ||
        manufacturerName.toLowerCase().includes(s)
      );
    });
  }, [dataSource, search]);

  const openRow = (item: InventoryRow) => {
    const variantId = item.variant?.id ?? item.subItems?.[0]?.variantId;
    if (variantId) openItem(variantId, { showBatches: true });
  };

  if (!user || (user.role !== "OWNER" && user.role !== "EMPLOYEE")) {
    return <div className="p-6">Access denied — Owners and employees only</div>;
  }

  const addFormWatch = addForm.watch();
  const computedMaxDiscountValue = computeMaxDiscount(
    addFormWatch.purchasePrice,
    addFormWatch.retailPrice
  );

  return (
    <div className="space-y-2">

      <div className="space-y-4">
        {/* Add Form Card */}
        <Card className="shadow-sm border-border/60">
          <CardHeader className="pb-4 p-5">
            <CardTitle className="text-lg font-semibold">Add Inventory Item</CardTitle>
          </CardHeader>
          <CardContent className="p-5 pt-0">
            <form onSubmit={addForm.handleSubmit(submitAdd)} className="space-y-4">
              {/* Item Name (AutoComplete) */}
              <div className="space-y-2">
                <label htmlFor="add-item-name" className="text-sm font-medium text-foreground">
                  Item Name (Search catalog or enter new)
                  <span className="ml-1 text-xs text-muted-foreground">[Search Box #1: Catalog Search]</span>
                </label>
                <Controller
                  name="itemName"
                  control={addForm.control}
                  render={({ field, fieldState: { error } }) => (
                    <div className="relative">
                      <Input
                        {...field}
                        ref={itemNameRef}
                        id="add-item-name"
                        placeholder="Type to search catalog or enter new product name"
                        onChange={(e) => {
                          field.onChange(e.target.value);
                          handleCatalogSearch(e.target.value);
                        }}
                      />
                      <FieldError message={error?.message} />
                      {catalogOptions.length > 0 && (
                        <div className="absolute z-10 w-full mt-1 border rounded-lg shadow-lg max-h-60 overflow-y-auto bg-popover text-popover-foreground">
                          {catalogOptions.map((item) => (
                            <button
                              key={`${item.productName}-${item.variantName}`}
                              type="button"
                              className="w-full px-3 py-2 text-left hover:bg-accent hover:text-accent-foreground border-b border-border last:border-b-0"
                              onClick={() => {
                                const value = item.variantName === "Standard"
                                  ? item.productName
                                  : `${item.productName} - ${item.variantName}`;
                                field.onChange(value);
                                handleCatalogSelect(value);
                                setCatalogOptions([]);
                              }}
                            >
                              <div className="font-medium text-sm">
                                {item.variantName === "Standard"
                                  ? item.productName
                                  : `${item.productName} - ${item.variantName}`}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                ৳{item.retailPrice}
                                {item.genericName && ` | ${item.genericName}`}
                                {typeof item.stockQuantity === "number" && (
                                  <span className={item.stockQuantity > 0 ? "text-green-600 font-medium" : "text-destructive"}>
                                    {" | "}{item.stockQuantity > 0 ? `${item.stockQuantity} in stock` : "Out of stock"}
                                  </span>
                                )}
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                />
              </div>

              {/* Price and Quantity Fields */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Controller
                  name="quantity"
                  control={addForm.control}
                  render={({ field, fieldState: { error } }) => (
                    <div className="space-y-2">
                      <label htmlFor="add-quantity" className="text-sm font-medium text-foreground">Quantity</label>
                      <Input
                        type="number"
                        placeholder="0"
                        min={1}
                        id="add-quantity"
                        {...field}
                        onChange={(e) => field.onChange(e.target.valueAsNumber || 0)}
                      />
                      <FieldError message={error?.message} />
                    </div>
                  )}
                />

                <Controller
                  name="purchasePrice"
                  control={addForm.control}
                  render={({ field, fieldState: { error } }) => (
                    <div className="space-y-2">
                      <label htmlFor="add-purchase-price" className="text-sm font-medium text-foreground">Purchase/unit (৳)</label>
                      <Input
                        type="number"
                        placeholder="0.00"
                        min={0}
                        step="0.01"
                        id="add-purchase-price"
                        {...field}
                        onChange={(e) => field.onChange(e.target.valueAsNumber || 0)}
                      />
                      <FieldError message={error?.message} />
                    </div>
                  )}
                />

                <Controller
                  name="retailPrice"
                  control={addForm.control}
                  render={({ field, fieldState: { error } }) => (
                    <div className="space-y-2">
                      <label htmlFor="add-mrp" className="text-sm font-medium text-foreground">MRP/unit (৳)</label>
                      <Input
                        type="number"
                        min={0}
                        step="0.1"
                        id="add-mrp"
                        {...field}
                        onChange={(e) => field.onChange(e.target.valueAsNumber || 0)}
                      />
                      <FieldError message={error?.message} />
                    </div>
                  )}
                />

                {computedMaxDiscountValue > 0 && (
                  <div className="space-y-2">
                    <label htmlFor="add-max-discount" className="text-sm font-medium text-muted-foreground">Max Discount %</label>
                    <Input
                      type="text"
                      disabled
                      id="add-max-discount"
                      value={`${computedMaxDiscountValue}%`}
                    />
                  </div>
                )}
              </div>

              {/* Fund Source */}
              <Controller
                name="fundSource"
                control={addForm.control}
                render={({ field, fieldState: { error } }) => (
                  <div className="space-y-2">
                    <label htmlFor="add-fund-source" className="text-sm font-medium text-foreground">Fund Source</label>
                    <select
                      id="add-fund-source"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      {...field}
                    >
                      <option value="CASH_BOX">Cash Register</option>
                      <option value="NEW_INVESTMENT">New Investment</option>
                      <option value="LOAN">Loan</option>
                    </select>
                    <FieldError message={error?.message} />
                  </div>
                )}
              />

              <Button
                type="submit"
                disabled={addMutation.isPending || isAddingItem}
                className="w-full md:w-auto active:scale-95 transition-transform duration-150"
              >
                {(isAddingItem || addMutation.isPending) && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {isAddingItem || addMutation.isPending ? "Adding Item..." : "Add Item"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Inventory Table Card */}
        <Card className="shadow-sm border-border/60">
          <CardHeader className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-border/60 pb-4 p-5">
            <CardTitle className="text-lg font-semibold">Inventory Items</CardTitle>
            <Input
              id="inventory-search"
              placeholder="Search by name, SKU, or generic name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full md:w-80"
              data-search-box="inventory-table-search"
              aria-label="Search Box #2: Inventory Table Search"
            />
          </CardHeader>
          <CardContent className="p-0">
            <div className="hidden md:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item Name</TableHead>
                    <TableHead className="text-right">Total Stock</TableHead>
                    <TableHead className="text-right">Purchase Price</TableHead>
                    <TableHead className="text-right">MRP/Unit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
                      </TableCell>
                    </TableRow>
                  ) : filteredDataSource.length > 0 ? (
                    filteredDataSource.map((item) => (
                      <TableRow
                        key={item.key}
                        onClick={() => openRow(item)}
                        className="cursor-pointer hover:bg-muted/50"
                      >
                        <TableCell>
                          <div>
                            <div className="font-semibold text-foreground">
                              {item.variant
                                ? item.variant.product.name
                                : item.itemName || "Unnamed item"}
                            </div>
                            {item.variant && item.variant.variantName !== "Standard" && (
                              <div className="text-xs text-muted-foreground mt-0.5">
                                {item.variant.variantName}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant={item.totalQuantity < 5 ? "destructive" : "secondary"}>
                            {item.totalQuantity}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">৳{item.latestPurchasePrice}</TableCell>
                        <TableCell className="text-right">৳{item.latestRetailPrice}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        No inventory items found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="md:hidden p-4 space-y-3">
              {isLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
                </div>
              ) : filteredDataSource.length > 0 ? (
                filteredDataSource.map((item) => {
                  const itemName = item.variant
                    ? item.variant.product.name
                    : item.itemName || "Unnamed item";
                  const variantName = item.variant?.variantName !== "Standard"
                    ? item.variant?.variantName
                    : undefined;
                  const stockLow = item.totalQuantity < 5;

                  return (
                    <MobileTableCard
                      key={item.key}
                      onClick={() => openRow(item)}
                    >
                      <div className="font-semibold text-sm">{itemName}</div>
                      {variantName && (
                        <div className="text-xs text-muted-foreground mb-2">{variantName}</div>
                      )}
                      <MobileTableCardRow
                        label="Stock"
                        value={
                          <Badge variant={stockLow ? "destructive" : "secondary"}>
                            {item.totalQuantity}
                          </Badge>
                        }
                      />
                      <MobileTableCardRow
                        label="Purchase Price"
                        value={`৳${item.latestPurchasePrice}`}
                      />
                      <MobileTableCardRow
                        label="MRP/Unit"
                        value={`৳${item.latestRetailPrice}`}
                      />
                    </MobileTableCard>
                  );
                })
              ) : (
                <div className="text-center py-8 text-muted-foreground">No inventory items found.</div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Delete Item</DialogTitle>
            </DialogHeader>
            <div className="py-4 text-sm text-muted-foreground">
              Are you sure you want to delete this inventory item?
            </div>
            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setDeleteConfirmOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={confirmDelete}
                disabled={deleteMutation.isPending}
              >
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add Item Success Popup */}
        <Dialog open={addSuccessOpen} onOpenChange={setAddSuccessOpen}>
          <DialogContent className="sm:max-w-[360px]" showCloseButton={false}>
            <DialogHeader>
              <DialogTitle className="text-emerald-600">Item Added!</DialogTitle>
              <DialogDescription>
                {addedItemName || "New item"} has been added to inventory.
              </DialogDescription>
            </DialogHeader>
            <div className="py-3 text-center text-xs text-muted-foreground">
              This confirmation will close automatically.
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Edit Inventory Item</DialogTitle>
            </DialogHeader>

            <form onSubmit={editForm.handleSubmit(submitEdit)} className="space-y-4 pt-2">
              <Controller
                name="itemName"
                control={editForm.control}
                render={({ field, fieldState: { error } }) => (
                  <div className="space-y-2">
                    <label htmlFor="edit-item-name" className="text-sm font-medium text-foreground">Item Name</label>
                    <Input
                      {...field}
                      id="edit-item-name"
                      placeholder="Item name"
                      disabled={!!editFormState.variantId}
                    />
                    <FieldError message={error?.message} />
                  </div>
                )}
              />

              <Controller
                name="quantity"
                control={editForm.control}
                render={({ field, fieldState: { error } }) => (
                  <div className="space-y-2">
                    <label htmlFor="edit-quantity" className="text-sm font-medium text-foreground">Quantity</label>
                    <Input
                      type="number"
                      min={1}
                      id="edit-quantity"
                      {...field}
                      onChange={(e) => field.onChange(e.target.valueAsNumber || 0)}
                    />
                    <FieldError message={error?.message} />
                  </div>
                )}
              />

              <Controller
                name="purchasePrice"
                control={editForm.control}
                render={({ field, fieldState: { error } }) => (
                  <div className="space-y-2">
                    <label htmlFor="edit-purchase-price" className="text-sm font-medium text-foreground">Purchase/unit (৳)</label>
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      id="edit-purchase-price"
                      {...field}
                      onChange={(e) => field.onChange(e.target.valueAsNumber || 0)}
                    />
                    <FieldError message={error?.message} />
                  </div>
                )}
              />

              <Controller
                name="retailPrice"
                control={editForm.control}
                render={({ field, fieldState: { error } }) => (
                  <div className="space-y-2">
                    <label htmlFor="edit-mrp" className="text-sm font-medium text-foreground">MRP/unit (৳)</label>
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      id="edit-mrp"
                      {...field}
                      onChange={(e) => field.onChange(e.target.valueAsNumber || 0)}
                    />
                    <FieldError message={error?.message} />
                  </div>
                )}
              />

              <DialogFooter className="pt-4 border-t border-border flex flex-row justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={handleDelete}
                  disabled={deleteMutation.isPending}
                >
                  Delete
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={updateMutation.isPending}
                >
                  Update Item
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
