import { 
  Modal, 
  Form, 
  Input, 
  InputNumber, 
  Select, 
  DatePicker, 
  message 
} from "antd";
import dayjs from "dayjs";
import { useCreateCashBoxEntry } from "../hooks/useCashBoxHooks";

interface AddEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  id?: string;
}

export function AddEntryModal({ isOpen, onClose, id }: AddEntryModalProps) {
  const [form] = Form.useForm();
  const { mutate: createEntry, isPending } = useCreateCashBoxEntry();

  const handleSubmit = (values: any) => {
    createEntry(
      {
        entryType: values.entryType,
        amount: Number(values.amount),
        note: values.note,
        entryDate: values.entryDate.format("YYYY-MM-DD"),
      },
      {
        onSuccess: () => {
          message.success("Entry added successfully");
          form.resetFields();
          onClose();
        },
        onError: (err: any) => {
          message.error(err?.response?.data?.message || "Failed to add entry");
        }
      }
    );
  };

  return (
    <Modal
      title="Add Cash Box Entry"
      open={isOpen}
      onCancel={() => {
        form.resetFields();
        onClose();
      }}
      onOk={() => form.submit()}
      confirmLoading={isPending}
      okText="Save Entry"
      destroyOnClose
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{
          entryType: "MANUAL_IN",
          entryDate: dayjs(),
        }}
        className="mt-4"
      >
        <Form.Item
          name="entryType"
          label="Type"
          rules={[{ required: true, message: "Please select entry type" }]}
        >
          <Select placeholder="Select type">
            <Select.Option value="MANUAL_IN">
              💰 Deposit (Cash In)
            </Select.Option>
            <Select.Option value="MANUAL_OUT">
              💸 Withdrawal (Cash Out)
            </Select.Option>
          </Select>
        </Form.Item>

        <Form.Item
          name="amount"
          label="Amount (৳)"
          rules={[
            { required: true, message: "Please enter amount" },
            { type: "number", min: 0.01, message: "Amount must be at least 0.01" }
          ]}
        >
          <InputNumber
            className="w-full"
            step="0.01"
            min={0.01}
            precision={2}
            placeholder="0.00"
          />
        </Form.Item>

        <Form.Item
          name="entryDate"
          label="Date"
          rules={[{ required: true, message: "Please select date" }]}
        >
          <DatePicker className="w-full" format="DD/MM/YYYY" />
        </Form.Item>

        <Form.Item
          name="note"
          label="Note (Optional)"
        >
          <Input.TextArea
            placeholder="e.g. Owner withdrawal, shop expenses..."
            rows={3}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}

