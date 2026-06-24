import { useState, useEffect } from 'react';
import { Button, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from '@heroui/react';
import { Chrome, Flame, Apple, X } from 'lucide-react';

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

  const getAlertStyles = () => {
    switch (support.type) {
      case 'warning':
        return 'border-yellow-500 bg-yellow-50 dark:bg-yellow-950';
      case 'error':
        return 'border-red-500 bg-red-50 dark:bg-red-950';
      default:
        return 'border-blue-500 bg-blue-50 dark:bg-blue-950';
    }
  };

  const getAlertTextColor = () => {
    switch (support.type) {
      case 'warning':
        return 'text-yellow-800 dark:text-yellow-200';
      case 'error':
        return 'text-red-800 dark:text-red-200';
      default:
        return 'text-blue-800 dark:text-blue-200';
    }
  };

  const getAlertIcon = () => {
    switch (support.type) {
      case 'warning':
        return '⚠️';
      case 'error':
        return '❌';
      default:
        return 'ℹ️';
    }
  };

  return (
    <>
      <div
        className={`fixed top-4 left-4 right-4 mx-auto max-w-[600px] border-l-4 rounded-md p-4 z-[1000] flex items-start justify-between ${getAlertStyles()} ${getAlertTextColor()}`}
      >
        <div className="flex items-start gap-3 flex-1">
          <span className="text-lg flex-shrink-0">{getAlertIcon()}</span>
          <div className="flex-1">
            <h3 className="font-semibold text-sm">{support.title}</h3>
            <p className="text-sm mt-1 opacity-90">{support.message}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 ml-4 flex-shrink-0">
          <Button
            isIconOnly
            variant="light"
            size="sm"
            className="text-inherit"
            onClick={() => setShowModal(true)}
          >
            Details
          </Button>
          <Button
            isIconOnly
            variant="light"
            size="sm"
            className="text-inherit"
            onClick={() => {}}
          >
            <X size={16} />
          </Button>
        </div>
      </div>

      <Modal isOpen={showModal} onOpenChange={setShowModal} size="lg">
        <ModalContent>
          <ModalHeader className="flex flex-col gap-1">Browser Compatibility Details</ModalHeader>
          <ModalBody className="gap-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Feature Support</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
                  <span className="text-sm">IndexedDB (Offline Storage)</span>
                  <span className={`text-sm font-medium ${browserSupport.indexedDB ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {browserSupport.indexedDB ? '✅ Supported' : '❌ Not Supported'}
                  </span>
                </div>

                <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
                  <span className="text-sm">Service Workers (Background Processing)</span>
                  <span className={`text-sm font-medium ${browserSupport.serviceWorker ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {browserSupport.serviceWorker ? '✅ Supported' : '❌ Not Supported'}
                  </span>
                </div>

                <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
                  <span className="text-sm">Background Sync (Auto-sync)</span>
                  <span className={`text-sm font-medium ${browserSupport.backgroundSync ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400'}`}>
                    {browserSupport.backgroundSync ? '✅ Supported' : '⚠️ Not Supported'}
                  </span>
                </div>

                <div className="flex justify-between items-center py-2">
                  <span className="text-sm">Cache API (Asset Caching)</span>
                  <span className={`text-sm font-medium ${browserSupport.cacheAPI ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {browserSupport.cacheAPI ? '✅ Supported' : '❌ Not Supported'}
                  </span>
                </div>
              </div>
            </div>

            <div className="border-l-4 border-blue-500 bg-blue-50 dark:bg-blue-950 p-4 rounded-r-md">
              <h4 className="font-semibold text-sm text-blue-900 dark:text-blue-200 mb-3">Recommended Browsers</h4>
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <Chrome size={20} className="text-blue-600 dark:text-blue-400 flex-shrink-0" />
                  <span className="text-sm text-blue-800 dark:text-blue-300">Chrome 90+ (Full support)</span>
                </div>
                <div className="flex items-center gap-3">
                  <Flame size={20} className="text-orange-600 dark:text-orange-400 flex-shrink-0" />
                  <span className="text-sm text-blue-800 dark:text-blue-300">Firefox 88+ (Full support)</span>
                </div>
                <div className="flex items-center gap-3">
                  <Apple size={20} className="text-gray-700 dark:text-gray-300 flex-shrink-0" />
                  <span className="text-sm text-blue-800 dark:text-blue-300">Safari 14+ (Limited support - no background sync)</span>
                </div>
              </div>
            </div>

            {browserSupport.overall === 'unsupported' && (
              <div className="border-l-4 border-yellow-500 bg-yellow-50 dark:bg-yellow-950 p-4 rounded-r-md">
                <h4 className="font-semibold text-sm text-yellow-900 dark:text-yellow-200 mb-2">Fallback Mode</h4>
                <p className="text-sm text-yellow-800 dark:text-yellow-300">
                  The app will work in online-only mode with basic functionality. Consider upgrading your browser for the full experience.
                </p>
              </div>
            )}
          </ModalBody>
          <ModalFooter>
            <Button color="primary" onPress={() => setShowModal(false)}>
              Close
            </Button>
          </ModalFooter>
        </ModalContent>
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
  const [isVisible, setIsVisible] = useState(true);
  const capabilities = useProgressiveEnhancement();

  if (capabilities.offlineStorage || !isVisible) return null; // Basic offline support available

  return (
    <div className="fixed top-4 left-4 right-4 mx-auto z-[1000] max-w-[600px] border-l-4 border-yellow-500 bg-yellow-50 dark:bg-yellow-950 rounded-r-md p-4 flex items-start justify-between text-yellow-800 dark:text-yellow-200">
      <div className="flex items-start gap-3 flex-1">
        <span className="text-lg flex-shrink-0">⚠️</span>
        <div className="flex-1">
          <h3 className="font-semibold text-sm">Limited Browser Support</h3>
          <p className="text-sm mt-1 opacity-90">
            Your browser has limited offline capabilities. The app will work but offline features are not available. For the best experience, please use a modern browser like Chrome or Firefox.
          </p>
        </div>
      </div>
      <Button
        isIconOnly
        variant="light"
        size="sm"
        className="text-inherit flex-shrink-0 ml-4"
        onClick={() => setIsVisible(false)}
      >
        <X size={16} />
      </Button>
    </div>
  );
}