import { useEffect } from "react";
import { 
  Modal, 
  Form, 
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

interface ExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  expenseId: string | null;
  id?: string;
}

export function ExpenseModal({ isOpen, onClose, expenseId, id }: ExpenseModalProps) {
  const [form] = Form.useForm();
  const isEditing = !!expenseId;
  const { data: categories } = useCategories();
  
  const { data: expensesData } = useExpenses({ page: 1, limit: 100 });
  const expenseToEdit = expensesData?.data?.find((e: any) => e.id === expenseId);

  const { mutate: createExpense, isPending: isCreating } = useCreateExpense();
  const { mutate: updateExpense, isPending: isUpdating } = useUpdateExpense();
  const { mutate: deleteExpense, isPending: isDeleting } = useDeleteExpense();

  useEffect(() => {
    if (isOpen) {
      if (isEditing && expenseToEdit) {
        form.setFieldsValue({
          amount: expenseToEdit.amount,
          categoryId: expenseToEdit.categoryId,
          expenseDate: dayjs(expenseToEdit.expenseDate),
          description: expenseToEdit.description || "",
        });
      } else {
        form.resetFields();
        form.setFieldsValue({
          expenseDate: dayjs(),
        });
      }
    }
  }, [isOpen, isEditing, expenseToEdit, form]);

  const onFinish = (values: any) => {
    const payload = {
      ...values,
      expenseDate: values.expenseDate.format("YYYY-MM-DD"),
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
              onClick={() => form.submit()} 
              loading={isSaving}
              disabled={isSaving}
            >
              {isEditing ? "Save Changes" : "Add Expense"}
            </Button>
          </div>
        </div>
      ]}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        initialValues={{
          amount: 0,
          expenseDate: dayjs(),
        }}
        className="pt-4"
      >
        <Form.Item
          name="amount"
          label="Amount (৳)"
          rules={[{ required: true, message: "Amount must be greater than 0" }]}
        >
          <InputNumber 
            className="w-full" 
            min={0.01} 
            step={0.01} 
            placeholder="0.00"
          />
        </Form.Item>

        <Form.Item
          name="categoryId"
          label="Category"
          rules={[{ required: true, message: "Please select a category" }]}
        >
          <Select placeholder="Select an expense category">
            {categories?.map((cat) => (
              <Select.Option key={cat.id} value={cat.id}>
                {cat.name}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item
          name="expenseDate"
          label="Date"
          rules={[{ required: true, message: "Date is required" }]}
        >
          <DatePicker className="w-full" format="DD/MM/YYYY" />
        </Form.Item>

        <Form.Item
          name="description"
          label="Description (Optional)"
        >
          <Input.TextArea 
            placeholder="Notes or details about this expense..." 
            autoSize={{ minRows: 3, maxRows: 6 }}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}

