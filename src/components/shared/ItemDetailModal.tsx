'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import api from '@/lib/api';

// Import shadcn UI components
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
  lastRestockDate?: string | null;
  createdAt?: string | null;
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
  });

  const handleSave = (batchId: string) => {
    updateMutation.mutate({ id: batchId, data: editForm });
  };

  const product = catalogItem?.product;

  const sortedBatches = useMemo(() => {
    return [...(batches as Batch[])].sort((a, b) => {
      const aDate = new Date(a.lastRestockDate || a.createdAt || 0).getTime();
      const bDate = new Date(b.lastRestockDate || b.createdAt || 0).getTime();
      return bDate - aDate;
    });
  }, [batches]);

  const formatBatchDate = (batch: Batch) => {
    const dateStr = batch.lastRestockDate || batch.createdAt;
    return dateStr ? new Date(dateStr).toLocaleDateString() : '—';
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      {/* Optimized constraints: sm:max-w-5xl prevents excessive stretch, w-full manages smaller layouts */}
      <DialogContent className="w-full sm:max-w-5xl max-h-[90vh] overflow-y-auto p-6">
        <DialogHeader>
          <DialogTitle>
            {product?.name ?? catalogItem?.variantName ?? 'Item Details'}
          </DialogTitle>
          <DialogDescription>
            Product details and batch inventory.
          </DialogDescription>
        </DialogHeader>

        {loadingItem ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm bg-muted/30 p-4 rounded-lg">
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
                <div className="sm:col-span-2">
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
                  /* Double wrap safeguards against layout breaks and prevents basic table layout explosions */
                  <div className="rounded-md border bg-card w-full overflow-hidden">
                    <div className="overflow-x-auto w-full inline-block align-middle">
                      <Table className="min-w-full table-fixed">
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[15%]">Batch No</TableHead>
                            <TableHead className="w-[15%]">Date</TableHead>
                            <TableHead className="w-[15%]">Purchase Price</TableHead>
                            <TableHead className="w-[15%]">Retail Price</TableHead>
                            <TableHead className="w-[10%] text-right">Qty</TableHead>
                            <TableHead className="w-[15%]">Expiry</TableHead>
                            <TableHead className="w-[15%] text-right">Action</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {sortedBatches.length > 0 ? (
                            sortedBatches.map((record) => (
                              <TableRow key={record.id}>
                                <TableCell className="font-medium truncate">
                                  {record.batchNo || '—'}
                                </TableCell>
                                <TableCell className="whitespace-nowrap">
                                  {formatBatchDate(record)}
                                </TableCell>
                                <TableCell>
                                  {editingBatchId === record.id ? (
                                    <div className="flex items-center gap-1">
                                      <span className="text-muted-foreground text-xs">৳</span>
                                      <Input
                                        type="number"
                                        min={0}
                                        step="0.01"
                                        id={`batch-cost-edit-${record.id}`}
                                        className="w-full max-w-[100px] h-8 px-2 py-1 text-xs"
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
                                      <span className="text-muted-foreground text-xs">৳</span>
                                      <Input
                                        type="number"
                                        min={0}
                                        step="0.01"
                                        id={`batch-price-edit-${record.id}`}
                                        className="w-full max-w-[100px] h-8 px-2 py-1 text-xs"
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
                                <TableCell className="whitespace-nowrap">
                                  {record.expiryDate
                                    ? new Date(record.expiryDate).toLocaleDateString()
                                    : '—'}
                                </TableCell>
                                <TableCell className="text-right">
                                  {editingBatchId === record.id ? (
                                    <div className="flex justify-end gap-1">
                                      <Button
                                        size="sm"
                                        onClick={() => handleSave(record.id)}
                                        disabled={updateMutation.isPending}
                                        className="h-8 px-2.5 text-xs"
                                      >
                                        Save
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => setEditingBatchId(null)}
                                        className="h-8 px-2.5 text-xs"
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
                                      className="h-8 px-3 text-xs"
                                    >
                                      Edit
                                    </Button>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))
                          ) : (
                            <TableRow>
                              <TableCell colSpan={7} className="text-center py-6 text-muted-foreground text-sm">
                                No batches found.
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
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