'use client';
import { useCreditSummary } from './hooks/useCreditsHooks';
import CreditCustomerList from './components/CreditCustomerList';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

function formatBDT(amount: number) {
  return `৳${(amount ?? 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function CreditsPage() {
  const { data: summary, isLoading: summaryLoading } = useCreditSummary();

  return (
    <div className="space-y-4">

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="shadow-sm border-border/60 border-l-4 border-l-destructive">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground font-semibold">Total Outstanding</p>
            <p className="text-2xl font-bold text-destructive mt-1">
              {summaryLoading ? '…' : formatBDT(summary?.totalOutstanding ?? 0)}
            </p>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-border/60 border-l-4 border-l-yellow-500">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground font-semibold">Customers with Dues</p>
            <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-500 mt-1">
              {summaryLoading ? '…' : (summary?.customersWithDues ?? 0).toString()}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Customer Table */}
      <Card className="shadow-sm border-border/60 overflow-hidden">
        <CardHeader className="pb-4 p-5 border-b border-border/60">
          <CardTitle className="text-lg font-semibold">Customers with Dues</CardTitle>
        </CardHeader>
        <CreditCustomerList />
      </Card>
    </div>
  );
}
