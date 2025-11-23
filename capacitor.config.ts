import type { CapacitorConfig } from '@capacitor/cli';

// 1. DEV: Use Live Reload (run 'npm run dev' locally)
// const isDev = true;
// const devUrl = 'http://192.168.88.115:3000';

// 2. PROD (BUNDLED): Load from local 'out' folder (Offline ready, fastest) - RECOMMENDED
const isDev = false;
const useVercel = false;

// 3. PROD (LIVE): Load directly from Vercel (Updates instantly, requires internet)
// const isDev = false;
// const useVercel = true;
const vercelUrl = 'https://supershop.shomaj.one';

const config: CapacitorConfig = {
  appId: 'com.supershop.app',
  appName: 'SuperShop',
  webDir: 'out',
  server: useVercel
    ? {
      url: vercelUrl,
      androidScheme: 'https',
      cleartext: true,
    }
    : isDev
      ? {
        url: 'http://192.168.88.115:3000',
        androidScheme: 'http',
        cleartext: true,
      }
      : {
        androidScheme: 'http',
        cleartext: true,
      },
};

export default config;
