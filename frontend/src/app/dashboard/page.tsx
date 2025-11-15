import dynamic from 'next/dynamic'
import { Card } from 'antd'

const DashboardClient = dynamic(() => import('@/components/dashboard/DashboardClient'), { ssr: false })

export default function DashboardPage() {
  return (
    <div style={{ maxWidth: 960, margin: '0 auto' }}>
      <Card title="Dashboard" bordered>
          <h1 className="text-2xl font-semibold mb-4">Dashboard</h1>
          <DashboardClient />
      </Card>
    </div>
  )
}
