import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";

export interface CashRegisterSummary {
  cashIn: number;
  cashOut: number;
  currentBalance: number;
}

export interface CashRegisterEntry {
  id: string;
  entryType: "SALE_IN" | "EXPENSE_OUT" | "MANUAL_IN" | "MANUAL_OUT" | "INVENTORY_OUT" | "NEW_INVESTMENT_IN" | "LOAN_IN" | "CREDIT_PAYMENT_IN";
  amount: number;
  note: string | null;
  referenceId: string | null;
  referenceType: string | null;
  entryDate: string;
  createdBy?: { id: string; fullName: string };
  createdAt: string;
}

export interface CashRegisterEntriesResponse {
  data: CashRegisterEntry[];
  total: number;
  page: number;
  limit: number;
}

export interface CreateCashRegisterEntryInput {
  entryType: "MANUAL_IN" | "MANUAL_OUT";
  amount: number;
  note?: string;
  entryDate?: string;
}

// Hooks
export function useCashRegisterSummary(startDate?: string, endDate?: string) {
  return useQuery<CashRegisterSummary>({
    queryKey: ["cash-register-summary", startDate, endDate],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      const res = await api.get("/cash-register/summary", { params });
      return res.data;
    },
  });
}

export function useCashRegisterEntries(params: {
  startDate?: string;
  endDate?: string;
  entryType?: string;
  page?: number;
  limit?: number;
}) {
  return useQuery<CashRegisterEntriesResponse>({
    queryKey: ["cash-register-entries", params],
    queryFn: async () => {
      const res = await api.get("/cash-register/entries", { params });
      return res.data;
    },
  });
}

export function useCreateCashRegisterEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateCashRegisterEntryInput) =>
      api.post("/cash-register/entries", data).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cash-register-summary"] });
      queryClient.invalidateQueries({ queryKey: ["cash-register-entries"] });
    },
  });
}

export function useDeleteCashRegisterEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.delete(`/cash-register/entries/${id}`).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cash-register-summary"] });
      queryClient.invalidateQueries({ queryKey: ["cash-register-entries"] });
    },
  });
}
