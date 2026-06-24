'use client';

import { useEffect } from 'react';
import { useForm, Controller, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import dayjs from 'dayjs';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Input,
  Select,
  SelectItem,
  Button,
  Popover,
  PopoverTrigger,
  PopoverContent,
} from '@heroui/react';
import { toast } from 'sonner';
import {
  useCategories,
  useCreateExpense,
  useUpdateExpense,
  useExpenses,
  useDeleteExpense,
} from '../hooks/useExpensesHooks';

// Zod validation schema
const expenseSchema = z.object({
  amount: z
    .number({ message: 'Amount must be a number' })
    .positive('Amount must be greater than 0'),
  categoryId: z.string().min(1, 'Please select a category'),
  expenseDate: z.string().min(1, 'Date is required'),
  description: z.string().default(''),
});

type ExpenseFormData = z.infer<typeof expenseSchema>;

interface ExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  expenseId: string | null;
  id?: string;
}

export function ExpenseModal({
  isOpen,
  onClose,
  expenseId,
  id,
}: ExpenseModalProps) {
  const isEditing = !!expenseId;
  const { data: categories } = useCategories();

  const { data: expensesData } = useExpenses({ page: 1, limit: 100 });
  const expenseToEdit = expensesData?.data?.find((e: any) => e.id === expenseId);

  const { mutate: createExpense, isPending: isCreating } = useCreateExpense();
  const { mutate: updateExpense, isPending: isUpdating } = useUpdateExpense();
  const { mutate: deleteExpense, isPending: isDeleting } = useDeleteExpense();

  const isSaving = isCreating || isUpdating;

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<Omit<ExpenseFormData, 'description'> & { description: string }>({
    resolver: zodResolver(expenseSchema) as any,
    defaultValues: {
      amount: 0,
      categoryId: '',
      expenseDate: dayjs().format('YYYY-MM-DD'),
      description: '',
    },
  });

  useEffect(() => {
    if (isOpen) {
      if (isEditing && expenseToEdit) {
        reset({
          amount: expenseToEdit.amount,
          categoryId: expenseToEdit.categoryId,
          expenseDate: dayjs(expenseToEdit.expenseDate).format('YYYY-MM-DD'),
          description: expenseToEdit.description || '',
        });
      } else {
        reset({
          amount: 0,
          categoryId: '',
          expenseDate: dayjs().format('YYYY-MM-DD'),
          description: '',
        });
      }
    }
  }, [isOpen, isEditing, expenseToEdit, reset]);

  const onSubmit: SubmitHandler<ExpenseFormData> = (values) => {
    const payload = {
      ...values,
      expenseDate: values.expenseDate,
    };

    if (isEditing) {
      updateExpense(
        { id: expenseId as string, ...payload },
        {
          onSuccess: () => {
            toast.success('Expense updated successfully');
            onClose();
            reset();
          },
          onError: (error: any) => {
            toast.error(
              error?.response?.data?.message || 'Failed to update expense'
            );
          },
        }
      );
    } else {
      createExpense(payload, {
        onSuccess: () => {
          toast.success('Expense added successfully');
          onClose();
          reset();
        },
        onError: (error: any) => {
          toast.error(
            error?.response?.data?.message || 'Failed to add expense'
          );
        },
      });
    }
  };

  const handleDelete = () => {
    deleteExpense(expenseId as string, {
      onSuccess: () => {
        toast.success('Expense deleted successfully');
        onClose();
        reset();
      },
      onError: (error: any) => {
        toast.error(
          error?.response?.data?.message || 'Failed to delete expense'
        );
      },
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="md"
      backdrop="blur"
      className="dark:bg-slate-900"
    >
      <ModalContent>
        {(onClose) => (
          <>
            <ModalHeader className="flex flex-col gap-1">
              {isEditing ? 'Edit Expense' : 'Add Expense'}
            </ModalHeader>

            <ModalBody className="gap-4">
              <form
                onSubmit={handleSubmit(onSubmit)}
                className="space-y-4"
                id="expense-form"
              >
                {/* Amount Field */}
                <Controller
                  name="amount"
                  control={control}
                  render={({ field }) => (
                    <Input
                      type="number"
                      label="Amount (৳)"
                      placeholder="0.00"
                      step={0.01}
                      min={0.01}
                      value={String(field.value)}
                      onChange={(e) =>
                        field.onChange(parseFloat(e.target.value) || 0)
                      }
                      isInvalid={!!errors.amount}
                      errorMessage={errors.amount?.message}
                      classNames={{
                        label: 'text-sm font-medium',
                      }}
                    />
                  )}
                />

                {/* Category Field */}
                <Controller
                  name="categoryId"
                  control={control}
                  render={({ field }) => (
                    <Select
                      {...field}
                      label="Category"
                      placeholder="Select an expense category"
                      isInvalid={!!errors.categoryId}
                      errorMessage={errors.categoryId?.message}
                      classNames={{
                        label: 'text-sm font-medium',
                      }}
                    >
                      {(categories ?? []).map((cat: any) => (
                        <SelectItem key={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </Select>
                  )}
                />

                {/* Date Field */}
                <Controller
                  name="expenseDate"
                  control={control}
                  render={({ field }) => (
                    <Input
                      {...field}
                      type="date"
                      label="Date"
                      isInvalid={!!errors.expenseDate}
                      errorMessage={errors.expenseDate?.message}
                      classNames={{
                        label: 'text-sm font-medium',
                      }}
                    />
                  )}
                />

                {/* Description Field */}
                <Controller
                  name="description"
                  control={control}
                  render={({ field }) => (
                    <Input
                      {...field}
                      type="text"
                      label="Description (Optional)"
                      placeholder="Notes or details about this expense..."
                      isInvalid={!!errors.description}
                      errorMessage={errors.description?.message}
                      classNames={{
                        label: 'text-sm font-medium',
                      }}
                    />
                  )}
                />
              </form>
            </ModalBody>

            <ModalFooter className="flex justify-between">
              {/* Delete button (left side, only when editing) */}
              {isEditing && (
                <Popover placement="top" backdrop="blur">
                  <PopoverTrigger>
                    <Button
                      color="danger"
                      variant="flat"
                      disabled={isDeleting || isSaving}
                      isLoading={isDeleting}
                    >
                      Delete
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 dark:bg-slate-800">
                    <div className="space-y-3 py-2">
                      <h3 className="font-semibold text-sm">Delete Expense</h3>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        Are you sure you want to delete this expense? This
                        action cannot be undone.
                      </p>
                      <div className="flex gap-2 justify-end pt-2">
                        <Button
                          size="sm"
                          variant="light"
                          onPress={() => {
                            // Close popover by clicking outside
                          }}
                        >
                          No
                        </Button>
                        <Button
                          size="sm"
                          color="danger"
                          onPress={handleDelete}
                          isLoading={isDeleting}
                          disabled={isDeleting}
                        >
                          Yes, Delete
                        </Button>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              )}

              {/* Right side buttons */}
              <div className="flex gap-2 ml-auto">
                <Button
                  variant="light"
                  onPress={onClose}
                  disabled={isSaving || isDeleting}
                >
                  Cancel
                </Button>
                <Button
                  color="primary"
                  type="submit"
                  form="expense-form"
                  isLoading={isSaving}
                  disabled={isSaving || isDeleting}
                >
                  {isEditing ? 'Save Changes' : 'Add Expense'}
                </Button>
              </div>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
