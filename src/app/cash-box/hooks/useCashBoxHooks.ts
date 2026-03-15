"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";

export interface CashBoxSummary {
  cashIn: number;
  cashOut: number;
  currentBalance: number;
}

export interface CashBoxEntry {
  id: string;
  entryType: "SALE_IN" | "EXPENSE_OUT" | "MANUAL_IN" | "MANUAL_OUT";
  amount: number;
  note?: string;
  referenceId?: string;
  entryDate: string;
  createdById: string;
  createdBy?: { id: string; fullName: string };
  createdAt: string;
}

export interface CashBoxEntriesResponse {
  data: CashBoxEntry[];
  total: number;
  page: number;
  limit: number;
}

export interface CreateCashBoxEntryInput {
  entryType: "MANUAL_IN" | "MANUAL_OUT";
  amount: number;
  note?: string;
  entryDate?: string;
}

// Hooks
export function useCashBoxSummary(startDate?: string, endDate?: string) {
  return useQuery<CashBoxSummary>({
    queryKey: ["cash-box-summary", startDate, endDate],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      const res = await api.get("/cash-box/summary", { params });
      return res.data;
    },
  });
}

export function useCashBoxEntries(params: {
  startDate?: string;
  endDate?: string;
  entryType?: string;
  page?: number;
  limit?: number;
}) {
  return useQuery<CashBoxEntriesResponse>({
    queryKey: ["cash-box-entries", params],
    queryFn: async () => {
      const res = await api.get("/cash-box/entries", { params });
      return res.data;
    },
  });
}

export function useCreateCashBoxEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateCashBoxEntryInput) =>
      api.post("/cash-box/entries", data).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cash-box-summary"] });
      queryClient.invalidateQueries({ queryKey: ["cash-box-entries"] });
    },
  });
}

export function useDeleteCashBoxEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.delete(`/cash-box/entries/${id}`).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cash-box-summary"] });
      queryClient.invalidateQueries({ queryKey: ["cash-box-entries"] });
    },
  });
}
