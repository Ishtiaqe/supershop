"use client";

import { useState } from "react";
import { Table, Tag, Button as AntButton, Popconfirm, DatePicker } from "antd";
import dayjs from "dayjs";
import type { ColumnsType } from "antd/es/table";
import {
  useCashBoxSummary,
  useCashBoxEntries,
  useDeleteCashBoxEntry,
  CashBoxEntry,
} from "./hooks/useCashBoxHooks";
import { AddEntryModal } from "./components/AddEntryModal";
import { Button } from "@/components/ui/button";

const { RangePicker } = DatePicker;

const ENTRY_TYPE_CONFIG: Record<
  CashBoxEntry["entryType"],
  { label: string; color: string; sign: "+" | "-" }
> = {
  SALE_IN: { label: "Sale (Cash)", color: "green", sign: "+" },
  MANUAL_IN: { label: "Deposit", color: "blue", sign: "+" },
  EXPENSE_OUT: { label: "Expense", color: "red", sign: "-" },
  MANUAL_OUT: { label: "Withdrawal", color: "volcano", sign: "-" },
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

  const { data: summary, isLoading: summaryLoading } = useCashBoxSummary(
    startDate,
    endDate
  );
  const { data: entriesData, isLoading: entriesLoading } = useCashBoxEntries({
    startDate,
    endDate,
    limit: 100,
  });
  const { mutate: deleteEntry } = useDeleteCashBoxEntry();

  const balanceColor =
    (summary?.currentBalance ?? 0) >= 0 ? "text-success" : "text-destructive";

  const columns: ColumnsType<CashBoxEntry> = [
    {
      title: "Date & Time",
      dataIndex: "entryDate",
      key: "entryDate",
      width: 160,
      render: (v: string) => dayjs(v).format("DD MMM YYYY, hh:mm A"),
      sorter: (a, b) =>
        new Date(a.entryDate).getTime() - new Date(b.entryDate).getTime(),
    },
    {
      title: "Type",
      dataIndex: "entryType",
      key: "entryType",
      width: 130,
      render: (type: CashBoxEntry["entryType"]) => {
        const cfg = ENTRY_TYPE_CONFIG[type];
        return <Tag color={cfg.color}>{cfg.label}</Tag>;
      },
    },
    {
      title: "Amount",
      dataIndex: "amount",
      key: "amount",
      width: 130,
      align: "right",
      render: (amount: number, record) => {
        const cfg = ENTRY_TYPE_CONFIG[record.entryType];
        const color =
          cfg.sign === "+"
            ? "text-success font-semibold"
            : "text-destructive font-semibold";
        return (
          <span className={color}>
            {cfg.sign}
            {formatBDT(amount)}
          </span>
        );
      },
    },
    {
      title: "Note",
      dataIndex: "note",
      key: "note",
      render: (note: string) =>
        note || <span className="text-muted-foreground">—</span>,
    },
    {
      title: "By",
      key: "createdBy",
      width: 130,
      render: (_: any, record) => record.createdBy?.fullName ?? "—",
    },
    {
      title: "Action",
      key: "action",
      width: 90,
      render: (_: any, record) => {
        const isManual =
          record.entryType === "MANUAL_IN" ||
          record.entryType === "MANUAL_OUT";
        if (!isManual) return null;
        return (
          <Popconfirm
            title="Delete this entry?"
            onConfirm={() => deleteEntry(record.id)}
            okText="Delete"
            okButtonProps={{ danger: true }}
          >
            <AntButton type="text" danger size="small">
              Delete
            </AntButton>
          </Popconfirm>
        );
      },
    },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-header">Cash Box</h1>
          <p className="page-subheader">
            Track all cash inflows and outflows
          </p>
        </div>
        <Button onClick={() => setIsAddModalOpen(true)}>+ Add Entry</Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-success/10 border border-success/20 rounded-xl p-5">
          <p className="text-sm text-success font-medium mb-1">
            💰 Cash In (period)
          </p>
          <p className="text-2xl font-bold text-success">
            {summaryLoading ? "…" : formatBDT(summary?.cashIn ?? 0)}
          </p>
        </div>
        <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-5">
          <p className="text-sm text-destructive font-medium mb-1">
            💸 Cash Out (period)
          </p>
          <p className="text-2xl font-bold text-destructive">
            {summaryLoading ? "…" : formatBDT(summary?.cashOut ?? 0)}
          </p>
        </div>
        <div className="bg-primary/10 border border-primary/20 rounded-xl p-5">
          <p className="text-sm text-primary font-medium mb-1">
            🏦 Current Balance (all-time)
          </p>
          <p className={`text-2xl font-bold ${balanceColor}`}>
            {summaryLoading ? "…" : formatBDT(summary?.currentBalance ?? 0)}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-sm font-medium text-muted-foreground">Date Range:</span>
        <RangePicker
          value={[dayjs(startDate), dayjs(endDate)]}
          onChange={(dates) => {
            if (dates && dates[0] && dates[1]) {
              setDateRange([
                dates[0].format("YYYY-MM-DD"),
                dates[1].format("YYYY-MM-DD"),
              ]);
            }
          }}
        />
        <AntButton
          size="small"
          onClick={() => {
            const today = new Date().toISOString().split("T")[0];
            setDateRange([today, today]);
          }}
        >
          Today
        </AntButton>
        <AntButton
          size="small"
          onClick={() => {
            const now = new Date();
            const first = new Date(now.getFullYear(), now.getMonth(), 1)
              .toISOString()
              .split("T")[0];
            const last = new Date(now.getFullYear(), now.getMonth() + 1, 0)
              .toISOString()
              .split("T")[0];
            setDateRange([first, last]);
          }}
        >
          This Month
        </AntButton>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <Table
          columns={columns}
          dataSource={entriesData?.data ?? []}
          rowKey="id"
          loading={entriesLoading}
          pagination={false}
          size="middle"
          locale={{ emptyText: "No cash movements in this period" }}
          summary={() => {
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
              <Table.Summary fixed>
                <Table.Summary.Row>
                  <Table.Summary.Cell index={0} colSpan={2}>
                    <span className="font-semibold">Period Net</span>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={1} align="right">
                    <span
                      className={
                        net >= 0
                          ? "text-success font-bold"
                          : "text-destructive font-bold"
                      }
                    >
                      {net >= 0 ? "+" : ""}
                      {formatBDT(net)}
                    </span>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={2} colSpan={3} />
                </Table.Summary.Row>
              </Table.Summary>
            );
          }}
        />
      </div>

      <AddEntryModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
      />
    </div>
  );
}
