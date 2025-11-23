import type { CapacitorConfig } from '@capacitor/cli';

const isDev = process.env.NODE_ENV === 'development';

const config: CapacitorConfig = {
  appId: 'com.supershop.app',
  appName: 'SuperShop',
  webDir: 'out',
  server: isDev
    ? {
        androidScheme: 'https',
        url: 'http://10.0.2.2:3000', // Android emulator loopback
        cleartext: true,
      }
    : {
        androidScheme: 'https',
      },
};

export default config;
