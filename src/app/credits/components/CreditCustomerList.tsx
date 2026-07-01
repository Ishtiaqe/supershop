'use client';

import { useState } from 'react';
import dayjs from 'dayjs';
import { useCreditCustomers, type CreditCustomer } from '../hooks/useCreditsHooks';
import CreditDetailDrawer from './CreditDetailDrawer';

// Import shadcn UI components
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import { MobileTableCard, MobileTableCardRow } from '@/components/mobile/MobileTableCard';

export default function CreditCustomerList() {
  const { data: customers = [], isLoading } = useCreditCustomers();
  const [selected, setSelected] = useState<CreditCustomer | null>(null);

  return (
    <>
      <div className="rounded-md border overflow-hidden bg-card">
        <div className="hidden md:block overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Total Due</TableHead>
                <TableHead className="text-center"># Sales</TableHead>
                <TableHead>Oldest Due</TableHead>
                <TableHead>Last Payment</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
                  </TableCell>
                </TableRow>
              ) : customers.length > 0 ? (
                customers.map((c, idx) => {
                  const key = c.customerPhone && c.customerPhone.trim()
                    ? c.customerPhone
                    : `credit-${idx}`;

                  return (
                    <TableRow
                      key={key}
                      onClick={() => setSelected(c)}
                      className="cursor-pointer hover:bg-muted/50"
                    >
                      <TableCell className="font-semibold">{c.customerName || 'Unknown'}</TableCell>
                      <TableCell>{c.customerPhone || '—'}</TableCell>
                      <TableCell>
                        <Badge variant="destructive">
                          ৳{(c.totalDue ?? 0).toFixed(2)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">{c.salesCount}</TableCell>
                      <TableCell>{c.oldestDueDate ? dayjs(c.oldestDueDate).format('DD MMM YYYY') : '—'}</TableCell>
                      <TableCell>{c.lastPaymentDate ? dayjs(c.lastPaymentDate).format('DD MMM YYYY') : '—'}</TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground text-sm">
                    No customers with outstanding dues.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <div className="md:hidden p-4 space-y-3">
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
            </div>
          ) : customers.length > 0 ? (
            customers.map((c, idx) => {
              const key = c.customerPhone && c.customerPhone.trim()
                ? c.customerPhone
                : `credit-${idx}`;

              return (
                <MobileTableCard
                  key={key}
                  onClick={() => setSelected(c)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="font-semibold text-sm">{c.customerName || 'Unknown'}</div>
                    <Badge variant="destructive">
                      ৳{(c.totalDue ?? 0).toFixed(2)}
                    </Badge>
                  </div>
                  <MobileTableCardRow label="Phone" value={c.customerPhone || '—'} />
                  <MobileTableCardRow label="# Sales" value={c.salesCount} />
                  <MobileTableCardRow
                    label="Oldest Due"
                    value={c.oldestDueDate ? dayjs(c.oldestDueDate).format('DD MMM YYYY') : '—'}
                  />
                  <MobileTableCardRow
                    label="Last Payment"
                    value={c.lastPaymentDate ? dayjs(c.lastPaymentDate).format('DD MMM YYYY') : '—'}
                  />
                </MobileTableCard>
              );
            })
          ) : (
            <div className="text-center py-8 text-muted-foreground text-sm">
              No customers with outstanding dues.
            </div>
          )}
        </div>
        {customers.length > 0 && (
          <div className="p-3 text-xs text-muted-foreground bg-muted/10 border-t border-border">
            {customers.length} customer{customers.length !== 1 ? 's' : ''} with dues
          </div>
        )}
      </div>
      <CreditDetailDrawer
        phone={selected?.customerPhone ?? null}
        customerName={selected?.customerName ?? ''}
        onClose={() => setSelected(null)}
      />
    </>
  );
}
