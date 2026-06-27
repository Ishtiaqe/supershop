'use client';

import { useState, useEffect } from 'react';
import { Chrome, Apple } from 'lucide-react';

// Import shadcn UI components
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

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
        backgroundSync: 'serviceWorker' in navigator && 'sync' in ServiceWorkerRegistration.prototype,
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
          variant: 'default' as const,
          title: 'Full Offline Support',
          message: 'Your browser fully supports all offline features including background sync.'
        };
      case 'limited':
        return {
          variant: 'warning' as const,
          title: 'Limited Offline Support',
          message: "Offline features work but background sync is not available. You'll need to manually sync when reopening the app."
        };
      case 'minimal':
        return {
          variant: 'warning' as const,
          title: 'Basic Offline Support',
          message: 'Only basic offline storage is available. Advanced features may not work properly.'
        };
      case 'unsupported':
        return {
          variant: 'destructive' as const,
          title: 'Offline Features Not Supported',
          message: "Your browser doesn't support offline features. Please use a modern browser for the best experience."
        };
    }
  };

  const support = getSupportMessage();

  if (browserSupport.overall === 'full') return null;

  return (
    <>
      <div className="fixed top-4 left-4 right-4 z-50 max-w-[600px] mx-auto">
        <Alert variant={support.variant === 'destructive' ? 'destructive' : 'default'} className="bg-background border shadow-md">
          <AlertTitle className="flex items-center justify-between font-semibold">
            <span>{support.title}</span>
            <Button size="sm" variant="outline" onClick={() => setShowModal(true)} className="ml-4 h-7 text-xs">
              Details
            </Button>
          </AlertTitle>
          <AlertDescription className="mt-1 text-xs text-muted-foreground">
            {support.message}
          </AlertDescription>
        </Alert>
      </div>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Browser Compatibility Details</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <h4 className="font-semibold text-sm text-foreground">Feature Support</h4>
            <div className="space-y-2.5 text-sm">
              <div className="flex justify-between items-center border-b pb-1.5">
                <span className="text-muted-foreground">IndexedDB (Offline Storage)</span>
                <span className={browserSupport.indexedDB ? 'text-emerald-600 font-medium' : 'text-destructive font-medium'}>
                  {browserSupport.indexedDB ? '✅ Supported' : '❌ Not Supported'}
                </span>
              </div>

              <div className="flex justify-between items-center border-b pb-1.5">
                <span className="text-muted-foreground">Service Workers (Background Processing)</span>
                <span className={browserSupport.serviceWorker ? 'text-emerald-600 font-medium' : 'text-destructive font-medium'}>
                  {browserSupport.serviceWorker ? '✅ Supported' : '❌ Not Supported'}
                </span>
              </div>

              <div className="flex justify-between items-center border-b pb-1.5">
                <span className="text-muted-foreground">Background Sync (Auto-sync)</span>
                <span className={browserSupport.backgroundSync ? 'text-emerald-600 font-medium' : 'text-amber-600 font-medium'}>
                  {browserSupport.backgroundSync ? '✅ Supported' : '⚠️ Not Supported'}
                </span>
              </div>

              <div className="flex justify-between items-center pb-1.5">
                <span className="text-muted-foreground">Cache API (Asset Caching)</span>
                <span className={browserSupport.cacheAPI ? 'text-emerald-600 font-medium' : 'text-destructive font-medium'}>
                  {browserSupport.cacheAPI ? '✅ Supported' : '❌ Not Supported'}
                </span>
              </div>
            </div>

            <div className="rounded-lg border p-4 bg-muted/20 space-y-3">
              <h5 className="font-medium text-xs text-muted-foreground">Recommended Browsers</h5>
              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-2">
                  <Chrome className="w-4 h-4 text-primary" />
                  <span className="text-foreground font-medium">Chrome 90+</span>
                  <span className="text-muted-foreground">(Full support)</span>
                </div>
                <div className="flex items-center gap-2">
                  <Apple className="w-4 h-4 text-foreground" />
                  <span className="text-foreground font-medium">Safari 14+</span>
                  <span className="text-muted-foreground">(Limited support - no background sync)</span>
                </div>
              </div>
            </div>

            {browserSupport.overall === 'unsupported' && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                <span className="font-semibold">Fallback Mode:</span> The app will work in online-only mode with basic functionality. Consider upgrading your browser for the full experience.
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" onClick={() => setShowModal(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

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
        backgroundSync: 'serviceWorker' in navigator && 'sync' in ServiceWorkerRegistration.prototype,
        serviceWorker: 'serviceWorker' in navigator,
        advancedCaching: 'caches' in window && 'serviceWorker' in navigator
      });
    };

    checkCapabilities();
  }, []);

  return capabilities;
}

export function OfflineFallback() {
  const capabilities = useProgressiveEnhancement();

  if (capabilities.offlineStorage) return null;

  return (
    <div className="fixed top-4 left-4 right-4 z-50 max-w-[600px] mx-auto">
      <Alert variant="destructive" className="bg-background border shadow-md">
        <AlertTitle className="font-semibold">Limited Browser Support</AlertTitle>
        <AlertDescription className="mt-1 text-xs text-muted-foreground">
          Your browser has limited offline capabilities. The app will work but offline features are not available. For the best experience, please use a modern browser like Chrome or Firefox.
        </AlertDescription>
      </Alert>
    </div>
  );
}