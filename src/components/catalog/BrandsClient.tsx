"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Table, Button, Modal, Form, Input, message, Popconfirm } from "antd";
import { PlusOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";
import api from "@/lib/api";

interface Brand {
  id: string;
  name: string;
  _count?: { products: number };
}

export default function BrandsClient() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
  const [form] = Form.useForm();
  const queryClient = useQueryClient();

  const { data: brands = [], isLoading } = useQuery<Brand[]>({
    queryKey: ["brands"],
    queryFn: () => api.get("/catalog/brands").then((res) => res.data),
  });

  const createMutation = useMutation({
    mutationFn: (name: string) => api.post("/catalog/brands", { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["brands"] });
      message.success("Brand created successfully");
      handleCloseModal();
    },
    onError: () => message.error("Failed to create brand"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      api.put(`/catalog/brands/${id}`, { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["brands"] });
      message.success("Brand updated successfully");
      handleCloseModal();
    },
    onError: () => message.error("Failed to update brand"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/catalog/brands/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["brands"] });
      message.success("Brand deleted successfully");
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } } };
      message.error(err.response?.data?.message || "Failed to delete brand");
    },
  });

  const handleOpenModal = (brand?: Brand) => {
    if (brand) {
      setEditingBrand(brand);
      form.setFieldsValue({ name: brand.name });
    } else {
      setEditingBrand(null);
      form.resetFields();
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingBrand(null);
    form.resetFields();
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (editingBrand) {
        updateMutation.mutate({ id: editingBrand.id, name: values.name });
      } else {
        createMutation.mutate(values.name);
      }
    } catch {
      // Form validation failed
    }
  };

  const columns = [
    {
      title: "Name",
      dataIndex: "name",
      key: "name",
    },
    {
      title: "Products",
      key: "products",
      render: (_: unknown, record: Brand) => record._count?.products || 0,
    },
    {
      title: "Actions",
      key: "actions",
      render: (_: unknown, record: Brand) => (
        <div className="flex gap-2">
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => handleOpenModal(record)}
          />
          <Popconfirm
            title="Delete brand"
            description={`Are you sure you want to delete "${record.name}"?`}
            onConfirm={() => deleteMutation.mutate(record.id)}
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
          {brands.length} brands
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => handleOpenModal()}
        >
          Add Brand
        </Button>
      </div>

      <Table
        dataSource={brands}
        columns={columns}
        rowKey="id"
        loading={isLoading}
        pagination={{ pageSize: 20 }}
      />

      <Modal
        title={editingBrand ? "Edit Brand" : "Add Brand"}
        open={isModalOpen}
        onOk={handleSubmit}
        onCancel={handleCloseModal}
        confirmLoading={createMutation.isPending || updateMutation.isPending}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label="Brand Name"
            rules={[{ required: true, message: "Please enter brand name" }]}
          >
            <Input placeholder="e.g., Nike, Samsung, Pfizer" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
