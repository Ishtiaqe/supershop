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
    { title: 'Phone', dataIndex: 'customerPhone', key: 'customerPhone' },
    {
      title: 'Total Due',
      dataIndex: 'totalDue',
      key: 'totalDue',
      render: (due: number) => (
        <Tag color="red">৳{(due ?? 0).toFixed(2)}</Tag>
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
      render: (d: string | null) =>
        d ? dayjs(d).format('DD MMM YYYY') : '—',
    },
    {
      title: 'Last Payment',
      dataIndex: 'lastPaymentDate',
      key: 'lastPaymentDate',
      render: (d: string | null) =>
        d ? dayjs(d).format('DD MMM YYYY') : '—',
    },
  ];

  return (
    <>
      <Table<CreditCustomer>
        columns={columns}
        dataSource={customers}
        loading={isLoading}
        // customerPhone may be null/empty; fall back to index-based key for those rows
        rowKey={(c) =>
          c.customerPhone && c.customerPhone.trim()
            ? c.customerPhone
            : `credit-${customers.indexOf(c)}`
        }
        pagination={false}
        locale={{ emptyText: 'No customers with outstanding dues' }}
        onRow={(record) => ({
          onClick: () => setSelected(record),
          style: { cursor: 'pointer' },
        })}
        footer={
          customers.length > 0
            ? () =>
                `${customers.length} customer${
                  customers.length !== 1 ? 's' : ''
                } with dues`
            : undefined
        }
      />
      <CreditDetailDrawer
        phone={selected?.customerPhone ?? null}
        customerName={selected?.customerName ?? ''}
        onClose={() => setSelected(null)}
      />
    </>
  );
}
