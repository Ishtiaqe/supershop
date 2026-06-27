'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import api from '@/lib/api';

// Import shadcn UI components
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';

interface Props {
  variantId: string;
  showBatches: boolean;
  onClose: () => void;
}

interface Batch {
  id: string;
  itemName: string;
  purchasePrice: number;
  retailPrice: number;
  quantity: number;
  batchNo: string | null;
  expiryDate: string | null;
  mfgDate: string | null;
  fundSource?: string;
}

export default function ItemDetailModal({ variantId, showBatches, onClose }: Props) {
  const qc = useQueryClient();
  const [editingBatchId, setEditingBatchId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Batch>>({});

  const { data: catalogItem, isLoading: loadingItem } = useQuery({
    queryKey: ['catalog-item', variantId],
    queryFn: () => api.get(`/catalog/${variantId}`).then((r) => r.data.data ?? r.data),
  });

  const { data: batches = [], isLoading: loadingBatches } = useQuery({
    queryKey: ['inventory-batches', variantId],
    queryFn: () =>
      api.get(`/inventory?variantId=${variantId}`).then((r) => {
        const raw = r.data;
        return Array.isArray(raw) ? raw : (raw?.data ?? []);
      }),
    enabled: showBatches,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Batch> }) =>
      api.put(`/inventory/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory-batches', variantId] });
      qc.invalidateQueries({ queryKey: ['inventory'] });
      setEditingBatchId(null);
    },
    onError: () => {
      // errors handled silently; caller can add toast if needed
    },
  });

  const handleSave = (batchId: string) => {
    updateMutation.mutate({ id: batchId, data: editForm });
  };

  const product = catalogItem?.product;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {product?.name ?? catalogItem?.variantName ?? 'Item Details'}
          </DialogTitle>
        </DialogHeader>

        {loadingItem ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4 text-sm bg-muted/30 p-4 rounded-lg">
              {product?.category?.name && (
                <div>
                  <span className="text-muted-foreground font-medium">Category: </span>
                  <span className="text-foreground">{product.category.name}</span>
                </div>
              )}
              {product?.brand?.name && (
                <div>
                  <span className="text-muted-foreground font-medium">Brand: </span>
                  <span className="text-foreground">{product.brand.name}</span>
                </div>
              )}
              {catalogItem?.variantName && catalogItem.variantName !== 'Standard' && (
                <div>
                  <span className="text-muted-foreground font-medium">Variant: </span>
                  <span className="text-foreground">{catalogItem.variantName}</span>
                </div>
              )}
              {product?.description && (
                <div className="col-span-2">
                  <span className="text-muted-foreground font-medium">Description: </span>
                  <span className="text-foreground">{product.description}</span>
                </div>
              )}
            </div>

            {showBatches && (
              <div className="space-y-3">
                <div className="font-semibold text-sm">
                  Batches ({(batches as Batch[]).length})
                </div>
                {loadingBatches ? (
                  <div className="flex justify-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
                  </div>
                ) : (
                  <div className="rounded-md border overflow-hidden bg-card">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Batch No</TableHead>
                          <TableHead>Purchase Price</TableHead>
                          <TableHead>Retail Price</TableHead>
                          <TableHead className="text-right">Qty</TableHead>
                          <TableHead>Expiry</TableHead>
                          <TableHead className="text-right w-[150px]">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(batches as Batch[]).length > 0 ? (
                          (batches as Batch[]).map((record) => (
                            <TableRow key={record.id}>
                              <TableCell className="font-medium">
                                {record.batchNo || '—'}
                              </TableCell>
                              <TableCell>
                                {editingBatchId === record.id ? (
                                  <div className="flex items-center gap-1">
                                    <span className="text-muted-foreground">৳</span>
                                    <Input
                                      type="number"
                                      min={0}
                                      step="0.01"
                                      className="w-24 h-8 px-2 py-1 text-xs"
                                      value={editForm.purchasePrice ?? record.purchasePrice}
                                      onChange={(e) =>
                                        setEditForm((f) => ({
                                          ...f,
                                          purchasePrice: parseFloat(e.target.value) || 0,
                                        }))
                                      }
                                    />
                                  </div>
                                ) : (
                                  `৳${record.purchasePrice.toFixed(2)}`
                                )}
                              </TableCell>
                              <TableCell>
                                {editingBatchId === record.id ? (
                                  <div className="flex items-center gap-1">
                                    <span className="text-muted-foreground">৳</span>
                                    <Input
                                      type="number"
                                      min={0}
                                      step="0.01"
                                      className="w-24 h-8 px-2 py-1 text-xs"
                                      value={editForm.retailPrice ?? record.retailPrice}
                                      onChange={(e) =>
                                        setEditForm((f) => ({
                                          ...f,
                                          retailPrice: parseFloat(e.target.value) || 0,
                                        }))
                                      }
                                    />
                                  </div>
                                ) : (
                                  `৳${record.retailPrice.toFixed(2)}`
                                )}
                              </TableCell>
                              <TableCell className="text-right">{record.quantity}</TableCell>
                              <TableCell>
                                {record.expiryDate
                                  ? new Date(record.expiryDate).toLocaleDateString()
                                  : '—'}
                              </TableCell>
                              <TableCell className="text-right">
                                {editingBatchId === record.id ? (
                                  <div className="flex justify-end gap-1.5">
                                    <Button
                                      size="sm"
                                      onClick={() => handleSave(record.id)}
                                      disabled={updateMutation.isPending}
                                      className="h-8"
                                    >
                                      Save
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => setEditingBatchId(null)}
                                      className="h-8"
                                    >
                                      Cancel
                                    </Button>
                                  </div>
                                ) : (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setEditingBatchId(record.id);
                                      setEditForm({});
                                    }}
                                    className="h-8"
                                  >
                                    Edit
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-6 text-muted-foreground text-sm">
                              No batches found.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
