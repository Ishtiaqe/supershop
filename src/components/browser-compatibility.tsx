import { useState, useEffect } from 'react';
import { Alert, Button, Modal, Space, Typography } from 'antd';
import { ChromeOutlined, FireOutlined, AppleOutlined } from '@ant-design/icons';

const { Text, Title } = Typography;

interface BrowserSupport {
  indexedDB: boolean;
  serviceWorker: boolean;
  backgroundSync: boolean;
  cacheAPI: boolean;
  webGL: boolean;
  webRTC: boolean;
  overall: 'full' | 'limited' | 'minimal' | 'unsupported';
}

export function BrowserCompatibilityCheck() {
  const [browserSupport, setBrowserSupport] = useState<BrowserSupport | null>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    const checkBrowserSupport = (): BrowserSupport => {
      const support: BrowserSupport = {
        indexedDB: !!window.indexedDB,
        serviceWorker: 'serviceWorker' in navigator,
        backgroundSync: 'serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype,
        cacheAPI: 'caches' in window,
        webGL: (() => {
          try {
            const canvas = document.createElement('canvas');
            return !!(window.WebGLRenderingContext && canvas.getContext('webgl'));
          } catch {
            return false;
          }
        })(),
        webRTC: !!(window.RTCPeerConnection || (window as Window & { webkitRTCPeerConnection?: typeof RTCPeerConnection }).webkitRTCPeerConnection),
        overall: 'unsupported'
      };

      // Determine overall support level
      if (support.indexedDB && support.serviceWorker && support.cacheAPI) {
        if (support.backgroundSync) {
          support.overall = 'full';
        } else {
          support.overall = 'limited';
        }
      } else if (support.indexedDB) {
        support.overall = 'minimal';
      }

      return support;
    };

    setBrowserSupport(checkBrowserSupport());
  }, []);

  if (!browserSupport) return null;

  const getSupportMessage = () => {
    switch (browserSupport.overall) {
      case 'full':
        return {
          type: 'success' as const,
          title: 'Full Offline Support',
          message: 'Your browser fully supports all offline features including background sync.'
        };
      case 'limited':
        return {
          type: 'warning' as const,
          title: 'Limited Offline Support',
          message: 'Offline features work but background sync is not available. You\'ll need to manually sync when reopening the app.'
        };
      case 'minimal':
        return {
          type: 'warning' as const,
          title: 'Basic Offline Support',
          message: 'Only basic offline storage is available. Advanced features may not work properly.'
        };
      case 'unsupported':
        return {
          type: 'error' as const,
          title: 'Offline Features Not Supported',
          message: 'Your browser doesn\'t support offline features. Please use a modern browser for the best experience.'
        };
    }
  };

  const support = getSupportMessage();

  // Only show warning/error states
  if (support.type === 'success') return null;

  return (
    <>
      <Alert
        message={support.title}
        description={support.message}
        type={support.type}
        showIcon
        closable
        action={
          <Button size="small" onClick={() => setShowModal(true)}>
            Details
          </Button>
        }
        style={{
          position: 'fixed',
          top: 16,
          left: 16,
          right: 16,
          zIndex: 1000,
          maxWidth: '600px'
        }}
      />

      <Modal
        title="Browser Compatibility Details"
        open={showModal}
        onCancel={() => setShowModal(false)}
        footer={[
          <Button key="close" onClick={() => setShowModal(false)}>
            Close
          </Button>
        ]}
        width={600}
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <div>
            <Title level={4}>Feature Support</Title>
            <Space direction="vertical" style={{ width: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text>IndexedDB (Offline Storage)</Text>
                <Text style={{ color: browserSupport.indexedDB ? 'hsl(var(--success))' : 'hsl(var(--destructive))' }}>
                  {browserSupport.indexedDB ? '✅ Supported' : '❌ Not Supported'}
                </Text>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text>Service Workers (Background Processing)</Text>
                <Text style={{ color: browserSupport.serviceWorker ? 'hsl(var(--success))' : 'hsl(var(--destructive))' }}>
                  {browserSupport.serviceWorker ? '✅ Supported' : '❌ Not Supported'}
                </Text>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text>Background Sync (Auto-sync)</Text>
                <Text style={{ color: browserSupport.backgroundSync ? 'hsl(var(--success))' : 'hsl(var(--warning))' }}>
                  {browserSupport.backgroundSync ? '✅ Supported' : '⚠️ Not Supported'}
                </Text>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text>Cache API (Asset Caching)</Text>
                <Text style={{ color: browserSupport.cacheAPI ? 'hsl(var(--success))' : 'hsl(var(--destructive))' }}>
                  {browserSupport.cacheAPI ? '✅ Supported' : '❌ Not Supported'}
                </Text>
              </div>
            </Space>
          </div>

          <Alert
            message="Recommended Browsers"
            description={
              <Space direction="vertical">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ChromeOutlined style={{ color: 'hsl(var(--primary))' }} />
                  <Text>Chrome 90+ (Full support)</Text>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FireOutlined style={{ color: 'hsl(var(--brand-firefox))' }} />
                  <Text>Firefox 88+ (Full support)</Text>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AppleOutlined style={{ color: 'hsl(var(--foreground))' }} />
                  <Text>Safari 14+ (Limited support - no background sync)</Text>
                </div>
              </Space>
            }
            type="info"
            showIcon
          />

          {browserSupport.overall === 'unsupported' && (
            <Alert
              message="Fallback Mode"
              description="The app will work in online-only mode with basic functionality. Consider upgrading your browser for the full experience."
              type="warning"
              showIcon
            />
          )}
        </Space>
      </Modal>
    </>
  );
}

// Progressive enhancement utilities
export function useProgressiveEnhancement() {
  const [capabilities, setCapabilities] = useState({
    offlineStorage: false,
    backgroundSync: false,
    serviceWorker: false,
    advancedCaching: false
  });

  useEffect(() => {
    const checkCapabilities = () => {
      setCapabilities({
        offlineStorage: !!window.indexedDB,
        backgroundSync: 'serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype,
        serviceWorker: 'serviceWorker' in navigator,
        advancedCaching: 'caches' in window && 'serviceWorker' in navigator
      });
    };

    checkCapabilities();
  }, []);

  return capabilities;
}

// Fallback component for unsupported browsers
export function OfflineFallback() {
  const capabilities = useProgressiveEnhancement();

  if (capabilities.offlineStorage) return null; // Basic offline support available

  return (
    <Alert
      message="Limited Browser Support"
      description="Your browser has limited offline capabilities. The app will work but offline features are not available. For the best experience, please use a modern browser like Chrome or Firefox."
      type="warning"
      showIcon
      closable
      style={{
        position: 'fixed',
        top: 16,
        left: 16,
        right: 16,
        zIndex: 1000
      }}
    />
  );
}