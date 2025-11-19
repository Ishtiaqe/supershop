"use client"

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { InventoryItem, ProductVariant, Product } from '@/types'
import { Select, InputNumber, Button, Table, Row, Col, Typography } from 'antd'

function fetchInventory(q?: string) {
  try {
    if (typeof window !== 'undefined' && q && q.length > 0) {
      const key = `pos-inventory:${q}`
      const cached = sessionStorage.getItem(key)
      if (cached) {
        const parsed = JSON.parse(cached)
        const now = Date.now()
  // parsed.__ttl stores the TTL in ms
        if (parsed.__ts && parsed.__ttl && now - parsed.__ts < parsed.__ttl) {
          return Promise.resolve(parsed.data)
        }
        // If expired, fall through and fetch from server
      }
    }

    return api.get('/inventory', { params: q ? { q } : {} }).then((r) => {
      if (typeof window !== 'undefined' && q && q.length > 0) {
        // store TTL of 2 minutes in sessionStorage
        const key = `pos-inventory:${q}`
        const payload = { __ts: Date.now(), __ttl: 120000, data: r.data }
        try {
          sessionStorage.setItem(key, JSON.stringify(payload))
        } catch {
          /* ignore session storage errors */
        }
      }

      return r.data
    })
  } catch {
    // Fallback to direct request
    return api.get('/inventory', { params: q ? { q } : {} }).then((r) => r.data)
  }
}

export default function POSClient() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  // debounce input so we don't call the API on every keystroke
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(t)
  }, [search])

  const { data: items = [], isFetching: itemsLoading } = useQuery({ queryKey: ['inventory', debouncedSearch], queryFn: () => fetchInventory(debouncedSearch) })
  const [selected, setSelected] = useState<string | null>(null)
  const [qty, setQty] = useState<number>(1)
  const [cart, setCart] = useState<Array<{ inventoryId: string; unitPrice: number; quantity: number }>>([])

  const saleMutation = useMutation({
  mutationFn: (payload: { items: Array<{ inventoryId: string; quantity: number; unitPrice: number }> }) => api.post('/sales', payload).then((r) => r.data),
    onSuccess() {
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
      // clear local sessionStorage cache for POS so search reflects new quantities
      try {
        for (let i = 0; i < sessionStorage.length; i++) {
          const key = sessionStorage.key(i)
          if (key && key.startsWith('pos-inventory:')) {
            sessionStorage.removeItem(key)
          }
        }
  } catch {
        // ignore sessionStorage errors
      }
    },
  })

  function addToCart() {
    if (!selected) return
  const inventory = items.find((i: { id: string }) => i.id === selected)
    if (!inventory) return
    setCart([...cart, { inventoryId: inventory.id, unitPrice: inventory.retailPrice, quantity: qty }])
    setSelected(null)
    setQty(1)
  }

  function checkout() {
    const payload = { items: cart }
    saleMutation.mutate(payload)
    setCart([])
  }

  const total = cart.reduce((s, it) => s + it.quantity * it.unitPrice, 0)

  return (
    <div>
      <Row gutter={16} align="bottom">
        <Col span={12}>
          <Typography.Text>Select Item</Typography.Text>
          <Select
            showSearch
            filterOption={false}
            allowClear
            placeholder="Type to search inventory or SKU..."
            style={{ width: '100%' }}
            value={selected ?? undefined}
            onSearch={(val) => setSearch(val)}
            onChange={(val) => {
              setSelected(val)
              // clear the search box when an item is selected
              setSearch('')
            }}
            notFoundContent={itemsLoading ? 'Searching...' : 'No results'}
            options={(items as (InventoryItem & { variant?: ProductVariant & { product?: Product } })[]).map((it) => ({
              label: `${it.itemName || it.variant?.variantName || it.variant?.product?.name || it.variant?.sku} (Qty: ${it.quantity})`,
              value: it.id,
            }))}
          />
  </Col>

  <Col span={12}>
          <Typography.Text>Qty</Typography.Text>
          <InputNumber className="w-full" min={1} value={qty} onChange={(value) => setQty(Number(value))} />
        </Col>
      </Row>

      <div style={{ marginTop: 16 }}>
        <Button type="primary" onClick={addToCart}>Add to cart</Button>
      </div>

  <div style={{ marginTop: 16 }}>
        <Table dataSource={cart} rowKey={(row) => `${row.inventoryId}-${row.quantity}-${Math.random()}`} pagination={false}>
          <Table.Column title="Item" dataIndex="inventoryId" key="inventoryId" render={(val: string) => items.find((it: { id: string, itemName?: string }) => it.id === val)?.itemName || 'Item'} />
          <Table.Column title="Qty" dataIndex="quantity" key="quantity" />
          <Table.Column title="Price" dataIndex="unitPrice" key="unitPrice" render={(v: number) => `$${v}`} />
        </Table>
      </div>

      <div style={{ marginTop: 16 }}>
        <div style={{ fontWeight: 700 }}>Total: ${total.toFixed(2)}</div>
        <Button type="primary" danger onClick={checkout} className="mt-2" disabled={cart.length === 0 || saleMutation.status === 'pending'}>
          {saleMutation.status === 'pending' ? 'Processing…' : 'Complete Sale'}
        </Button>
      </div>
    </div>
  )
}
