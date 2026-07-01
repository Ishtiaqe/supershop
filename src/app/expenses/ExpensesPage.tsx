"use client";

import { useState } from "react";
import { Plus, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import dayjs from "dayjs";
import { useExpenses, useExpenseSummary, ExpenseFilters } from "./hooks/useExpensesHooks";
import { ExpenseModal } from "./components/ExpenseModal";
import { ManageCategoriesModal } from "./components/ManageCategoriesModal";
import { useCategories } from "./hooks/useExpensesHooks";

export default function ExpensesPage() {
  const [filters, setFilters] = useState<ExpenseFilters>({ page: 1, limit: 10 });
  const page = filters.page ?? 1;
  const limit = filters.limit ?? 10;
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isCategoriesModalOpen, setIsCategoriesModalOpen] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);

  const { data: expensesData, isLoading: isLoadingExpenses } = useExpenses(filters);
  const { data: summaryData, isLoading: isLoadingSummary } = useExpenseSummary({
    startDate: filters.startDate,
    endDate: filters.endDate,
  });
  const { data: categories } = useCategories();

  // Helper formatter
  const formatCurrency = (amount: number) => `৳${amount.toLocaleString()}`;

  const openAddModal = () => {
    setEditingExpenseId(null);
    setIsExpenseModalOpen(true);
  };

  const openEditModal = (id: string) => {
    setEditingExpenseId(id);
    setIsExpenseModalOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsCategoriesModalOpen(true)} className="flex items-center gap-1">
            <Settings className="w-4 h-4" />
            Manage Categories
          </Button>
          <Button onClick={openAddModal} className="flex items-center gap-1">
            <Plus className="w-4 h-4" />
            Add Expense
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="shadow-sm border-border/60 border-l-4 border-l-destructive">
          <CardContent className="p-5">
            <div className="text-sm text-muted-foreground font-semibold">Total Expenses</div>
            <div className="text-2xl font-bold text-destructive mt-1">
              {isLoadingSummary ? "..." : formatCurrency(summaryData?.totalAmount || 0)}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-border/60 border-l-4 border-l-yellow-500">
          <CardContent className="p-5">
            <div className="text-sm text-muted-foreground font-semibold">Top Category</div>
            <div className="text-2xl font-bold truncate text-yellow-600 dark:text-yellow-500 mt-1">
              {isLoadingSummary
                ? "..."
                : (summaryData?.categorySummary?.[0]?.name || "N/A")}
            </div>
            {summaryData?.categorySummary?.[0]?.amount && (
              <p className="text-xs text-muted-foreground mt-1">
                {formatCurrency(summaryData.categorySummary[0].amount)}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="shadow-sm border-border/60">
        <CardContent className="p-5">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex flex-col gap-1.5 w-full sm:w-auto">
              <label htmlFor="expense-start-date" className="text-xs font-semibold text-muted-foreground">Start Date</label>
              <input
                id="expense-start-date"
                type="date"
                value={filters.startDate || ""}
                onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value || undefined, page: 1 }))}
                className="flex h-10 w-full sm:w-[180px] rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              />
            </div>
            <div className="flex flex-col gap-1.5 w-full sm:w-auto">
              <label htmlFor="expense-end-date" className="text-xs font-semibold text-muted-foreground">End Date</label>
              <input
                id="expense-end-date"
                type="date"
                value={filters.endDate || ""}
                onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value || undefined, page: 1 }))}
                className="flex h-10 w-full sm:w-[180px] rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              />
            </div>
            <div className="flex flex-col gap-1.5 w-full sm:w-auto">
              <label htmlFor="expense-category" className="text-xs font-semibold text-muted-foreground">Category</label>
              <select
                id="expense-category"
                value={filters.categoryId || "all"}
                onChange={(e) => setFilters(prev => ({ ...prev, categoryId: e.target.value === "all" ? undefined : e.target.value, page: 1 }))}
                className="flex h-10 w-full sm:w-[200px] items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                <option value="all">All Categories</option>
                {categories?.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data Table */}
      <Card className="shadow-sm border-border/60 overflow-hidden">
        <CardHeader className="pb-4 p-5 border-b border-border/60">
          <CardTitle className="text-lg font-semibold">Expense Records</CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Logged By</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoadingExpenses ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
                </TableCell>
              </TableRow>
            ) : expensesData?.data && expensesData.data.length > 0 ? (
              expensesData.data.map((record: any) => (
                <TableRow key={record.id}>
                  <TableCell>{dayjs(record.expenseDate).format("DD/MM/YYYY")}</TableCell>
                  <TableCell>
                    <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10 dark:bg-blue-400/10 dark:text-blue-400 dark:ring-blue-400/20">
                      {record.category?.name}
                    </span>
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate" title={record.description}>
                    {record.description || "-"}
                  </TableCell>
                  <TableCell>{record.employee?.fullName || "-"}</TableCell>
                  <TableCell className="text-right font-bold">{formatCurrency(record.amount)}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="link" size="sm" className="h-auto p-0" onClick={() => openEditModal(record.id)}>
                      Edit
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No expenses found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        {/* Pagination */}
        {expensesData?.meta && expensesData.meta.total > 0 && (
          <div className="flex items-center justify-between px-4 py-4 border-t border-border bg-card">
            <span className="text-sm text-muted-foreground">
              Showing {Math.min((page - 1) * limit + 1, expensesData.meta.total)} to{" "}
              {Math.min(page * limit, expensesData.meta.total)} of {expensesData.meta.total} expenses
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFilters(prev => ({ ...prev, page: Math.max(1, (prev.page ?? 1) - 1) }))}
                disabled={page === 1}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFilters(prev => ({ ...prev, page: Math.min(Math.ceil(expensesData.meta.total / limit), (prev.page ?? 1) + 1) }))}
                disabled={page >= Math.ceil(expensesData.meta.total / limit)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
        </CardContent>
      </Card>

      {/* Modals */}
      <ExpenseModal
        isOpen={isExpenseModalOpen}
        onClose={() => setIsExpenseModalOpen(false)}
        expenseId={editingExpenseId}
      />

      <ManageCategoriesModal
        isOpen={isCategoriesModalOpen}
        onClose={() => setIsCategoriesModalOpen(false)}
      />
    </div>
  );
}

