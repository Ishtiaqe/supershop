"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useCreateCashBoxEntry } from "../hooks/useCashBoxHooks";
import { format } from "date-fns";

const schema = z.object({
  entryType: z.enum(["MANUAL_IN", "MANUAL_OUT"]),
  amount: z
    .union([z.string(), z.number()])
    .transform((v) => Number(v))
    .refine((v) => v > 0, { message: "Amount must be greater than 0" }),
  note: z.string().optional(),
  entryDate: z.string().min(1, "Date is required"),
});

type FormValues = z.input<typeof schema>;

interface AddEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface AddEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  id?: string;
}

export function AddEntryModal({ isOpen, onClose, id }: AddEntryModalProps) {
  const { mutate: createEntry, isPending } = useCreateCashBoxEntry();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      entryType: "MANUAL_IN",
      amount: "" as any,
      note: "",
      entryDate: format(new Date(), "yyyy-MM-dd"),
    },
  });

  const onSubmit = (values: FormValues) => {
    createEntry(
      {
        entryType: values.entryType,
        amount: Number(values.amount),
        note: values.note,
        entryDate: values.entryDate,
      },
      {
        onSuccess: () => {
          form.reset();
          onClose();
        },
      }
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent id={id} className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Add Cash Box Entry</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="entryType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="MANUAL_IN">
                        💰 Deposit (Cash In)
                      </SelectItem>
                      <SelectItem value="MANUAL_OUT">
                        💸 Withdrawal (Cash Out)
                      </SelectItem>
                    </SelectContent>
                  </Select>
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
                    <Input type="number" step="0.01" min="0.01" {...field} />
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
                    <Input type="date" {...field} />
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
                    <Textarea
                      placeholder="e.g. Owner withdrawal, shop expenses..."
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Saving..." : "Save Entry"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
