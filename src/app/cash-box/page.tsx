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
    (summary?.currentBalance ?? 0) >= 0 ? "text-success" : "text-destructive";

  const columns: ColumnsType<CashBoxEntry> = [
    {
      title: "Date & Time",
      dataIndex: "entryDate",
      key: "entryDate",
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
        <Button onClick={() => setIsAddModalOpen(true)}>+ Add Entry</Button>
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
        <span className="text-sm font-medium text-muted-foreground">Date Range:</span>
        <RangePicker
          value={[dayjs(startDate), dayjs(endDate)]}
          onChange={(dates) => {
            if (dates && dates[0] && dates[1]) {
              setDateRange([
                dates[0].format("DD/MM/YYYY"),
                dates[1].format("DD/MM/YYYY"),
              ]);
              setPage(1);
            }
          }}
        />
        <AntButton
          size="small"
          onClick={() => {
            const today = new Date().toISOString().split("T")[0];
            setDateRange([today, today]);
            setPage(1);
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
            setPage(1);
          }}
        >
          This Month
        </AntButton>
      </div>

      {/* Table */}
      <div className="surface-card overflow-hidden">
        <Table
          columns={columns}
          dataSource={entriesData?.data ?? []}
          rowKey="id"
          loading={entriesLoading}
          pagination={{
            current: entriesData?.page ?? page,
            pageSize: entriesData?.limit ?? pageSize,
            total: entriesData?.total ?? 0,
            onChange: (p, ps) => {
              setPage(p);
              setPageSize(ps);
            },
            showSizeChanger: true,
            pageSizeOptions: ["10", "25", "50", "100"],
          }}
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
