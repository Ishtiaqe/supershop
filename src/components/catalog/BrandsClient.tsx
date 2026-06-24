"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
} from "@heroui/react";
import { Plus, Edit2, Trash2 } from "lucide-react";
import api from "@/lib/api";
import { toast } from "sonner";

interface Brand {
  id: string;
  name: string;
  _count?: { products: number };
}

const brandSchema = z.object({
  name: z.string().min(1, "Brand name is required").min(2, "Brand name must be at least 2 characters"),
});

type BrandFormData = z.infer<typeof brandSchema>;

export default function BrandsClient() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
  const [brandToDelete, setBrandToDelete] = useState<Brand | null>(null);
  const queryClient = useQueryClient();

  const { control, handleSubmit, formState: { errors }, reset } = useForm<BrandFormData>({
    resolver: zodResolver(brandSchema),
    defaultValues: { name: "" },
  });

  const { data: brands = [], isLoading } = useQuery<Brand[]>({
    queryKey: ["brands"],
    queryFn: () => api.get("/catalog/brands").then((res) => res.data),
  });

  const createMutation = useMutation({
    mutationFn: (name: string) => api.post("/catalog/brands", { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["brands"] });
      toast.success("Brand created successfully");
      handleCloseModal();
    },
    onError: () => toast.error("Failed to create brand"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      api.put(`/catalog/brands/${id}`, { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["brands"] });
      toast.success("Brand updated successfully");
      handleCloseModal();
    },
    onError: () => toast.error("Failed to update brand"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/catalog/brands/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["brands"] });
      toast.success("Brand deleted successfully");
      setIsDeleteConfirmOpen(false);
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || "Failed to delete brand");
    },
  });

  const handleOpenModal = (brand?: Brand) => {
    if (brand) {
      setEditingBrand(brand);
      reset({ name: brand.name });
    } else {
      setEditingBrand(null);
      reset({ name: "" });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingBrand(null);
    reset();
  };

  const handleOpenDeleteConfirm = (brand: Brand) => {
    setBrandToDelete(brand);
    setIsDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = () => {
    if (brandToDelete) {
      deleteMutation.mutate(brandToDelete.id);
    }
  };

  const onSubmit = (values: BrandFormData) => {
    if (editingBrand) {
      updateMutation.mutate({ id: editingBrand.id, name: values.name });
    } else {
      createMutation.mutate(values.name);
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;
  const isDeleting = deleteMutation.isPending;

  return (
    <div className="space-y-6">
      <Card>
        <CardBody className="space-y-4">
          <div className="flex justify-between items-center">
            <div className="text-sm text-muted-foreground">
              {brands.length} brands
            </div>
            <Button
              color="primary"
              startContent={<Plus size={18} />}
              onClick={() => handleOpenModal()}
            >
              Add Brand
            </Button>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardBody className="p-0">
          <Table aria-label="Brands table">
            <TableHeader>
              <TableColumn key="name">Name</TableColumn>
              <TableColumn key="products" align="end">
                Products
              </TableColumn>
              <TableColumn key="actions" align="center">
                Actions
              </TableColumn>
            </TableHeader>
            <TableBody
              emptyContent="No brands found"
              items={brands}
              isLoading={isLoading}
            >
              {(brand: Brand) => (
                <TableRow key={brand.id}>
                  <TableCell>
                    <span className="font-medium">{brand.name}</span>
                  </TableCell>
                  <TableCell className="text-right">
                    {brand._count?.products || 0}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2 justify-center">
                      <Button
                        isIconOnly
                        size="sm"
                        variant="light"
                        onClick={() => handleOpenModal(brand)}
                      >
                        <Edit2 size={16} />
                      </Button>
                      <Button
                        isIconOnly
                        size="sm"
                        color="danger"
                        variant="light"
                        onClick={() => handleOpenDeleteConfirm(brand)}
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardBody>
      </Card>

      {/* Create/Edit Modal */}
      <Modal isOpen={isModalOpen} onOpenChange={handleCloseModal} backdrop="blur">
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">
                {editingBrand ? "Edit Brand" : "Add Brand"}
              </ModalHeader>
              <ModalBody>
                <form className="space-y-4">
                  <Controller
                    name="name"
                    control={control}
                    render={({ field }) => (
                      <Input
                        {...field}
                        label="Brand Name"
                        placeholder="e.g., Nike, Samsung, Pfizer"
                        isInvalid={!!errors.name}
                        errorMessage={errors.name?.message}
                        isDisabled={isSaving}
                      />
                    )}
                  />
                </form>
              </ModalBody>
              <ModalFooter>
                <Button
                  color="default"
                  onPress={onClose}
                  isDisabled={isSaving}
                >
                  Cancel
                </Button>
                <Button
                  color="primary"
                  onClick={handleSubmit(onSubmit)}
                  isLoading={isSaving}
                  isDisabled={isSaving}
                >
                  {editingBrand ? "Save Changes" : "Add Brand"}
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteConfirmOpen}
        onOpenChange={setIsDeleteConfirmOpen}
        backdrop="blur"
        size="sm"
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">
                Delete Brand
              </ModalHeader>
              <ModalBody>
                <p>
                  Are you sure you want to delete <span className="font-semibold">&quot;{brandToDelete?.name}&quot;</span>?
                </p>
              </ModalBody>
              <ModalFooter>
                <Button
                  color="default"
                  onPress={onClose}
                  isDisabled={isDeleting}
                >
                  Cancel
                </Button>
                <Button
                  color="danger"
                  onPress={handleConfirmDelete}
                  isLoading={isDeleting}
                  isDisabled={isDeleting}
                >
                  Delete
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
}
