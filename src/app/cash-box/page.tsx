"use client";

import { useState } from "react";
import {
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Button,
  Chip,
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@heroui/react";
import { Input } from "@heroui/react";
import { Trash2 } from "lucide-react";
import dayjs from "dayjs";
import { toast } from "sonner";
import {
  useCashBoxSummary,
  useCashBoxEntries,
  useDeleteCashBoxEntry,
  CashBoxEntry,
} from "./hooks/useCashBoxHooks";
import { AddEntryModal } from "./components/AddEntryModal";

const ENTRY_TYPE_CONFIG: Record<
  CashBoxEntry["entryType"],
  { label: string; color: "success" | "primary" | "danger" | "warning"; sign: "+" | "-" }
> = {
  SALE_IN: { label: "Sale (Cash)", color: "success", sign: "+" },
  MANUAL_IN: { label: "Deposit", color: "primary", sign: "+" },
  EXPENSE_OUT: { label: "Expense", color: "danger", sign: "-" },
  MANUAL_OUT: { label: "Withdrawal", color: "warning", sign: "-" },
};

function formatBDT(amount: number) {
  return `৳ ${amount.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function CashBoxPage() {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [dateRange, setDateRange] = useState<[string, string]>(() => {
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];
    return [todayStr, todayStr];
  });

  const [startDate, endDate] = dateRange;
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  const { data: summary, isLoading: summaryLoading } = useCashBoxSummary(
    startDate,
    endDate
  );
  const { data: entriesData, isLoading: entriesLoading } = useCashBoxEntries({
    startDate,
    endDate,
    page,
    limit: pageSize,
  });
  const { mutate: deleteEntry } = useDeleteCashBoxEntry();

  const balanceColor =
    (summary?.currentBalance ?? 0) >= 0
      ? "text-success"
      : "text-destructive";

  const handleDateChange = (type: "start" | "end", value: string) => {
    if (type === "start") {
      setDateRange([value, endDate]);
    } else {
      setDateRange([startDate, value]);
    }
    setPage(1);
  };

  const handleDeleteEntry = (id: string) => {
    deleteEntry(id, {
      onSuccess: () => {
        toast.success("Entry deleted");
      },
      onError: () => {
        toast.error("Failed to delete entry");
      },
    });
  };

  const entries = entriesData?.data ?? [];
  const periodIn = entries
    .filter(
      (e) => e.entryType === "SALE_IN" || e.entryType === "MANUAL_IN"
    )
    .reduce((s, e) => s + e.amount, 0);
  const periodOut = entries
    .filter(
      (e) =>
        e.entryType === "EXPENSE_OUT" ||
        e.entryType === "MANUAL_OUT"
    )
    .reduce((s, e) => s + e.amount, 0);
  const net = periodIn - periodOut;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="page-header">Cash Box</h1>
          <p className="page-subheader">Track cash movements and balance</p>
        </div>
        <Button
          color="primary"
          onClick={() => setIsAddModalOpen(true)}
        >
          + Add Entry
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="stat-card stat-card-success">
          <p className="stat-label text-success">
            💰 Cash In (period)
          </p>
          <p className="stat-value text-success">
            {summaryLoading ? "…" : formatBDT(summary?.cashIn ?? 0)}
          </p>
        </div>
        <div className="stat-card stat-card-danger">
          <p className="stat-label text-destructive">
            💸 Cash Out (period)
          </p>
          <p className="stat-value text-destructive">
            {summaryLoading ? "…" : formatBDT(summary?.cashOut ?? 0)}
          </p>
        </div>
        <div className="stat-card stat-card-primary">
          <p className="stat-label text-primary">
            🏦 Current Balance (all-time)
          </p>
          <p className={`stat-value ${balanceColor}`}>
            {summaryLoading ? "…" : formatBDT(summary?.currentBalance ?? 0)}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-sm font-medium text-muted-foreground">
          Date Range:
        </span>
        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={startDate}
            onChange={(e) => handleDateChange("start", e.target.value)}
            className="w-48"
            size="sm"
          />
          <span className="text-muted-foreground">to</span>
          <Input
            type="date"
            value={endDate}
            onChange={(e) => handleDateChange("end", e.target.value)}
            className="w-48"
            size="sm"
          />
        </div>
        <Button
          size="sm"
          variant="bordered"
          onClick={() => {
            const today = new Date().toISOString().split("T")[0];
            setDateRange([today, today]);
            setPage(1);
          }}
        >
          Today
        </Button>
        <Button
          size="sm"
          variant="bordered"
          onClick={() => {
            const now = new Date();
            const first = new Date(now.getFullYear(), now.getMonth(), 1)
              .toISOString()
              .split("T")[0];
            const last = new Date(now.getFullYear(), now.getMonth() + 1, 0)
              .toISOString()
              .split("T")[0];
            setDateRange([first, last]);
            setPage(1);
          }}
        >
          This Month
        </Button>
      </div>

      {/* Table */}
      <div className="surface-card overflow-hidden rounded-lg">
        <Table
          aria-label="Cash box entries"
          classNames={{
            wrapper: "shadow-none border-0",
            table: "min-h-[400px]",
          }}
        >
          <TableHeader>
            <TableColumn key="entryDate">Date & Time</TableColumn>
            <TableColumn key="entryType" width="140">
              Type
            </TableColumn>
            <TableColumn key="amount" align="end" width="150">
              Amount
            </TableColumn>
            <TableColumn key="note">Note</TableColumn>
            <TableColumn key="createdBy" width="140">
              By
            </TableColumn>
            <TableColumn key="action" width="80" align="center">
              Action
            </TableColumn>
          </TableHeader>
          <TableBody
            emptyContent={"No cash movements in this period"}
            items={entries}
            isLoading={entriesLoading}
            loadingContent={"Loading entries..."}
          >
            {(item) => {
              const cfg = ENTRY_TYPE_CONFIG[item.entryType];
              const amountColor = cfg.sign === "+" ? "text-success" : "text-destructive";
              const isManual =
                item.entryType === "MANUAL_IN" ||
                item.entryType === "MANUAL_OUT";

              return (
                <TableRow key={item.id}>
                  <TableCell>
                    {dayjs(item.entryDate).format("DD MMM YYYY, hh:mm A")}
                  </TableCell>
                  <TableCell>
                    <Chip
                      color={cfg.color}
                      variant="flat"
                      size="sm"
                      className="font-medium"
                    >
                      {cfg.label}
                    </Chip>
                  </TableCell>
                  <TableCell>
                    <span className={`${amountColor} font-semibold`}>
                      {cfg.sign}
                      {formatBDT(item.amount)}
                    </span>
                  </TableCell>
                  <TableCell>
                    {item.note ? (
                      <span>{item.note}</span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {item.createdBy?.fullName ?? "—"}
                  </TableCell>
                  <TableCell>
                    {isManual ? (
                      <Popover placement="left">
                        <PopoverTrigger>
                          <Button
                            isIconOnly
                            size="sm"
                            variant="light"
                            className="text-danger"
                          >
                            <Trash2 size={18} />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-72">
                          <div className="px-1 py-2 space-y-3">
                            <p className="font-semibold">Delete this entry?</p>
                            <p className="text-sm text-muted-foreground">
                              This action cannot be undone.
                            </p>
                            <div className="flex gap-2 justify-end">
                              <PopoverTrigger>
                                <Button size="sm" variant="bordered">
                                  Cancel
                                </Button>
                              </PopoverTrigger>
                              <Button
                                size="sm"
                                color="danger"
                                onClick={() => {
                                  handleDeleteEntry(item.id);
                                }}
                              >
                                Delete
                              </Button>
                            </div>
                          </div>
                        </PopoverContent>
                      </Popover>
                    ) : null}
                  </TableCell>
                </TableRow>
              );
            }}
          </TableBody>
        </Table>

        {/* Custom Summary Section */}
        <div className="border-t border-divider bg-default-50 px-6 py-4 flex items-center justify-between">
          <div>
            <span className="font-semibold text-foreground">Period Net</span>
          </div>
          <div>
            <span
              className={`text-lg font-bold ${
                net >= 0 ? "text-success" : "text-destructive"
              }`}
            >
              {net >= 0 ? "+" : ""}
              {formatBDT(net)}
            </span>
          </div>
        </div>

        {/* Pagination */}
        <div className="border-t border-divider px-6 py-4 flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {entries.length === 0 ? 0 : (page - 1) * pageSize + 1} to{" "}
            {Math.min(page * pageSize, entriesData?.total ?? 0)} of{" "}
            {entriesData?.total ?? 0} entries
          </div>
          <div className="flex items-center gap-2">
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
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
              isDisabled={page === 1}
              onClick={() => setPage(page - 1)}
            >
              Prev
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {page} of {Math.ceil((entriesData?.total ?? 0) / pageSize)}
            </span>
            <Button
              size="sm"
              variant="bordered"
              isDisabled={page >= Math.ceil((entriesData?.total ?? 0) / pageSize)}
              onClick={() => setPage(page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      </div>

      <AddEntryModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
      />
    </div>
  );
}
