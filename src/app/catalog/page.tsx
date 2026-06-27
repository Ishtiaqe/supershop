"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash, Pill } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
  productType: z.enum(["GENERAL", "MEDICINE"]).default("GENERAL"),
  genericName: z.string().optional(),
  manufacturerName: z.string().optional(),
  variantName: z.string().min(1, "Variant name is required"),
  sku: z.string().min(1, "SKU is required"),
  retailPrice: z.coerce.number().min(0, "Retail price must be at least 0"),
  description: z.string().optional(),
});

type CatalogFormData = z.infer<typeof catalogSchema>;

export default function CatalogPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CatalogItem | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
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
    const s = search.toLowerCase();
    return catalogItems.filter(
      (item) =>
        item.productName.toLowerCase().includes(s) ||
        item.variantName.toLowerCase().includes(s) ||
        item.sku.toLowerCase().includes(s) ||
        item.genericName?.toLowerCase().includes(s) ||
        item.manufacturerName?.toLowerCase().includes(s)
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
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || "Failed to update product");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/catalog/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["catalog"] });
      toast.success("Product removed from catalog");
      setDeletingId(null);
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || "Failed to delete product");
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
        retailPrice: 0,
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
      retailPrice: 0,
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

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex flex-wrap gap-4 items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {catalogItems.length} products in catalog
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <Input
              placeholder="Search catalog..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full sm:w-[250px]"
            />
            <Button onClick={() => handleOpenModal()} className="flex items-center gap-1 shrink-0">
              <Plus className="w-4 h-4" />
              Add to Catalog
            </Button>
          </div>
        </div>

        <div className="rounded-md border overflow-hidden bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Variant</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-right">Stock</TableHead>
                <TableHead className="text-right w-[150px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
                  </TableCell>
                </TableRow>
              ) : filteredCatalogItems.length > 0 ? (
                filteredCatalogItems.map((record) => (
                  <TableRow key={record.variantId}>
                    <TableCell>
                      <div>
                        <div className="font-semibold text-foreground">{record.productName}</div>
                        {record.productType === "MEDICINE" && record.genericName && (
                          <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            <Pill className="w-3.5 h-3.5 text-blue-500" />
                            {record.genericName}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{record.variantName}</TableCell>
                    <TableCell className="font-mono text-xs">{record.sku}</TableCell>
                    <TableCell className="text-right">৳{record.retailPrice.toLocaleString()}</TableCell>
                    <TableCell className="text-right font-medium">{record.currentStock ?? 0}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2 items-center">
                        {deletingId === record.variantId ? (
                          <div className="flex gap-1.5">
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => deleteMutation.mutate(record.variantId)}
                              disabled={deleteMutation.isPending}
                            >
                              Confirm
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setDeletingId(null)}
                              disabled={deleteMutation.isPending}
                            >
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleOpenModal(record)}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => setDeletingId(record.variantId)}
                            >
                              <Trash className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No products found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <Dialog open={isModalOpen} onOpenChange={(open) => !open && handleCloseModal()}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>{editingItem ? "Edit Product" : "Add to Catalog"}</DialogTitle>
            </DialogHeader>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 max-h-[80vh] overflow-y-auto pr-2">
                <FormField
                  control={form.control}
                  name="productName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Product Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Paracetamol, Rice" {...field} />
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
                        <select
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                          {...field}
                        >
                          <option value="GENERAL">General</option>
                          <option value="MEDICINE">Medicine</option>
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {watchedProductType === "MEDICINE" && (
                  <FormField
                    control={form.control}
                    name="genericName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Generic Name</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Acetaminophen" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <FormField
                  control={form.control}
                  name="manufacturerName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Manufacturer</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Square Pharmaceuticals" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="variantName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Variant</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., 500mg Tablet, 1kg Pack" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="sku"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>SKU</FormLabel>
                      <FormControl>
                        <Input placeholder="Unique product code" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="retailPrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Retail Price (৳)</FormLabel>
                      <FormControl>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <textarea
                          placeholder="Optional description"
                          className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <DialogFooter className="pt-4 border-t border-border flex flex-row justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleCloseModal}
                    disabled={isSaving}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" disabled={isSaving}>
                    {editingItem ? "Save Changes" : "Add Product"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
