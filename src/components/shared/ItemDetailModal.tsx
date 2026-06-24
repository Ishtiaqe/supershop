'use client';
import { Modal, ModalContent, ModalHeader, ModalBody, Button, Input, Table, TableHeader, TableColumn, TableBody, TableRow, TableCell, Spinner } from '@heroui/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import api from '@/lib/api';

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
    <Modal isOpen backdrop="blur" onOpenChange={(open) => !open && onClose()}>
      <ModalContent>
        <ModalHeader className="flex flex-col gap-1">
          {product?.name ?? catalogItem?.variantName ?? 'Item Details'}
        </ModalHeader>
        <ModalBody className="pb-6">
          {loadingItem ? (
            <div className="flex justify-center py-8">
              <Spinner />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                {product?.category?.name && (
                  <div>
                    <span className="text-default-500">Category: </span>
                    {product.category.name}
                  </div>
                )}
                {product?.brand?.name && (
                  <div>
                    <span className="text-default-500">Brand: </span>
                    {product.brand.name}
                  </div>
                )}
                {catalogItem?.variantName && catalogItem.variantName !== 'Standard' && (
                  <div>
                    <span className="text-default-500">Variant: </span>
                    {catalogItem.variantName}
                  </div>
                )}
                {product?.description && (
                  <div className="col-span-2">
                    <span className="text-default-500">Description: </span>
                    {product.description}
                  </div>
                )}
              </div>

              {showBatches && (
                <div>
                  <div className="font-semibold text-sm mb-2">
                    Batches ({(batches as Batch[]).length})
                  </div>
                  {loadingBatches ? (
                    <div className="flex justify-center py-4">
                      <Spinner size="sm" />
                    </div>
                  ) : (
                    <Table removeWrapper classNames={{ wrapper: "border border-default-200 rounded-lg" }}>
                      <TableHeader>
                        <TableColumn key="batchNo">Batch No</TableColumn>
                        <TableColumn key="purchasePrice">Purchase Price</TableColumn>
                        <TableColumn key="retailPrice">Retail Price</TableColumn>
                        <TableColumn key="quantity">Qty</TableColumn>
                        <TableColumn key="expiryDate">Expiry</TableColumn>
                        <TableColumn key="action">Action</TableColumn>
                      </TableHeader>
                      <TableBody items={batches as Batch[]}>
                        {(record: Batch) => (
                          <TableRow key={record.id}>
                            <TableCell>{record.batchNo || '—'}</TableCell>
                            <TableCell>
                              {editingBatchId === record.id ? (
                                <Input
                                  type="number"
                                  size="sm"
                                  value={String(editForm.purchasePrice ?? record.purchasePrice)}
                                  onChange={(e) => setEditForm((f) => ({ ...f, purchasePrice: parseFloat(e.target.value) || 0 }))}
                                  className="w-24"
                                />
                              ) : (
                                `৳${record.purchasePrice.toFixed(2)}`
                              )}
                            </TableCell>
                            <TableCell>
                              {editingBatchId === record.id ? (
                                <Input
                                  type="number"
                                  size="sm"
                                  value={String(editForm.retailPrice ?? record.retailPrice)}
                                  onChange={(e) => setEditForm((f) => ({ ...f, retailPrice: parseFloat(e.target.value) || 0 }))}
                                  className="w-24"
                                />
                              ) : (
                                `৳${record.retailPrice.toFixed(2)}`
                              )}
                            </TableCell>
                            <TableCell>{record.quantity}</TableCell>
                            <TableCell>{record.expiryDate ? new Date(record.expiryDate).toLocaleDateString() : '—'}</TableCell>
                            <TableCell>
                              {editingBatchId === record.id ? (
                                <div className="flex gap-1">
                                  <Button
                                    size="sm"
                                    color="primary"
                                    onClick={() => handleSave(record.id)}
                                    isLoading={updateMutation.isPending}
                                  >
                                    Save
                                  </Button>
                                  <Button size="sm" variant="light" onClick={() => setEditingBatchId(null)}>
                                    Cancel
                                  </Button>
                                </div>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="light"
                                  onClick={() => {
                                    setEditingBatchId(record.id);
                                    setEditForm({});
                                  }}
                                >
                                  Edit
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  )}
                </div>
              )}
            </div>
          )}
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}
