"use client";

import { useState } from "react";
import { Plus, Check, X, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import dayjs from "dayjs";
import {
  useCashBoxSummary,
  useCashBoxEntries,
  useDeleteCashBoxEntry,
  CashBoxEntry,
} from "./hooks/useCashBoxHooks";
import { AddEntryModal } from "./components/AddEntryModal";

const ENTRY_TYPE_CONFIG: Record<
  CashBoxEntry["entryType"],
  { label: string; badgeClass: string; sign: "+" | "-" }
> = {
  SALE_IN: { label: "Sale (Cash)", badgeClass: "bg-green-500/10 text-green-600 border-green-500/20", sign: "+" },
  MANUAL_IN: { label: "Deposit", badgeClass: "bg-blue-500/10 text-blue-600 border-blue-500/20", sign: "+" },
  EXPENSE_OUT: { label: "Expense", badgeClass: "bg-red-500/10 text-red-600 border-red-500/20", sign: "-" },
  MANUAL_OUT: { label: "Withdrawal", badgeClass: "bg-amber-500/10 text-amber-600 border-amber-500/20", sign: "-" },
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
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

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
    (summary?.currentBalance ?? 0) >= 0 ? "text-green-600 dark:text-green-500" : "text-destructive";

  const entries = entriesData?.data ?? [];
  const periodIn = entries
    .filter((e) => e.entryType === "SALE_IN" || e.entryType === "MANUAL_IN")
    .reduce((s, e) => s + e.amount, 0);
  const periodOut = entries
    .filter((e) => e.entryType === "EXPENSE_OUT" || e.entryType === "MANUAL_OUT")
    .reduce((s, e) => s + e.amount, 0);
  const net = periodIn - periodOut;

  const totalPages = Math.max(1, Math.ceil((entriesData?.total ?? 0) / pageSize));

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Cash Box</h1>
          <p className="text-muted-foreground text-sm">Monitor and manage cash flows</p>
        </div>
        <Button className="flex items-center gap-2" onClick={() => setIsAddModalOpen(true)}>
          <Plus className="h-4 w-4" />
          Add Movement
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-6 rounded-xl border bg-card text-card-foreground shadow-sm border-l-4 border-l-green-500">
          <p className="text-sm font-semibold text-green-600 dark:text-green-500">
            💰 Cash In (period)
          </p>
          <p className="text-2xl font-bold text-green-600 dark:text-green-500 mt-2">
            {summaryLoading ? "…" : formatBDT(summary?.cashIn ?? 0)}
          </p>
        </div>
        <div className="p-6 rounded-xl border bg-card text-card-foreground shadow-sm border-l-4 border-l-destructive">
          <p className="text-sm font-semibold text-destructive">
            💸 Cash Out (period)
          </p>
          <p className="text-2xl font-bold text-destructive mt-2">
            {summaryLoading ? "…" : formatBDT(summary?.cashOut ?? 0)}
          </p>
        </div>
        <div className="p-6 rounded-xl border bg-card text-card-foreground shadow-sm border-l-4 border-l-primary">
          <p className="text-sm font-semibold text-primary">
            🏦 Current Balance (all-time)
          </p>
          <p className={`text-2xl font-bold mt-2 ${balanceColor}`}>
            {summaryLoading ? "…" : formatBDT(summary?.currentBalance ?? 0)}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 flex-wrap bg-muted/30 p-4 rounded-lg border border-border">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-semibold text-muted-foreground">From:</span>
          <Input
            type="date"
            value={startDate}
            onChange={(e) => {
              setDateRange([e.target.value, endDate]);
              setPage(1);
            }}
            className="w-40"
          />
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-semibold text-muted-foreground">To:</span>
          <Input
            type="date"
            value={endDate}
            onChange={(e) => {
              setDateRange([startDate, e.target.value]);
              setPage(1);
            }}
            className="w-40"
          />
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const today = new Date().toISOString().split("T")[0];
              setDateRange([today, today]);
              setPage(1);
            }}
          >
            Today
          </Button>
          <Button
            variant="outline"
            size="sm"
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
      </div>

      {/* Table */}
      <div className="rounded-md border overflow-hidden bg-card text-card-foreground shadow-sm">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date & Time</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Note</TableHead>
                <TableHead>By</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entriesLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  </TableCell>
                </TableRow>
              ) : entries.length > 0 ? (
                entries.map((record) => {
                  const cfg = ENTRY_TYPE_CONFIG[record.entryType];
                  const amountColor =
                    cfg.sign === "+" ? "text-green-600 dark:text-green-500 font-semibold" : "text-destructive font-semibold";
                  const isManual =
                    record.entryType === "MANUAL_IN" || record.entryType === "MANUAL_OUT";
                  return (
                    <TableRow key={record.id}>
                      <TableCell>{dayjs(record.entryDate).format("DD MMM YYYY, hh:mm A")}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cfg.badgeClass}>
                          {cfg.label}
                        </Badge>
                      </TableCell>
                      <TableCell className={`text-right ${amountColor}`}>
                        {cfg.sign} {formatBDT(record.amount)}
                      </TableCell>
                      <TableCell>{record.note || <span className="text-muted-foreground">—</span>}</TableCell>
                      <TableCell>{record.createdBy?.fullName ?? "—"}</TableCell>
                      <TableCell className="text-right">
                        {isManual && (
                          confirmDeleteId === record.id ? (
                            <div className="flex items-center gap-1 bg-destructive/10 px-2 py-0.5 rounded border border-destructive/20 justify-end w-fit ml-auto">
                              <span className="text-xs text-destructive font-medium mr-1">Delete?</span>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-7 w-7 text-destructive hover:bg-destructive/20"
                                onClick={() => {
                                  deleteEntry(record.id);
                                  setConfirmDeleteId(null);
                                }}
                              >
                                <Check className="h-3.5 w-3.5" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-7 w-7 text-muted-foreground hover:bg-muted"
                                onClick={() => setConfirmDeleteId(null)}
                              >
                                <X className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          ) : (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8"
                              onClick={() => setConfirmDeleteId(record.id)}
                            >
                              Delete
                            </Button>
                          )
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No cash movements in this period
                  </TableCell>
                </TableRow>
              )}

              {/* Table Net Summary */}
              {!entriesLoading && entries.length > 0 && (
                <TableRow className="bg-muted/30 font-semibold border-t">
                  <TableCell colSpan={2} className="font-bold">Period Net</TableCell>
                  <TableCell className="text-right font-bold">
                    <span className={net >= 0 ? "text-green-600 dark:text-green-500" : "text-destructive"}>
                      {net >= 0 ? "+" : ""}
                      {formatBDT(net)}
                    </span>
                  </TableCell>
                  <TableCell colSpan={3} />
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination footer */}
        <div className="flex items-center justify-between p-4 border-t bg-muted/20">
          <div className="text-sm text-muted-foreground">
            Total {entriesData?.total ?? 0} entries
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 1}
              onClick={() => setPage(prev => Math.max(1, prev - 1))}
            >
              Previous
            </Button>
            <span className="text-sm font-medium">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage(prev => prev + 1)}
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
