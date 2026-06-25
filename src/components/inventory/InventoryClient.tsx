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
import {
  Table,
  Button,
  Input,
  InputNumber,
  Select,
  Modal,
  Tag,
  Card,
} from "antd";
import type { InputRef } from "antd";
import type { ColumnsType } from "antd/es/table";
import { debounce } from "lodash";
import dayjs from "dayjs";
import { useAuth } from "@/components/auth/AuthProvider";
import { useItemDetail } from "@/components/providers/ItemDetailContext";

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
}

// Define a common interface for both online and offline clients
interface ApiClient {
  get: (url: string) => Promise<{ data: unknown }>;
  post: (url: string, data?: unknown) => Promise<{ data: unknown }>;
  put: (url: string, data?: unknown) => Promise<{ data: unknown }>;
  delete: (url: string) => Promise<{ data: unknown }>;
}

// Zod validation schemas
const addInventorySchema = z.object({
  itemName: z.string().min(1, "Please enter item name"),
  quantity: z.coerce.number().int().min(1, "Quantity must be at least 1"),
  purchasePrice: z.coerce
    .number()
    .min(0, "Purchase price cannot be negative"),
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
  purchasePrice: z.coerce
    .number()
    .min(0, "Purchase price cannot be negative"),
  retailPrice: z.coerce.number().min(0, "Retail price cannot be negative"),
});

type AddInventoryFormData = z.infer<typeof addInventorySchema>;
type EditInventoryFormData = z.infer<typeof editInventorySchema>;

function fetchInventory(isOnline: boolean): Promise<InventoryItem[]> {
  const client = (isOnline ? api : offlineApi) as unknown as ApiClient;
  return client.get("/inventory").then((r) => r.data as InventoryItem[]);
}

async function searchCatalog(
  query: string,
  isOnline: boolean,
): Promise<CatalogItem[]> {
  if (!query || query.length < 2) return [];
  if (!isOnline) return [];
  const response = await api.get(
    `/catalog/search?q=${encodeURIComponent(query)}`,
  );
  return response.data as CatalogItem[];
}

// Small field-error helper for the react-hook-form + antd combo
function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <div style={{ color: "#cf1322", fontSize: 12 }}>{message}</div>;
}

