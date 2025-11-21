import { useState, useEffect, useCallback } from 'react';
import { Modal, Progress, Button, Space, Typography, Alert, List } from 'antd';
import { DatabaseOutlined, DeleteOutlined } from '@ant-design/icons';
import { useOffline } from './providers/offline-provider';

const { Text, Title } = Typography;

interface StorageInfo {
  used: number;
  available: number;
  percentage: number;
  status: 'normal' | 'warning' | 'error';
}

export function StorageMonitor() {
  const { getStorageUsage, clearStorage } = useOffline();
  const [storageInfo, setStorageInfo] = useState<StorageInfo | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);

  useEffect(() => {
    const checkStorage = async () => {
      const usage = await getStorageUsage();
      if (usage) {
        const percentage = (usage.used / usage.available) * 100;
        let status: 'normal' | 'warning' | 'error' = 'normal';

        if (percentage > 90) status = 'error';
        else if (percentage > 75) status = 'warning';

        setStorageInfo({
          ...usage,
          percentage,
          status
        });
      }
    };

    checkStorage();
    // Check storage every 5 minutes
    const interval = setInterval(checkStorage, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [getStorageUsage]);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const handleCleanup = async () => {
    setIsCleaning(true);
    try {
      await clearStorage();
      // Refresh storage info
      const usage = await getStorageUsage();
      if (usage) {
        const percentage = (usage.used / usage.available) * 100;
        setStorageInfo({
          ...usage,
          percentage,
          status: percentage > 90 ? 'error' : percentage > 75 ? 'warning' : 'normal'
        });
      }
    } catch (error) {
      console.error('Cleanup failed:', error);
    } finally {
      setIsCleaning(false);
    }
  };

  if (!storageInfo) return null;

  const getStatusColor = () => {
    switch (storageInfo.status) {
      case 'error': return '#ff4d4f';
      case 'warning': return '#faad14';
      default: return '#52c41a';
    }
  };

  const getStatusMessage = () => {
    switch (storageInfo.status) {
      case 'error':
        return 'Storage is critically low. Please clear old data.';
      case 'warning':
        return 'Storage is getting full. Consider cleaning up old data.';
      default:
        return 'Storage usage is normal.';
    }
  };

  return (
    <>
      <div
        style={{
          position: 'fixed',
          bottom: 24,
          left: 24,
          zIndex: 1000,
          cursor: 'pointer'
        }}
        onClick={() => setShowModal(true)}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: '#fff',
            padding: '8px 12px',
            borderRadius: '6px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            border: `2px solid ${getStatusColor()}`
          }}
        >
          <DatabaseOutlined style={{ color: getStatusColor() }} />
          <Text style={{ color: getStatusColor(), fontWeight: 500 }}>
            {Math.round(storageInfo.percentage)}%
          </Text>
        </div>
      </div>

      <Modal
        title="Storage Management"
        open={showModal}
        onCancel={() => setShowModal(false)}
        footer={[
          <Button key="close" onClick={() => setShowModal(false)}>
            Close
          </Button>
        ]}
        width={500}
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <div>
            <Title level={4}>Storage Usage</Title>
            <Progress
              percent={Math.round(storageInfo.percentage)}
              status={storageInfo.status === 'error' ? 'exception' : 'active'}
              strokeColor={getStatusColor()}
            />
            <div style={{ marginTop: '8px' }}>
              <Text>
                {formatBytes(storageInfo.used)} of {formatBytes(storageInfo.available)} used
              </Text>
            </div>
          </div>

          <Alert
            message="Storage Status"
            description={getStatusMessage()}
            type={storageInfo.status === 'error' ? 'error' : storageInfo.status === 'warning' ? 'warning' : 'info'}
            showIcon
          />

          <div>
            <Title level={5}>Cleanup Actions</Title>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Text type="secondary">
                Clearing storage will remove cached data, offline queue, and temporary files.
                Your core data will remain intact.
              </Text>

              <List size="small">
                <List.Item>
                  <Space>
                    <DeleteOutlined />
                    <div>
                      <Text strong>Clear Offline Cache</Text>
                      <br />
                      <Text type="secondary">Remove cached API responses and temporary data</Text>
                    </div>
                  </Space>
                </List.Item>
                <List.Item>
                  <Space>
                    <DeleteOutlined />
                    <div>
                      <Text strong>Clear IndexedDB</Text>
                      <br />
                      <Text type="secondary">Remove local database (use with caution)</Text>
                    </div>
                  </Space>
                </List.Item>
                <List.Item>
                  <Space>
                    <DeleteOutlined />
                    <div>
                      <Text strong>Clear Service Worker Cache</Text>
                      <br />
                      <Text type="secondary">Remove cached static assets</Text>
                    </div>
                  </Space>
                </List.Item>
              </List>

              <Button
                type="primary"
                danger
                loading={isCleaning}
                onClick={handleCleanup}
                icon={<DeleteOutlined />}
                block
              >
                {isCleaning ? 'Cleaning...' : 'Clear All Storage'}
              </Button>
            </Space>
          </div>
        </Space>
      </Modal>
    </>
  );
}

// Hook for programmatic storage monitoring
export function useStorageMonitor() {
  const { getStorageUsage, clearStorage } = useOffline();
  const [storageInfo, setStorageInfo] = useState<StorageInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const refreshStorage = useCallback(async () => {
    setIsLoading(true);
    try {
      const usage = await getStorageUsage();
      if (usage) {
        const percentage = (usage.used / usage.available) * 100;
        setStorageInfo({
          ...usage,
          percentage,
          status: percentage > 90 ? 'error' : percentage > 75 ? 'warning' : 'normal'
        });
      }
    } finally {
      setIsLoading(false);
    }
  }, [getStorageUsage]);

  const cleanup = async () => {
    setIsLoading(true);
    try {
      await clearStorage();
      await refreshStorage(); // Refresh after cleanup
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshStorage();
  }, [refreshStorage]);

  return {
    storageInfo,
    isLoading,
    refreshStorage,
    cleanup
  };
}