"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import {
  Table,
  Modal,
  Descriptions,
  Tag,
  Spin,
  Input,
  Select,
  DatePicker,
  Row,
  Col,
} from "antd";
import { SearchOutlined } from "@ant-design/icons";
import type { Sale } from "@/types";
import type { Dayjs } from "dayjs";
function fetchSales() {
  return api.get("/sales").then((rowData) => rowData.data);
}

function fetchSaleDetails(saleId: string) {
  return api.get(`/sales/${saleId}`).then((res) => res.data);
}

export default function SalesClient() {
  const { data: sales = [], isLoading } = useQuery({
    queryKey: ["sales"],
    queryFn: fetchSales,
  });
  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [dateRange, setDateRange] = useState<
    [Dayjs | null, Dayjs | null] | null
  >(null);
  const [paymentFilter, setPaymentFilter] = useState<string | undefined>(
    undefined
  );

  const { data: saleDetails, isLoading: isLoadingDetails } = useQuery({
    queryKey: ["sale-details", selectedSaleId],
    queryFn: () => fetchSaleDetails(selectedSaleId!),
    enabled: !!selectedSaleId,
  });

  const userJson =
    typeof window !== "undefined" ? localStorage.getItem("user") : null;
  const user = userJson ? JSON.parse(userJson) : null;

  if (!user || (user.role !== "OWNER" && user.role !== "EMPLOYEE")) {
    return <div className="p-6">Access denied — Owners and employees only</div>;
  }

  const handleRowClick = (record: Sale) => {
    setSelectedSaleId(record.id);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedSaleId(null);
  };

  // Filter sales
  const filteredSales = sales.filter((sale: Sale) => {
    // Search filter
    if (searchText) {
      const search = searchText.toLowerCase();
      const matchesReceipt = sale.receiptNumber?.toLowerCase().includes(search);
      const matchesCustomer =
        sale.customerName?.toLowerCase().includes(search) ||
        sale.customerPhone?.toLowerCase().includes(search);
      if (!matchesReceipt && !matchesCustomer) return false;
    }

    // Date range filter
    if (dateRange && dateRange[0] && dateRange[1]) {
      const saleDate = new Date(sale.saleTime);
      const start = dateRange[0].startOf("day").toDate();
      const end = dateRange[1].endOf("day").toDate();
      if (saleDate < start || saleDate > end) return false;
    }

    // Payment method filter
    if (paymentFilter && sale.paymentMethod !== paymentFilter) {
      return false;
    }

    return true;
  });

  // Calculate totals
  const totalRevenue = filteredSales.reduce(
    (sum: number, sale: Sale) => sum + sale.totalAmount,
    0
  );
  const totalProfit = filteredSales.reduce(
    (sum: number, sale: Sale) => sum + sale.totalProfit,
    0
  );

  return (
    <div>
      <Row gutter={16} className="mb-4">
        <Col span={8}>
          <Input
            placeholder="Search by receipt or customer..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            prefix={<SearchOutlined />}
          />
        </Col>
        <Col span={8}>
          <DatePicker.RangePicker
            style={{ width: "100%" }}
            value={dateRange}
            onChange={(dates) => setDateRange(dates)}
          />
        </Col>
        <Col span={8}>
          <Select
            placeholder="Filter by payment method"
            style={{ width: "100%" }}
            allowClear
            value={paymentFilter}
            onChange={(value) => setPaymentFilter(value)}
            options={[
              { label: "Cash", value: "CASH" },
              { label: "Card", value: "CARD" },
              { label: "Mobile Payment", value: "MOBILE_PAYMENT" },
              { label: "Other", value: "OTHER" },
            ]}
          />
        </Col>
      </Row>

      {isLoading && <div>Loading…</div>}
      <Table
        dataSource={filteredSales}
        rowKey={(r: Sale) => r.id}
        pagination={{ pageSize: 10 }}
        onRow={(record) => ({
          onClick: () => handleRowClick(record),
          style: { cursor: "pointer" },
        })}
        footer={() => (
          <div style={{ textAlign: "right", fontWeight: "bold" }}>
            <span className="mr-8">Total Sales: {filteredSales.length}</span>
            <span className="mr-8">
              Total Revenue: ৳{totalRevenue.toFixed(2)}
            </span>
            <span>Total Profit: ৳{totalProfit.toFixed(2)}</span>
          </div>
        )}
      >
        <Table.Column
          title="Receipt"
          dataIndex="receiptNumber"
          key="receiptNumber"
        />
        <Table.Column
          title="Time"
          dataIndex="saleTime"
          key="saleTime"
          render={(t: string) => new Date(t).toLocaleString()}
        />
        <Table.Column
          title="Total"
          dataIndex="totalAmount"
          key="totalAmount"
          render={(t: number) => `৳${t.toFixed(2)}`}
        />
        <Table.Column
          title="Employee"
          dataIndex="employee"
          key="employee"
          render={(
            e: string | { fullName?: string } | undefined,
            record: Sale
          ) => {
            if (typeof e === "string") return e;
            if (e && typeof e === "object" && "fullName" in e && e.fullName)
              return e.fullName;
            return (
              record?.employeeName ?? record?.employeeFullName ?? "Cashier"
            );
          }}
        />
      </Table>

      <Modal
        title={`Transaction Details - ${saleDetails?.receiptNumber || ""}`}
        open={isModalOpen}
        onCancel={handleCloseModal}
        footer={null}
        width={800}
      >
        {isLoadingDetails ? (
          <div className="flex justify-center py-8">
            <Spin size="large" />
          </div>
        ) : saleDetails ? (
          <div className="space-y-4">
            <Descriptions bordered column={2} size="small">
              <Descriptions.Item label="Receipt Number">
                {saleDetails.receiptNumber}
              </Descriptions.Item>
              <Descriptions.Item label="Sale Time">
                {new Date(saleDetails.saleTime).toLocaleString()}
              </Descriptions.Item>
              <Descriptions.Item label="Employee">
                {saleDetails.employee?.fullName || "N/A"}
              </Descriptions.Item>
              <Descriptions.Item label="Payment Method">
                <Tag
                  color={
                    saleDetails.paymentMethod === "cash" ? "green" : "blue"
                  }
                >
                  {saleDetails.paymentMethod?.toUpperCase()}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Discount Type">
                {saleDetails.discountType || "None"}
              </Descriptions.Item>
              <Descriptions.Item label="Discount Value">
                ৳{saleDetails.discountValue?.toFixed(2) || 0}
              </Descriptions.Item>
              <Descriptions.Item label="Total Amount" span={2}>
                <span className="text-lg font-bold text-green-600">
                  ৳{saleDetails.totalAmount?.toFixed(2)}
                </span>
              </Descriptions.Item>
              <Descriptions.Item label="Total Profit" span={2}>
                <span className="text-lg font-bold text-blue-600">
                  ৳{saleDetails.totalProfit?.toFixed(2)}
                </span>
              </Descriptions.Item>
            </Descriptions>

            <div>
              <h3 className="text-lg font-semibold mb-3">Items</h3>
              <Table
                dataSource={saleDetails.items || []}
                rowKey={(item: { id: string }) => item.id}
                pagination={false}
                size="small"
              >
                <Table.Column
                  title="Product"
                  key="product"
                  render={(
                    _,
                    item: {
                      inventory?: {
                        variant?: {
                          product?: { name?: string };
                          variantName?: string;
                          sku?: string;
                        };
                        itemName?: string;
                      };
                    }
                  ) => {
                    // Check if it's a catalog item or ad-hoc
                    if (item.inventory?.variant?.product?.name) {
                      return item.inventory.variant.product.name;
                    }
                    // Fallback to ad-hoc item name
                    return item.inventory?.itemName || "N/A";
                  }}
                />
                <Table.Column
                  title="Variant"
                  key="variant"
                  render={(
                    _,
                    item: {
                      inventory?: {
                        variant?: { variantName?: string; sku?: string };
                      };
                    }
                  ) => {
                    // Use variantName from schema
                    if (item.inventory?.variant?.variantName) {
                      return item.inventory.variant.variantName;
                    }
                    // For ad-hoc items, show SKU or dash
                    return item.inventory?.variant?.sku || "-";
                  }}
                />
                <Table.Column
                  title="Quantity"
                  dataIndex="quantity"
                  key="quantity"
                />
                <Table.Column
                  title="Unit Price"
                  dataIndex="unitPrice"
                  key="unitPrice"
                  render={(price: number) => `৳${price?.toFixed(2)}`}
                />
                <Table.Column
                  title="Subtotal"
                  dataIndex="subtotal"
                  key="subtotal"
                  render={(subtotal: number) => `৳${subtotal?.toFixed(2)}`}
                />
              </Table>
            </div>
          </div>
        ) : (
          <div>No details available</div>
        )}
      </Modal>
    </div>
  );
}
