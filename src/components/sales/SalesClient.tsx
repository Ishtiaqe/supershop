"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
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
import SearchOutlined from "@ant-design/icons/SearchOutlined";
import type { Sale } from "@/types";
import type { Dayjs } from "dayjs";
import { useAuth } from "@/components/auth/AuthProvider";
function fetchSales() {
  return api.get("/sales").then((rowData) => rowData.data);
}

function fetchSaleDetails(saleId: string) {
  return api.get(`/sales/${saleId}`).then((res) => res.data);
}

export default function SalesClient() {
  const queryClient = useQueryClient();
  const { data: sales = [], isLoading } = useQuery({
    queryKey: ["sales"],
    queryFn: fetchSales,
    staleTime: 30 * 1000,
  });
  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [dateRange, setDateRange] = useState<
    [Dayjs | null, Dayjs | null] | null
  >(null);
  const [paymentFilter, setPaymentFilter] = useState<string | undefined>(
    undefined,
  );
  const deferredSearchText = useDeferredValue(searchText);

  const { data: saleDetails, isLoading: isLoadingDetails } = useQuery({
    queryKey: ["sale-details", selectedSaleId],
    queryFn: () => fetchSaleDetails(selectedSaleId!),
    enabled: !!selectedSaleId,
  });

  const { user } = useAuth();

  if (!user || (user.role !== "OWNER" && user.role !== "EMPLOYEE")) {
    return <div className="p-6">Access denied — Owners and employees only</div>;
  }

  const handleRowClick = (record: Sale) => {
    setSelectedSaleId(record.id);
    setIsModalOpen(true);
  };

  const prefetchSaleDetails = (saleId: string) => {
    queryClient.prefetchQuery({
      queryKey: ["sale-details", saleId],
      queryFn: () => fetchSaleDetails(saleId),
      staleTime: 30 * 1000,
    });
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedSaleId(null);
  };

  const normalizedSearch = deferredSearchText.trim().toLowerCase();
  const startDate = dateRange?.[0]?.startOf("day").toDate() ?? null;
  const endDate = dateRange?.[1]?.endOf("day").toDate() ?? null;

  // Use a single memoized pass to reduce per-keystroke work on large sales datasets.
  const { filteredSales } = useMemo(() => {
    const rows: Sale[] = [];

    for (const sale of sales as Sale[]) {
      if (normalizedSearch) {
        const matchesReceipt = sale.receiptNumber
          ?.toLowerCase()
          .includes(normalizedSearch);
        const matchesCustomer =
          sale.customerName?.toLowerCase().includes(normalizedSearch) ||
          sale.customerPhone?.toLowerCase().includes(normalizedSearch);

        if (!matchesReceipt && !matchesCustomer) {
          continue;
        }
      }

      if (startDate && endDate) {
        const saleDate = new Date(sale.saleTime);
        if (saleDate < startDate || saleDate > endDate) {
          continue;
        }
      }

      if (paymentFilter && sale.paymentMethod !== paymentFilter) {
        continue;
      }

      rows.push(sale);
    }

    return {
      filteredSales: rows,
    };
  }, [sales, normalizedSearch, startDate, endDate, paymentFilter]);

  return (
    <div>
      <Row gutter={16} className="mb-4">
        <Col span={8}>
          <Input
            placeholder="Search"
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

      <Table
        loading={isLoading}
        dataSource={filteredSales}
        rowKey={(r: Sale) => r.id}
        virtual
        scroll={{ y: 520 }}
        pagination={{ pageSize: 10 }}
        onRow={(record) => ({
          onClick: () => handleRowClick(record),
          onMouseEnter: () => prefetchSaleDetails(record.id),
          style: { cursor: "pointer" },
        })}
      >
        <Table.Column
          title="Receipt Number"
          dataIndex="receiptNumber"
          key="receiptNumber"
        />
        <Table.Column
          title="Customer Name"
          dataIndex="customerName"
          key="customerName"
        />
        <Table.Column
          title="Customer Phone"
          dataIndex="customerPhone"
          key="customerPhone"
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
          title="Profit"
          dataIndex="totalProfit"
          key="totalProfit"
          render={(t: number) => `৳${t.toFixed(2)}`}
        />
      </Table>

      <Modal
        title={`Transaction Details - ${saleDetails?.receiptNumber || ""}`}
        open={isModalOpen}
        onCancel={handleCloseModal}
        footer={null}
        width={800}
      >
        <div id={selectedSaleId ? `sale-modal-${selectedSaleId}` : "sale-modal"}>
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
              <Descriptions.Item label="Customer Name">
                {saleDetails.customerName || "N/A"}
              </Descriptions.Item>
              <Descriptions.Item label="Sale Time">
                {new Date(saleDetails.saleTime).toLocaleString()}
              </Descriptions.Item>
              <Descriptions.Item label="Customer Phone">
                {saleDetails.customerPhone || "N/A"}
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
                <span className="text-lg font-bold text-success">
                  ৳{saleDetails.totalAmount?.toFixed(2)}
                </span>
              </Descriptions.Item>
              <Descriptions.Item label="Total Profit" span={2}>
                <span className="text-lg font-bold text-primary">
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
                    },
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
                    },
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
        </div>
      </Modal>
    </div>
  );
}
