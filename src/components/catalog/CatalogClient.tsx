"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Table,
  Button,
  Modal,
  Input,
  InputNumber,
  Select,
  message,
  Popconfirm,
  // Tag,
} from "antd";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  MedicineBoxOutlined,
} from "@ant-design/icons";
import api from "@/lib/api";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";

interface CatalogItem {
  variantId: string;
  productId: string;
  productName: string;
  variantName: string;
  sku: string;
  retailPrice: number;
  description?: string;
  category?: string;
  brand?: string;
  currentStock?: number;
  productType?: string;
  genericName?: string;
  manufacturerName?: string;
}

const catalogSchema = z.object({
  productName: z.string().min(1, "Product name is required"),
  productType: z.enum(["GENERAL", "MEDICINE"]).default("GENERAL"),
  genericName: z.string().optional(),
  manufacturerName: z.string().optional(),
  variantName: z.string().min(1, "Variant name is required"),
  sku: z.string().min(1, "SKU is required"),
  retailPrice: z.coerce.number().min(0, "Retail price must be at least 0"),
  description: z.string().optional(),
});

type CatalogFormData = z.infer<typeof catalogSchema>;

export default function CatalogClient() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CatalogItem | null>(null);
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");

  const form = useForm<CatalogFormData>({
    resolver: zodResolver(catalogSchema) as Resolver<CatalogFormData>,
    defaultValues: {
      productName: "",
      productType: "GENERAL",
      genericName: "",
      manufacturerName: "",
      variantName: "",
      sku: "",
      retailPrice: undefined,
      description: "",
    },
  });

  const watchedProductType = form.watch("productType");

  const { data: catalogItems = [], isLoading } = useQuery<CatalogItem[]>({
    queryKey: ["catalog"],
    queryFn: () => api.get("/catalog").then((res) => res.data),
  });

  const filteredCatalogItems = useMemo(() => {
    if (!search) return catalogItems;
    return catalogItems.filter(
      (item) =>
        item.productName.toLowerCase().includes(search.toLowerCase()) ||
        item.variantName.toLowerCase().includes(search.toLowerCase()) ||
        item.sku.toLowerCase().includes(search.toLowerCase()) ||
        item.genericName?.toLowerCase().includes(search.toLowerCase()) ||
        item.manufacturerName?.toLowerCase().includes(search.toLowerCase())
    );
  }, [catalogItems, search]);

  const createMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => api.post("/catalog", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["catalog"] });
      message.success("Product added to catalog");
      handleCloseModal();
    },
    onError: () => message.error("Failed to add product"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      api.put(`/catalog/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["catalog"] });
      message.success("Product updated");
      handleCloseModal();
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } } };
      message.error(err.response?.data?.message || "Failed to update product");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/catalog/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["catalog"] });
      message.success("Product removed from catalog");
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } } };
      message.error(err.response?.data?.message || "Failed to delete product");
    },
  });

  const handleOpenModal = (item?: CatalogItem) => {
    if (item) {
      setEditingItem(item);
      form.reset({
        productName: item.productName,
        productType: (item.productType as "GENERAL" | "MEDICINE") || "GENERAL",
        genericName: item.genericName || "",
        manufacturerName: item.manufacturerName || "",
        variantName: item.variantName,
        sku: item.sku,
        retailPrice: item.retailPrice,
        description: item.description || "",
      });
    } else {
      setEditingItem(null);
      form.reset({
        productName: "",
        productType: "GENERAL",
        genericName: "",
        manufacturerName: "",
        variantName: "",
        sku: "",
        retailPrice: undefined,
        description: "",
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingItem(null);
    form.reset({
      productName: "",
      productType: "GENERAL",
      genericName: "",
      manufacturerName: "",
      variantName: "",
      sku: "",
      retailPrice: undefined,
      description: "",
    });
  };

  const handleSubmit = (values: CatalogFormData) => {
    const data = {
      productName: values.productName,
      variantName: values.variantName,
      sku: values.sku,
      retailPrice: values.retailPrice,
      description: values.description,
      productType: values.productType || "GENERAL",
      genericName:
        values.productType === "MEDICINE" ? values.genericName : undefined,
      manufacturerName: values.manufacturerName,
    };

    if (editingItem) {
      updateMutation.mutate({ id: editingItem.variantId, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const columns = [
    {
      title: "Product",
      dataIndex: "productName",
      key: "productName",
      render: (text: string, record: CatalogItem) => (
        <div>
          <div className="font-medium">{text}</div>
          {record.productType === "MEDICINE" && record.genericName && (
            <div className="text-xs text-muted-foreground">
              <MedicineBoxOutlined className="mr-1" />
              {record.genericName}
            </div>
          )}
        </div>
      ),
    },
    {
      title: "Actions",
      key: "actions",
      render: (_: unknown, record: CatalogItem) => (
        <div className="flex gap-2">
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => handleOpenModal(record)}
          />
          <Popconfirm
            title="Remove from catalog"
            description={`Remove "${record.productName} - ${record.variantName}"?`}
            onConfirm={() => deleteMutation.mutate(record.variantId)}
            okText="Yes"
            cancelText="No"
          >
            <Button type="text" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="surface-card p-4 md:p-6">
        <div className="mb-4 flex justify-between items-center">
          <div className="text-sm text-muted-foreground">
            {catalogItems.length} products in catalog
          </div>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => handleOpenModal()}
          >
            Add to Catalog
          </Button>
        </div>

        <Input.Search
          placeholder="Search catalog..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onSearch={setSearch}
          style={{ marginBottom: 16, width: 300 }}
          allowClear
        />

        <div className="overflow-x-auto">
          <Table
            dataSource={filteredCatalogItems}
            columns={columns}
            rowKey="variantId"
            loading={isLoading}
            pagination={{ pageSize: 10 }}
          />
        </div>
      </div>

      <Modal
        title={editingItem ? "Edit Product" : "Add to Catalog"}
        open={isModalOpen}
        onOk={form.handleSubmit(handleSubmit)}
        onCancel={handleCloseModal}
        confirmLoading={createMutation.isPending || updateMutation.isPending}
        width={600}
      >
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 mt-4">
            <FormField
              control={form.control}
              name="productName"
              render={({ field, fieldState: { error } }) => (
                <FormItem>
                  <FormLabel>Product Name</FormLabel>
                  <FormControl>
                    <Input 
                      value={field.value}
                      placeholder="e.g., Paracetamol, Rice" 
                      status={error ? "error" : undefined}
                      onChange={(e) => field.onChange(e.target.value)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="productType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Product Type</FormLabel>
                  <FormControl>
                    <Select
                      value={field.value}
                      onChange={(val) => field.onChange(val)}
                      options={[
                        { value: "GENERAL", label: "General" },
                        { value: "MEDICINE", label: "Medicine" }
                      ]}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {watchedProductType === "MEDICINE" && (
              <FormField
                control={form.control}
                name="genericName"
                render={({ field, fieldState: { error } }) => (
                  <FormItem>
                    <FormLabel>Generic Name</FormLabel>
                    <FormControl>
                      <Input 
                        value={field.value}
                        placeholder="e.g., Acetaminophen" 
                        status={error ? "error" : undefined}
                        onChange={(e) => field.onChange(e.target.value)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="manufacturerName"
              render={({ field, fieldState: { error } }) => (
                <FormItem>
                  <FormLabel>Manufacturer</FormLabel>
                  <FormControl>
                    <Input 
                      value={field.value}
                      placeholder="e.g., Square Pharmaceuticals" 
                      status={error ? "error" : undefined}
                      onChange={(e) => field.onChange(e.target.value)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="variantName"
              render={({ field, fieldState: { error } }) => (
                <FormItem>
                  <FormLabel>Variant</FormLabel>
                  <FormControl>
                    <Input 
                      value={field.value}
                      placeholder="e.g., 500mg Tablet, 1kg Pack" 
                      status={error ? "error" : undefined}
                      onChange={(e) => field.onChange(e.target.value)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="sku"
              render={({ field, fieldState: { error } }) => (
                <FormItem>
                  <FormLabel>SKU</FormLabel>
                  <FormControl>
                    <Input 
                      value={field.value}
                      placeholder="Unique product code" 
                      status={error ? "error" : undefined}
                      onChange={(e) => field.onChange(e.target.value)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="retailPrice"
              render={({ field, fieldState: { error } }) => (
                <FormItem>
                  <FormLabel>Retail Price</FormLabel>
                  <FormControl>
                    <InputNumber
                      value={field.value}
                      min={0}
                      step={0.01}
                      style={{ width: "100%" }}
                      prefix="৳"
                      status={error ? "error" : undefined}
                      onChange={(val) => field.onChange(val)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field, fieldState: { error } }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Input.TextArea 
                      value={field.value}
                      rows={2} 
                      placeholder="Optional description" 
                      status={error ? "error" : undefined}
                      onChange={(e) => field.onChange(e.target.value)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>
      </Modal>
    </div>
  );
}
