"use client";
import { useState } from "react";
import { PlusOutlined, SettingOutlined } from "@ant-design/icons";
import { 
  Button, 
  Card, 
  Input, 
  Table, 
  Select, 
  Space, 
  Typography, 
  Tag, 
  Row, 
  Col, 
  DatePicker 
} from "antd";
import dayjs from "dayjs";
import { useExpenses, useExpenseSummary, ExpenseFilters } from "./hooks/useExpensesHooks";
import { ExpenseModal } from "./components/ExpenseModal";
import { ManageCategoriesModal } from "./components/ManageCategoriesModal";
import { useCategories } from "./hooks/useExpensesHooks";

const { Title, Text } = Typography;

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

  const openAddModal = () => {
    setEditingExpenseId(null);
    setIsExpenseModalOpen(true);
  };

  const openEditModal = (id: string) => {
    setEditingExpenseId(id);
    setIsExpenseModalOpen(true);
  };

  const columns = [
    {
      title: "Date",
      dataIndex: "expenseDate",
      key: "expenseDate",
      render: (date: string) => dayjs(date).format("DD/MM/YYYY"),
    },
    {
      title: "Category",
      dataIndex: ["category", "name"],
      key: "category",
      render: (name: string) => <Tag color="blue">{name}</Tag>,
    },
    {
      title: "Description",
      dataIndex: "description",
      key: "description",
      ellipsis: true,
      render: (text: string) => text || "-",
    },
    {
      title: "Logged By",
      dataIndex: ["employee", "fullName"],
      key: "employee",
    },
    {
      title: "Amount",
      dataIndex: "amount",
      key: "amount",
      align: "right" as const,
      render: (amount: number) => <Text strong>{formatCurrency(amount)}</Text>,
    },
    {
      title: "Actions",
      key: "actions",
      align: "right" as const,
      render: (_: any, record: any) => (
        <Button type="link" size="small" onClick={() => openEditModal(record.id)}>
          Edit
        </Button>
      ),
    },
  ];

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between mb-4">
        <Title level={2} style={{ margin: 0 }}>Expenses</Title>
        <Space>
          <Button icon={<SettingOutlined />} onClick={() => setIsCategoriesModalOpen(true)}>
            Manage Categories
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={openAddModal}>
            Add Expense
          </Button>
        </Space>
      </div>

      <Row gutter={16}>
        <Col span={6}>
          <Card className="stat-card stat-card-danger">
            <Text type="secondary">Total Expenses</Text>
            <div className="text-2xl font-bold text-destructive mt-1">
              {isLoadingSummary ? "..." : formatCurrency(summaryData?.totalAmount || 0)}
            </div>
          </Card>
        </Col>
        
        <Col span={6}>
          <Card className="stat-card stat-card-warning">
            <Text type="secondary">Top Category</Text>
            <div className="text-2xl font-bold truncate text-warning mt-1">
              {isLoadingSummary 
                ? "..." 
                : (summaryData?.categorySummary?.[0]?.name || "N/A")}
            </div>
            {summaryData?.categorySummary?.[0]?.amount && (
              <p className="text-xs text-warning/85 mt-1">
                {formatCurrency(summaryData.categorySummary[0].amount)}
              </p>
            )}
          </Card>
        </Col>
      </Row>

      {/* Filters */}
      <Card size="small" className="mb-4">
        <Space wrap size="middle">
          <div className="flex flex-col">
            <Text type="secondary">Start Date</Text>
            <DatePicker 
              value={filters.startDate ? dayjs(filters.startDate) : null}
              onChange={(date) => setFilters(prev => ({ ...prev, startDate: date?.format("YYYY-MM-DD"), page: 1 }))}
              placeholder="Start Date"
            />
          </div>
          <div className="flex flex-col">
            <Text type="secondary">End Date</Text>
            <DatePicker 
              value={filters.endDate ? dayjs(filters.endDate) : null}
              onChange={(date) => setFilters(prev => ({ ...prev, endDate: date?.format("YYYY-MM-DD"), page: 1 }))}
              placeholder="End Date"
            />
          </div>
          <div className="flex flex-col">
            <Text type="secondary">Category</Text>
            <Select 
              style={{ width: 200 }}
              value={filters.categoryId || "all"} 
              onChange={(val) => setFilters(prev => ({ ...prev, categoryId: val === "all" ? undefined : val, page: 1 }))}
            >
              <Select.Option value="all">All Categories</Select.Option>
              {categories?.map((c) => (
                <Select.Option key={c.id} value={c.id}>{c.name}</Select.Option>
              ))}
            </Select>
          </div>
        </Space>
      </Card>

      {/* Data Table */}
      <Table
        columns={columns}
        dataSource={expensesData?.data || []}
        rowKey="id"
        loading={isLoadingExpenses}
        scroll={{ x: 'max-content' }}
        pagination={{
          current: filters.page,
          pageSize: filters.limit,
          total: expensesData?.meta?.total || 0,
          onChange: (page, pageSize) => setFilters(prev => ({ ...prev, page, limit: pageSize })),
          showSizeChanger: true,
          showTotal: (total) => `Total ${total} expenses`
        }}
      />

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

