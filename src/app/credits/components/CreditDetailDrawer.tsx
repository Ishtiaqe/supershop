'use client';
import { useState } from 'react';
import { Drawer, DrawerContent, DrawerBody, Button, Input, Chip } from '@heroui/react';
import dayjs from 'dayjs';
import { useCreditsByPhone, useRecordPayment, CreditSale } from '../hooks/useCreditsHooks';

interface Props {
  phone: string | null;
  customerName: string;
  onClose: () => void;
}

interface PaymentFormState {
  saleId: string;
  amount: number;
  note: string;
}

export default function CreditDetailDrawer({ phone, customerName, onClose }: Props) {
  const { data: sales = [], isLoading, error } = useCreditsByPhone(phone);
  const { mutate: recordPayment, isPending } = useRecordPayment();
  const [paymentForm, setPaymentForm] = useState<PaymentFormState | null>(null);

  const handlePay = () => {
    if (!paymentForm || paymentForm.amount <= 0) return;
    recordPayment(
      { saleId: paymentForm.saleId, amount: paymentForm.amount, note: paymentForm.note || undefined },
      { onSuccess: () => setPaymentForm(null) },
    );
  };

  return (
    <Drawer
      isOpen={!!phone}
      onClose={onClose}
      size="lg"
      classNames={{
        wrapper: 'max-w-[95vw]',
        base: 'max-w-[680px]',
      }}
    >
      <DrawerContent>
        <div className="flex items-center justify-between py-4 px-6 border-b border-divider">
          <h2 className="text-lg font-semibold">
            Credit History — {customerName}
            {phone ? ` (${phone})` : ''}
          </h2>
        </div>
        <DrawerBody className="py-6">
          {isLoading ? (
            <div className="text-center py-8 text-default-500">Loading...</div>
          ) : error ? (
            <div className="text-center py-8 text-red-500">Failed to load credit history</div>
          ) : (
            <div className="space-y-4">
              {sales.map((sale: CreditSale) => (
                <div key={sale.id} className="border border-divider rounded-lg p-4 space-y-3">
                  <div className="flex justify-between items-start flex-wrap gap-2">
                    <div>
                      <p className="font-semibold">#{sale.receiptNumber}</p>
                      <p className="text-xs text-default-500">
                        {dayjs(sale.saleTime).format('DD MMM YYYY, hh:mm A')}
                      </p>
                    </div>
                    <div className="text-right space-y-1">
                      <div className="text-sm">
                        Total: <span className="font-semibold">৳{(sale.totalAmount ?? 0).toFixed(2)}</span>
                      </div>
                      <div className="text-sm">
                        Paid: <span className="text-success font-semibold">৳{(sale.amountPaid ?? 0).toFixed(2)}</span>
                      </div>
                      <div className="text-sm">
                        Due:{' '}
                        <Chip
                          size="sm"
                          variant="flat"
                          color={(sale.dueAmount ?? 0) > 0 ? 'danger' : 'success'}
                        >
                          ৳{(sale.dueAmount ?? 0).toFixed(2)}
                        </Chip>
                      </div>
                    </div>
                  </div>

                  {(sale.creditPayments ?? []).length > 0 && (
                    <div className="text-xs text-default-500">
                      <div className="font-medium mb-2">Payments:</div>
                      <div className="space-y-1">
                        {sale.creditPayments.map((p) => (
                          <div key={p.id} className="flex justify-between">
                            <span>
                              {dayjs(p.paymentDate).format('DD/MM/YYYY')}
                              {p.note ? ` — ${p.note}` : ''}
                            </span>
                            <span>৳{p.amount.toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {(sale.dueAmount ?? 0) > 0 &&
                    (paymentForm?.saleId === sale.id ? (
                      <div className="flex gap-3 flex-wrap items-end">
                        <div className="flex flex-col gap-1">
                          <label className="text-xs font-medium text-default-700">Amount (৳)</label>
                          <Input
                            type="number"
                            min={0.01}
                            max={sale.dueAmount ?? 0}
                            value={String(paymentForm.amount)}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value) || 0;
                              setPaymentForm((prev) =>
                                prev ? { ...prev, amount: val } : prev
                              );
                            }}
                            className="w-24"
                            size="sm"
                            step="0.01"
                          />
                        </div>
                        <div className="flex flex-col gap-1 flex-1 min-w-40">
                          <label className="text-xs font-medium text-default-700">Note (optional)</label>
                          <Input
                            value={paymentForm.note}
                            onChange={(e) =>
                              setPaymentForm((prev) =>
                                prev ? { ...prev, note: e.target.value } : prev,
                              )
                            }
                            placeholder="e.g. Cash"
                            size="sm"
                          />
                        </div>
                        <Button
                          color="primary"
                          onClick={handlePay}
                          isLoading={isPending}
                          size="sm"
                          className="h-10"
                        >
                          Save
                        </Button>
                        <Button
                          variant="light"
                          onClick={() => setPaymentForm(null)}
                          size="sm"
                          className="h-10"
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="bordered"
                        size="sm"
                        onClick={() =>
                          setPaymentForm({ saleId: sale.id, amount: sale.dueAmount ?? 0, note: '' })
                        }
                      >
                        Record Payment
                      </Button>
                    ))}
                </div>
              ))}
              {sales.length === 0 && (
                <div className="text-center py-8 text-default-500">No credit sales found</div>
              )}
            </div>
          )}
        </DrawerBody>
      </DrawerContent>
    </Drawer>
  );
}
