"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Table,
  Button,
  Modal,
  Form,
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

export default function CatalogClient() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CatalogItem | null>(null);
  const [form] = Form.useForm();
  const queryClient = useQueryClient();
  const [productType, setProductType] = useState<"GENERAL" | "MEDICINE">(
    "GENERAL"
  );
  const [search, setSearch] = useState("");

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
      setProductType((item.productType as "GENERAL" | "MEDICINE") || "GENERAL");
      form.setFieldsValue({
        productName: item.productName,
        productType: item.productType || "GENERAL",
        genericName: item.genericName,
        manufacturerName: item.manufacturerName,
        variantName: item.variantName,
        sku: item.sku,
        retailPrice: item.retailPrice,
        description: item.description,
      });
    } else {
      setEditingItem(null);
      setProductType("GENERAL");
      form.resetFields();
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingItem(null);
    form.resetFields();
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
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
    } catch {
      // Form validation failed
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
    // {
    //   title: "Variant",
    //   dataIndex: "variantName",
    //   key: "variantName",
    // },
    // {
    //   title: "SKU",
    //   dataIndex: "sku",
    //   key: "sku",
    // },
    // {
    //   title: "Type",
    //   dataIndex: "productType",
    //   key: "productType",
    //   render: (type: string) => (
    //     <Tag color={type === "MEDICINE" ? "blue" : "default"}>
    //       {type || "General"}
    //     </Tag>
    //   ),
    // },
    // {
    //   title: "Manufacturer",
    //   dataIndex: "manufacturerName",
    //   key: "manufacturerName",
    //   render: (text: string) => text || "-",
    // },
    // {
    //   title: "Price",
    //   dataIndex: "retailPrice",
    //   key: "retailPrice",
    //   render: (price: number) => `৳${price.toFixed(2)}`,
    // },
    // {
    //   title: "Stock",
    //   dataIndex: "currentStock",
    //   key: "currentStock",
    //   render: (stock: number) => stock || 0,
    // },
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

      <Input
        placeholder="Search catalog..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ marginBottom: 16, width: 300 }}
        allowClear
      />

      <Table
        dataSource={filteredCatalogItems}
        columns={columns}
        rowKey="variantId"
        loading={isLoading}
        pagination={{ pageSize: 10 }}
      />

      <Modal
        title={editingItem ? "Edit Product" : "Add to Catalog"}
        open={isModalOpen}
        onOk={handleSubmit}
        onCancel={handleCloseModal}
        confirmLoading={createMutation.isPending || updateMutation.isPending}
        width={600}
      >
        <Form form={form} layout="vertical" className="mt-4">
          <Form.Item
            name="productName"
            label="Product Name"
            rules={[{ required: true, message: "Required" }]}
          >
            <Input placeholder="e.g., Paracetamol, Rice" />
          </Form.Item>

          <Form.Item
            name="productType"
            label="Product Type"
            initialValue="GENERAL"
          >
            <Select
              onChange={(value) =>
                setProductType(value as "GENERAL" | "MEDICINE")
              }
            >
              <Select.Option value="GENERAL">General</Select.Option>
              <Select.Option value="MEDICINE">Medicine</Select.Option>
            </Select>
          </Form.Item>

          {productType === "MEDICINE" && (
            <Form.Item name="genericName" label="Generic Name">
              <Input placeholder="e.g., Acetaminophen" />
            </Form.Item>
          )}

          <Form.Item name="manufacturerName" label="Manufacturer">
            <Input placeholder="e.g., Square Pharmaceuticals" />
          </Form.Item>

          <Form.Item
            name="variantName"
            label="Variant"
            rules={[{ required: true, message: "Required" }]}
          >
            <Input placeholder="e.g., 500mg Tablet, 1kg Pack" />
          </Form.Item>

          <Form.Item
            name="sku"
            label="SKU"
            rules={[{ required: true, message: "Required" }]}
          >
            <Input placeholder="Unique product code" />
          </Form.Item>

          <Form.Item
            name="retailPrice"
            label="Retail Price"
            rules={[{ required: true, message: "Required" }]}
          >
            <InputNumber
              min={0}
              step={0.01}
              style={{ width: "100%" }}
              prefix="৳"
            />
          </Form.Item>

          <Form.Item name="description" label="Description">
            <Input.TextArea rows={2} placeholder="Optional description" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
