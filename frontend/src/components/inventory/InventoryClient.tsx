"use client"

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { InventoryItem } from '@/types'
import api from '@/lib/api'
import { Table, Form, Input, InputNumber, Button, Space, Typography } from 'antd'

function fetchInventory(): Promise<InventoryItem[]> {
  return api.get('/inventory').then((r) => r.data)
}

export default function InventoryClient() {
  const queryClient = useQueryClient()
  const { data: items = [], isLoading } = useQuery<InventoryItem[], Error>({ queryKey: ['inventory'], queryFn: fetchInventory })
  const [form, setForm] = useState({ itemName: '', quantity: 0, purchasePrice: 0, retailPrice: 0 })

  const addMutation = useMutation<InventoryItem, Error, Partial<InventoryItem>>({
  mutationFn: (payload: Partial<InventoryItem>) => api.post('/inventory', payload).then((r) => r.data),
    async onSuccess() {
      await queryClient.invalidateQueries({ queryKey: ['inventory'] })
    },
  })

  const submit = async (values: Partial<InventoryItem>) => {
    await addMutation.mutateAsync(values)
    setForm({ itemName: '', quantity: 0, purchasePrice: 0, retailPrice: 0 })
  }

  const userJson = typeof window !== 'undefined' ? localStorage.getItem('user') : null
  const user = userJson ? JSON.parse(userJson) : null

  if (!user || (user.role !== 'OWNER' && user.role !== 'EMPLOYEE')) {
    return <div className="p-6">Access denied — Owners and employees only</div>
  }

  return (
    <>
      <Form layout="vertical" onFinish={submit} className="mb-6">
        <Form.Item name="itemName" label="Item name" rules={[{ required: true }]}> 
          <Input value={form.itemName} onChange={(e) => setForm({ ...form, itemName: e.target.value })} />
        </Form.Item>

        <Space size={8} className="mb-2">
          <Form.Item name="quantity" label="Quantity" rules={[{ required: true }]}> 
            <InputNumber min={1} value={form.quantity} onChange={(value) => setForm({ ...form, quantity: Number(value) })} />
          </Form.Item>

          <Form.Item name="purchasePrice" label="Purchase" rules={[{ required: true }]}> 
            <InputNumber min={0} value={form.purchasePrice} onChange={(value) => setForm({ ...form, purchasePrice: Number(value) })} />
          </Form.Item>

          <Form.Item name="retailPrice" label="Retail" rules={[{ required: true }]}> 
            <InputNumber min={0} value={form.retailPrice} onChange={(value) => setForm({ ...form, retailPrice: Number(value) })} />
          </Form.Item>
        </Space>

        <Form.Item>
          <Button type="primary" htmlType="submit">Add Item</Button>
        </Form.Item>
      </Form>

  <Typography.Title level={4}>Items</Typography.Title>

      {isLoading ? (
        <div>Loading…</div>
      ) : (
        <Table dataSource={items} rowKey="id" pagination={false}>
            <Table.Column title="Item" dataIndex="itemName" key="itemName" render={(text, record: InventoryItem) => text || record.variantId || 'Unnamed item'} />
          <Table.Column title="Qty" dataIndex="quantity" key="quantity" />
            <Table.Column title="Retail" dataIndex="retailPrice" key="retailPrice" render={(v: number) => `৳${v}`} />
        </Table>
      )}
    </>
  )
}
