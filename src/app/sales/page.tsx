"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import type { Sale } from "@/types";
import { useAuth } from "@/components/auth/AuthProvider";
import { toast } from "sonner";

// Import shadcn UI components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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

function fetchSales() {
  return api.get("/sales").then((rowData) => rowData.data);
}

function fetchSaleDetails(saleId: string) {
  return api.get(`/sales/${saleId}`).then((res) => res.data);
}

export default function SalesPage() {
  const queryClient = useQueryClient();
  const { data: sales = [], isLoading } = useQuery({
    queryKey: ["sales"],
    queryFn: fetchSales,
    staleTime: 30 * 1000,
  });
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
    mutationFn: (saleId: string) => api.delete(`/sales/${saleId}`),
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

  const { filteredSales, totalPages } = useMemo(() => {
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

      if (startDateStr && endDateStr) {
        const saleDate = new Date(sale.saleTime);
        const start = new Date(startDateStr + "T00:00:00");
        const end = new Date(endDateStr + "T23:59:59");
        if (saleDate < start || saleDate > end) {
          continue;
        }
      }

      if (paymentFilter && sale.paymentMethod !== paymentFilter) {
        continue;
      }

      rows.push(sale);
    }

    const total = rows.length;
    const pages = Math.ceil(total / PAGE_SIZE);
    const start = (currentPage - 1) * PAGE_SIZE;
    const paginated = rows.slice(start, start + PAGE_SIZE);

    return {
      filteredSales: paginated,
      totalPages: pages,
    };
  }, [sales, normalizedSearch, startDateStr, endDateStr, paymentFilter, currentPage]);

  if (!user || (user.role !== "OWNER" && user.role !== "EMPLOYEE")) {
    return <div className="p-6">Access denied — Owners and employees only</div>;
  }

  return (
    <div className="w-full space-y-6">

      <div className="space-y-6 max-w-full md:max-w-7xl mx-auto w-full">
        <div className="flex flex-wrap gap-3 items-center justify-between">
          <div className="flex-1 min-w-[200px]">
            <Input
              placeholder="Search by receipt or customer..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="w-full"
            />
          </div>
          <div className="flex items-center gap-2 min-w-[280px]">
            <Input
              type="date"
              value={startDateStr}
              onChange={(e) => setStartDateStr(e.target.value)}
              className="w-full"
            />
            <span className="text-muted-foreground text-sm">to</span>
            <Input
              type="date"
              value={endDateStr}
              onChange={(e) => setEndDateStr(e.target.value)}
              className="w-full"
            />
          </div>
          <div className="min-w-[180px]">
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              value={paymentFilter || ""}
              onChange={(e) => setPaymentFilter(e.target.value || undefined)}
            >
              <option value="">All Payment Methods</option>
              <option value="CASH">Cash</option>
              <option value="CARD">Card</option>
              <option value="MOBILE_PAYMENT">Mobile Payment</option>
              <option value="OTHER">Other</option>
              <option value="CREDIT">Credit (Due)</option>
            </select>
          </div>
        </div>

        <div className="rounded-md border overflow-hidden bg-card">
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
                filteredSales.map((record) => (
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
                      {new Date(record.saleTime).toLocaleString()}
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
          <DialogContent className="max-w-6xl max-h-[100vh] overflow-y-auto" aria-describedby="sale-details-description">
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
                      {new Date(saleDetails.saleTime).toLocaleString()}
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
                    Void Sale
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