export default function InventoryClient() {
  const { isOnline } = useOffline();
  const queryClient = useQueryClient();
  const itemNameRef = useRef<InputRef>(null);

  // Add form
  // ponytail: cast resolver — z.coerce.number() yields `unknown` input type that
  // doesn't line up with the inferred number output; cast keeps one form generic.
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

  // Edit form
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

  const { data: items = [], isLoading } = useQuery<InventoryItem[], Error>({
    queryKey: ["inventory", isOnline],
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
    },
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
    const selected = catalogOptions.find(
      (item) => `${item.productName} - ${item.variantName}` === value,
    );

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
      values.retailPrice,
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

    try {
      // payload carries ISO date strings for the wire; InventoryItem types them as Date
      await addMutation.mutateAsync(payload as unknown as Partial<InventoryItem>);
      addForm.reset();
      setSelectedFromCatalog(null);
      setCatalogOptions([]);
      toast.success("Item added successfully");

      setTimeout(() => {
        itemNameRef.current?.focus();
      }, 100);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to add item",
      );
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
        error instanceof Error ? error.message : "Failed to update item",
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
        error instanceof Error ? error.message : "Failed to delete item",
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
    retailPrice?: number,
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
    if (!Array.isArray(items)) {
      console.error("Items is not an array:", items);
      return [];
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
        item,
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
      {},
    );

    return Object.values(grouped).map((item) => {
      const latest = item.subItems[0];
      return {
        ...item,
        batchInfo:
          item.batches.length > 1
            ? `${item.batches.length} Batches`
            : item.subItems[0]?.batchNo || "-",
        latestPurchasePrice: latest.purchasePrice,
        latestRetailPrice: latest.retailPrice,
      };
    });
  }, [items]);

  type InventoryRow = (typeof dataSource)[number];

  const filteredDataSource = useMemo(() => {
    if (!search) return dataSource;
    return dataSource.filter((item) => {
      const name = item.variant
        ? `${item.variant.product.name} ${
            item.variant.variantName === "Standard"
              ? ""
              : item.variant.variantName
          }`
        : item.itemName || "";
      return name.toLowerCase().includes(search.toLowerCase());
    });
  }, [dataSource, search]);

  const openRow = (item: InventoryRow) => {
    const variantId = item.variant?.id ?? item.subItems?.[0]?.variantId;
    if (variantId) openItem(variantId, { showBatches: true });
  };

  const columns: ColumnsType<InventoryRow> = [
    {
      title: "Item Name",
      key: "itemName",
      render: (_, item) =>
        item.variant
          ? `${item.variant.product.name}${
              item.variant.variantName === "Standard"
                ? ""
                : ` - ${item.variant.variantName}`
            }`
          : item.itemName || "Unnamed item",
    },
    {
      title: "Total Stock",
      key: "totalQuantity",
      align: "right",
      render: (_, item) => (
        <Tag color={item.totalQuantity < 5 ? "red" : "green"}>
          {item.totalQuantity}
        </Tag>
      ),
    },
    {
      title: "Purchase Price",
      key: "purchasePrice",
      align: "right",
      render: (_, item) => `৳${item.latestPurchasePrice}`,
    },
    {
      title: "MRP/Unit",
      key: "retailPrice",
      align: "right",
      render: (_, item) => `৳${item.latestRetailPrice}`,
    },
    {
      title: "Batch Info",
      key: "batchInfo",
      render: (_, item) => item.batchInfo,
    },
  ];

  if (!user || (user.role !== "OWNER" && user.role !== "EMPLOYEE")) {
    return <div className="p-6">Access denied — Owners and employees only</div>;
  }

  const addFormWatch = addForm.watch();
  const computedMaxDiscount = computeMaxDiscount(
    addFormWatch.purchasePrice,
    addFormWatch.retailPrice,
  );

  return (
    <div className="space-y-4">
      {/* Add Form Card */}
      <Card>
        <h2 className="text-lg font-semibold mb-4">Add Inventory Item</h2>
        <form onSubmit={addForm.handleSubmit(submitAdd)} className="space-y-4">
          {/* Item Name (AutoComplete) */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Item Name (Search catalog or enter new)
            </label>
            <Controller
              name="itemName"
              control={addForm.control}
              render={({ field, fieldState: { error } }) => (
                <div>
                  <Input
                    value={field.value}
                    ref={itemNameRef}
                    allowClear
                    status={error ? "error" : undefined}
                    placeholder="Type to search catalog or enter new product name"
                    onChange={(e) => {
                      field.onChange(e.target.value);
                      handleCatalogSearch(e.target.value);
                    }}
                  />
                  <FieldError message={error?.message} />
                  {catalogOptions.length > 0 && (
                    <div className="mt-2 border rounded-lg overflow-hidden bg-white">
                      {catalogOptions.map((item) => (
                        <button
                          key={`${item.productName}-${item.variantName}`}
                          type="button"
                          className="w-full px-3 py-2 text-left hover:bg-gray-100 border-b last:border-b-0"
                          onClick={() => {
                            const value = `${item.productName} - ${item.variantName}`;
                            field.onChange(value);
                            handleCatalogSelect(value);
                            setCatalogOptions([]);
                          }}
                        >
                          <div className="font-medium text-sm">
                            {item.productName} - {item.variantName}
                          </div>
                          <div className="text-xs text-gray-600">
                            ৳{item.retailPrice}
                            {item.genericName && ` | ${item.genericName}`}
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
                  <label className="text-sm font-medium">Quantity</label>
                  <InputNumber
                    value={field.value}
                    placeholder="0"
                    status={error ? "error" : undefined}
                    min={1}
                    style={{ width: "100%" }}
                    onChange={(val) => field.onChange(val ?? 0)}
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
                  <label className="text-sm font-medium">Purchase/unit</label>
                  <InputNumber
                    value={field.value}
                    placeholder="0"
                    status={error ? "error" : undefined}
                    prefix="৳"
                    min={0}
                    style={{ width: "100%" }}
                    onChange={(val) => field.onChange(val ?? 0)}
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
                  <label className="text-sm font-medium">MRP/unit</label>
                  <InputNumber
                    value={field.value}
                    placeholder="0"
                    status={error ? "error" : undefined}
                    prefix="৳"
                    min={0}
                    style={{ width: "100%" }}
                    onChange={(val) => field.onChange(val ?? 0)}
                  />
                  <FieldError message={error?.message} />
                </div>
              )}
            />

            {computedMaxDiscount > 0 && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Max Discount %</label>
                <InputNumber
                  placeholder="0"
                  disabled
                  value={computedMaxDiscount}
                  prefix="%"
                  style={{ width: "100%" }}
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
                <label className="text-sm font-medium">Fund Source</label>
                <Select
                  value={field.value}
                  placeholder="Select fund source"
                  status={error ? "error" : undefined}
                  style={{ width: "100%" }}
                  onChange={(val) => field.onChange(val)}
                  options={[
                    { value: "CASH_BOX", label: "Cash Box" },
                    { value: "NEW_INVESTMENT", label: "New Investment" },
                    { value: "LOAN", label: "Loan" },
                  ]}
                />
                <FieldError message={error?.message} />
              </div>
            )}
          />

          <Button
            type="primary"
            htmlType="submit"
            size="large"
            loading={addMutation.isPending}
            className="w-full md:w-auto"
          >
            Add Item
          </Button>
        </form>
      </Card>

      {/* Inventory Table Card */}
      <Card>
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
          <h2 className="text-lg font-semibold">Inventory Items</h2>
          <Input
            placeholder="Search by product name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            allowClear
            type="search"
            className="w-full md:w-80"
          />
        </div>

        <Table<InventoryRow>
          columns={columns}
          dataSource={filteredDataSource}
          rowKey={(item) => item.key}
          loading={isLoading}
          pagination={false}
          scroll={{ x: true }}
          locale={{ emptyText: "No inventory items found" }}
          onRow={(record) => ({
            onClick: () => openRow(record),
            style: { cursor: "pointer" },
          })}
        />
      </Card>

      {/* Delete Confirmation Modal */}
      <Modal
        open={deleteConfirmOpen}
        onCancel={() => setDeleteConfirmOpen(false)}
        title="Delete Item"
        okText="Delete"
        okButtonProps={{ danger: true, loading: deleteMutation.isPending }}
        onOk={confirmDelete}
      >
        Are you sure you want to delete this inventory item?
      </Modal>

      {/* Edit Modal */}
      <Modal
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        title="Edit Inventory Item"
        footer={[
          <Button key="cancel" onClick={() => setModalOpen(false)}>
            Cancel
          </Button>,
          <Button
            key="delete"
            danger
            onClick={handleDelete}
            loading={deleteMutation.isPending}
          >
            Delete
          </Button>,
          <Button
            key="update"
            type="primary"
            loading={updateMutation.isPending}
            onClick={editForm.handleSubmit(submitEdit)}
          >
            Update Item
          </Button>,
        ]}
      >
        <form
          onSubmit={editForm.handleSubmit(submitEdit)}
          className="space-y-4"
        >
          <Controller
            name="itemName"
            control={editForm.control}
            render={({ field, fieldState: { error } }) => (
              <div className="space-y-2">
                <label className="text-sm font-medium">Item Name</label>
                <Input
                  {...field}
                  placeholder="Item name"
                  status={error ? "error" : undefined}
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
                <label className="text-sm font-medium">Quantity</label>
                <InputNumber
                  value={field.value}
                  placeholder="0"
                  status={error ? "error" : undefined}
                  min={1}
                  style={{ width: "100%" }}
                  onChange={(val) => field.onChange(val ?? 0)}
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
                <label className="text-sm font-medium">Purchase/unit</label>
                <InputNumber
                  value={field.value}
                  placeholder="0"
                  status={error ? "error" : undefined}
                  prefix="৳"
                  min={0}
                  style={{ width: "100%" }}
                  onChange={(val) => field.onChange(val ?? 0)}
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
                <label className="text-sm font-medium">MRP/unit</label>
                <InputNumber
                  value={field.value}
                  placeholder="0"
                  status={error ? "error" : undefined}
                  prefix="৳"
                  min={0}
                  style={{ width: "100%" }}
                  onChange={(val) => field.onChange(val ?? 0)}
                />
                <FieldError message={error?.message} />
              </div>
            )}
          />
        </form>
      </Modal>
    </div>
  );
}
