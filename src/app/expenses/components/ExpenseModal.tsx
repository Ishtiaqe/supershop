import { useEffect, useState } from "react";
import dayjs from "dayjs";
import {
  useCategories,
  useCreateExpense,
  useUpdateExpense,
  useExpenses,
  useDeleteExpense,
} from "../hooks/useExpensesHooks";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const expenseSchema = z.object({
  amount: z.coerce.number().min(0.01, "Amount must be at least 0.01"),
  categoryId: z.string().min(1, "Please select a category"),
  expenseDate: z.string().min(1, "Date is required"),
  description: z.string().optional(),
});

type ExpenseFormData = z.infer<typeof expenseSchema>;

interface ExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  expenseId: string | null;
}

export function ExpenseModal({ isOpen, onClose, expenseId }: ExpenseModalProps) {
  const isEditing = !!expenseId;
  const { data: categories } = useCategories();
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  const { data: expensesData } = useExpenses({ page: 1, limit: 100 });
  const expenseToEdit = expensesData?.data?.find((e: { id: string }) => e.id === expenseId);

  const { mutate: createExpense, isPending: isCreating } = useCreateExpense();
  const { mutate: updateExpense, isPending: isUpdating } = useUpdateExpense();
  const { mutate: deleteExpense, isPending: isDeleting } = useDeleteExpense();

  const form = useForm<ExpenseFormData>({
    resolver: zodResolver(expenseSchema) as Resolver<ExpenseFormData>,
    defaultValues: {
      amount: 0,
      categoryId: "",
      expenseDate: dayjs().format("YYYY-MM-DD"),
      description: "",
    },
  });

  useEffect(() => {
    if (isOpen) {
      setShowConfirmDelete(false);
      if (isEditing && expenseToEdit) {
        form.reset({
          amount: expenseToEdit.amount,
          categoryId: expenseToEdit.categoryId,
          expenseDate: dayjs(expenseToEdit.expenseDate).format("YYYY-MM-DD"),
          description: expenseToEdit.description || "",
        });
      } else {
        form.reset({
          amount: 0,
          categoryId: "",
          expenseDate: dayjs().format("YYYY-MM-DD"),
          description: "",
        });
      }
    }
  }, [isOpen, isEditing, expenseToEdit, form]);

  const onFinish = (values: ExpenseFormData) => {
    if (isEditing) {
      updateExpense(
        { id: expenseId as string, ...values },
        {
          onSuccess: () => {
            toast.success("Expense updated successfully");
            onClose();
          },
        }
      );
    } else {
      createExpense(values, {
        onSuccess: () => {
          toast.success("Expense added successfully");
          onClose();
        },
      });
    }
  };

  const handleDelete = () => {
    deleteExpense(expenseId as string, {
      onSuccess: () => {
        toast.success("Expense deleted successfully");
        onClose();
      },
    });
  };

  const isSaving = isCreating || isUpdating;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Expense" : "Add Expense"}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onFinish)} className="space-y-4">
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount (৳)</FormLabel>
                  <FormControl>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      placeholder="0.00"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="categoryId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <FormControl>
                    <select
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      {...field}
                    >
                      <option value="">Select an expense category</option>
                      {categories?.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="expenseDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date</FormLabel>
                  <FormControl>
                    <input
                      type="date"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <textarea
                      placeholder="Notes or details about this expense..."
                      className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="pt-4 border-t border-border flex flex-row items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                {isEditing && (
                  <>
                    {showConfirmDelete ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Sure?</span>
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={handleDelete}
                          disabled={isDeleting || isSaving}
                        >
                          Confirm
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setShowConfirmDelete(false)}
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => setShowConfirmDelete(true)}
                        disabled={isSaving || isDeleting}
                      >
                        Delete
                      </Button>
                    )}
                  </>
                )}
              </div>
              <div className="flex items-center gap-2 ml-auto">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onClose}
                  disabled={isSaving || isDeleting}
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={isSaving || isDeleting}>
                  {isEditing ? "Save Changes" : "Add Expense"}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

