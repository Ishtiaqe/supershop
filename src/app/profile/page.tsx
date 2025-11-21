"use client"

import { useEffect, useState } from 'react'
import { Card, Avatar, Button, Form, Input, message, Tabs } from 'antd'
import type { User } from '@/types'
import api from '@/lib/api'

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    const u = localStorage.getItem('user')
    if (u) setUser(JSON.parse(u))
  }, [])

  const onProfileFinish = async (values: Partial<User>) => {
    if (!user) return

    try {
      const response = await api.put('/users/me', {
        fullName: values.fullName,
        email: values.email,
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

  const onPasswordFinish = async (values: { currentPassword: string; newPassword: string; confirmPassword: string }) => {
    if (!user) return

    try {
      await api.post('/users/me/change-password', {
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      })
      message.success('Password changed successfully')
    } catch (error) {
      message.error('Failed to change password')
      console.error('Password change error:', error)
    }
  }

  if (!user) {
    return <div className="p-6">Not signed in</div>
  }

  return (
    <Card title="Profile" style={{ maxWidth: 600 }}>
      <Tabs defaultActiveKey="profile">
        <Tabs.TabPane tab="Profile" key="profile">
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
            onFinish={onProfileFinish}
          >
            <Form.Item label="Full name" name="fullName">
              <Input />
            </Form.Item>

            <Form.Item label="Email" name="email" rules={[{ type: 'email', message: 'Please enter a valid email' }]}>
              <Input />
            </Form.Item>

            <Form.Item>
              <Button type="primary" htmlType="submit">Save</Button>
            </Form.Item>
          </Form>
        </Tabs.TabPane>

        <Tabs.TabPane tab="Change Password" key="password">
          <Form
            layout="vertical"
            onFinish={onPasswordFinish}
          >
            <Form.Item
              label="Current Password"
              name="currentPassword"
              rules={[{ required: true, message: 'Please enter your current password' }]}
            >
              <Input.Password />
            </Form.Item>

            <Form.Item
              label="New Password"
              name="newPassword"
              rules={[
                { required: true, message: 'Please enter a new password' },
                { min: 8, message: 'Password must be at least 8 characters' }
              ]}
            >
              <Input.Password />
            </Form.Item>

            <Form.Item
              label="Confirm New Password"
              name="confirmPassword"
              dependencies={['newPassword']}
              rules={[
                { required: true, message: 'Please confirm your new password' },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue('newPassword') === value) {
                      return Promise.resolve();
                    }
                    return Promise.reject(new Error('Passwords do not match'));
                  },
                }),
              ]}
            >
              <Input.Password />
            </Form.Item>

            <Form.Item>
              <Button type="primary" htmlType="submit">Change Password</Button>
            </Form.Item>
          </Form>
        </Tabs.TabPane>
      </Tabs>
    </Card>
  )
}
