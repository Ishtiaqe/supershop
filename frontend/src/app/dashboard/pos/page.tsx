import dynamic from 'next/dynamic'
import { Card } from 'antd'

const POSClient = dynamic(() => import('@/components/pos/POSClient'), { ssr: false })

export default function POSPage() {
  return (
    <div style={{ maxWidth: 960, margin: '0 auto' }}>
        <Card title="Point of Sale" bordered>
          <POSClient />
        </Card>
      </div>
  
  )
}
