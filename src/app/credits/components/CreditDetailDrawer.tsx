'use client';

import { useState } from 'react';
import dayjs from 'dayjs';
import { useCreditsByPhone, useRecordPayment, type CreditSale } from '../hooks/useCreditsHooks';

// Import shadcn UI components
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface Props {
  phone: string | null;
  customerName: string;
  onClose: () => void;
}

interface PaymentFormState {
  saleId: string;
  amount: number;
  note: string;
  paymentMethod: string;
}

export default function CreditDetailDrawer({ phone, customerName, onClose }: Props) {
  const { data: sales = [], isLoading, error } = useCreditsByPhone(phone);
  const { mutate: recordPayment, isPending } = useRecordPayment();
  const [paymentForm, setPaymentForm] = useState<PaymentFormState | null>(null);

  const handlePay = () => {
    if (!paymentForm || paymentForm.amount <= 0) return;
    recordPayment(
      { saleId: paymentForm.saleId, amount: paymentForm.amount, note: paymentForm.note || undefined, paymentMethod: paymentForm.paymentMethod },
      { onSuccess: () => setPaymentForm(null) }
    );
  };

  return (
    <Dialog open={!!phone} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Credit History — {customerName}
            {phone ? ` (${phone})` : ''}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="text-center py-8 text-sm text-muted-foreground">Loading...</div>
        ) : error ? (
          <div className="text-center py-8 text-sm text-destructive font-medium">
            Failed to load credit history
          </div>
        ) : sales.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground">No credit sales found</div>
        ) : (
          <div className="space-y-4 pt-2">
            {sales.map((sale: CreditSale) => (
              <Card key={sale.id} className="shadow-sm">
                <CardContent className="p-4 space-y-4">
                  <div className="flex justify-between items-start flex-wrap gap-2">
                    <div>
                      <div className="font-semibold text-sm text-foreground">#{sale.receiptNumber}</div>
                      <div className="text-xs text-muted-foreground">
                        {dayjs(sale.saleTime).format('DD MMM YYYY, hh:mm A')}
                      </div>
                    </div>
                    <div className="text-right text-xs space-y-1">
                      <div>
                        Total: <span className="font-semibold text-foreground">৳{(sale.totalAmount ?? 0).toFixed(2)}</span>
                      </div>
                      <div>
                        Paid: <span className="font-semibold text-foreground">৳{(sale.amountPaid ?? 0).toFixed(2)}</span>
                      </div>
                      <div className="flex items-center justify-end gap-1.5 mt-1">
                        <span>Due:</span>
                        <Badge variant={(sale.dueAmount ?? 0) > 0 ? 'destructive' : 'secondary'}>
                          ৳{(sale.dueAmount ?? 0).toFixed(2)}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {(sale.creditPayments ?? []).length > 0 && (
                    <div className="text-xs text-muted-foreground border-t pt-3 space-y-2">
                      <div className="font-semibold text-foreground">Payments:</div>
                      <div className="space-y-1">
                        {sale.creditPayments.map((p) => (
                          <div key={p.id} className="flex justify-between">
                            <span>
                              {dayjs(p.paymentDate).format('DD/MM/YYYY')}
                              {p.paymentMethod && p.paymentMethod !== 'CASH' ? ` · ${p.paymentMethod}` : ''}
                              {p.note ? ` — ${p.note}` : ''}
                            </span>
                            <span className="font-medium text-foreground">৳{p.amount.toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {(sale.dueAmount ?? 0) > 0 && (
                    <div className="border-t pt-3">
                      {paymentForm?.saleId === sale.id ? (
                        <div className="flex flex-wrap gap-3 items-end">
                          <div className="space-y-1">
                            <label htmlFor={`payment-amount-${sale.id}`} className="text-xs font-semibold text-foreground">Amount (৳)</label>
                            <Input
                              type="number"
                              inputMode="decimal"
                              min="0.01"
                              max={sale.dueAmount ?? 0}
                              step="0.01"
                              id={`payment-amount-${sale.id}`}
                              value={paymentForm.amount}
                              onChange={(e) =>
                                setPaymentForm((prev) =>
                                  prev ? { ...prev, amount: parseFloat(e.target.value) || 0 } : prev
                                )
                              }
                              className="w-28 h-8 px-2 py-1 text-xs"
                            />
                          </div>
                          <div className="space-y-1">
                            <label htmlFor={`payment-method-${sale.id}`} className="text-xs font-semibold text-foreground">Method</label>
                            <select
                              id={`payment-method-${sale.id}`}
                              value={paymentForm.paymentMethod}
                              onChange={(e) =>
                                setPaymentForm((prev) =>
                                  prev ? { ...prev, paymentMethod: e.target.value } : prev
                                )
                              }
                              className="h-8 px-2 py-1 text-xs rounded-md border border-input bg-background"
                            >
                              <option value="CASH">Cash</option>
                              <option value="CARD">Card</option>
                              <option value="MOBILE_PAYMENT">Mobile</option>
                              <option value="OTHER">Other</option>
                            </select>
                          </div>
                          <div className="space-y-1 flex-1 min-w-[120px]">
                            <label htmlFor={`payment-note-${sale.id}`} className="text-xs font-semibold text-foreground">Note (optional)</label>
                            <Input
                              id={`payment-note-${sale.id}`}
                              value={paymentForm.note}
                              onChange={(e) =>
                                setPaymentForm((prev) =>
                                  prev ? { ...prev, note: e.target.value } : prev
                                )
                              }
                              placeholder="e.g. partial payment"
                              className="h-8 px-2 py-1 text-xs"
                            />
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" onClick={handlePay} disabled={isPending} className="h-8 text-xs font-semibold">
                              Save
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setPaymentForm(null)} className="h-8 text-xs font-semibold">
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() =>
                            setPaymentForm({ saleId: sale.id, amount: sale.dueAmount ?? 0, note: '', paymentMethod: 'CASH' })
                          }
                          className="h-8 text-xs font-semibold"
                        >
                          Record Payment
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
