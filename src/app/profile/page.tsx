"use client"

import { useEffect, useState } from 'react'
import { Card, Avatar, Button, Form, Input, message } from 'antd'
import type { User } from '@/types'
import api from '@/lib/api'

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    const u = localStorage.getItem('user')
    if (u) setUser(JSON.parse(u))
  }, [])

  const onFinish = async (values: Partial<User>) => {
    if (!user) return

    try {
      const response = await api.put(`/users/${user.id}`, {
        fullName: values.fullName,
      })
      const updatedUser = response.data
      localStorage.setItem('user', JSON.stringify(updatedUser))
      setUser(updatedUser)
      message.success('Profile saved')
    } catch (error) {
      message.error('Failed to update profile')
      console.error('Profile update error:', error)
    }
  }

  if (!user) {
    return <div className="p-6">Not signed in</div>
  }

  return (
    <Card title="Profile" style={{ maxWidth: 600 }}>
      <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 16 }}>
        <Avatar style={{ backgroundColor: '#1890ff' }}>{(user.fullName || user.email || 'U')[0]}</Avatar>
        <div>
          <div style={{ fontWeight: 700 }}>{user.fullName || user.email}</div>
          <div style={{ color: '#666' }}>{user.email}</div>
        </div>
      </div>

      <Form
        layout="vertical"
        initialValues={{ fullName: user.fullName, email: user.email }}
        onFinish={onFinish}
      >
        <Form.Item label="Full name" name="fullName">
          <Input />
        </Form.Item>

        <Form.Item label="Email" name="email">
          <Input disabled />
        </Form.Item>

        <Form.Item>
          <Button type="primary" htmlType="submit">Save</Button>
        </Form.Item>
      </Form>
    </Card>
  )
}
