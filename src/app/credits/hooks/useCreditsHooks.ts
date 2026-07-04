import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { toast } from 'sonner';

export interface CreditCustomer {
  customerName: string;
  customerPhone: string;
  totalDue: number;
  salesCount: number;
  oldestDueDate: string;
  lastPaymentDate: string | null;
}

export interface CreditPayment {
  id: string;
  amount: number;
  paymentMethod: string;
  paymentDate: string;
  note: string | null;
}

export interface CreditSale {
  id: string;
  receiptNumber: string;
  saleTime: string;
  totalAmount: number;
  amountPaid: number;
  dueAmount: number;
  customerName: string;
  customerPhone: string;
  creditPayments: CreditPayment[];
}

export interface CreditSummary {
  totalOutstanding: number;
  customersWithDues: number;
}

export function useCreditSummary() {
  return useQuery<CreditSummary>({
    queryKey: ['credit-summary'],
    queryFn: async () => {
      const res = await api.get('/credits/summary');
      return res.data?.data ?? res.data;
    },
  });
}

export function useCreditCustomers() {
  return useQuery<CreditCustomer[]>({
    queryKey: ['credit-customers'],
    queryFn: async () => {
      const res = await api.get('/credits');
      return res.data?.data ?? res.data ?? [];
    },
  });
}

export function useCreditsByPhone(phone: string | null) {
  return useQuery<CreditSale[]>({
    queryKey: ['credits-by-phone', phone],
    queryFn: async () => {
      const res = await api.get(`/credits/${phone}`);
      const payload = res.data?.data ?? res.data;
      return payload?.sales ?? payload ?? [];
    },
    enabled: !!phone,
  });
}

export function useRecordPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ saleId, amount, note, paymentMethod }: { saleId: string; amount: number; note?: string; paymentMethod?: string }) =>
      api.post(`/credits/${saleId}/payments`, { amount, note, paymentMethod }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['credit-customers'] });
      qc.invalidateQueries({ queryKey: ['credits-by-phone'] });
      qc.invalidateQueries({ queryKey: ['credit-summary'] });
      qc.invalidateQueries({ queryKey: ['cash-register'] });
      toast.success('Payment recorded successfully');
    },
    onError: (err: unknown) => {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      toast.error(axiosErr?.response?.data?.message ?? 'Failed to record payment');
    },
  });
}
