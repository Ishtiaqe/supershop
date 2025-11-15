import dynamic from 'next/dynamic'
import { Card } from 'antd'

const SalesClient = dynamic(() => import('@/components/sales/SalesClient'), { ssr: false })

export default function SalesPage() {
    return (
                <div style={{ maxWidth: 960, margin: '0 auto' }}>
                    <Card title="Sales history" bordered>
                        <SalesClient />
                    </Card>
                </div>
  
    )
}
