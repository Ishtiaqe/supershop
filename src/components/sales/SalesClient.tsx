"use client"

import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import { Table } from 'antd'
import type { Sale } from '@/types'

function fetchSales() {
  return api.get('/sales').then((rowData) => rowData.data)
}

export default function SalesClient() {
  const { data: sales = [], isLoading } = useQuery({ queryKey: ['sales'], queryFn: fetchSales })
  const userJson = typeof window !== 'undefined' ? localStorage.getItem('user') : null
  const user = userJson ? JSON.parse(userJson) : null

  if (!user || (user.role !== 'OWNER' && user.role !== 'EMPLOYEE')) {
    return <div className="p-6">Access denied — Owners and employees only</div>
  }

  return (
    <div>
      {isLoading && <div>Loading…</div>}
      <Table dataSource={sales} rowKey={(r: { id: string }) => r.id} pagination={{ pageSize: 10 }}>
        <Table.Column title="Receipt" dataIndex="receiptNumber" key="receiptNumber" />
        <Table.Column title="Time" dataIndex="saleTime" key="saleTime" render={(t: string) => new Date(t).toLocaleString()} />
        <Table.Column title="Total" dataIndex="totalAmount" key="totalAmount" render={(t: number) => `৳${t.toFixed(2)}`} />
        <Table.Column
          title="Employee"
          dataIndex="employee"
          key="employee"
          render={(e: string | { fullName?: string } | undefined, record: Sale) => {
            if (typeof e === 'string') return e
            if (e && typeof e === 'object' && 'fullName' in e && e.fullName) return e.fullName
            // fallbacks if employee info is stored differently on the record
            return record?.employeeName ?? record?.employeeFullName ?? 'Cashier'
          }}
        />
      </Table>
    </div>
  )
}
