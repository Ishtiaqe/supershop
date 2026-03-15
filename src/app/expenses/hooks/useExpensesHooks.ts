import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

// --- Types ---
export interface ExpenseCategory {
  id: string;
  name: string;
  description?: string;
  tenantId: string;
}

export interface Expense {
  id: string;
  tenantId: string;
  employeeId: string;
  categoryId: string;
  amount: number;
  description?: string;
  expenseDate: string;
  category: ExpenseCategory;
  employee: {
    id: string;
    fullName: string;
    email: string;
  };
}

export interface ExpenseSummary {
  totalAmount: number;
  totalCount: number;
  categorySummary: { name: string; amount: number; count: number }[];
}

export interface ExpenseFilters {
  startDate?: string;
  endDate?: string;
  categoryId?: string;
  page?: number;
  limit?: number;
}

// --- Category Hooks ---

export const useCategories = () => {
  return useQuery({
    queryKey: ['expense-categories'],
    queryFn: async () => {
      const { data } = await api.get<ExpenseCategory[]>('/expenses/categories');
      return data;
    },
  });
};

export const useCreateCategory = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { name: string; description?: string }) => {
      const { data } = await api.post<ExpenseCategory>('/expenses/categories', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense-categories'] });
    },
  });
};

export const useUpdateCategory = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: { id: string; name: string; description?: string }) => {
      const { data } = await api.patch<ExpenseCategory>(`/expenses/categories/${id}`, payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense-categories'] });
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
    },
  });
};

export const useDeleteCategory = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.delete(`/expenses/categories/${id}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense-categories'] });
    },
  });
};

// --- Expense Hooks ---

export const useExpenses = (filters: ExpenseFilters) => {
  return useQuery({
    queryKey: ['expenses', filters],
    queryFn: async () => {
      const { data } = await api.get<{ data: Expense[]; meta: any }>('/expenses', { params: filters });
      return data;
    },
  });
};

export const useExpenseSummary = (filters: Pick<ExpenseFilters, 'startDate' | 'endDate'>) => {
  return useQuery({
    queryKey: ['expenses-summary', filters],
    queryFn: async () => {
      const { data } = await api.get<ExpenseSummary>('/expenses/summary', { params: filters });
      return data;
    },
  });
};

export const useCreateExpense = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { categoryId: string; amount: number; expenseDate: string; description?: string }) => {
      const { data } = await api.post<Expense>('/expenses', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['expenses-summary'] });
    },
  });
};

export const useUpdateExpense = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: { id: string; categoryId?: string; amount?: number; expenseDate?: string; description?: string }) => {
      const { data } = await api.patch<Expense>(`/expenses/${id}`, payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['expenses-summary'] });
    },
  });
};

export const useDeleteExpense = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.delete(`/expenses/${id}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['expenses-summary'] });
    },
  });
};
