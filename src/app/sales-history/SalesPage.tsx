"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import type { Sale } from "@/types";
import { useAuth } from "@/components/auth/AuthProvider";
import { MobileTableCard, MobileTableCardRow } from "@/components/mobile/MobileTableCard";
import { toast } from "sonner";
import { formatDateTime } from "@/lib/ui-helpers";

// Import shadcn UI components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

function fetchSales(params: {
  page: number;
  limit: number;
  search?: string;
  startDate?: string;
  endDate?: string;
  paymentMethod?: string;
}) {
  const queryParams: Record<string, string> = {
    limit: String(params.limit),
    offset: String((params.page - 1) * params.limit),
  };
  if (params.search) queryParams.search = params.search;
  if (params.startDate) queryParams.startDate = params.startDate;
  if (params.endDate) queryParams.endDate = params.endDate;
  if (params.paymentMethod) queryParams.paymentMethod = params.paymentMethod;
  return api.get("/sales-history", { params: queryParams }).then((res) => res.data);
}

function fetchSaleDetails(saleId: string) {
  return api.get(`/sales-history/${saleId}`).then((res) => res.data);
}

export default function SalesPage() {
  const queryClient = useQueryClient();
  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [startDateStr, setStartDateStr] = useState("");
  const [endDateStr, setEndDateStr] = useState("");
  const [paymentFilter, setPaymentFilter] = useState<string | undefined>(
    undefined
  );
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const deferredSearchText = useDeferredValue(searchText);
  const PAGE_SIZE = 10;

  const { data: salesResponse, isLoading } = useQuery({
    queryKey: ["sales", currentPage, deferredSearchText, startDateStr, endDateStr, paymentFilter],
    queryFn: () => fetchSales({
      page: currentPage,
      limit: PAGE_SIZE,
      search: deferredSearchText.trim() || undefined,
      startDate: startDateStr || undefined,
      endDate: endDateStr || undefined,
      paymentMethod: paymentFilter,
    }),
    staleTime: 30 * 1000,
  });

  const sales: Sale[] = salesResponse?.data ?? [];
  const totalCount = salesResponse?.total ?? 0;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

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
    setDeletingId(null);
  };

  const voidMutation = useMutation({
    mutationFn: (saleId: string) => api.delete(`/sales-history/${saleId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      toast.success("Sale voided successfully");
      handleCloseModal();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to void sale");
    },
  });

  const normalizedSearch = deferredSearchText.trim().toLowerCase();

  // Reset to first page when filters change
  useMemo(() => {
    setCurrentPage(1);
  }, [normalizedSearch, startDateStr, endDateStr, paymentFilter]);

  const filteredSales = sales;

  if (!user || (user.role !== "OWNER" && user.role !== "EMPLOYEE")) {
    return <div className="p-6">Access denied — Owners and employees only</div>;
  }

  return (
    <div className="space-y-4">

      <div className="space-y-6">
        <Card className="shadow-sm border-border/60">
          <CardHeader className="flex flex-col lg:flex-row gap-4 p-5 pb-4 border-b border-border/60">
            <CardTitle className="text-lg font-semibold">Transactions</CardTitle>
            <div className="flex flex-wrap flex-1 gap-3 items-center justify-end">
              <Input
                id="sales-search"
                placeholder="Search by receipt or customer..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="w-full sm:w-[220px]"
              />
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <Input
                  type="date"
                  id="sales-start-date"
                  value={startDateStr}
                  onChange={(e) => setStartDateStr(e.target.value)}
                  className="w-full sm:w-[140px]"
                />
                <span className="hidden sm:inline text-muted-foreground text-sm">to</span>
                <Input
                  type="date"
                  id="sales-end-date"
                  value={endDateStr}
                  onChange={(e) => setEndDateStr(e.target.value)}
                  className="w-full sm:w-[140px]"
                />
              </div>
              <select
                id="sales-payment-filter"
                className="flex h-10 w-full sm:w-[180px] rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={paymentFilter || ""}
                onChange={(e) => setPaymentFilter(e.target.value || undefined)}
              >
                <option value="">All Payment Methods</option>
                <option value="CASH">Cash</option>
                <option value="NAGAD">Nagad</option>
                <option value="BKASH">bKash</option>
                <option value="ROCKET">Rocket</option>
                <option value="CARD">Card</option>
                <option value="MOBILE_PAYMENT">Mobile Payment</option>
                <option value="CREDIT">Credit (Due)</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="hidden md:block overflow-x-auto">
              <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Receipt Number</TableHead>
                  <TableHead>Customer Name</TableHead>
                  <TableHead>Customer Phone</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Profit</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
                    </TableCell>
                  </TableRow>
                ) : filteredSales.length > 0 ? (
                  filteredSales.map((record: Sale) => (
                    <TableRow key={record.id} className="hover:bg-muted/50">
                      <TableCell
                        className="font-semibold cursor-pointer"
                        onClick={() => handleRowClick(record)}
                        onMouseEnter={() => prefetchSaleDetails(record.id)}
                      >
                        {record.receiptNumber}
                      </TableCell>
                      <TableCell
                        className="cursor-pointer"
                        onClick={() => handleRowClick(record)}
                        onMouseEnter={() => prefetchSaleDetails(record.id)}
                      >
                        {record.customerName || "—"}
                      </TableCell>
                      <TableCell
                        className="cursor-pointer"
                        onClick={() => handleRowClick(record)}
                        onMouseEnter={() => prefetchSaleDetails(record.id)}
                      >
                        {record.customerPhone || "—"}
                      </TableCell>
                      <TableCell
                        className="cursor-pointer"
                        onClick={() => handleRowClick(record)}
                        onMouseEnter={() => prefetchSaleDetails(record.id)}
                      >
                        {formatDateTime(record.saleTime)}
                      </TableCell>
                      <TableCell
                        className="text-right font-medium cursor-pointer"
                        onClick={() => handleRowClick(record)}
                        onMouseEnter={() => prefetchSaleDetails(record.id)}
                      >
                        ৳{record.totalAmount.toFixed(2)}
                      </TableCell>
                      <TableCell
                        className="text-right text-emerald-600 font-semibold cursor-pointer"
                        onClick={() => handleRowClick(record)}
                        onMouseEnter={() => prefetchSaleDetails(record.id)}
                      >
                        ৳{record.totalProfit.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                        {user?.role === "OWNER" && deletingId === record.id ? (
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => voidMutation.mutate(record.id)}
                              disabled={voidMutation.isPending}
                            >
                              {voidMutation.isPending ? "..." : "Confirm"}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setDeletingId(null)}
                            >
                              Cancel
                            </Button>
                          </div>
                        ) : user?.role === "OWNER" ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setDeletingId(record.id)}
                          >
                            🗑️
                          </Button>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No sales found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            </div>

            <div className="md:hidden p-4 space-y-3">
              {isLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
                </div>
              ) : filteredSales.length > 0 ? (
                filteredSales.map((record: Sale) => (
                  <MobileTableCard
                    key={record.id}
                    onClick={() => handleRowClick(record)}
                    className="relative"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-semibold text-sm">{record.receiptNumber}</div>
                      <Badge variant={record.paymentMethod === "CASH" ? "default" : "secondary"}>
                        {record.paymentMethod?.toUpperCase() || "CASH"}
                      </Badge>
                    </div>
                    <MobileTableCardRow label="Customer" value={record.customerName || "—"} />
                    <MobileTableCardRow label="Phone" value={record.customerPhone || "—"} />
                    <MobileTableCardRow
                      label="Time"
                      value={formatDateTime(record.saleTime)}
                    />
                    <MobileTableCardRow
                      label="Total"
                      value={`৳${record.totalAmount.toFixed(2)}`}
                      className="font-bold text-foreground"
                    />
                    <MobileTableCardRow
                      label="Profit"
                      value={`৳${record.totalProfit.toFixed(2)}`}
                      className="text-emerald-600"
                    />
                    {user?.role === "OWNER" && (
                      <div className="pt-2 border-t border-border mt-2">
                        {deletingId === record.id ? (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="destructive"
                              className="flex-1"
                              onClick={(e) => {
                                e.stopPropagation();
                                voidMutation.mutate(record.id);
                              }}
                              disabled={voidMutation.isPending}
                            >
                              {voidMutation.isPending ? "..." : "Confirm"}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeletingId(null);
                              }}
                            >
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            className="w-full text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeletingId(record.id);
                            }}
                          >
                            Refund and Undo Sale
                          </Button>
                        )}
                      </div>
                    )}
                  </MobileTableCard>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">No sales found.</div>
              )}
            </div>
          </CardContent>
        </Card>

        {totalPages > 1 && (
          <div className="flex justify-between items-center">
            <div className="text-sm text-muted-foreground">
              Page {currentPage} of {totalPages}
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}

        <Dialog open={isModalOpen} onOpenChange={(open) => !open && handleCloseModal()}>
          <DialogContent className="max-w-6xl max-h-[100vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                Transaction Details - {saleDetails?.receiptNumber || ""}
              </DialogTitle>
            </DialogHeader>

            {isLoadingDetails ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              </div>
            ) : saleDetails ? (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border border-border rounded-lg p-4 bg-muted/20 text-sm">
                  <div className="space-y-1">
                    <div className="text-xs text-muted-foreground font-medium">Receipt Number</div>
                    <div className="font-semibold text-foreground">{saleDetails.receiptNumber}</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs text-muted-foreground font-medium">Customer Name</div>
                    <div className="font-semibold text-foreground">{saleDetails.customerName || "N/A"}</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs text-muted-foreground font-medium">Sale Time</div>
                    <div className="font-semibold text-foreground">
                      {formatDateTime(saleDetails.saleTime)}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs text-muted-foreground font-medium">Customer Phone</div>
                    <div className="font-semibold text-foreground">{saleDetails.customerPhone || "N/A"}</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs text-muted-foreground font-medium">Employee</div>
                    <div className="font-semibold text-foreground">
                      {saleDetails.employee?.fullName || "N/A"}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs text-muted-foreground font-medium">Payment Method</div>
                    <div>
                      <Badge variant={saleDetails.paymentMethod === "CASH" ? "default" : "secondary"}>
                        {saleDetails.paymentMethod?.toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs text-muted-foreground font-medium">Discount Type</div>
                    <div className="font-semibold text-foreground">{saleDetails.discountType || "None"}</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs text-muted-foreground font-medium">Discount Value</div>
                    <div className="font-semibold text-foreground">৳{saleDetails.discountValue?.toFixed(2) || 0}</div>
                  </div>
                  <div className="space-y-1 sm:col-span-2 pt-2 border-t border-border flex justify-between items-center">
                    <div className="text-sm font-medium text-foreground">Total Amount</div>
                    <div className="text-lg font-bold text-emerald-600">
                      ৳{saleDetails.totalAmount?.toFixed(2)}
                    </div>
                  </div>
                  <div className="space-y-1 sm:col-span-2 pt-2 border-t border-border flex justify-between items-center">
                    <div className="text-sm font-medium text-foreground">Total Profit</div>
                    <div className="text-lg font-bold text-blue-600">
                      ৳{saleDetails.totalProfit?.toFixed(2)}
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-foreground">Items</h3>
                  <div className="rounded-md border overflow-hidden bg-card">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Product</TableHead>
                          <TableHead>Variant</TableHead>
                          <TableHead className="text-right">Quantity</TableHead>
                          <TableHead className="text-right">Unit Price</TableHead>
                          <TableHead className="text-right">Subtotal</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {saleDetails.items && saleDetails.items.length > 0 ? (
                          saleDetails.items.map((item: {
                            id: string;
                            quantity: number;
                            unitPrice: number;
                            subtotal: number;
                            inventory?: {
                              variant?: {
                                product?: { name?: string };
                                variantName?: string;
                              };
                              itemName?: string;
                            };
                          }) => (
                            <TableRow key={item.id}>
                              <TableCell className="font-medium">
                                {item.inventory?.variant?.product?.name || item.inventory?.itemName || "N/A"}
                              </TableCell>
                              <TableCell>
                                {item.inventory?.variant?.variantName || "—"}
                              </TableCell>
                              <TableCell className="text-right">{item.quantity}</TableCell>
                              <TableCell className="text-right">৳{item.unitPrice?.toFixed(2)}</TableCell>
                              <TableCell className="text-right font-medium">৳{item.subtotal?.toFixed(2)}</TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center py-4 text-muted-foreground text-sm">
                              No items in this transaction.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground text-sm" id="sale-details-description">No details available</div>
            )}
            {saleDetails && user?.role === "OWNER" && (
              <DialogFooter>
                {deletingId === saleDetails.id ? (
                  <div className="flex gap-2 w-full justify-end">
                    <Button
                      variant="destructive"
                      onClick={() => voidMutation.mutate(saleDetails.id)}
                      disabled={voidMutation.isPending}
                    >
                      {voidMutation.isPending ? "Voiding..." : "Confirm Void"}
                    </Button>
                    <Button variant="outline" onClick={() => setDeletingId(null)}>
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <Button variant="destructive" onClick={() => setDeletingId(saleDetails.id)}>
                    Refund and Undo Sale
                  </Button>
                )}
              </DialogFooter>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
