import { useEffect } from "react";
import { 
  Modal, 
  Input, 
  Button, 
  Select, 
  DatePicker, 
  Popconfirm, 
  message,
  InputNumber
} from "antd";
import dayjs from "dayjs";
import { 
  useCategories, 
  useCreateExpense, 
  useUpdateExpense, 
  useExpenses,
  useDeleteExpense 
} from "../hooks/useExpensesHooks";
import { useForm } from "react-hook-form";
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

const expenseSchema = z.object({
  amount: z.coerce.number().min(0.01, "Amount must be at least 0.01"),
  categoryId: z.string({
    required_error: "Please select a category",
  }),
  expenseDate: z.any().refine((val) => val && dayjs(val).isValid(), "Date is required"),
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
  
  const { data: expensesData } = useExpenses({ page: 1, limit: 100 });
  const expenseToEdit = expensesData?.data?.find((e: { id: string }) => e.id === expenseId);

  const { mutate: createExpense, isPending: isCreating } = useCreateExpense();
  const { mutate: updateExpense, isPending: isUpdating } = useUpdateExpense();
  const { mutate: deleteExpense, isPending: isDeleting } = useDeleteExpense();

  const form = useForm<ExpenseFormData>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      amount: undefined,
      categoryId: undefined,
      expenseDate: dayjs(),
      description: "",
    },
  });

  useEffect(() => {
    if (isOpen) {
      if (isEditing && expenseToEdit) {
        form.reset({
          amount: expenseToEdit.amount,
          categoryId: expenseToEdit.categoryId,
          expenseDate: dayjs(expenseToEdit.expenseDate),
          description: expenseToEdit.description || "",
        });
      } else {
        form.reset({
          amount: undefined,
          categoryId: undefined,
          expenseDate: dayjs(),
          description: "",
        });
      }
    }
  }, [isOpen, isEditing, expenseToEdit, form]);

  const onFinish = (values: ExpenseFormData) => {
    const payload = {
      ...values,
      expenseDate: dayjs(values.expenseDate).format("YYYY-MM-DD"),
    };

    if (isEditing) {
      updateExpense(
        { id: expenseId as string, ...payload },
        { 
          onSuccess: () => {
            message.success("Expense updated successfully");
            onClose();
          } 
        }
      );
    } else {
      createExpense(payload, { 
        onSuccess: () => {
          message.success("Expense added successfully");
          onClose();
        } 
      });
    }
  };

  const handleDelete = () => {
    deleteExpense(expenseId as string, { 
      onSuccess: () => {
        message.success("Expense deleted successfully");
        onClose();
      } 
    });
  };

  const isSaving = isCreating || isUpdating;

  return (
    <Modal
      title={isEditing ? "Edit Expense" : "Add Expense"}
      open={isOpen}
      onCancel={onClose}
      footer={[
        <div key="footer-row" className="flex justify-between items-center w-full">
          {isEditing ? (
            <Popconfirm
              title="Delete expense"
              description="Are you sure you want to delete this expense?"
              onConfirm={handleDelete}
              okText="Yes"
              cancelText="No"
              disabled={isDeleting || isSaving}
            >
              <Button 
                danger 
                disabled={isDeleting || isSaving}
                loading={isDeleting}
              >
                Delete
              </Button>
            </Popconfirm>
          ) : <div /> }
          <div className="flex gap-2">
            <Button onClick={onClose} disabled={isSaving}>
              Cancel
            </Button>
            <Button 
              type="primary" 
              onClick={form.handleSubmit(onFinish)} 
              loading={isSaving}
              disabled={isSaving}
            >
              {isEditing ? "Save Changes" : "Add Expense"}
            </Button>
          </div>
        </div>
      ]}
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onFinish)} className="space-y-4 pt-4">
          <FormField
            control={form.control}
            name="amount"
            render={({ field, fieldState: { error } }) => (
              <FormItem>
                <FormLabel>Amount (৳)</FormLabel>
                <FormControl>
                  <InputNumber 
                    value={field.value}
                    className="w-full" 
                    min={0.01} 
                    step={0.01} 
                    placeholder="0.00"
                    status={error ? "error" : undefined}
                    onChange={(val) => field.onChange(val)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="categoryId"
            render={({ field, fieldState: { error } }) => (
              <FormItem>
                <FormLabel>Category</FormLabel>
                <FormControl>
                  <Select 
                    value={field.value}
                    placeholder="Select an expense category"
                    status={error ? "error" : undefined}
                    onChange={(val) => field.onChange(val)}
                    options={categories?.map((cat) => ({
                      value: cat.id,
                      label: cat.name,
                    })) || []}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="expenseDate"
            render={({ field, fieldState: { error } }) => (
              <FormItem>
                <FormLabel>Date</FormLabel>
                <FormControl>
                  <DatePicker 
                    value={field.value}
                    className="w-full" 
                    format="DD/MM/YYYY"
                    status={error ? "error" : undefined}
                    onChange={(val) => field.onChange(val)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="description"
            render={({ field, fieldState: { error } }) => (
              <FormItem>
                <FormLabel>Description (Optional)</FormLabel>
                <FormControl>
                  <Input.TextArea 
                    value={field.value}
                    placeholder="Notes or details about this expense..." 
                    autoSize={{ minRows: 3, maxRows: 6 }}
                    status={error ? "error" : undefined}
                    onChange={(e) => field.onChange(e.target.value)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </form>
      </Form>
    </Modal>
  );
}

