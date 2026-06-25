'use client';
import { useState } from 'react';
import { Drawer, Card, Tag, Button, Input, InputNumber } from 'antd';
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
      open={!!phone}
      onClose={onClose}
      width={680}
      title={`Credit History — ${customerName}${phone ? ` (${phone})` : ''}`}
    >
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '32px 0' }}>Loading...</div>
      ) : error ? (
        <div style={{ textAlign: 'center', padding: '32px 0', color: '#cf1322' }}>
          Failed to load credit history
        </div>
      ) : sales.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '32px 0' }}>No credit sales found</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {sales.map((sale: CreditSale) => (
            <Card key={sale.id} size="small">
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  flexWrap: 'wrap',
                  gap: 8,
                }}
              >
                <div>
                  <p style={{ fontWeight: 600, margin: 0 }}>#{sale.receiptNumber}</p>
                  <p style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)', margin: 0 }}>
                    {dayjs(sale.saleTime).format('DD MMM YYYY, hh:mm A')}
                  </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 14 }}>
                    Total: <strong>৳{(sale.totalAmount ?? 0).toFixed(2)}</strong>
                  </div>
                  <div style={{ fontSize: 14 }}>
                    Paid: <strong>৳{(sale.amountPaid ?? 0).toFixed(2)}</strong>
                  </div>
                  <div style={{ fontSize: 14 }}>
                    Due:{' '}
                    <Tag color={(sale.dueAmount ?? 0) > 0 ? 'red' : 'green'}>
                      ৳{(sale.dueAmount ?? 0).toFixed(2)}
                    </Tag>
                  </div>
                </div>
              </div>

              {(sale.creditPayments ?? []).length > 0 && (
                <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)', marginTop: 12 }}>
                  <div style={{ fontWeight: 500, marginBottom: 8 }}>Payments:</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {sale.creditPayments.map((p) => (
                      <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between' }}>
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
                  <div
                    style={{
                      display: 'flex',
                      gap: 12,
                      flexWrap: 'wrap',
                      alignItems: 'flex-end',
                      marginTop: 12,
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <label style={{ fontSize: 12, fontWeight: 500 }}>Amount (৳)</label>
                      <InputNumber
                        min={0.01}
                        max={sale.dueAmount ?? 0}
                        step={0.01}
                        value={paymentForm.amount}
                        onChange={(val) =>
                          setPaymentForm((prev) =>
                            prev ? { ...prev, amount: Number(val) || 0 } : prev,
                          )
                        }
                        style={{ width: 120 }}
                      />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minWidth: 160 }}>
                      <label style={{ fontSize: 12, fontWeight: 500 }}>Note (optional)</label>
                      <Input
                        value={paymentForm.note}
                        onChange={(e) =>
                          setPaymentForm((prev) =>
                            prev ? { ...prev, note: e.target.value } : prev,
                          )
                        }
                        placeholder="e.g. Cash"
                      />
                    </div>
                    <Button type="primary" onClick={handlePay} loading={isPending}>
                      Save
                    </Button>
                    <Button type="text" onClick={() => setPaymentForm(null)}>
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <Button
                    style={{ marginTop: 12 }}
                    onClick={() =>
                      setPaymentForm({ saleId: sale.id, amount: sale.dueAmount ?? 0, note: '' })
                    }
                  >
                    Record Payment
                  </Button>
                ))}
            </Card>
          ))}
        </div>
      )}
    </Drawer>
  );
}
