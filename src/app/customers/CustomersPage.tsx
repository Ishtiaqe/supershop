'use client';

import { useState } from 'react';
import { useCustomers, useCreateCustomer, useUpdateCustomer, useDeleteCustomer } from './hooks/useCustomersHooks';
import type { Customer } from '@/types';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import { MobileTableCard, MobileTableCardRow } from '@/components/mobile/MobileTableCard';
import { toast } from 'sonner';

interface CustomerFormState {
  id?: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  creditLimit: string;
}

const emptyForm: CustomerFormState = {
  name: '',
  phone: '',
  email: '',
  address: '',
  creditLimit: '',
};

export default function CustomersPage() {
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<CustomerFormState>(emptyForm);
  const { data: customers = [], isLoading } = useCustomers(search);
  const createMut = useCreateCustomer();
  const updateMut = useUpdateCustomer();
  const deleteMut = useDeleteCustomer();

  const openCreate = () => {
    setForm(emptyForm);
    setFormOpen(true);
  };

  const openEdit = (c: Customer) => {
    setForm({
      id: c.id,
      name: c.name,
      phone: c.phone || '',
      email: c.email || '',
      address: c.address || '',
      creditLimit: c.creditLimit?.toString() || '',
    });
    setFormOpen(true);
  };

  const handleSave = () => {
    if (!form.name.trim()) {
      toast.error('Name is required');
      return;
    }
    const payload = {
      name: form.name.trim(),
      phone: form.phone.trim() || undefined,
      email: form.email.trim() || undefined,
      address: form.address.trim() || undefined,
      creditLimit: form.creditLimit ? parseFloat(form.creditLimit) : undefined,
    };
    if (form.id) {
      updateMut.mutate({ id: form.id, ...payload }, { onSuccess: () => setFormOpen(false) });
    } else {
      createMut.mutate(payload, { onSuccess: () => setFormOpen(false) });
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('Delete this customer? Their sales records will remain but lose the customer link.')) {
      deleteMut.mutate(id);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-xl font-bold">Customers</h1>
        <Button onClick={openCreate}>Add Customer</Button>
      </div>

      <Card className="shadow-sm border-border/60 overflow-hidden">
        <CardHeader className="pb-3 p-4 border-b border-border/60">
          <Input
            placeholder="Search by name or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-sm"
          />
        </CardHeader>
        <CardContent className="p-0">
          <div className="hidden md:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Credit Limit</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : customers.length > 0 ? (
                  customers.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-semibold">{c.name}</TableCell>
                      <TableCell>{c.phone || '—'}</TableCell>
                      <TableCell className="text-muted-foreground">{c.email || '—'}</TableCell>
                      <TableCell>
                        {c.creditLimit != null ? (
                          <Badge variant="secondary">৳{c.creditLimit.toFixed(2)}</Badge>
                        ) : '—'}
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button size="sm" variant="outline" onClick={() => openEdit(c)}>Edit</Button>
                        <Button size="sm" variant="destructive" onClick={() => handleDelete(c.id)}>Delete</Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground text-sm">
                      No customers found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <div className="md:hidden p-4 space-y-3">
            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto" />
              </div>
            ) : customers.length > 0 ? (
              customers.map((c) => (
                <MobileTableCard key={c.id}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="font-semibold text-sm">{c.name}</div>
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => openEdit(c)}>Edit</Button>
                      <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={() => handleDelete(c.id)}>Del</Button>
                    </div>
                  </div>
                  <MobileTableCardRow label="Phone" value={c.phone || '—'} />
                  <MobileTableCardRow label="Email" value={c.email || '—'} />
                  <MobileTableCardRow label="Credit Limit" value={c.creditLimit != null ? `৳${c.creditLimit.toFixed(2)}` : '—'} />
                </MobileTableCard>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground text-sm">No customers found.</div>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>{form.id ? 'Edit Customer' : 'Add Customer'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-sm font-medium">Name *</label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Customer name" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Phone</label>
              <Input type="tel" inputMode="tel" autoComplete="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="Phone number" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Email</label>
              <Input type="email" autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="Email (optional)" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Address</label>
              <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Address (optional)" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Credit Limit (৳)</label>
              <Input type="number" inputMode="decimal" min="0" step="0.01" value={form.creditLimit} onChange={(e) => setForm({ ...form, creditLimit: e.target.value })} placeholder="0.00" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={createMut.isPending || updateMut.isPending}>
                {form.id ? 'Update' : 'Create'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
