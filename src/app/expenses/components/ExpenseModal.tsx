import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { 
  useCategories, 
  useCreateExpense, 
  useUpdateExpense, 
  useExpenses,
  useDeleteExpense 
} from "../hooks/useExpensesHooks";

const expenseSchema = z.object({
  amount: z.union([z.string(), z.number()]).transform((val) => Number(val)).refine((val) => val > 0, { message: "Amount must be greater than 0" }),
  categoryId: z.string().min(1, "Please select a category"),
  expenseDate: z.string().min(1, "Date is required"),
  description: z.string().optional(),
});

type ExpenseFormValues = z.input<typeof expenseSchema>;

interface ExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  expenseId: string | null;
}

export function ExpenseModal({ isOpen, onClose, expenseId }: ExpenseModalProps) {
  const isEditing = !!expenseId;
  const { data: categories } = useCategories();
  
  // To fetch a single expense to edit we reuse the hook with a large limit,
  // alternatively we could create a `useExpense(id)` hook.
  const { data: expensesData } = useExpenses({ page: 1, limit: 100 });
  const expenseToEdit = expensesData?.data?.find(e => e.id === expenseId);

  const { mutate: createExpense, isPending: isCreating } = useCreateExpense();
  const { mutate: updateExpense, isPending: isUpdating } = useUpdateExpense();
  const { mutate: deleteExpense, isPending: isDeleting } = useDeleteExpense();

  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      amount: 0,
      categoryId: "",
      expenseDate: format(new Date(), "yyyy-MM-dd"),
      description: "",
    },
  });

  useEffect(() => {
    if (isOpen) {
      if (isEditing && expenseToEdit) {
        form.reset({
          amount: expenseToEdit.amount,
          categoryId: expenseToEdit.categoryId,
          expenseDate: format(new Date(expenseToEdit.expenseDate), "yyyy-MM-dd"),
          description: expenseToEdit.description || "",
        });
      } else {
        form.reset({
          amount: 0,
          categoryId: "",
          expenseDate: format(new Date(), "yyyy-MM-dd"),
          description: "",
        });
      }
    }
  }, [isOpen, isEditing, expenseToEdit, form]);

  const onSubmit = (values: ExpenseFormValues) => {
    // Schema transforms it to number, we can cast it safely for our API hook
    const parsedValues = {
      ...values,
      amount: Number(values.amount)
    };

    if (isEditing) {
      updateExpense(
        { id: expenseId as string, ...parsedValues },
        { onSuccess: onClose }
      );
    } else {
      createExpense(parsedValues as Parameters<typeof createExpense>[0], { onSuccess: onClose });
    }
  };

  const handleDelete = () => {
    if (confirm("Are you sure you want to delete this expense?")) {
      deleteExpense(expenseId as string, { onSuccess: onClose });
    }
  };

  const isSaving = isCreating || isUpdating;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Expense" : "Add Expense"}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount (৳)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" {...field} />
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
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select an expense category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {categories?.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                    <Input type="date" {...field} />
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
                    <Textarea 
                      placeholder="Notes or details about this expense..." 
                      className="resize-none"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-between items-center pt-4">
              {isEditing ? (
                <Button 
                  type="button" 
                  variant="destructive" 
                  onClick={handleDelete}
                  disabled={isDeleting || isSaving}
                >
                  Delete
                </Button>
              ) : <div></div>}
              
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={onClose} disabled={isSaving}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? "Saving..." : isEditing ? "Save Changes" : "Add Expense"}
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
