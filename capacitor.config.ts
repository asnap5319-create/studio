
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.asnap.app',
  appName: 'A.snap',
  webDir: 'out',
  server: {
    url: 'https://studio-xi-henna-41.vercel.app',
    cleartext: true,
    allowNavigation: ['studio-xi-henna-41.vercel.app']
  },
  android: {
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: true
  }
};

export default config;
