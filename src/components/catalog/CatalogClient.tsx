"use client";

import { useState, useMemo } from "react";
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
  Select,
  SelectItem,
  Card,
  CardBody,
} from "@heroui/react";
import { Plus, Edit, Trash2, Package2 } from "lucide-react";
import api from "@/lib/api";
import { toast } from "sonner";

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
  variantName: z.string().min(1, "Variant is required"),
  sku: z.string().min(1, "SKU is required"),
  retailPrice: z.number().positive("Price must be greater than 0"),
  description: z.string().default(""),
  productType: z.enum(["GENERAL", "MEDICINE"]),
  genericName: z.string().default(""),
  manufacturerName: z.string().default(""),
});

type CatalogFormData = z.infer<typeof catalogSchema>;

export default function CatalogClient() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CatalogItem | null>(null);
  const [productType, setProductType] = useState<"GENERAL" | "MEDICINE">("GENERAL");
  const [search, setSearch] = useState("");
  const queryClient = useQueryClient();

  const { control, register, handleSubmit, formState: { errors }, reset, watch } = useForm<CatalogFormData>({
    resolver: zodResolver(catalogSchema) as any,
    defaultValues: { productType: "GENERAL" },
  });

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
      toast.success("Product added to catalog");
      handleCloseModal();
    },
    onError: () => toast.error("Failed to add product"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      api.put(`/catalog/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["catalog"] });
      toast.success("Product updated");
      handleCloseModal();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to update product");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/catalog/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["catalog"] });
      toast.success("Product removed from catalog");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to delete product");
    },
  });

  const handleOpenModal = (item?: CatalogItem) => {
    if (item) {
      setEditingItem(item);
      setProductType((item.productType as "GENERAL" | "MEDICINE") || "GENERAL");
      reset({
        productName: item.productName,
        productType: (item.productType as "GENERAL" | "MEDICINE") || "GENERAL",
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
      reset();
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingItem(null);
    reset();
  };

  const onSubmit = async (values: CatalogFormData) => {
    const data = {
      productName: values.productName,
      variantName: values.variantName,
      sku: values.sku,
      retailPrice: values.retailPrice,
      description: values.description,
      productType: values.productType || "GENERAL",
      genericName: values.productType === "MEDICINE" ? values.genericName : undefined,
      manufacturerName: values.manufacturerName,
    };

    if (editingItem) {
      updateMutation.mutate({ id: editingItem.variantId, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6">
      <Card>
        <CardBody className="space-y-4">
          <div className="flex justify-between items-center">
            <div className="text-sm text-muted-foreground">
              {catalogItems.length} products in catalog
            </div>
            <Button
              color="primary"
              startContent={<Plus size={18} />}
              onClick={() => handleOpenModal()}
            >
              Add to Catalog
            </Button>
          </div>

          <Input
            placeholder="Search catalog..."
            value={search}
            onValueChange={setSearch}
            isClearable
            className="max-w-xs"
          />
        </CardBody>
      </Card>

      <Card>
        <CardBody className="p-0">
          <Table>
            <TableHeader>
              <TableColumn key="productName">Product</TableColumn>
              <TableColumn key="variantName">Variant</TableColumn>
              <TableColumn key="sku">SKU</TableColumn>
              <TableColumn key="retailPrice" align="end">
                Retail Price
              </TableColumn>
              <TableColumn key="actions" align="center">
                Actions
              </TableColumn>
            </TableHeader>
            <TableBody emptyContent="No products" items={filteredCatalogItems} isLoading={isLoading}>
              {(item: CatalogItem) => (
                <TableRow key={item.variantId}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{item.productName}</div>
                      {item.productType === "MEDICINE" && item.genericName && (
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          <Package2 size={12} />
                          {item.genericName}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{item.variantName}</TableCell>
                  <TableCell className="text-sm">{item.sku}</TableCell>
                  <TableCell className="text-right font-semibold">
                    ৳{item.retailPrice.toFixed(2)}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1 justify-center">
                      <Button
                        isIconOnly
                        size="sm"
                        variant="light"
                        onClick={() => handleOpenModal(item)}
                      >
                        <Edit size={16} />
                      </Button>
                      <Button
                        isIconOnly
                        size="sm"
                        color="danger"
                        variant="light"
                        onClick={() => deleteMutation.mutate(item.variantId)}
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

      <Modal isOpen={isModalOpen} onOpenChange={handleCloseModal} backdrop="blur">
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>{editingItem ? "Edit Product" : "Add to Catalog"}</ModalHeader>
              <ModalBody className="space-y-4">
                <Controller
                  name="productName"
                  control={control}
                  render={({ field }) => (
                    <Input
                      {...field}
                      label="Product Name"
                      placeholder="e.g., Paracetamol, Rice"
                      isInvalid={!!errors.productName}
                      errorMessage={errors.productName?.message}
                    />
                  )}
                />

                <Controller
                  name="productType"
                  control={control}
                  render={({ field }) => (
                    <Select
                      {...field}
                      label="Product Type"
                      onChange={(e) => {
                        field.onChange(e);
                        setProductType(e.target.value as "GENERAL" | "MEDICINE");
                      }}
                    >
                      <SelectItem key="GENERAL">
                        General
                      </SelectItem>
                      <SelectItem key="MEDICINE">
                        Medicine
                      </SelectItem>
                    </Select>
                  )}
                />

                {productType === "MEDICINE" && (
                  <Controller
                    name="genericName"
                    control={control}
                    render={({ field }) => (
                      <Input
                        {...field}
                        label="Generic Name"
                        placeholder="e.g., Acetaminophen"
                      />
                    )}
                  />
                )}

                <Controller
                  name="manufacturerName"
                  control={control}
                  render={({ field }) => (
                    <Input
                      {...field}
                      label="Manufacturer"
                      placeholder="e.g., Square Pharmaceuticals"
                    />
                  )}
                />

                <Controller
                  name="variantName"
                  control={control}
                  render={({ field }) => (
                    <Input
                      {...field}
                      label="Variant"
                      placeholder="e.g., 500mg Tablet, 1kg Pack"
                      isInvalid={!!errors.variantName}
                      errorMessage={errors.variantName?.message}
                    />
                  )}
                />

                <Controller
                  name="sku"
                  control={control}
                  render={({ field }) => (
                    <Input
                      {...field}
                      label="SKU"
                      placeholder="Unique product code"
                      isInvalid={!!errors.sku}
                      errorMessage={errors.sku?.message}
                    />
                  )}
                />

                <Controller
                  name="retailPrice"
                  control={control}
                  render={({ field }) => (
                    <Input
                      type="number"
                      label="Retail Price (৳)"
                      placeholder="0.00"
                      isInvalid={!!errors.retailPrice}
                      errorMessage={errors.retailPrice?.message}
                      {...field}
                      onChange={(e) => field.onChange(parseFloat(e.target.value))}
                    />
                  )}
                />

                <Controller
                  name="description"
                  control={control}
                  render={({ field }) => (
                    <Input
                      {...field}
                      label="Description"
                      placeholder="Optional description"
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
                  onPress={handleSubmit(onSubmit)}
                  isLoading={isSaving}
                  isDisabled={isSaving}
                >
                  {editingItem ? "Save Changes" : "Add Product"}
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
}
