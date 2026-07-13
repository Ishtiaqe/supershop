"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { useAuth } from "@/components/auth/AuthProvider";
import { formatDateTime } from "@/lib/ui-helpers";
import { toast } from "sonner";

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
import { MobileTableCard, MobileTableCardRow } from "@/components/mobile/MobileTableCard";

interface Shift {
  id: string;
  tenantId: string;
  userId: string;
  openingBalance: number;
  closingBalance: number | null;
  expectedBalance: number | null;
  discrepancy: number | null;
  status: "OPEN" | "CLOSED";
  openedAt: string;
  closedAt: string | null;
  note: string | null;
  user?: { id: string; fullName: string };
}

const fmt = (n: number) =>
  (n ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function ShiftsPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [isOpenModal, setIsOpenModal] = useState(false);
  const [isCloseModal, setIsCloseModal] = useState(false);
  const [closingShiftId, setClosingShiftId] = useState<string | null>(null);
  const [openingBalance, setOpeningBalance] = useState<string>("");
  const [openingNote, setOpeningNote] = useState("");
  const [closingBalance, setClosingBalance] = useState<string>("");
  const [closingNote, setClosingNote] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;

  const { data: activeShift } = useQuery<Shift | null>({
    queryKey: ["shifts", "active"],
    queryFn: () => api.get("/shifts/active").then((r) => r.data),
    refetchOnWindowFocus: false,
    staleTime: 10 * 1000,
  });

  const { data: shiftsResponse, isLoading } = useQuery({
    queryKey: ["shifts", "list", currentPage],
    queryFn: () =>
      api
        .get("/shifts", { params: { limit: PAGE_SIZE, offset: (currentPage - 1) * PAGE_SIZE } })
        .then((r) => r.data),
    staleTime: 30 * 1000,
  });

  const shifts: Shift[] = shiftsResponse?.data ?? [];
  const totalCount = shiftsResponse?.total ?? 0;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const openShiftMutation = useMutation({
    mutationFn: (data: { openingBalance: number; note?: string }) =>
      api.post("/shifts/open", data).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shifts"] });
      toast.success("Shift opened successfully");
      setIsOpenModal(false);
      setOpeningBalance("");
      setOpeningNote("");
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Failed to open shift");
    },
  });

  const closeShiftMutation = useMutation({
    mutationFn: (data: { id: string; closingBalance: number; note?: string }) =>
      api.post(`/shifts/${data.id}/close`, {
        closingBalance: data.closingBalance,
        note: data.note,
      }).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shifts"] });
      toast.success("Shift closed successfully");
      setIsCloseModal(false);
      setClosingShiftId(null);
      setClosingBalance("");
      setClosingNote("");
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Failed to close shift");
    },
  });

  const handleOpenShift = () => {
    const balance = parseFloat(openingBalance) || 0;
    openShiftMutation.mutate({ openingBalance: balance, note: openingNote || undefined });
  };

  const handleCloseShift = () => {
    if (!closingShiftId) return;
    const balance = parseFloat(closingBalance) || 0;
    closeShiftMutation.mutate({
      id: closingShiftId,
      closingBalance: balance,
      note: closingNote || undefined,
    });
  };

  if (!user || (user.role !== "OWNER" && user.role !== "EMPLOYEE" && user.role !== "SUPER_ADMIN")) {
    return <div className="p-6">Access denied</div>;
  }

  return (
    <div className="space-y-4">
      {/* Active Shift Banner */}
      {activeShift && (
        <Card className="shadow-sm border-emerald-500/40 bg-emerald-500/5">
          <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Badge variant="default" className="bg-emerald-600">OPEN</Badge>
                <span className="text-sm font-medium">
                  Started {formatDateTime(activeShift.openedAt)}
                </span>
              </div>
              <div className="text-sm text-muted-foreground">
                Opening Balance: <span className="font-semibold text-foreground">৳{fmt(activeShift.openingBalance)}</span>
                {activeShift.user && <span className="ml-3">by {activeShift.user.fullName}</span>}
              </div>
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                setClosingShiftId(activeShift.id);
                setIsCloseModal(true);
              }}
            >
              Close Shift
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Header */}
      <Card className="shadow-sm border-border/60">
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 pb-4 border-b border-border/60">
          <CardTitle className="text-lg font-semibold">Shift History</CardTitle>
          {!activeShift && (
            <Button size="sm" onClick={() => setIsOpenModal(true)}>
              Open New Shift
            </Button>
          )}
        </CardHeader>
        <CardContent className="p-0">
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Opened By</TableHead>
                  <TableHead>Opened At</TableHead>
                  <TableHead>Closed At</TableHead>
                  <TableHead className="text-right">Opening</TableHead>
                  <TableHead className="text-right">Closing</TableHead>
                  <TableHead className="text-right">Expected</TableHead>
                  <TableHead className="text-right">Discrepancy</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : shifts.length > 0 ? (
                  shifts.map((shift) => (
                    <TableRow key={shift.id} className="hover:bg-muted/50">
                      <TableCell>
                        <Badge variant={shift.status === "OPEN" ? "default" : "secondary"}>
                          {shift.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{shift.user?.fullName || "—"}</TableCell>
                      <TableCell>{formatDateTime(shift.openedAt)}</TableCell>
                      <TableCell>{shift.closedAt ? formatDateTime(shift.closedAt) : "—"}</TableCell>
                      <TableCell className="text-right font-medium">৳{fmt(shift.openingBalance)}</TableCell>
                      <TableCell className="text-right font-medium">
                        {shift.closingBalance != null ? `৳${fmt(shift.closingBalance)}` : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        {shift.expectedBalance != null ? `৳${fmt(shift.expectedBalance)}` : "—"}
                      </TableCell>
                      <TableCell className={`text-right font-semibold ${
                        shift.discrepancy != null
                          ? Math.abs(shift.discrepancy) < 0.01
                            ? "text-emerald-600"
                            : "text-red-600"
                          : ""
                      }`}>
                        {shift.discrepancy != null ? `৳${fmt(shift.discrepancy)}` : "—"}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No shifts recorded yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden p-4 space-y-3">
            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto" />
              </div>
            ) : shifts.length > 0 ? (
              shifts.map((shift) => (
                <MobileTableCard key={shift.id}>
                  <div className="flex items-start justify-between gap-2">
                    <Badge variant={shift.status === "OPEN" ? "default" : "secondary"}>
                      {shift.status}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{formatDateTime(shift.openedAt)}</span>
                  </div>
                  <MobileTableCardRow label="Opened By" value={shift.user?.fullName || "—"} />
                  <MobileTableCardRow label="Opening" value={`৳${fmt(shift.openingBalance)}`} />
                  {shift.closingBalance != null && (
                    <>
                      <MobileTableCardRow label="Closing" value={`৳${fmt(shift.closingBalance)}`} />
                      <MobileTableCardRow label="Expected" value={`৳${fmt(shift.expectedBalance || 0)}`} />
                      <MobileTableCardRow
                        label="Discrepancy"
                        value={`৳${fmt(shift.discrepancy || 0)}`}
                        className={
                          Math.abs(shift.discrepancy || 0) < 0.01
                            ? "text-emerald-600 font-semibold"
                            : "text-red-600 font-semibold"
                        }
                      />
                    </>
                  )}
                  {shift.status === "OPEN" && (
                    <div className="pt-2 border-t border-border mt-2">
                      <Button
                        size="sm"
                        variant="destructive"
                        className="w-full"
                        onClick={() => {
                          setClosingShiftId(shift.id);
                          setIsCloseModal(true);
                        }}
                      >
                        Close Shift
                      </Button>
                    </div>
                  )}
                </MobileTableCard>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">No shifts recorded yet.</div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
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

      {/* Open Shift Modal */}
      <Dialog open={isOpenModal} onOpenChange={setIsOpenModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Open New Shift</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Opening Cash Balance</label>
              <Input
                type="number"
                inputMode="decimal"
                step="0.01"
                placeholder="Enter cash in drawer..."
                value={openingBalance}
                onChange={(e) => setOpeningBalance(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Note (optional)</label>
              <Input
                placeholder="Any notes for this shift..."
                value={openingNote}
                onChange={(e) => setOpeningNote(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpenModal(false)}>Cancel</Button>
            <Button
              onClick={handleOpenShift}
              disabled={openShiftMutation.isPending}
            >
              {openShiftMutation.isPending ? "Opening..." : "Open Shift"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Close Shift Modal */}
      <Dialog open={isCloseModal} onOpenChange={setIsCloseModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Close Shift</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Counted Cash Balance</label>
              <Input
                type="number"
                inputMode="decimal"
                step="0.01"
                placeholder="Enter actual cash counted..."
                value={closingBalance}
                onChange={(e) => setClosingBalance(e.target.value)}
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                The system will calculate expected balance and discrepancy automatically.
              </p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Note (optional)</label>
              <Input
                placeholder="Any notes for closing..."
                value={closingNote}
                onChange={(e) => setClosingNote(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCloseModal(false)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={handleCloseShift}
              disabled={closeShiftMutation.isPending}
            >
              {closeShiftMutation.isPending ? "Closing..." : "Close Shift"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
