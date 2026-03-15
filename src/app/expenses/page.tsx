"use client";

import { useState } from "react";
import { Plus, Settings2 } from "lucide-react";
import { format } from "date-fns";
import { useExpenses, useExpenseSummary, ExpenseFilters } from "./hooks/useExpensesHooks";
import { ExpenseModal } from "./components/ExpenseModal";
import { ManageCategoriesModal } from "./components/ManageCategoriesModal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCategories } from "./hooks/useExpensesHooks";

export default function ExpensesPage() {
  const [filters, setFilters] = useState<ExpenseFilters>({ page: 1, limit: 20 });
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
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h1 className="page-header">Expenses</h1>
          <p className="page-subheader">Track and manage operating costs</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={() => setIsCategoriesModalOpen(true)}>
            <Settings2 className="mr-2 h-4 w-4" />
            Manage Categories
          </Button>
          <Button onClick={openAddModal}>
            <Plus className="mr-2 h-4 w-4" /> Add Expense
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="stat-card stat-card-danger">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-destructive/90">Total Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {isLoadingSummary ? "..." : formatCurrency(summaryData?.totalAmount || 0)}
            </div>
          </CardContent>
        </Card>
        
        {/* Top Category Card */}
        <Card className="stat-card stat-card-warning">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-warning/95">Top Category</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold truncate text-warning">
              {isLoadingSummary 
                ? "..." 
                : (summaryData?.categorySummary?.[0]?.name || "N/A")}
            </div>
            <p className="text-xs text-warning/85 mt-1">
              {summaryData?.categorySummary?.[0]?.amount 
                ? formatCurrency(summaryData.categorySummary[0].amount) 
                : ""}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 py-4">
        <div className="space-y-1">
          <label htmlFor="expenses-start-date" className="text-xs font-medium text-muted-foreground">
            Start Date
          </label>
          <Input
            id="expenses-start-date"
            type="date"
            value={filters.startDate || ""}
            onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value, page: 1 }))}
            className="w-40"
            placeholder="Start Date"
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="expenses-end-date" className="text-xs font-medium text-muted-foreground">
            End Date
          </label>
          <Input
            id="expenses-end-date"
            type="date"
            value={filters.endDate || ""}
            onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value, page: 1 }))}
            className="w-40"
            placeholder="End Date"
          />
        </div>
        <Select 
          value={filters.categoryId || "all"} 
          onValueChange={(val) => setFilters(prev => ({ ...prev, categoryId: val === "all" ? undefined : val, page: 1 }))}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories?.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <p className="text-sm text-muted-foreground">
        Total records: {expensesData?.meta?.total ?? expensesData?.data?.length ?? 0}
      </p>

      {/* Data Table */}
      <div className="surface-card">
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
                <TableCell colSpan={6} className="text-center py-4">Loading expenses...</TableCell>
              </TableRow>
            ) : expensesData?.data?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-4 text-muted-foreground">No expenses found.</TableCell>
              </TableRow>
            ) : (
              expensesData?.data.map((expense) => (
                <TableRow key={expense.id}>
                  <TableCell>{format(new Date(expense.expenseDate), "MMM dd, yyyy")}</TableCell>
                  <TableCell>
                    <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold">
                      {expense.category.name}
                    </div>
                  </TableCell>
                  <TableCell className="max-w-[300px] truncate" title={expense.description}>{expense.description || "-"}</TableCell>
                  <TableCell>{expense.employee.fullName}</TableCell>
                  <TableCell className="text-right font-medium">{formatCurrency(expense.amount)}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => openEditModal(expense.id)}>
                      Edit
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

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
