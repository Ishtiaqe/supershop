'use client';
import { useState } from 'react';
import { Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { useCreditCustomers, CreditCustomer } from '../hooks/useCreditsHooks';
import CreditDetailDrawer from './CreditDetailDrawer';

export default function CreditCustomerList() {
  const { data: customers = [], isLoading } = useCreditCustomers();
  const [selected, setSelected] = useState<CreditCustomer | null>(null);

  const columns: ColumnsType<CreditCustomer> = [
    {
      title: 'Customer Name',
      dataIndex: 'customerName',
      key: 'customerName',
      render: (name: string) => name || 'Unknown',
    },
    {
      title: 'Phone',
      dataIndex: 'customerPhone',
      key: 'customerPhone',
    },
    {
      title: 'Total Due',
      dataIndex: 'totalDue',
      key: 'totalDue',
      sorter: (a: CreditCustomer, b: CreditCustomer) => b.totalDue - a.totalDue,
      defaultSortOrder: 'ascend',
      render: (v: number) => (
        <Tag color="red" className="font-medium">
          ৳{(v ?? 0).toFixed(2)}
        </Tag>
      ),
    },
    {
      title: '# Sales',
      dataIndex: 'salesCount',
      key: 'salesCount',
      align: 'center',
    },
    {
      title: 'Oldest Due',
      dataIndex: 'oldestDueDate',
      key: 'oldestDueDate',
      render: (d: string) => (d ? dayjs(d).format('DD MMM YYYY') : '—'),
    },
    {
      title: 'Last Payment',
      dataIndex: 'lastPaymentDate',
      key: 'lastPaymentDate',
      render: (d: string | null) => (d ? dayjs(d).format('DD MMM YYYY') : '—'),
    },
  ];

  return (
    <>
      <Table
        columns={columns}
        dataSource={customers}
        rowKey="customerPhone"
        loading={isLoading}
        scroll={{ x: 'max-content' }}
        onRow={(record) => ({
          onClick: () => setSelected(record),
          style: { cursor: 'pointer' },
        })}
        pagination={{
          pageSize: 20,
          showTotal: (t) => `${t} customer${t !== 1 ? 's' : ''} with dues`,
        }}
        locale={{ emptyText: 'No customers with outstanding dues' }}
      />
      <CreditDetailDrawer
        phone={selected?.customerPhone ?? null}
        customerName={selected?.customerName ?? ''}
        onClose={() => setSelected(null)}
      />
    </>
  );
}
