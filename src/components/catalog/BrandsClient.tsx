"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Table, Button, Modal, Input, message, Popconfirm } from "antd";
import { PlusOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";
import api from "@/lib/api";
import { useForm } from "react-hook-form";
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

interface Brand {
  id: string;
  name: string;
  _count?: { products: number };
}

const brandSchema = z.object({
  name: z.string().min(1, "Please enter brand name"),
});

type BrandFormData = z.infer<typeof brandSchema>;

export default function BrandsClient() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
  const queryClient = useQueryClient();

  const form = useForm<BrandFormData>({
    resolver: zodResolver(brandSchema),
    defaultValues: {
      name: "",
    },
  });

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
      form.reset({ name: brand.name });
    } else {
      setEditingBrand(null);
      form.reset({ name: "" });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingBrand(null);
    form.reset({ name: "" });
  };

  const handleSubmit = (values: BrandFormData) => {
    if (editingBrand) {
      updateMutation.mutate({ id: editingBrand.id, name: values.name });
    } else {
      createMutation.mutate(values.name);
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
        pagination={{ pageSize: 10 }}
      />

      <Modal
        title={editingBrand ? "Edit Brand" : "Add Brand"}
        open={isModalOpen}
        onOk={form.handleSubmit(handleSubmit)}
        onCancel={handleCloseModal}
        confirmLoading={createMutation.isPending || updateMutation.isPending}
      >
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 pt-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field, fieldState: { error } }) => (
                <FormItem>
                  <FormLabel>Brand Name</FormLabel>
                  <FormControl>
                    <Input 
                      value={field.value}
                      placeholder="e.g., Nike, Samsung, Pfizer" 
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
