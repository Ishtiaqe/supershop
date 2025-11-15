"use client"

import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import { Row, Col, Card } from 'antd'

function fetchDashboard() {
  return api.get('/tenants/metrics/dashboard').then((res) => res.data)
}

export default function DashboardClient() {
  const { data, isLoading, error } = useQuery({ queryKey: ['dashboard'], queryFn: fetchDashboard })

  return (
    <>
      {isLoading && <div>Loading metrics…</div>}

      {error && (
        <div className="text-red-700 bg-red-100 p-2 rounded">Unable to load dashboard</div>
      )}

      {data && (
        <Row gutter={16}>
          <Col span={8}>
            <Card>
              <div className="text-sm text-gray-500">Total Sales</div>
              <div className="text-xl font-bold">{data.overview?.totalSales ?? 0}</div>
            </Card>
          </Col>

          <Col span={8}>
            <Card>
              <div className="text-sm text-gray-500">Total Revenue</div>
              <div className="text-xl font-bold">${data.overview?.totalRevenue ?? 0}</div>
            </Card>
          </Col>

          <Col span={8}>
            <Card>
              <div className="text-sm text-gray-500">Inventory Items</div>
              <div className="text-xl font-bold">{data.inventory?.totalItems ?? 0}</div>
            </Card>
          </Col>
        </Row>
      )}
    </>
  )
}
