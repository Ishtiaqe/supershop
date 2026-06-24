"use client";
import { useState } from "react";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Input,
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Select,
  SelectItem,
  Chip,
  Divider,
} from "@heroui/react";
import { Settings, Plus } from "lucide-react";
import { toast } from "sonner";
import { useExpenses, useExpenseSummary, ExpenseFilters } from "./hooks/useExpensesHooks";
import { ExpenseModal } from "./components/ExpenseModal";
import { ManageCategoriesModal } from "./components/ManageCategoriesModal";
import { useCategories } from "./hooks/useExpensesHooks";

export default function ExpensesPage() {
  const [filters, setFilters] = useState<ExpenseFilters>({ page: 1, limit: 10 });
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
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-BD", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const openAddModal = () => {
    setEditingExpenseId(null);
    setIsExpenseModalOpen(true);
  };

  const openEditModal = (id: string) => {
    setEditingExpenseId(id);
    setIsExpenseModalOpen(true);
  };

  const expenses = expensesData?.data || [];
  const total = expensesData?.meta?.total || 0;

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div>
          <h1 className="page-header">Expenses</h1>
          <p className="page-subheader">Track and categorize shop expenses</p>
        </div>
        <div className="flex gap-2">
          <Button
            isIconOnly
            variant="bordered"
            onClick={() => setIsCategoriesModalOpen(true)}
            title="Manage Categories"
          >
            <Settings size={20} />
          </Button>
          <Button
            color="primary"
            startContent={<Plus size={20} />}
            onClick={openAddModal}
          >
            Add Expense
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="stat-card stat-card-danger">
          <CardBody className="gap-2">
            <p className="stat-label text-destructive">Total Expenses</p>
            <p className="stat-value text-destructive">
              {isLoadingSummary ? "..." : formatCurrency(summaryData?.totalAmount || 0)}
            </p>
          </CardBody>
        </Card>

        <Card className="stat-card stat-card-warning">
          <CardBody className="gap-2">
            <p className="stat-label text-warning">Top Category</p>
            <p className="stat-value truncate text-warning">
              {isLoadingSummary ? "..." : (summaryData?.categorySummary?.[0]?.name || "N/A")}
            </p>
            {summaryData?.categorySummary?.[0]?.amount && (
              <p className="text-xs text-warning/85">
                {formatCurrency(summaryData.categorySummary[0].amount)}
              </p>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardBody>
          <div className="flex flex-col gap-4">
            <p className="font-semibold text-sm">Filters</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-muted-foreground">
                  Start Date
                </label>
                <Input
                  type="date"
                  value={filters.startDate || ""}
                  onChange={(e) =>
                    setFilters((prev) => ({
                      ...prev,
                      startDate: e.target.value || undefined,
                      page: 1,
                    }))
                  }
                  size="sm"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-muted-foreground">
                  End Date
                </label>
                <Input
                  type="date"
                  value={filters.endDate || ""}
                  onChange={(e) =>
                    setFilters((prev) => ({
                      ...prev,
                      endDate: e.target.value || undefined,
                      page: 1,
                    }))
                  }
                  size="sm"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-muted-foreground">
                  Category
                </label>
                <Select
                  selectedKeys={filters.categoryId ? [filters.categoryId] : ["all"]}
                  onChange={(e) =>
                    setFilters((prev) => ({
                      ...prev,
                      categoryId: e.target.value === "all" ? undefined : e.target.value,
                      page: 1,
                    }))
                  }
                  size="sm"
                >
                  <SelectItem key="all">
                    All Categories
                  </SelectItem>
                  {((categories ?? []).map((c: any) => (
                    <SelectItem key={c.id}>
                      {c.name}
                    </SelectItem>
                  )) as any)}
                </Select>
              </div>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Data Table */}
      <div className="surface-card overflow-hidden rounded-lg">
        <Table
          aria-label="Expenses table"
          classNames={{
            wrapper: "shadow-none border-0",
            table: "min-h-[400px]",
          }}
        >
          <TableHeader>
            <TableColumn key="expenseDate">Date</TableColumn>
            <TableColumn key="category">Category</TableColumn>
            <TableColumn key="description">Description</TableColumn>
            <TableColumn key="employee">Logged By</TableColumn>
            <TableColumn key="amount" align="end" width="150">
              Amount
            </TableColumn>
            <TableColumn key="actions" align="center" width="100">
              Actions
            </TableColumn>
          </TableHeader>
          <TableBody
            emptyContent={"No expenses found"}
            items={expenses}
            isLoading={isLoadingExpenses}
            loadingContent={"Loading expenses..."}
          >
            {(item: any) => (
              <TableRow key={item.id}>
                <TableCell>
                  {formatDate(item.expenseDate)}
                </TableCell>
                <TableCell>
                  <Chip
                    color="primary"
                    variant="flat"
                    size="sm"
                    className="font-medium"
                  >
                    {item.category?.name || "—"}
                  </Chip>
                </TableCell>
                <TableCell>
                  {item.description ? (
                    <span className="line-clamp-2">{item.description}</span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell>
                  {item.employee?.fullName || "—"}
                </TableCell>
                <TableCell>
                  <span className="font-semibold text-foreground">
                    {formatCurrency(item.amount)}
                  </span>
                </TableCell>
                <TableCell>
                  <Button
                    size="sm"
                    variant="light"
                    onClick={() => openEditModal(item.id)}
                  >
                    Edit
                  </Button>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        {/* Pagination */}
        <div className="border-t border-divider px-6 py-4 flex items-center justify-between flex-wrap gap-4">
          <div className="text-sm text-muted-foreground">
            Showing {expenses.length === 0 ? 0 : ((filters.page ?? 1) - 1) * (filters.limit ?? 10) + 1} to{" "}
            {Math.min((filters.page ?? 1) * (filters.limit ?? 10), total)} of {total} expenses
          </div>
          <div className="flex items-center gap-2">
            <select
              value={filters.limit ?? 10}
              onChange={(e) => {
                setFilters((prev) => ({
                  ...prev,
                  limit: Number(e.target.value),
                  page: 1,
                }));
              }}
              className="px-2 py-1 rounded border border-divider text-sm bg-background"
            >
              <option value={10}>10 per page</option>
              <option value={25}>25 per page</option>
              <option value={50}>50 per page</option>
              <option value={100}>100 per page</option>
            </select>
            <Button
              size="sm"
              variant="bordered"
              isDisabled={(filters.page ?? 1) === 1}
              onClick={() =>
                setFilters((prev) => ({ ...prev, page: (prev.page ?? 1) - 1 }))
              }
            >
              Prev
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {filters.page ?? 1} of {Math.ceil(total / (filters.limit ?? 10))}
            </span>
            <Button
              size="sm"
              variant="bordered"
              isDisabled={(filters.page ?? 1) >= Math.ceil(total / (filters.limit ?? 10))}
              onClick={() =>
                setFilters((prev) => ({ ...prev, page: (prev.page ?? 1) + 1 }))
              }
            >
              Next
            </Button>
          </div>
        </div>
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
