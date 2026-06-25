import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    plugins: [
      react(),
      VitePWA({
        strategies: 'injectManifest',
        srcDir: 'src',
        filename: 'sw.js',
        registerType: 'autoUpdate',
        // Use existing public/manifest.json — Vite copies it to dist automatically
        manifest: false,
        injectManifest: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    define: {
      'process.env.NEXT_PUBLIC_API_URL': JSON.stringify(env.NEXT_PUBLIC_API_URL),
      'process.env.NEXT_PUBLIC_API_URL_BACKUP': JSON.stringify(env.NEXT_PUBLIC_API_URL_BACKUP),
      'process.env.NEXT_PUBLIC_APP_NAME': JSON.stringify(env.NEXT_PUBLIC_APP_NAME),
      'process.env.NEXT_PUBLIC_GA_TRACKING_ID': JSON.stringify(env.NEXT_PUBLIC_GA_TRACKING_ID),
      'process.env.NEXT_PUBLIC_FIREBASE_API_KEY': JSON.stringify(env.NEXT_PUBLIC_FIREBASE_API_KEY),
      'process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN': JSON.stringify(env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN),
      'process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID': JSON.stringify(env.NEXT_PUBLIC_FIREBASE_PROJECT_ID),
      'process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET': JSON.stringify(env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET),
      'process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID': JSON.stringify(env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID),
      'process.env.NEXT_PUBLIC_FIREBASE_APP_ID': JSON.stringify(env.NEXT_PUBLIC_FIREBASE_APP_ID),
      'process.env.NEXT_PUBLIC_AD_PROVIDER': JSON.stringify(env.NEXT_PUBLIC_AD_PROVIDER),
      'process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID': JSON.stringify(env.NEXT_PUBLIC_ADSENSE_CLIENT_ID),
    },
    build: {
      outDir: 'dist',
      sourcemap: true,
    },
    server: {
      port: 3001,
    },
  };
});
