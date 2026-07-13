import { Component, lazy, type ComponentType, type LazyExoticComponent } from 'react';

/**
 * Wraps a dynamic import with a single retry. If the first attempt fails
 * (e.g. the chunk was 404 because a new deploy changed the hash), it
 * retries once. This handles the common case where the browser has cached
 * an old index.html that references a stale chunk filename.
 */
export function lazyWithRetry<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>
): LazyExoticComponent<T> {
  return lazy(async () => {
    try {
      return await importFn();
    } catch (err: any) {
      // Only retry on network / module-load errors, not on code errors
      const isChunkError =
        err?.name === 'TypeError' ||
        err?.message?.includes('Failed to fetch dynamically imported module') ||
        err?.message?.includes('Importing a module script failed') ||
        err?.message?.includes('error loading dynamically imported module');

      if (!isChunkError) throw err;

      // Retry once — the browser cache may have served a stale index.html
      // and the chunk hash changed after a deploy. A second attempt will
      // either hit the browser cache for the new chunk or fetch it fresh.
      await new Promise((resolve) => setTimeout(resolve, 100));
      return await importFn();
    }
  });
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error boundary that catches "Failed to fetch dynamically imported module"
 * errors (which happen when a stale chunk hash is referenced after a deploy)
 * and automatically reloads the page so the browser picks up the new
 * index.html with updated chunk hashes.
 */
export class LazyImportErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error) {
    const isChunkError =
      error?.message?.includes('Failed to fetch dynamically imported module') ||
      error?.message?.includes('Importing a module script failed') ||
      error?.message?.includes('error loading dynamically imported module') ||
      error?.name === 'TypeError';

    if (isChunkError) {
      // The app was likely updated and the old chunk no longer exists.
      // Reload the page to pick up the new index.html with fresh hashes.
      // Use a hard reload to bypass cache.
      if (typeof window !== 'undefined') {
        // Brief delay so the user sees the loading state, not a blank flash
        setTimeout(() => {
          window.location.reload();
        }, 300);
      }
    }
  }

  render() {
    if (this.state.hasError) {
      const isChunkError =
        this.state.error?.message?.includes('Failed to fetch dynamically imported module') ||
        this.state.error?.message?.includes('Importing a module script failed') ||
        this.state.error?.message?.includes('error loading dynamically imported module');

      if (isChunkError) {
        return (
          <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 p-6 text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
            <p className="text-sm text-muted-foreground">
              Updating app… Reloading automatically.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="text-sm font-medium text-primary underline"
            >
              Click here if it doesn't reload
            </button>
          </div>
        );
      }

      // For non-chunk errors, show a generic error message
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 p-6 text-center">
          <p className="text-sm font-medium text-foreground">
            Something went wrong.
          </p>
          <p className="text-xs text-muted-foreground max-w-md">
            {this.state.error?.message || 'An unexpected error occurred.'}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="text-sm font-medium text-primary underline"
          >
            Reload page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
