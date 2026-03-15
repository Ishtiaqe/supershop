"use client"

import { useState, startTransition } from 'react'
import api from '@/lib/api'
import { Input, Button, Form, Alert, Card } from 'antd'
import { useRouter } from 'next/navigation'

export default function TenantSetupPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const router = useRouter()

  const onFinish = async (values: Record<string, unknown>) => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await api.post('/tenants/setup', values);

      // Use startTransition for success state update
      startTransition(() => {
        setSuccess('Tenant created successfully');
      });

      // Allow UI to update before navigation
      await new Promise(resolve => setTimeout(resolve, 0));

      // Redirect to dashboard after a short delay
      setTimeout(() => router.push('/sales'), 1000);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e?.response?.data?.message || 'Failed to setup tenant');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 640, margin: '0 auto' }}>
      <Card title="Setup your store">
        {error && <Alert type="error" message={error} className="mb-4" />}
        {success && <Alert type="success" message={success} className="mb-4" />}

        <Form layout="vertical" onFinish={onFinish}>
          <Form.Item name="name" label="Store name" rules={[{ required: true }]}> 
            <Input />
          </Form.Item>

          <Form.Item name="registrationNumber" label="Registration number">
            <Input />
          </Form.Item>

          <Form.Item name="addressStreet" label="Street">
            <Input />
          </Form.Item>

          <Form.Item name="addressCity" label="City">
            <Input />
          </Form.Item>

          <Form.Item name="addressZone" label="Zone">
            <Input />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading}>Create store</Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  )
}
