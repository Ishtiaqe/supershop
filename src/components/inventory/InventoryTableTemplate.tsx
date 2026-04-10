'use client';

import React, { useState } from 'react';
import { Table, Button, Input, Popconfirm, Space, Card, Empty, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';

// Mock Type based on PROJECT_SUMMARY.md
interface InventoryItem {
  id: string;
  name: string;
  stock: number;
  price: number;
}

interface InventoryTableTemplateProps {
  data: InventoryItem[] | null;
  isLoading: boolean;
  onDelete: (id: string) => Promise<void>;
  onSearch: (value: string) => void;
}

export default function InventoryTableTemplate({
  data,
  isLoading,
  onDelete,
  onSearch,
}: InventoryTableTemplateProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await onDelete(id);
      message.success('Item deleted successfully');
    } catch (error) {
      message.error('Failed to delete item');
    } finally {
      setDeletingId(null);
    }
  };

  const columns: ColumnsType<InventoryItem> = [
    {
      title: 'Item Name',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Stock',
      dataIndex: 'stock',
      key: 'stock',
    },
    {
      title: 'Price',
      dataIndex: 'price',
      key: 'price',
      render: (val: number) => `$${val.toFixed(2)}`,
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button icon={<EditOutlined />} type="default">
            Edit
          </Button>
          {/* UX Improvement: Popconfirm replaces window.confirm() */}
          <Popconfirm
            title="Delete the inventory item"
            description={`Are you sure you want to delete ${record.name}?`}
            onConfirm={() => handleDelete(record.id)}
            okText="Yes"
            cancelText="No"
          >
            <Button 
              danger 
              icon={<DeleteOutlined />} 
              loading={deletingId === record.id} 
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Card 
      title="Inventory Management" 
      // UX Improvement: Input.Search with allowClear
      extra={<Input.Search placeholder="Search items..." allowClear onSearch={onSearch} style={{ width: 250 }} />}
    >
      {/* Built-in loading, Empty state, and native pagination configuration */}
      <Table
        columns={columns}
        dataSource={data || []}
        rowKey="id"
        loading={isLoading}
        locale={{
          emptyText: <Empty description="No inventory items found." />,
        }}
        pagination={{
          defaultPageSize: 10,
          showSizeChanger: true,
          showTotal: (total) => `Total ${total} items`,
        }}
      />
    </Card>
  );
}