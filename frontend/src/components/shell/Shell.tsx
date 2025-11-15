"use client"

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Layout, Menu, Button, Avatar, Dropdown, Segmented } from 'antd'
import { useTheme } from '@/components/providers'
 
import { MenuFoldOutlined, MenuUnfoldOutlined, ShopOutlined, FileTextOutlined, UserOutlined, DashboardOutlined } from '@ant-design/icons'

const { Header, Sider, Content } = Layout

export default function Shell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false)
  const pathname = usePathname() || '/'
  const router = useRouter()

  useEffect(() => {
    function checkWidth() {
      setCollapsed(window.innerWidth < 768)
    }
    checkWidth()
    window.addEventListener('resize', checkWidth)
    return () => window.removeEventListener('resize', checkWidth)
  }, [])

  const userJson = typeof window !== 'undefined' ? localStorage.getItem('user') : null
  const user = userJson ? JSON.parse(userJson) : null

  const items: Array<{ key: string; icon: React.ReactNode; label: React.ReactNode }> = [
    { key: '/dashboard', icon: <DashboardOutlined />, label: <Link href="/dashboard">Dashboard</Link> },
    { key: '/dashboard/inventory', icon: <ShopOutlined />, label: <Link href="/dashboard/inventory">Inventory</Link> },
    { key: '/dashboard/pos', icon: <FileTextOutlined />, label: <Link href="/dashboard/pos">POS</Link> },
    { key: '/dashboard/sales', icon: <FileTextOutlined />, label: <Link href="/dashboard/sales">Sales</Link> },
  ]

  if (user && user.role === 'SUPER_ADMIN') {
    items.push({ key: '/admin/tenants', icon: <UserOutlined />, label: <Link href="/admin/tenants">Tenants</Link> })
  }

  const theme = useTheme()

  // If we're on the authentication route (login/register), don't render the shell
  if (pathname === '/login' || pathname === '/register') {
    return <>{children}</>
  }

  // choose selected key: exact or longest matching prefix
  const selectedKey = (() => {
    let matched: string | undefined
    for (const it of items) {
      if (pathname === it.key) return it.key
      if (pathname.startsWith(it.key + '/')) {
        if (!matched || it.key.length > matched.length) matched = it.key
      }
    }
    return matched || pathname
  })()

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider collapsible collapsed={collapsed} onCollapse={setCollapsed} breakpoint="md">
  <div style={{ color: '#fff', padding: 16, textAlign: 'center', fontWeight: 700, fontSize: '1.125rem' }}>SuperShop</div>
  <Menu theme="dark" mode="inline" items={items} selectedKeys={[selectedKey]} />
      </Sider>

      <Layout>
        <Header style={{ padding: 8, display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'space-between' }}>
          <div>
            <Button type="text" onClick={() => setCollapsed(!collapsed)} icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />} />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {user && (
              <Dropdown
                menu={{
                  items: [
                    { key: 'profile', label: <a onClick={() => router.push('/profile')}>Profile</a> },
                    {
                      key: 'logout',
                      label: (
                        <a
                          onClick={() => {
                            localStorage.removeItem('accessToken')
                            localStorage.removeItem('refreshToken')
                            localStorage.removeItem('user')
                            router.push('/login')
                          }}
                        >
                          Sign out
                        </a>
                      ),
                    },
                  ],
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Avatar style={{ backgroundColor: '#1890ff' }}>{(user?.fullName || 'U')[0]}</Avatar>
                  <div>{user?.fullName || user?.email}</div>
                </div>
              </Dropdown>
            )}
            {/* Theme selector */}
            <Segmented
              options={[{ label: 'System', value: 'system' }, { label: 'Light', value: 'light' }, { label: 'Dark', value: 'dark' }]}
              value={theme.mode}
              onChange={(val) => theme.setMode(val as 'system' | 'light' | 'dark')}
            />
          </div>
        </Header>

    <Content style={{ margin: 16, padding: 16, background: '#f0f2f5' }}>{children}</Content>
      </Layout>
    </Layout>
  )
}
