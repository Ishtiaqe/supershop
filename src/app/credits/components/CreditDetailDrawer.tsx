'use client';
import { useState } from 'react';
import { Drawer, Button, InputNumber, Input, Tag, Typography } from 'antd';
import dayjs from 'dayjs';
import { useCreditsByPhone, useRecordPayment, CreditSale } from '../hooks/useCreditsHooks';

const { Text } = Typography;

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
  const { data: sales = [], isLoading } = useCreditsByPhone(phone);
  const { mutate: recordPayment, isPending } = useRecordPayment();
  const [paymentForm, setPaymentForm] = useState<PaymentFormState | null>(null);

  const handlePay = () => {
    if (!paymentForm || paymentForm.amount <= 0) return;
    recordPayment(
      { saleId: paymentForm.saleId, amount: paymentForm.amount, note: paymentForm.note || undefined },
      { onSuccess: () => setPaymentForm(null) },
    );
  };

  const drawerWidth =
    typeof window !== 'undefined' ? Math.min(680, window.innerWidth * 0.95) : 680;

  return (
    <Drawer
      title={`Credit History — ${customerName}${phone ? ` (${phone})` : ''}`}
      open={!!phone}
      onClose={onClose}
      width={drawerWidth}
      footer={null}
    >
      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Loading...</div>
      ) : (
        <div className="space-y-4">
          {sales.map((sale: CreditSale) => (
            <div key={sale.id} className="border border-border rounded-lg p-4 space-y-3">
              <div className="flex justify-between items-start flex-wrap gap-2">
                <div>
                  <Text strong>#{sale.receiptNumber}</Text>
                  <div className="text-xs text-muted-foreground">
                    {dayjs(sale.saleTime).format('DD MMM YYYY, hh:mm A')}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm">
                    Total: <Text strong>৳{(sale.totalAmount ?? 0).toFixed(2)}</Text>
                  </div>
                  <div className="text-sm">
                    Paid: <Text type="success">৳{(sale.amountPaid ?? 0).toFixed(2)}</Text>
                  </div>
                  <div className="text-sm">
                    Due:{' '}
                    <Tag color={(sale.dueAmount ?? 0) > 0 ? 'red' : 'green'}>
                      ৳{(sale.dueAmount ?? 0).toFixed(2)}
                    </Tag>
                  </div>
                </div>
              </div>

              {(sale.creditPayments ?? []).length > 0 && (
                <div className="text-xs text-muted-foreground">
                  <div className="font-medium mb-1">Payments:</div>
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
              )}

              {(sale.dueAmount ?? 0) > 0 &&
                (paymentForm?.saleId === sale.id ? (
                  <div className="flex gap-2 flex-wrap items-end">
                    <div>
                      <div className="text-xs mb-1">Amount (৳)</div>
                      <InputNumber
                        min={0.01}
                        max={sale.dueAmount ?? 0}
                        value={paymentForm.amount}
                        onChange={(v) =>
                          setPaymentForm((prev) => (prev ? { ...prev, amount: v ?? 0 } : prev))
                        }
                        style={{ width: 120 }}
                      />
                    </div>
                    <div>
                      <div className="text-xs mb-1">Note (optional)</div>
                      <Input
                        value={paymentForm.note}
                        onChange={(e) =>
                          setPaymentForm((prev) =>
                            prev ? { ...prev, note: e.target.value } : prev,
                          )
                        }
                        style={{ width: 160 }}
                        placeholder="e.g. Cash"
                      />
                    </div>
                    <Button type="primary" onClick={handlePay} loading={isPending} size="small">
                      Save
                    </Button>
                    <Button size="small" onClick={() => setPaymentForm(null)}>
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <Button
                    size="small"
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
            <div className="text-center py-8 text-muted-foreground">No credit sales found</div>
          )}
        </div>
      )}
    </Drawer>
  );
}
