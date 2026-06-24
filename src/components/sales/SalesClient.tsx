"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import {
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  Button,
  Chip,
  Spinner,
  Input,
  Select,
  SelectItem,
} from "@heroui/react";
import { Search, X } from "lucide-react";
import type { Sale } from "@/types";
import { useAuth } from "@/components/auth/AuthProvider";

function fetchSales() {
  return api.get("/sales").then((rowData) => rowData.data);
}

function fetchSaleDetails(saleId: string) {
  return api.get(`/sales/${saleId}`).then((res) => res.data);
}

const PAYMENT_METHOD_COLOR: Record<
  string,
  "success" | "primary" | "warning" | "danger" | "secondary"
> = {
  CASH: "success",
  CARD: "primary",
  MOBILE_PAYMENT: "warning",
  CREDIT: "danger",
  OTHER: "secondary",
};

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
  const [startDateStr, setStartDateStr] = useState<string>("");
  const [endDateStr, setEndDateStr] = useState<string>("");
  const [paymentFilter, setPaymentFilter] = useState<string>("");
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const deferredSearchText = useDeferredValue(searchText);

  const { data: saleDetails, isLoading: isLoadingDetails } = useQuery({
    queryKey: ["sale-details", selectedSaleId],
    queryFn: () => fetchSaleDetails(selectedSaleId!),
    enabled: !!selectedSaleId,
  });

  const { user } = useAuth();

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
  const startDate = startDateStr ? new Date(startDateStr + "T00:00:00") : null;
  const endDate = endDateStr ? new Date(endDateStr + "T23:59:59") : null;

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

    return { filteredSales: rows };
  }, [sales, normalizedSearch, startDate, endDate, paymentFilter]);

  const totalPages = Math.ceil(filteredSales.length / pageSize);
  const pagedSales = filteredSales.slice((page - 1) * pageSize, page * pageSize);

  if (!user || (user.role !== "OWNER" && user.role !== "EMPLOYEE")) {
    return <div className="p-6">Access denied — Owners and employees only</div>;
  }

  return (
    <div className="overflow-x-auto max-w-full md:max-w-7xl mx-auto w-full">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="flex-1 min-w-[200px]">
          <Input
            placeholder="Search by receipt or customer..."
            value={searchText}
            onValueChange={(val) => {
              setSearchText(val);
              setPage(1);
            }}
            isClearable
            startContent={<Search size={16} className="text-default-400" />}
            variant="bordered"
            size="sm"
          />
        </div>
        <div className="flex items-center gap-2 flex-1 min-w-[240px]">
          <Input
            type="date"
            value={startDateStr}
            onChange={(e) => {
              setStartDateStr(e.target.value);
              setPage(1);
            }}
            variant="bordered"
            size="sm"
            className="w-full"
            aria-label="Start date"
          />
          <span className="text-default-400 text-sm">to</span>
          <Input
            type="date"
            value={endDateStr}
            onChange={(e) => {
              setEndDateStr(e.target.value);
              setPage(1);
            }}
            variant="bordered"
            size="sm"
            className="w-full"
            aria-label="End date"
          />
          {(startDateStr || endDateStr) && (
            <Button
              isIconOnly
              size="sm"
              variant="light"
              onPress={() => {
                setStartDateStr("");
                setEndDateStr("");
                setPage(1);
              }}
              aria-label="Clear date range"
            >
              <X size={16} />
            </Button>
          )}
        </div>
        <div className="flex-1 min-w-[180px]">
          <Select
            placeholder="Filter by payment method"
            selectedKeys={paymentFilter ? [paymentFilter] : []}
            onSelectionChange={(keys) => {
              const val = Array.from(keys)[0] as string | undefined;
              setPaymentFilter(val ?? "");
              setPage(1);
            }}
            variant="bordered"
            size="sm"
            aria-label="Payment method filter"
          >
            <SelectItem key="CASH">Cash</SelectItem>
            <SelectItem key="CARD">Card</SelectItem>
            <SelectItem key="MOBILE_PAYMENT">Mobile Payment</SelectItem>
            <SelectItem key="OTHER">Other</SelectItem>
            <SelectItem key="CREDIT">Credit (Due)</SelectItem>
          </Select>
        </div>
      </div>

      {/* Main Table */}
      <div className="overflow-x-auto">
        <Table
          aria-label="Sales table"
          classNames={{ wrapper: "shadow-sm" }}
          bottomContent={
            totalPages > 1 ? (
              <div className="flex items-center justify-between px-2 py-2">
                <span className="text-small text-default-400">
                  Total {filteredSales.length} sales
                </span>
                <div className="flex gap-2 items-center">
                  <Button
                    size="sm"
                    variant="bordered"
                    isDisabled={page === 1}
                    onPress={() => setPage(page - 1)}
                  >
                    Prev
                  </Button>
                  <span className="text-small text-default-500">
                    {page} / {totalPages}
                  </span>
                  <Button
                    size="sm"
                    variant="bordered"
                    isDisabled={page >= totalPages}
                    onPress={() => setPage(page + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            ) : null
          }
        >
          <TableHeader>
            <TableColumn key="receiptNumber">Receipt Number</TableColumn>
            <TableColumn key="customerName">Customer Name</TableColumn>
            <TableColumn key="customerPhone">Customer Phone</TableColumn>
            <TableColumn key="saleTime">Time</TableColumn>
            <TableColumn key="totalAmount" align="end">Total</TableColumn>
            <TableColumn key="totalProfit" align="end">Profit</TableColumn>
          </TableHeader>
          <TableBody
            items={pagedSales}
            emptyContent={isLoading ? " " : "No sales found"}
            isLoading={isLoading}
            loadingContent={<Spinner />}
          >
            {(record: Sale) => (
              <TableRow
                key={record.id}
                className="cursor-pointer"
                onClick={() => handleRowClick(record)}
                onMouseEnter={() => prefetchSaleDetails(record.id)}
              >
                <TableCell>{record.receiptNumber}</TableCell>
                <TableCell>{record.customerName ?? "—"}</TableCell>
                <TableCell>{record.customerPhone ?? "—"}</TableCell>
                <TableCell>
                  {new Date(record.saleTime).toLocaleString()}
                </TableCell>
                <TableCell className="text-right">
                  ৳{(record.totalAmount as number).toFixed(2)}
                </TableCell>
                <TableCell className="text-right">
                  ৳{(record.totalProfit as number).toFixed(2)}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Sale Detail Modal */}
      <Modal
        isOpen={isModalOpen}
        onOpenChange={(open) => {
          if (!open) handleCloseModal();
        }}
        size="2xl"
        scrollBehavior="inside"
      >
        <ModalContent>
          {() => (
            <>
              <ModalHeader className="flex flex-col gap-1">
                Transaction Details
                {saleDetails?.receiptNumber && (
                  <span className="text-sm font-normal text-default-500">
                    {saleDetails.receiptNumber}
                  </span>
                )}
              </ModalHeader>
              <ModalBody className="pb-6">
                <div
                  id={
                    selectedSaleId
                      ? `sale-modal-${selectedSaleId}`
                      : "sale-modal"
                  }
                >
                  {isLoadingDetails ? (
                    <div className="flex justify-center py-8">
                      <Spinner size="lg" />
                    </div>
                  ) : saleDetails ? (
                    <div className="space-y-6">
                      {/* Details Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                        <div className="bg-default-50 rounded-lg p-3">
                          <span className="text-default-500 block mb-1">
                            Receipt Number
                          </span>
                          <span className="font-medium">
                            {saleDetails.receiptNumber}
                          </span>
                        </div>
                        <div className="bg-default-50 rounded-lg p-3">
                          <span className="text-default-500 block mb-1">
                            Customer Name
                          </span>
                          <span className="font-medium">
                            {saleDetails.customerName || "N/A"}
                          </span>
                        </div>
                        <div className="bg-default-50 rounded-lg p-3">
                          <span className="text-default-500 block mb-1">
                            Sale Time
                          </span>
                          <span className="font-medium">
                            {new Date(saleDetails.saleTime).toLocaleString()}
                          </span>
                        </div>
                        <div className="bg-default-50 rounded-lg p-3">
                          <span className="text-default-500 block mb-1">
                            Customer Phone
                          </span>
                          <span className="font-medium">
                            {saleDetails.customerPhone || "N/A"}
                          </span>
                        </div>
                        <div className="bg-default-50 rounded-lg p-3">
                          <span className="text-default-500 block mb-1">
                            Employee
                          </span>
                          <span className="font-medium">
                            {saleDetails.employee?.fullName || "N/A"}
                          </span>
                        </div>
                        <div className="bg-default-50 rounded-lg p-3">
                          <span className="text-default-500 block mb-1">
                            Payment Method
                          </span>
                          <Chip
                            size="sm"
                            variant="flat"
                            color={
                              PAYMENT_METHOD_COLOR[
                                saleDetails.paymentMethod?.toUpperCase() ?? ""
                              ] ?? "default"
                            }
                          >
                            {saleDetails.paymentMethod?.toUpperCase()}
                          </Chip>
                        </div>
                        <div className="bg-default-50 rounded-lg p-3">
                          <span className="text-default-500 block mb-1">
                            Discount Type
                          </span>
                          <span className="font-medium">
                            {saleDetails.discountType || "None"}
                          </span>
                        </div>
                        <div className="bg-default-50 rounded-lg p-3">
                          <span className="text-default-500 block mb-1">
                            Discount Value
                          </span>
                          <span className="font-medium">
                            ৳{saleDetails.discountValue?.toFixed(2) || "0.00"}
                          </span>
                        </div>
                        <div className="bg-default-50 rounded-lg p-3 sm:col-span-2">
                          <span className="text-default-500 block mb-1">
                            Total Amount
                          </span>
                          <span className="text-lg font-bold text-success">
                            ৳{saleDetails.totalAmount?.toFixed(2)}
                          </span>
                        </div>
                        <div className="bg-default-50 rounded-lg p-3 sm:col-span-2">
                          <span className="text-default-500 block mb-1">
                            Total Profit
                          </span>
                          <span className="text-lg font-bold text-primary">
                            ৳{saleDetails.totalProfit?.toFixed(2)}
                          </span>
                        </div>
                      </div>

                      {/* Items Table */}
                      <div>
                        <h3 className="text-base font-semibold mb-3">Items</h3>
                        <Table
                          aria-label="Sale items"
                          classNames={{ wrapper: "shadow-none border border-default-200" }}
                          removeWrapper={false}
                        >
                          <TableHeader>
                            <TableColumn key="product">Product</TableColumn>
                            <TableColumn key="variant">Variant</TableColumn>
                            <TableColumn key="quantity" align="end">Qty</TableColumn>
                            <TableColumn key="unitPrice" align="end">Unit Price</TableColumn>
                            <TableColumn key="subtotal" align="end">Subtotal</TableColumn>
                          </TableHeader>
                          <TableBody
                            items={saleDetails.items ?? []}
                            emptyContent="No items"
                          >
                            {(item: {
                              id: string;
                              quantity: number;
                              unitPrice: number;
                              subtotal: number;
                              inventory?: {
                                variant?: {
                                  product?: { name?: string };
                                  variantName?: string;
                                  sku?: string;
                                };
                                itemName?: string;
                              };
                            }) => (
                              <TableRow key={item.id}>
                                <TableCell>
                                  {item.inventory?.variant?.product?.name ||
                                    item.inventory?.itemName ||
                                    "N/A"}
                                </TableCell>
                                <TableCell>
                                  {item.inventory?.variant?.variantName || "—"}
                                </TableCell>
                                <TableCell className="text-right">
                                  {item.quantity}
                                </TableCell>
                                <TableCell className="text-right">
                                  ৳{item.unitPrice?.toFixed(2)}
                                </TableCell>
                                <TableCell className="text-right">
                                  ৳{item.subtotal?.toFixed(2)}
                                </TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  ) : (
                    <div className="py-8 text-center text-default-400">
                      No details available
                    </div>
                  )}
                </div>
              </ModalBody>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
}
