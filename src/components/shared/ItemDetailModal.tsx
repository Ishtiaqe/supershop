'use client';
import { Modal, Table, Button, InputNumber, Spin } from 'antd';
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

  const batchColumns = [
    {
      title: 'Batch No',
      dataIndex: 'batchNo',
      key: 'batchNo',
      render: (v: string | null) => v || '—',
    },
    {
      title: 'Purchase Price',
      dataIndex: 'purchasePrice',
      key: 'purchasePrice',
      render: (v: number, record: Batch) =>
        editingBatchId === record.id ? (
          <InputNumber
            value={editForm.purchasePrice ?? v}
            min={0}
            prefix="৳"
            onChange={(val) => setEditForm((f) => ({ ...f, purchasePrice: val ?? 0 }))}
            style={{ width: 110 }}
          />
        ) : (
          `৳${v.toFixed(2)}`
        ),
    },
    {
      title: 'Retail Price',
      dataIndex: 'retailPrice',
      key: 'retailPrice',
      render: (v: number, record: Batch) =>
        editingBatchId === record.id ? (
          <InputNumber
            value={editForm.retailPrice ?? v}
            min={0}
            prefix="৳"
            onChange={(val) => setEditForm((f) => ({ ...f, retailPrice: val ?? 0 }))}
            style={{ width: 110 }}
          />
        ) : (
          `৳${v.toFixed(2)}`
        ),
    },
    { title: 'Qty', dataIndex: 'quantity', key: 'quantity' },
    {
      title: 'Expiry',
      dataIndex: 'expiryDate',
      key: 'expiryDate',
      render: (v: string | null) => (v ? new Date(v).toLocaleDateString() : '—'),
    },
    {
      title: 'Action',
      key: 'action',
      render: (_: unknown, record: Batch) =>
        editingBatchId === record.id ? (
          <div className="flex gap-1">
            <Button
              size="small"
              type="primary"
              onClick={() => handleSave(record.id)}
              loading={updateMutation.isPending}
            >
              Save
            </Button>
            <Button size="small" onClick={() => setEditingBatchId(null)}>
              Cancel
            </Button>
          </div>
        ) : (
          <Button
            size="small"
            onClick={() => {
              setEditingBatchId(record.id);
              setEditForm({});
            }}
          >
            Edit
          </Button>
        ),
    },
  ];

  const product = catalogItem?.product;

  return (
    <Modal
      open
      onCancel={onClose}
      footer={null}
      width={Math.min(800, typeof window !== 'undefined' ? window.innerWidth * 0.95 : 800)}
      title={product?.name ?? catalogItem?.variantName ?? 'Item Details'}
    >
      {loadingItem ? (
        <div className="flex justify-center py-8">
          <Spin />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            {product?.category?.name && (
              <div>
                <span className="text-muted-foreground">Category: </span>
                {product.category.name}
              </div>
            )}
            {product?.brand?.name && (
              <div>
                <span className="text-muted-foreground">Brand: </span>
                {product.brand.name}
              </div>
            )}
            {catalogItem?.variantName && catalogItem.variantName !== 'Standard' && (
              <div>
                <span className="text-muted-foreground">Variant: </span>
                {catalogItem.variantName}
              </div>
            )}
            {product?.description && (
              <div className="col-span-2">
                <span className="text-muted-foreground">Description: </span>
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
                <Spin size="small" />
              ) : (
                <Table
                  columns={batchColumns}
                  dataSource={batches as Batch[]}
                  rowKey="id"
                  pagination={false}
                  size="small"
                  scroll={{ x: 500 }}
                />
              )}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
