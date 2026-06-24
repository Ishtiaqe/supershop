"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Button,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Input,
  Card,
  CardBody,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@heroui/react";
import { Plus, Edit, Trash2 } from "lucide-react";
import api from "@/lib/api";
import { toast } from "sonner";

interface Category {
  id: string;
  name: string;
  _count?: { products: number };
}

const categorySchema = z.object({
  name: z.string().min(1, "Category name is required"),
});

type CategoryFormData = z.infer<typeof categorySchema>;

export default function CategoriesClient() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState<Category | null>(null);
  const queryClient = useQueryClient();

  const { control, handleSubmit, formState: { errors }, reset } = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
  });

  const { data: categories = [], isLoading } = useQuery<Category[]>({
    queryKey: ["categories"],
    queryFn: () => api.get("/catalog/categories").then((res) => res.data),
  });

  const createMutation = useMutation({
    mutationFn: (name: string) => api.post("/catalog/categories", { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      toast.success("Category created successfully");
      handleCloseModal();
    },
    onError: () => toast.error("Failed to create category"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      api.put(`/catalog/categories/${id}`, { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      toast.success("Category updated successfully");
      handleCloseModal();
    },
    onError: () => toast.error("Failed to update category"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/catalog/categories/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      toast.success("Category deleted successfully");
      setDeleteConfirmTarget(null);
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || "Failed to delete category");
    },
  });

  const handleOpenModal = (category?: Category) => {
    if (category) {
      setEditingCategory(category);
      reset({ name: category.name });
    } else {
      setEditingCategory(null);
      reset();
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingCategory(null);
    reset();
  };

  const onSubmit = (values: CategoryFormData) => {
    if (editingCategory) {
      updateMutation.mutate({ id: editingCategory.id, name: values.name });
    } else {
      createMutation.mutate(values.name);
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6">
      <Card>
        <CardBody>
          <div className="flex justify-between items-center">
            <div className="text-sm text-muted-foreground">
              {categories.length} categories
            </div>
            <Button
              color="primary"
              startContent={<Plus size={18} />}
              onClick={() => handleOpenModal()}
            >
              Add Category
            </Button>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardBody className="p-0">
          <Table>
            <TableHeader>
              <TableColumn key="name">Name</TableColumn>
              <TableColumn key="products" align="end">
                Products
              </TableColumn>
              <TableColumn key="actions" align="center">
                Actions
              </TableColumn>
            </TableHeader>
            <TableBody emptyContent="No categories" items={categories} isLoading={isLoading}>
              {(category: Category) => (
                <TableRow key={category.id}>
                  <TableCell>{category.name}</TableCell>
                  <TableCell className="text-right">{category._count?.products || 0}</TableCell>
                  <TableCell>
                    <div className="flex gap-1 justify-center">
                      <Button
                        isIconOnly
                        size="sm"
                        variant="light"
                        onClick={() => handleOpenModal(category)}
                      >
                        <Edit size={16} />
                      </Button>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            isIconOnly
                            size="sm"
                            color="danger"
                            variant="light"
                          >
                            <Trash2 size={16} />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80">
                          <div className="space-y-4">
                            <div className="text-sm font-semibold">Delete category</div>
                            <div className="text-sm text-muted-foreground">
                              Are you sure you want to delete &quot;{category.name}&quot;?
                            </div>
                            <div className="flex gap-2 justify-end">
                              <Button size="sm" variant="flat" onPress={() => setDeleteConfirmTarget(null)}>
                                No
                              </Button>
                              <Button
                                size="sm"
                                color="danger"
                                isLoading={deleteConfirmTarget?.id === category.id && deleteMutation.isPending}
                                onPress={() => {
                                  setDeleteConfirmTarget(category);
                                  deleteMutation.mutate(category.id);
                                }}
                              >
                                Yes
                              </Button>
                            </div>
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardBody>
      </Card>

      <Modal isOpen={isModalOpen} onOpenChange={handleCloseModal} backdrop="blur">
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>{editingCategory ? "Edit Category" : "Add Category"}</ModalHeader>
              <ModalBody className="space-y-4">
                <Controller
                  name="name"
                  control={control}
                  render={({ field }) => (
                    <Input
                      {...field}
                      label="Category Name"
                      placeholder="e.g., Electronics, Food, Medicine"
                      isInvalid={!!errors.name}
                      errorMessage={errors.name?.message}
                      isClearable
                    />
                  )}
                />
              </ModalBody>
              <ModalFooter>
                <Button color="default" onPress={onClose} isDisabled={isSaving}>
                  Cancel
                </Button>
                <Button
                  color="primary"
                  onClick={handleSubmit(onSubmit)}
                  isLoading={isSaving}
                  isDisabled={isSaving}
                >
                  {editingCategory ? "Save Changes" : "Add Category"}
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
}
