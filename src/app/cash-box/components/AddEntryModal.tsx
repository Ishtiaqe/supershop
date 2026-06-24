'use client';

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
  Textarea,
} from '@heroui/react';
import { toast } from 'sonner';
import { useCreateCashBoxEntry } from '../hooks/useCashBoxHooks';

const addEntrySchema = z.object({
  entryType: z.enum(['MANUAL_IN', 'MANUAL_OUT']),
  amount: z
    .number({ message: 'Amount must be a number' })
    .min(0.01, 'Amount must be at least 0.01'),
  entryDate: z.string().min(1, 'Date is required'),
  note: z.string().optional(),
});

type AddEntryFormData = z.infer<typeof addEntrySchema>;

interface AddEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  id?: string;
}

export function AddEntryModal({ isOpen, onClose, id }: AddEntryModalProps) {
  const { mutate: createEntry, isPending } = useCreateCashBoxEntry();

  const {
    control,
    handleSubmit,
    reset,
    register,
    formState: { errors },
  } = useForm<AddEntryFormData>({
    resolver: zodResolver(addEntrySchema),
    defaultValues: {
      entryType: 'MANUAL_IN',
      amount: 0,
      entryDate: dayjs().format('YYYY-MM-DD'),
      note: '',
    },
  });

  const handleClose = () => {
    reset();
    onClose();
  };

  const onSubmit: SubmitHandler<AddEntryFormData> = (values) => {
    createEntry(
      {
        entryType: values.entryType,
        amount: Number(values.amount),
        note: values.note,
        entryDate: values.entryDate,
      },
      {
        onSuccess: () => {
          toast.success('Entry added successfully');
          reset();
          onClose();
        },
        onError: (err: any) => {
          toast.error(err?.response?.data?.message || 'Failed to add entry');
        },
      }
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={(open) => { if (!open) handleClose(); }}
      backdrop="blur"
    >
      <ModalContent>
        {(onModalClose) => (
          <>
            <ModalHeader className="flex flex-col gap-1">
              Add Cash Box Entry
            </ModalHeader>

            <ModalBody>
              <form
                onSubmit={handleSubmit(onSubmit)}
                className="space-y-4 mt-2"
                id="add-entry-form"
              >
                {/* Entry Type */}
                <Controller
                  name="entryType"
                  control={control}
                  render={({ field }) => (
                    <Select
                      label="Type"
                      placeholder="Select type"
                      selectedKeys={field.value ? [field.value] : []}
                      onSelectionChange={(keys) => {
                        const val = Array.from(keys)[0] as string;
                        field.onChange(val);
                      }}
                      isInvalid={!!errors.entryType}
                      errorMessage={errors.entryType?.message}
                    >
                      <SelectItem key="MANUAL_IN">
                        💰 Deposit (Cash In)
                      </SelectItem>
                      <SelectItem key="MANUAL_OUT">
                        💸 Withdrawal (Cash Out)
                      </SelectItem>
                    </Select>
                  )}
                />

                {/* Amount */}
                <Input
                  {...register('amount', {
                    valueAsNumber: true,
                  })}
                  type="number"
                  label="Amount (৳)"
                  placeholder="0.00"
                  step="0.01"
                  min="0.01"
                  isInvalid={!!errors.amount}
                  errorMessage={errors.amount?.message}
                />

                {/* Date */}
                <Controller
                  name="entryDate"
                  control={control}
                  render={({ field }) => (
                    <Input
                      {...field}
                      type="date"
                      label="Date"
                      isInvalid={!!errors.entryDate}
                      errorMessage={errors.entryDate?.message}
                    />
                  )}
                />

                {/* Note */}
                <Controller
                  name="note"
                  control={control}
                  render={({ field }) => (
                    <Textarea
                      {...field}
                      label="Note (Optional)"
                      placeholder="e.g. Owner withdrawal, shop expenses..."
                      minRows={3}
                      isInvalid={!!errors.note}
                      errorMessage={errors.note?.message}
                    />
                  )}
                />
              </form>
            </ModalBody>

            <ModalFooter>
              <Button
                variant="light"
                onPress={handleClose}
                isDisabled={isPending}
              >
                Cancel
              </Button>
              <Button
                color="primary"
                type="submit"
                form="add-entry-form"
                isLoading={isPending}
                isDisabled={isPending}
              >
                Save Entry
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
