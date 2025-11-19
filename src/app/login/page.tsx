"use client"

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Form, Input, Button, Alert } from 'antd'
import api from '@/lib/api'
import { Card } from 'antd'

export default function LoginPage() {
  const router = useRouter()
  // form values handled by antd Form
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (values: { email: string; password: string }) => {
    // values contain { email, password }
    setError(null)
    setLoading(true)

    try {
      const { data } = await api.post('/auth/login', { email: values.email, password: values.password })

      // Store tokens and user info
      if (data.accessToken) {
        localStorage.setItem('accessToken', data.accessToken)
      }
      if (data.refreshToken) {
        localStorage.setItem('refreshToken', data.refreshToken)
      }
      if (data.user) {
        localStorage.setItem('user', JSON.stringify(data.user))
      }

      // Redirect to dashboard
      router.push('/dashboard')
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } }
      setError(e?.response?.data?.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md">
        <Card title="Sign in" bordered>

          {error && <Alert type="error" message={error} className="mb-4" />}

          <Form onFinish={submit} layout="vertical">
          <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}>
            <Input />
          </Form.Item>

          <Form.Item name="password" label="Password" rules={[{ required: true }]}>
            <Input.Password />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" block loading={loading}>
              {loading ? 'Signing in...' : 'Sign in'}
            </Button>
          </Form.Item>
          </Form>
        </Card>
      </div>
    </main>
  )
}
