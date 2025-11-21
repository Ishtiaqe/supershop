import React, { useState, useEffect } from 'react';
import { notification, Button, Progress, Modal, Space, Typography, Alert } from 'antd';
import { WifiOutlined, DisconnectOutlined, SyncOutlined } from '@ant-design/icons';
import { useOffline } from './providers/offline-provider';

const { Text } = Typography;

export function OfflineIndicator() {
  const { isOnline, isSyncing, lastSyncTime } = useOffline();
  const [showOfflineModal, setShowOfflineModal] = useState(false);
  const [lastNotification, setLastNotification] = useState<number>(0);

  useEffect(() => {
    const now = Date.now();

    // Show notification when going offline (max once per minute)
    if (!isOnline && now - lastNotification > 60000) {
      notification.warning({
        message: 'You are offline',
        description: 'Some features may be limited. Your data will sync when connection returns.',
        duration: 4,
        icon: <DisconnectOutlined style={{ color: '#ff4d4f' }} />
      });
      setLastNotification(now);
    }

    // Show notification when coming back online
    if (isOnline && !isSyncing && lastSyncTime && now - lastSyncTime > 30000) {
      notification.success({
        message: 'Back online',
        description: 'Syncing your data...',
        duration: 3,
        icon: <WifiOutlined style={{ color: '#52c41a' }} />
      });
    }
  }, [isOnline, isSyncing, lastSyncTime, lastNotification]);

  const getStatusColor = () => {
    if (!isOnline) return '#ff4d4f';
    if (isSyncing) return '#faad14';
    return '#52c41a';
  };

  const getStatusText = () => {
    if (!isOnline) return 'Offline';
    if (isSyncing) return 'Syncing...';
    return 'Online';
  };

  const getStatusIcon = () => {
    if (!isOnline) return <DisconnectOutlined />;
    if (isSyncing) return <SyncOutlined spin />;
    return <WifiOutlined />;
  };

  return (
    <>
      <div
        style={{
          position: 'fixed',
          top: 64,
          right: 24,
          zIndex: 1000,
          cursor: 'pointer'
        }}
        onClick={() => setShowOfflineModal(true)}
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
          {getStatusIcon()}
          <Text style={{ color: getStatusColor(), fontWeight: 500 }}>
            {getStatusText()}
          </Text>
        </div>
      </div>

      <Modal
        title="Connection Status"
        open={showOfflineModal}
        onCancel={() => setShowOfflineModal(false)}
        footer={[
          <Button key="close" onClick={() => setShowOfflineModal(false)}>
            Close
          </Button>
        ]}
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <Alert
            message={getStatusText()}
            description={
              !isOnline
                ? "You're currently offline. Your changes will be saved locally and synced when connection returns."
                : isSyncing
                ? "Syncing your data with the server..."
                : "You're online and all data is synchronized."
            }
            type={!isOnline ? 'warning' : isSyncing ? 'info' : 'success'}
            showIcon
          />

          {lastSyncTime && (
            <div>
              <Text strong>Last synced: </Text>
              <Text>{new Date(lastSyncTime).toLocaleString()}</Text>
            </div>
          )}

          {!isOnline && (
            <Alert
              message="Offline Capabilities"
              description="You can continue working with inventory, sales, and products. All changes will be queued for sync."
              type="info"
              showIcon
            />
          )}
        </Space>
      </Modal>
    </>
  );
}

export function SyncStatus() {
  const { isSyncing, offlineStatus } = useOffline();
  const [syncProgress, setSyncProgress] = useState(0);

  useEffect(() => {
    if (isSyncing) {
      // Simulate progress (in real implementation, this would come from sync events)
      const interval = setInterval(() => {
        setSyncProgress(prev => {
          if (prev >= 90) return prev;
          return prev + Math.random() * 10;
        });
      }, 500);

      return () => clearInterval(interval);
    } else {
      setSyncProgress(0);
    }
  }, [isSyncing]);

  if (!isSyncing) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        zIndex: 1000,
        background: '#fff',
        padding: '16px',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        minWidth: '300px'
      }}
    >
      <Space direction="vertical" style={{ width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <SyncOutlined spin style={{ color: '#1890ff' }} />
          <Text strong>Syncing data...</Text>
        </div>

        <Progress
          percent={Math.round(syncProgress)}
          status="active"
          strokeColor="#1890ff"
          showInfo={false}
        />

        <Text type="secondary" style={{ fontSize: '12px' }}>
          {offlineStatus.pendingOperations > 0
            ? `${offlineStatus.pendingOperations} operations pending`
            : 'Synchronizing with server...'
          }
        </Text>
      </Space>
    </div>
  );
}

export function OfflineNotification() {
  const { isOnline, forceSync } = useOffline();
  const [lastOfflineNotification, setLastOfflineNotification] = useState(0);

  useEffect(() => {
    if (!isOnline) {
      const now = Date.now();
      // Only show notification once every 5 minutes when offline
      if (now - lastOfflineNotification > 300000) {
        notification.warning({
          message: 'Offline Mode Active',
          description: 'You can continue working. Data will sync automatically when online.',
          duration: 0, // Don't auto-close
          btn: (
            <Button
              size="small"
              onClick={() => {
                forceSync();
                notification.destroy();
              }}
            >
              Try Sync Now
            </Button>
          ),
          key: 'offline-notification'
        });
        setLastOfflineNotification(now);
      }
    } else {
      // Clear offline notification when back online
      notification.destroy('offline-notification');
    }
  }, [isOnline, forceSync, lastOfflineNotification]);

  return null; // This component only manages notifications
}