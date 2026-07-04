"use client";

import { useState } from "react";
import { Plus, Check, X, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import dayjs from "dayjs";
import { MobileTableCard, MobileTableCardRow } from "@/components/mobile/MobileTableCard";
import {
  useCashRegisterSummary,
  useCashRegisterEntries,
  useDeleteCashRegisterEntry,
  CashRegisterEntry,
} from "./hooks/useCashRegisterHooks";
import { AddEntryModal } from "./components/AddEntryModal";

const ENTRY_TYPE_CONFIG: Record<
  CashRegisterEntry["entryType"],
  { label: string; badgeClass: string; sign: "+" | "-" }
> = {
  SALE_IN: { label: "Sale (Cash)", badgeClass: "bg-green-500/10 text-green-600 border-green-500/20", sign: "+" },
  MANUAL_IN: { label: "Deposit", badgeClass: "bg-blue-500/10 text-blue-600 border-blue-500/20", sign: "+" },
  NEW_INVESTMENT_IN: { label: "Capital In", badgeClass: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20", sign: "+" },
  LOAN_IN: { label: "Loan In", badgeClass: "bg-cyan-500/10 text-cyan-600 border-cyan-500/20", sign: "+" },
  CREDIT_PAYMENT_IN: { label: "Credit Payment", badgeClass: "bg-teal-500/10 text-teal-600 border-teal-500/20", sign: "+" },
  EXPENSE_OUT: { label: "Expense", badgeClass: "bg-red-500/10 text-red-600 border-red-500/20", sign: "-" },
  MANUAL_OUT: { label: "Withdrawal", badgeClass: "bg-amber-500/10 text-amber-600 border-amber-500/20", sign: "-" },
  INVENTORY_OUT: { label: "Stock Purchase", badgeClass: "bg-purple-500/10 text-purple-600 border-purple-500/20", sign: "-" },
};

function formatBDT(amount: number) {
  return `৳ ${amount.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function CashRegisterPage() {
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

  const { data: summary, isLoading: summaryLoading } = useCashRegisterSummary(
    startDate,
    endDate
  );
  const { data: entriesData, isLoading: entriesLoading } = useCashRegisterEntries({
    startDate,
    endDate,
    page,
    limit: pageSize,
  });
  const { mutate: deleteEntry } = useDeleteCashRegisterEntry();

  const balanceColor =
    (summary?.currentBalance ?? 0) >= 0 ? "text-green-600 dark:text-green-500" : "text-destructive";

  const entries = entriesData?.data ?? [];
  const periodIn = entries
    .filter((e) => e.entryType === "SALE_IN" || e.entryType === "MANUAL_IN" || e.entryType === "NEW_INVESTMENT_IN" || e.entryType === "LOAN_IN" || e.entryType === "CREDIT_PAYMENT_IN")
    .reduce((s, e) => s + e.amount, 0);
  const periodOut = entries
    .filter((e) => e.entryType === "EXPENSE_OUT" || e.entryType === "MANUAL_OUT" || e.entryType === "INVENTORY_OUT")
    .reduce((s, e) => s + e.amount, 0);
  const net = periodIn - periodOut;

  const totalPages = Math.max(1, Math.ceil((entriesData?.total ?? 0) / pageSize));

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <Button className="flex items-center gap-2" onClick={() => setIsAddModalOpen(true)}>
          <Plus className="h-4 w-4" />
          Add Transaction
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="shadow-sm border-border/60 border-l-4 border-l-green-500">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground font-semibold">Cash In (period)</p>
            <p className="text-2xl font-bold text-green-600 dark:text-green-500 mt-1">
              {summaryLoading ? "…" : formatBDT(summary?.cashIn ?? 0)}
            </p>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-border/60 border-l-4 border-l-destructive">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground font-semibold">Cash Out (period)</p>
            <p className="text-2xl font-bold text-destructive mt-1">
              {summaryLoading ? "…" : formatBDT(summary?.cashOut ?? 0)}
            </p>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-border/60 border-l-4 border-l-primary">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground font-semibold">Current Balance (all-time)</p>
            <p className={`text-2xl font-bold mt-1 ${balanceColor}`}>
              {summaryLoading ? "…" : formatBDT(summary?.currentBalance ?? 0)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="shadow-sm border-border/60">
        <CardContent className="p-5 flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-semibold text-muted-foreground">From:</span>
          <Input
            type="date"
            id="cashregister-start-date"
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
            id="cashregister-end-date"
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
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="shadow-sm border-border/60 overflow-hidden">
        <CardHeader className="pb-4 p-5 border-b border-border/60">
          <CardTitle className="text-lg font-semibold">Cash Movements</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="hidden md:block overflow-x-auto">
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
                    const cfg = ENTRY_TYPE_CONFIG[record.entryType] ?? {
                      label: record.entryType,
                      badgeClass: "bg-gray-500/10 text-gray-600 border-gray-500/20",
                      sign: "+" as const,
                    };
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

          <div className="md:hidden p-4 space-y-3">
            {entriesLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              </div>
            ) : entries.length > 0 ? (
              <>
                {entries.map((record) => {
                  const cfg = ENTRY_TYPE_CONFIG[record.entryType] ?? {
                    label: record.entryType,
                    badgeClass: "bg-gray-500/10 text-gray-600 border-gray-500/20",
                    sign: "+" as const,
                  };
                  const amountColor =
                    cfg.sign === "+" ? "text-green-600 dark:text-green-500" : "text-destructive";
                  const isManual =
                    record.entryType === "MANUAL_IN" || record.entryType === "MANUAL_OUT";

                  return (
                    <MobileTableCard key={record.id}>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <Badge variant="outline" className={cfg.badgeClass}>
                            {cfg.label}
                          </Badge>
                          <div className="text-xs text-muted-foreground mt-1">
                            {dayjs(record.entryDate).format("DD MMM YYYY, hh:mm A")}
                          </div>
                        </div>
                        <div className={`font-bold text-sm ${amountColor}`}>
                          {cfg.sign} {formatBDT(record.amount)}
                        </div>
                      </div>
                      <MobileTableCardRow label="Note" value={record.note || "—"} />
                      <MobileTableCardRow label="By" value={record.createdBy?.fullName ?? "—"} />
                      {isManual && (
                        <div className="pt-2 border-t border-border mt-2 flex justify-end">
                          {confirmDeleteId === record.id ? (
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-destructive font-medium">Delete?</span>
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-9 w-9 text-destructive"
                                onClick={() => {
                                  deleteEntry(record.id);
                                  setConfirmDeleteId(null);
                                }}
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-9 w-9"
                                onClick={() => setConfirmDeleteId(null)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-destructive"
                              onClick={() => setConfirmDeleteId(record.id)}
                            >
                              Delete
                            </Button>
                          )}
                        </div>
                      )}
                    </MobileTableCard>
                  );
                })}
                {!entriesLoading && entries.length > 0 && (
                  <div className="flex items-center justify-between py-3 px-2 border-t border-border">
                    <span className="font-bold">Period Net</span>
                    <span className={net >= 0 ? "text-green-600 dark:text-green-500 font-bold" : "text-destructive font-bold"}>
                      {net >= 0 ? "+" : ""}
                      {formatBDT(net)}
                    </span>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">No cash movements in this period</div>
            )}
          </div>

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
        </CardContent>
      </Card>

      <AddEntryModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
      />
    </div>
  );
}
