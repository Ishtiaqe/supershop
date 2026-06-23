'use client';
import { useCreditSummary } from './hooks/useCreditsHooks';
import CreditCustomerList from './components/CreditCustomerList';

function formatBDT(amount: number) {
  return `৳${(amount ?? 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function CreditsPage() {
  const { data: summary, isLoading: summaryLoading } = useCreditSummary();

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="page-header">Credit / Dues</h1>
        <p className="page-subheader">Track outstanding customer payments</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="stat-card stat-card-danger">
          <p className="stat-label text-destructive">Total Outstanding</p>
          <p className="stat-value text-destructive">
            {summaryLoading ? '…' : formatBDT(summary?.totalOutstanding ?? 0)}
          </p>
        </div>
        <div className="stat-card stat-card-warning">
          <p className="stat-label text-warning">Customers with Dues</p>
          <p className="stat-value text-warning">
            {summaryLoading ? '…' : (summary?.customersWithDues ?? 0).toString()}
          </p>
        </div>
      </div>

      {/* Customer Table */}
      <div className="surface-card overflow-hidden">
        <div className="p-4 border-b border-border">
          <h3 className="font-semibold text-foreground">
            Click a row to view sales and record payments
          </h3>
        </div>
        <CreditCustomerList />
      </div>
    </div>
  );
}
