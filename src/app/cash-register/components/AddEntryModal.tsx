import { useEffect } from "react";
import dayjs from "dayjs";
import { useCreateCashRegisterEntry } from "../hooks/useCashRegisterHooks";
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

const cashRegisterEntrySchema = z.object({
  entryType: z.enum(["MANUAL_IN", "MANUAL_OUT"]),
  amount: z.coerce.number().min(0.01, "Amount must be at least 0.01"),
  entryDate: z.string().min(1, "Please select date"),
  note: z.string().optional(),
});

type CashRegisterEntryFormData = z.infer<typeof cashRegisterEntrySchema>;

interface AddEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AddEntryModal({ isOpen, onClose }: AddEntryModalProps) {
  const { mutate: createEntry, isPending } = useCreateCashRegisterEntry();

  const form = useForm<CashRegisterEntryFormData>({
    resolver: zodResolver(cashRegisterEntrySchema) as Resolver<CashRegisterEntryFormData>,
    defaultValues: {
      entryType: "MANUAL_IN",
      amount: 0,
      entryDate: dayjs().format("YYYY-MM-DD"),
      note: "",
    },
  });

  useEffect(() => {
    if (isOpen) {
      form.reset({
        entryType: "MANUAL_IN",
        amount: 0,
        entryDate: dayjs().format("YYYY-MM-DD"),
        note: "",
      });
    }
  }, [isOpen, form]);

  const handleSubmit = (values: CashRegisterEntryFormData) => {
    createEntry(
      {
        entryType: values.entryType,
        amount: Number(values.amount),
        note: values.note,
        entryDate: values.entryDate,
      },
      {
        onSuccess: () => {
          toast.success("Entry added successfully");
          form.reset();
          onClose();
        },
        onError: (err: unknown) => {
          const errorMsg =
            (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
            "Failed to add entry";
          toast.error(errorMsg);
        },
      }
    );
  };

  const handleClose = () => {
    form.reset();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Cash Register Entry</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="entryType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type</FormLabel>
                  <FormControl>
                    <select
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      {...field}
                    >
                      <option value="MANUAL_IN">💰 Deposit (Cash In)</option>
                      <option value="MANUAL_OUT">💸 Withdrawal (Cash Out)</option>
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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
              name="entryDate"
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
              name="note"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Note (Optional)</FormLabel>
                  <FormControl>
                    <textarea
                      placeholder="e.g. Owner withdrawal, shop expenses..."
                      className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="pt-4 border-t border-border">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleClose}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={isPending}>
                Save Entry
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
