import { 
  Modal, 
  Input, 
  InputNumber, 
  Select, 
  DatePicker, 
  message 
} from "antd";
import dayjs from "dayjs";
import { useCreateCashBoxEntry } from "../hooks/useCashBoxHooks";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useEffect } from "react";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";

const cashBoxEntrySchema = z.object({
  entryType: z.enum(["MANUAL_IN", "MANUAL_OUT"]),
  amount: z.coerce.number().min(0.01, "Amount must be at least 0.01"),
  entryDate: z.any().refine((val) => val && dayjs(val).isValid(), "Please select date"),
  note: z.string().optional(),
});

type CashBoxEntryFormData = z.infer<typeof cashBoxEntrySchema>;

interface AddEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AddEntryModal({ isOpen, onClose }: AddEntryModalProps) {
  const { mutate: createEntry, isPending } = useCreateCashBoxEntry();

  const form = useForm<CashBoxEntryFormData>({
    resolver: zodResolver(cashBoxEntrySchema) as Resolver<CashBoxEntryFormData>,
    defaultValues: {
      entryType: "MANUAL_IN",
      amount: undefined,
      entryDate: dayjs(),
      note: "",
    },
  });

  useEffect(() => {
    if (isOpen) {
      form.reset({
        entryType: "MANUAL_IN",
        amount: undefined,
        entryDate: dayjs(),
        note: "",
      });
    }
  }, [isOpen, form]);

  const handleSubmit = (values: CashBoxEntryFormData) => {
    createEntry(
      {
        entryType: values.entryType,
        amount: Number(values.amount),
        note: values.note,
        entryDate: dayjs(values.entryDate).format("YYYY-MM-DD"),
      },
      {
        onSuccess: () => {
          message.success("Entry added successfully");
          form.reset();
          onClose();
        },
        onError: (err: unknown) => {
          const errorMsg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || "Failed to add entry";
          message.error(errorMsg);
        }
      }
    );
  };

  return (
    <Modal
      title="Add Cash Box Entry"
      open={isOpen}
      onCancel={() => {
        form.reset();
        onClose();
      }}
      onOk={form.handleSubmit(handleSubmit)}
      confirmLoading={isPending}
      okText="Save Entry"
      destroyOnClose
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 mt-4">
          <FormField
            control={form.control}
            name="entryType"
            render={({ field, fieldState: { error } }) => (
              <FormItem>
                <FormLabel>Type</FormLabel>
                <FormControl>
                  <Select
                    value={field.value}
                    placeholder="Select type"
                    status={error ? "error" : undefined}
                    style={{ width: "100%" }}
                    onChange={(val) => field.onChange(val)}
                    options={[
                      { value: "MANUAL_IN", label: "💰 Deposit (Cash In)" },
                      { value: "MANUAL_OUT", label: "💸 Withdrawal (Cash Out)" }
                    ]}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

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
                    step="0.01"
                    min={0.01}
                    precision={2}
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
            name="entryDate"
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
            name="note"
            render={({ field, fieldState: { error } }) => (
              <FormItem>
                <FormLabel>Note (Optional)</FormLabel>
                <FormControl>
                  <Input.TextArea
                    value={field.value}
                    placeholder="e.g. Owner withdrawal, shop expenses..."
                    rows={3}
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

