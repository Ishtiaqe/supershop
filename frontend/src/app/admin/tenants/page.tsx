"use client"

import { useState, useEffect } from 'react'
import api from '@/lib/api'
import { Table, Form, Input, Button, Alert, Card, Divider, Modal } from 'antd'
import type { Tenant } from '@/types'

export default function AdminTenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [name, setName] = useState('')
  const [ownerEmail, setOwnerEmail] = useState('')
  const [ownerFullName, setOwnerFullName] = useState('')
  const [ownerPassword, setOwnerPassword] = useState('')
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null)
  const [editLoading, setEditLoading] = useState(false)

  const userJson = typeof window !== 'undefined' ? localStorage.getItem('user') : null
  const user = userJson ? JSON.parse(userJson) : null

  useEffect(() => {
    fetchTenants()
  }, [])

  async function fetchTenants() {
    setLoading(true)
    try {
      const { data } = await api.get('/tenants')
      setTenants(data)
    } catch (err: unknown) {
  const e = err as { response?: { data?: { message?: string } } }
  const message = e?.response?.data?.message || 'Failed to fetch tenants'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  async function handleCreateTenant(values: { tenantName?: string; ownerEmail?: string; ownerFullName?: string; ownerPassword?: string }) {
    // Ant Design `Form` calls onFinish with values, not an event. Accept values and
    // map them to the local state for controlled inputs.
    setError(null)
    const { tenantName, ownerEmail: ownerEmailVal, ownerFullName: ownerFullNameVal, ownerPassword: ownerPasswordVal } = values || {}
    // If the handler is called as a direct event for some reason, guard against it.
    if (typeof (values as unknown as { preventDefault?: () => void })?.preventDefault === 'function') {
      ;(values as unknown as { preventDefault?: () => void }).preventDefault?.()
    }
    // Use provided values or fallback to existing state
    const nameToUse = tenantName ?? name
    const emailToUse = ownerEmailVal ?? ownerEmail
    const fullNameToUse = ownerFullNameVal ?? ownerFullName
    const passwordToUse = ownerPasswordVal ?? ownerPassword

    try {
      // Create owner user (OWNER role). Only super-admin should reach here.
      const { data: created } = await api.post('/auth/register', {
        email: emailToUse,
        password: passwordToUse,
        fullName: fullNameToUse,
        role: 'OWNER',
      })

      // Create tenant with ownerId
  await api.post('/tenants', { name: nameToUse, ownerId: created.id })

  setName('')
  setOwnerEmail('')
  setOwnerFullName('')
  setOwnerPassword('')

      // Refresh list
      fetchTenants()
    } catch (err: unknown) {
  const e = err as { response?: { data?: { message?: string } } }
  const message = e?.response?.data?.message || 'Failed to create tenant'
      setError(message)
    }
  }

  if (!user || user.role !== 'SUPER_ADMIN') {
    return <div className="p-6">Access denied — Super Admins only</div>
  }

  return (
    <div style={{ maxWidth: 960, margin: '0 auto' }}>
  <Card title="Tenants (Super Admin)" bordered>

  {loading && <div>Loading…</div>}
  {error && <Alert type="error" message={error} className="mb-4" />}

        <Table dataSource={tenants} rowKey={(r) => r.id} pagination={false} className="mb-6">
          <Table.Column title="Tenant" dataIndex="name" key="name" />
          <Table.Column title="ID" dataIndex="id" key="id" />
          <Table.Column
            title="Actions"
            key="actions"
            render={(_text, record: Tenant) => (
              <Button type="link" onClick={() => setEditingTenant(record)}>Edit</Button>
            )}
          />
        </Table>

        <Form layout="vertical" onFinish={handleCreateTenant} className="space-y-3">
          <Form.Item label="Tenant name" name="tenantName" rules={[{ required: true, message: 'Please enter a tenant name' }]}>
            <Input value={name} onChange={(e) => setName(e.target.value)} required />
          </Form.Item>

          <Divider>Owner details</Divider>

          <Form.Item label="Owner Email" name="ownerEmail" rules={[{ required: true, type: 'email' }]}> 
            <Input value={ownerEmail} onChange={(e) => setOwnerEmail(e.target.value)} required />
          </Form.Item>

          <Form.Item label="Owner Full Name" name="ownerFullName" rules={[{ required: true }]}>
            <Input value={ownerFullName} onChange={(e) => setOwnerFullName(e.target.value)} required />
          </Form.Item>

          <Form.Item label="Owner Password" name="ownerPassword" rules={[{ required: true, min: 8 }]}>
            <Input.Password value={ownerPassword} onChange={(e) => setOwnerPassword(e.target.value)} required minLength={8} />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit">Create Tenant</Button>
          </Form.Item>
  </Form>
        <Modal
          title={editingTenant ? `Edit ${editingTenant.name}` : 'Edit tenant'}
          open={!!editingTenant}
          onCancel={() => setEditingTenant(null)}
          footer={null}
        >
          {editingTenant && (
            <Form
              layout="vertical"
              initialValues={{
                name: editingTenant.name,
                addressStreet: editingTenant.addressStreet || '',
                addressCity: editingTenant.addressCity || '',
                addressZone: editingTenant.addressZone || '',
              }}
              onFinish={async (vals: Record<string, unknown>) => {
                setEditLoading(true)
                setError(null)
                try {
                  await api.patch(`/tenants/${editingTenant.id}`, vals)
                  setEditingTenant(null)
                  fetchTenants()
                } catch (err: unknown) {
                  const e = err as { response?: { data?: { message?: string } } }
                  setError(e?.response?.data?.message || 'Failed to update tenant')
                } finally {
                  setEditLoading(false)
                }
              }}
            >
              <Form.Item name="name" label="Tenant name" rules={[{ required: true }]}>
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
                <Button type="primary" htmlType="submit" loading={editLoading}>Save</Button>
              </Form.Item>
            </Form>
          )}
        </Modal>
        </Card>
      </div>
  )
}
