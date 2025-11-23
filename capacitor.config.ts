import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.supershop.app',
  appName: 'SuperShop',
  webDir: 'supershop-frontend/out',
  server: {
    androidScheme: 'https',
    url: 'http://10.0.2.2:3000', // Special alias for localhost in Android Emulator
    cleartext: true
  }
};

export default config;
