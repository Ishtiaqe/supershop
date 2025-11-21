import React, { useState } from 'react';
import { Card, Row, Col, Statistic, Progress, Button, Space, Typography, List } from 'antd';
import { SyncOutlined, ClockCircleOutlined, WarningOutlined } from '@ant-design/icons';
import { useOfflineAnalytics } from '../lib/offline-analytics';

const { Title, Text } = Typography;

export function OfflineAnalyticsDashboard() {
  const analytics = useOfflineAnalytics();
  const [stats, setStats] = useState(analytics.getStats());
  const [events, setEvents] = useState(analytics.getEvents(20));

  const refreshData = () => {
    setStats(analytics.getStats());
    setEvents(analytics.getEvents(20));
  };

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  return (
    <div style={{ padding: '24px' }}>
      <Space direction="vertical" style={{ width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Title level={3}>Offline Analytics</Title>
          <Space>
            <Button onClick={refreshData}>Refresh</Button>
            <Button danger onClick={analytics.clearData}>Clear Data</Button>
          </Space>
        </div>

        <Row gutter={16}>
          <Col span={6}>
            <Card>
              <Statistic
                title="Total Offline Time"
                value={formatTime(stats.totalOfflineTime)}
                prefix={<ClockCircleOutlined />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="Sync Success Rate"
                value={analytics.getSyncSuccessRate()}
                suffix="%"
                prefix={<SyncOutlined />}
                valueStyle={{ color: analytics.getSyncSuccessRate() > 80 ? '#3f8600' : '#cf1322' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="Total Syncs"
                value={stats.syncAttempts}
                prefix={<SyncOutlined />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="Storage Issues"
                value={stats.storageWarnings + stats.storageErrors}
                prefix={<WarningOutlined />}
                valueStyle={{ color: stats.storageErrors > 0 ? '#cf1322' : '#faad14' }}
              />
            </Card>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Card title="Sync Performance" size="small">
              <Space direction="vertical" style={{ width: '100%' }}>
                <div>
                  <Text strong>Successful Syncs: </Text>
                  <Text>{stats.syncSuccesses}</Text>
                </div>
                <div>
                  <Text strong>Failed Syncs: </Text>
                  <Text>{stats.syncFailures}</Text>
                </div>
                <div>
                  <Text strong>Average Sync Time: </Text>
                  <Text>{formatTime(stats.totalSyncTime / Math.max(1, stats.syncAttempts))}</Text>
                </div>
                <Progress
                  percent={analytics.getSyncSuccessRate()}
                  status={analytics.getSyncSuccessRate() > 80 ? 'success' : 'exception'}
                  showInfo={false}
                />
              </Space>
            </Card>
          </Col>
          <Col span={12}>
            <Card title="Recent Events" size="small">
              <List
                size="small"
                dataSource={events.slice(-10)}
                renderItem={(event) => (
                  <List.Item>
                    <Space>
                      <Text style={{ fontSize: '12px', color: '#666' }}>
                        {new Date(event.timestamp).toLocaleTimeString()}
                      </Text>
                      <Text>{event.type.replace('_', ' ').toUpperCase()}</Text>
                    </Space>
                  </List.Item>
                )}
              />
            </Card>
          </Col>
        </Row>
      </Space>
    </div>
  );
}