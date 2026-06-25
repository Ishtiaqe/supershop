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

interface Category {
  id: string;
  name: string;
  _count?: { products: number };
}

const categorySchema = z.object({
  name: z.string().min(1, "Please enter category name"),
});

type CategoryFormData = z.infer<typeof categorySchema>;

export default function CategoriesClient() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const queryClient = useQueryClient();

  const form = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: "",
    },
  });

  const { data: categories = [], isLoading } = useQuery<Category[]>({
    queryKey: ["categories"],
    queryFn: () => api.get("/catalog/categories").then((res) => res.data),
  });

  const createMutation = useMutation({
    mutationFn: (name: string) => api.post("/catalog/categories", { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      message.success("Category created successfully");
      handleCloseModal();
    },
    onError: () => message.error("Failed to create category"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      api.put(`/catalog/categories/${id}`, { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      message.success("Category updated successfully");
      handleCloseModal();
    },
    onError: () => message.error("Failed to update category"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/catalog/categories/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      message.success("Category deleted successfully");
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } } };
      message.error(err.response?.data?.message || "Failed to delete category");
    },
  });

  const handleOpenModal = (category?: Category) => {
    if (category) {
      setEditingCategory(category);
      form.reset({ name: category.name });
    } else {
      setEditingCategory(null);
      form.reset({ name: "" });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingCategory(null);
    form.reset({ name: "" });
  };

  const handleSubmit = (values: CategoryFormData) => {
    if (editingCategory) {
      updateMutation.mutate({ id: editingCategory.id, name: values.name });
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
      render: (_: unknown, record: Category) => record._count?.products || 0,
    },
    {
      title: "Actions",
      key: "actions",
      render: (_: unknown, record: Category) => (
        <div className="flex gap-2">
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => handleOpenModal(record)}
          />
          <Popconfirm
            title="Delete category"
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
          {categories.length} categories
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => handleOpenModal()}
        >
          Add Category
        </Button>
      </div>

      <Table
        dataSource={categories}
        columns={columns}
        rowKey="id"
        loading={isLoading}
        pagination={{ pageSize: 10 }}
      />

      <Modal
        title={editingCategory ? "Edit Category" : "Add Category"}
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
                  <FormLabel>Category Name</FormLabel>
                  <FormControl>
                    <Input 
                      value={field.value}
                      placeholder="e.g., Electronics, Food, Medicine" 
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
