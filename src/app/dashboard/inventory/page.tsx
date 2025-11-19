import dynamic from 'next/dynamic'
import { Card } from 'antd'

const InventoryClient = dynamic(() => import('@/components/inventory/InventoryClient'), {
  ssr: false,
})

export default function InventoryPage() {
  return (
    <div style={{ maxWidth: 1080, margin: '0 auto' }}>
        <Card title="Inventory">
          <InventoryClient />
        </Card>
      </div>
  
  )
}
