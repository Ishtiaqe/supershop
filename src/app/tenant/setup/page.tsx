"use client";

import { useState, startTransition } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import api from '@/lib/api';

// Import shadcn UI components
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

const tenantSetupSchema = z.object({
  name: z.string().min(1, 'Store name is required'),
  registrationNumber: z.string().optional(),
  addressStreet: z.string().optional(),
  addressCity: z.string().optional(),
  addressZone: z.string().optional(),
});

type TenantSetupFormData = z.infer<typeof tenantSetupSchema>;

export default function TenantSetupPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const navigate = useNavigate();

  const form = useForm<TenantSetupFormData>({
    resolver: zodResolver(tenantSetupSchema),
    defaultValues: {
      name: '',
      registrationNumber: '',
      addressStreet: '',
      addressCity: '',
      addressZone: '',
    },
  });

  const onSubmit = async (values: TenantSetupFormData) => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await api.post('/tenants/setup', values);

      startTransition(() => {
        setSuccess('Tenant created successfully');
      });

      await new Promise((resolve) => setTimeout(resolve, 0));
      setTimeout(() => navigate('/sales'), 1000);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e?.response?.data?.message || 'Failed to setup tenant');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <Card className="shadow-sm border-border/60">
        <CardHeader className="pb-4 p-5">
          <CardTitle className="text-lg font-semibold">Setup your store</CardTitle>
        </CardHeader>
        <CardContent className="p-5 pt-0 space-y-4">
          {error && (
            <Alert variant="destructive" className="bg-background border shadow-sm">
              <AlertTitle className="font-semibold">Error</AlertTitle>
              <AlertDescription className="mt-1 text-xs text-muted-foreground">
                {error}
              </AlertDescription>
            </Alert>
          )}
          {success && (
            <Alert className="bg-background border shadow-sm border-emerald-500 text-emerald-600">
              <AlertTitle className="font-semibold text-emerald-600">Success</AlertTitle>
              <AlertDescription className="mt-1 text-xs text-muted-foreground">
                {success}
              </AlertDescription>
            </Alert>
          )}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Store Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter store name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="registrationNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Registration Number</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter registration number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="addressStreet"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Street Address</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter street" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="addressCity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>City</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter city" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="addressZone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Zone</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter zone" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Creating store...' : 'Create store'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
