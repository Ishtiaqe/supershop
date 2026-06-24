'use client';
import { useState } from 'react';
import {
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Chip,
  Spinner,
} from '@heroui/react';
import dayjs from 'dayjs';
import { useCreditCustomers, CreditCustomer } from '../hooks/useCreditsHooks';
import CreditDetailDrawer from './CreditDetailDrawer';

export default function CreditCustomerList() {
  const { data: customers = [], isLoading } = useCreditCustomers();
  const [selected, setSelected] = useState<CreditCustomer | null>(null);

  const columns = [
    { key: 'customerName', label: 'Customer Name' },
    { key: 'customerPhone', label: 'Phone' },
    { key: 'totalDue', label: 'Total Due' },
    { key: 'salesCount', label: '# Sales' },
    { key: 'oldestDueDate', label: 'Oldest Due' },
    { key: 'lastPaymentDate', label: 'Last Payment' },
  ];

  const renderCell = (customer: CreditCustomer, columnKey: React.Key) => {
    switch (columnKey) {
      case 'customerName':
        return customer.customerName || 'Unknown';
      case 'customerPhone':
        return customer.customerPhone;
      case 'totalDue':
        return (
          <Chip
            variant="flat"
            color="danger"
            className="font-medium"
          >
            ৳{(customer.totalDue ?? 0).toFixed(2)}
          </Chip>
        );
      case 'salesCount':
        return customer.salesCount;
      case 'oldestDueDate':
        return customer.oldestDueDate
          ? dayjs(customer.oldestDueDate).format('DD MMM YYYY')
          : '—';
      case 'lastPaymentDate':
        return customer.lastPaymentDate
          ? dayjs(customer.lastPaymentDate).format('DD MMM YYYY')
          : '—';
      default:
        return null;
    }
  };

  const emptyContent = 'No customers with outstanding dues';

  return (
    <>
      <Table
        aria-label="Credit customers table"
        onRowAction={(key) => {
          // Key is customerPhone when present, or "credit-{index}" fallback for null/empty phone rows
          const customer =
            customers.find((c) => c.customerPhone === key) ??
            (String(key).startsWith('credit-')
              ? customers[parseInt(String(key).replace('credit-', ''), 10)]
              : undefined);
          if (customer) setSelected(customer);
        }}
        className="cursor-pointer"
        isStriped
        bottomContent={
          customers.length > 0 ? (
            <div className="text-small text-default-500 text-center py-2">
              {customers.length} customer{customers.length !== 1 ? 's' : ''} with dues
            </div>
          ) : null
        }
      >
        <TableHeader columns={columns}>
          {(column) => (
            <TableColumn
              key={column.key}
              align={column.key === 'salesCount' ? 'center' : 'start'}
            >
              {column.label}
            </TableColumn>
          )}
        </TableHeader>
        <TableBody
          items={customers}
          loadingContent={<Spinner />}
          loadingState={isLoading ? 'loading' : 'idle'}
          emptyContent={emptyContent}
        >
          {(item) => (
            // Use customerPhone as key; fall back to index-based key for null/empty phone (edge case)
            <TableRow key={item.customerPhone && item.customerPhone.trim() ? item.customerPhone : `credit-${customers.indexOf(item)}`}>
              {(columnKey) => <TableCell>{renderCell(item, columnKey)}</TableCell>}
            </TableRow>
          )}
        </TableBody>
      </Table>
      <CreditDetailDrawer
        phone={selected?.customerPhone ?? null}
        customerName={selected?.customerName ?? ''}
        onClose={() => setSelected(null)}
      />
    </>
  );
}
