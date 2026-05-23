
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.asnap.app',
  appName: 'A.snap',
  webDir: 'out',
  server: {
    // Professional URL sync - Set to your preferred free Vercel subdomain
    url: 'https://asnap.vercel.app',
    cleartext: true,
    allowNavigation: ['asnap.vercel.app', 'studio-xi-henna-41.vercel.app']
  },
  android: {
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: true
  }
};

export default config;
