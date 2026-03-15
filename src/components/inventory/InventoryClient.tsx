"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { InventoryItem, ProductVariant, Product } from "@/types";
import api from "@/lib/api";
import { offlineApi } from "@/lib/api-offline";
import { useOffline } from "@/hooks/useOffline";
import {
  Table,
  Form,
  Input,
  InputNumber,
  Button,
  Space,
  Typography,
  Modal,
  message,
  AutoComplete,
} from "antd";
import SearchOutlined from "@ant-design/icons/SearchOutlined";
import { debounce } from "lodash";
import dayjs from "dayjs";
import { useAuth } from "@/components/auth/AuthProvider";

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

function fetchInventory(isOnline: boolean): Promise<InventoryItem[]> {
  const client = (isOnline ? api : offlineApi) as unknown as ApiClient;
  return client.get("/inventory").then((r) => r.data as InventoryItem[]);
}

async function searchCatalog(
  query: string,
  isOnline: boolean,
): Promise<CatalogItem[]> {
  if (!query || query.length < 2) return [];
  // Catalog search might only be available online for now, or we need to implement offline search
  if (!isOnline) return [];
  const response = await api.get(
    `/catalog/search?q=${encodeURIComponent(query)}`,
  );
  return response.data as CatalogItem[];
}

export default function InventoryClient() {
  const { isOnline } = useOffline();
  const queryClient = useQueryClient();
  const [addFormInstance] = Form.useForm();
  const [editFormInstance] = Form.useForm();
  const itemNameRef = useRef<React.ComponentRef<typeof AutoComplete>>(null);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.key === "/" &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.altKey
      ) {
        // Only trigger if not typing in an input
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
    queryKey: ["inventory", isOnline], // Add isOnline to queryKey to refetch on status change
    queryFn: () => fetchInventory(isOnline),
    select: (data) => (Array.isArray(data) ? data : []), // Ensure data is always an array
  });

  const [editForm, setEditForm] = useState<{
    id?: string;
    variantId?: string;
    itemName: string;
    quantity: number;
    purchasePrice: number;
    retailPrice: number;
  }>({
    id: undefined,
    variantId: undefined,
    itemName: "",
    quantity: 0,
    purchasePrice: 0,
    retailPrice: 0,
  });

  const [modalOpen, setModalOpen] = useState(false);
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
      addFormInstance.setFieldsValue({
        retailPrice: selected.retailPrice,
        purchasePrice: selected.purchasePrice,
        productType: selected.productType || "GENERAL",
        genericName: selected.genericName,
        manufacturerName: selected.manufacturerName,
      });
    }
  };

  const submitAdd = async () => {
    const values = addFormInstance.getFieldsValue();
    const computed = computeMaxDiscount(
      values.purchasePrice,
      values.retailPrice,
    );
    if (
      typeof values.maxDiscount === "number" &&
      values.maxDiscount > computed
    ) {
      values.maxDiscount = computed;
    }

    // Convert dates to ISO strings if present
    const payload = {
      ...values,
      variantId: selectedFromCatalog?.variantId,
      expiryDate: values.expiryDate
        ? dayjs(values.expiryDate).toISOString()
        : undefined,
      mfgDate: values.mfgDate ? dayjs(values.mfgDate).toISOString() : undefined,
    };

    await addMutation.mutateAsync(payload);
    addFormInstance.resetFields();
    setSelectedFromCatalog(null);
    setCatalogOptions([]);
    message.success("Item added successfully");

    // Focus back to Item Name field for quick successive additions
    setTimeout(() => {
      itemNameRef.current?.focus();
    }, 100);
  };

  const submitEdit = async () => {
    if (!editForm.id) return;
    const values = editFormInstance.getFieldsValue() as Partial<InventoryItem>;
    const payload: Partial<InventoryItem> & { id?: string } = {
      id: editForm.id,
      ...values,
    };
    // If this inventory item is attached to a product variant, we don't allow changing itemName (it comes from catalog)
    if (editForm.variantId) {
      // When payload is typed as Partial<InventoryItem>, delete here is fine
      // and TypeScript will allow property deletion on a partial object.
      delete (payload as Partial<InventoryItem>).itemName;
    }
    await updateMutation.mutateAsync(payload);
  };

  const handleDelete = async () => {
    if (!editForm.id) return;
    Modal.confirm({
      title: "Delete Item",
      content: "Are you sure you want to delete this item?",
      okText: "Delete",
      okType: "danger",
      onOk: async () => {
        await deleteMutation.mutateAsync(editForm.id!);
      },
    });
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
      message.success("Item updated successfully");
      editFormInstance.resetFields();
      setEditForm({
        id: undefined,
        itemName: "",
        quantity: 0,
        purchasePrice: 0,
        retailPrice: 0,
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
      message.success("Item deleted successfully");
      editFormInstance.resetFields();
      setEditForm({
        id: undefined,
        itemName: "",
        quantity: 0,
        purchasePrice: 0,
        retailPrice: 0,
      });
      setModalOpen(false);
    },
  });

  function computeMaxDiscount(purchasePrice?: number, retailPrice?: number) {
    const p = Number(purchasePrice ?? 0);
    const r = Number(retailPrice ?? 0);
    if (!r || r <= 0) return 0;
    const discount = ((r - p) / r) * 100;
    return Number.isFinite(discount) ? Math.max(0, Math.floor(discount)) : 0;
  }

  const { user } = useAuth();

  const dataSource = useMemo(() => {
    // Ensure items is an array before processing
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
      // Since items are fetched ordered by createdAt desc, the first child is the latest
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

  if (!user || (user.role !== "OWNER" && user.role !== "EMPLOYEE")) {
    return <div className="p-6">Access denied — Owners and employees only</div>;
  }

  return (
    <>
      <Form
        form={addFormInstance}
        layout="vertical"
        onFinish={submitAdd}
        className="mb-6"
        onValuesChange={(changedValues, allValues) => {
          if (
            "purchasePrice" in changedValues ||
            "retailPrice" in changedValues
          ) {
            const computed = computeMaxDiscount(
              allValues.purchasePrice,
              allValues.retailPrice,
            );
            addFormInstance.setFieldsValue({ maxDiscount: computed });

            // Trigger validation on both price fields for real-time feedback
            addFormInstance
              .validateFields(["purchasePrice", "retailPrice"])
              .catch(() => {});
          }
        }}
      >
        <Form.Item
          name="itemName"
          label="Item Name (Search catalog or enter new)"
          rules={[{ required: true, message: "Please enter item name" }]}
        >
          <AutoComplete
            ref={itemNameRef}
            options={catalogOptions.map((item) => ({
              value: `${item.productName} - ${item.variantName}`,
              label: (
                <div>
                  <div className="font-medium">
                    {item.productName} - {item.variantName}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    SKU: {item.sku} | ৳{item.retailPrice}
                    {item.genericName && ` | ${item.genericName}`}
                  </div>
                </div>
              ),
            }))}
            onSearch={handleCatalogSearch}
            onSelect={handleCatalogSelect}
            placeholder="Type to search catalog or enter new product name"
            notFoundContent="No matches found - will create new catalog entry"
            suffixIcon={<SearchOutlined />}
          />
        </Form.Item>

        {/* <Space size={8} className="mb-2 flex-wrap">
          <Form.Item
            name="productType"
            label="Product Type"
            initialValue="GENERAL"
          >
            <Select style={{ width: 140 }}>
              <Select.Option value="GENERAL">General</Select.Option>
              <Select.Option value="MEDICINE">Medicine</Select.Option>
            </Select>
          </Form.Item>

          {productType === "MEDICINE" && (
            <Form.Item name="genericName" label="Generic Name">
              <Input placeholder="e.g., Acetaminophen" style={{ width: 200 }} />
            </Form.Item>
          )}

          <Form.Item name="manufacturerName" label="Manufacturer">
            <Input placeholder="e.g., Square" style={{ width: 200 }} />
          </Form.Item>

          <Form.Item name="batchNo" label="Batch Number">
            <Input
              placeholder="Auto-generated if empty"
              style={{ width: 200 }}
            />
          </Form.Item>
        </Space> */}

        <Space size={8} className="mb-2 flex-wrap">
          <Form.Item
            name="quantity"
            label="Quantity"
            rules={[{ required: true }]}
          >
            <InputNumber min={1} style={{ width: 120 }} inputMode="numeric" />
          </Form.Item>

          <Form.Item
            name="purchasePrice"
            label="Purchase/unit"
            rules={[
              { required: true, message: "Please enter purchase price" },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  const retailPrice = getFieldValue("retailPrice");
                  if (!value || !retailPrice || retailPrice >= value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(
                    new Error(
                      "Purchase price cannot be higher than retail price",
                    ),
                  );
                },
              }),
            ]}
          >
            <InputNumber
              min={0}
              prefix="৳"
              style={{ width: 140 }}
              inputMode="numeric"
            />
          </Form.Item>

          <Form.Item
            name="retailPrice"
            label="MRP/unit"
            rules={[
              { required: true, message: "Please enter retail price" },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  const purchasePrice = getFieldValue("purchasePrice");
                  if (!value || !purchasePrice || value >= purchasePrice) {
                    return Promise.resolve();
                  }
                  return Promise.reject(
                    new Error(
                      "Retail price cannot be lower than purchase price",
                    ),
                  );
                },
              }),
            ]}
          >
            <InputNumber
              min={0}
              prefix="৳"
              style={{ width: 140 }}
              inputMode="numeric"
            />
          </Form.Item>

          {/* <Form.Item name="expiryDate" label="Expiry Date (Optional)">
            <DatePicker style={{ width: 160 }} format="YYYY-MM-DD" />
          </Form.Item>

          <Form.Item name="mfgDate" label="Mfg Date (Optional)">
            <DatePicker style={{ width: 160 }} format="YYYY-MM-DD" />
          </Form.Item> */}
        </Space>

        <Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            loading={addMutation.isPending}
            size="large"
          >
            Add Item
          </Button>
        </Form.Item>
      </Form>

      <Typography.Title level={4}>Inventory Items</Typography.Title>

      <Input
        placeholder="Search inventory..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ marginBottom: 16, width: 300 }}
        allowClear
      />

      {isLoading ? (
        <div>Loading…</div>
      ) : (
        <div className="overflow-x-auto">
          <Table
            dataSource={filteredDataSource}
            rowKey="key"
            pagination={{ pageSize: 20 }}
            expandable={{
              expandedRowRender: (record: { subItems: InventoryItem[] }) => (
                <div className="overflow-x-auto">
                  <Table
                    dataSource={record.subItems}
                    rowKey="id"
                    pagination={false}
                    size="small"
                    columns={[
                      {
                        title: "Batch #",
                        dataIndex: "batchNo",
                        render: (t) => t || "-",
                      },
                      { title: "Quantity", dataIndex: "quantity" },
                      {
                        title: "Purchase",
                        dataIndex: "purchasePrice",
                        render: (v) => `৳${v}`,
                      },
                      {
                        title: "Retail",
                        dataIndex: "retailPrice",
                        render: (v) => `৳${v}`,
                      },
                      // {
                      //   title: "Expiry",
                      //   dataIndex: "expiryDate",
                      //   render: (d) =>
                      //     d ? dayjs(d).format("YYYY-MM-DD") : "-",
                      // },
                      {
                        title: "Actions",
                        render: (_, subRecord: InventoryItem) => (
                          <Button
                            size="small"
                            onClick={() => {
                              setEditForm({
                                id: subRecord.id,
                                variantId: subRecord.variantId,
                                itemName: subRecord.itemName || "",
                                quantity: subRecord.quantity || 0,
                                purchasePrice: subRecord.purchasePrice || 0,
                                retailPrice: subRecord.retailPrice || 0,
                              });
                              editFormInstance.setFieldsValue({
                                itemName: subRecord.itemName || "",
                                quantity: subRecord.quantity || 0,
                                purchasePrice: subRecord.purchasePrice || 0,
                                retailPrice: subRecord.retailPrice || 0,
                              });
                              setModalOpen(true);
                            }}
                          >
                            Edit
                          </Button>
                        ),
                      },
                    ]}
                  />
                </div>
              ),
            }}
          >
            <Table.Column
              title="Item Name"
              key="itemName"
              render={(
                _,
                record: {
                  variant?: { product: { name: string }; variantName: string };
                  itemName?: string;
                },
              ) => {
                if (record.variant) {
                  const productName = record.variant.product.name;
                  const variantName = record.variant.variantName;
                  return variantName === "Standard"
                    ? productName
                    : `${productName} - ${variantName}`;
                }
                return record.itemName || "Unnamed item";
              }}
            />
            {/* <Table.Column
              title="Batch Info"
              key="batchInfo"
              render={(
                _,
                record: {
                  batchInfo: string;
                }
              ) => record.batchInfo}
            /> */}
            <Table.Column
              title="Total Stock"
              dataIndex="totalQuantity"
              key="totalQuantity"
            />
            <Table.Column
              title="Purchase Price"
              key="purchasePrice"
              render={(_, record: { latestPurchasePrice: number }) =>
                `৳${record.latestPurchasePrice}`
              }
            />
            <Table.Column
              title="MRP/Unit"
              key="retailPrice"
              render={(_, record: { latestRetailPrice: number }) =>
                `৳${record.latestRetailPrice}`
              }
            />
          </Table>
        </div>
      )}

      <Modal
        title="Edit Inventory Item"
        open={modalOpen}
        onCancel={() => {
          editFormInstance.resetFields();
          setEditForm({
            id: undefined,
            itemName: "",
            quantity: 0,
            purchasePrice: 0,
            retailPrice: 0,
          });
          setModalOpen(false);
        }}
        footer={null}
      >
        <Form
          form={editFormInstance}
          layout="vertical"
          onFinish={submitEdit}
          className="mt-4"
          onValuesChange={(changedValues) => {
            if (
              "purchasePrice" in changedValues ||
              "retailPrice" in changedValues
            ) {
              // Trigger validation on both price fields for real-time feedback
              editFormInstance
                .validateFields(["purchasePrice", "retailPrice"])
                .catch(() => {});
            }
          }}
        >
          <Form.Item
            name="itemName"
            label="Item name"
            rules={[{ required: true }]}
          >
            <Input disabled={!!editForm.variantId} />
          </Form.Item>

          <Form.Item
            name="quantity"
            label="Quantity"
            rules={[{ required: true }]}
          >
            <InputNumber
              min={1}
              style={{ width: "100%" }}
              inputMode="numeric"
            />
          </Form.Item>

          <Form.Item
            name="purchasePrice"
            label="Purchase/unit"
            rules={[
              { required: true, message: "Please enter purchase price" },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  const retailPrice = getFieldValue("retailPrice");
                  if (!value || !retailPrice || retailPrice >= value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(
                    new Error(
                      "Purchase price cannot be higher than retail price",
                    ),
                  );
                },
              }),
            ]}
          >
            <InputNumber
              prefix="৳"
              min={0}
              style={{ width: "100%" }}
              inputMode="numeric"
            />
          </Form.Item>

          <Form.Item
            name="retailPrice"
            label="MRP/unit"
            rules={[
              { required: true, message: "Please enter retail price" },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  const purchasePrice = getFieldValue("purchasePrice");
                  if (!value || !purchasePrice || value >= purchasePrice) {
                    return Promise.resolve();
                  }
                  return Promise.reject(
                    new Error(
                      "Retail price cannot be lower than purchase price",
                    ),
                  );
                },
              }),
            ]}
          >
            <InputNumber
              prefix="৳"
              min={0}
              style={{ width: "100%" }}
              inputMode="numeric"
            />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button
                type="primary"
                htmlType="submit"
                loading={updateMutation.isPending}
              >
                Update Item
              </Button>
              <Button
                danger
                onClick={handleDelete}
                loading={deleteMutation.isPending}
              >
                Delete Item
              </Button>
              <Button
                onClick={() => {
                  editFormInstance.resetFields();
                  setEditForm({
                    id: undefined,
                    itemName: "",
                    quantity: 0,
                    purchasePrice: 0,
                    retailPrice: 0,
                  });
                  setModalOpen(false);
                }}
              >
                Cancel
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
