import type { CapacitorConfig } from '@capacitor/cli';

const devServerUrl = process.env.CAP_SERVER_URL;
const useDevServer = process.env.CAPACITOR_DEV === 'true';

const config: CapacitorConfig = {
  appId: 'com.llamaswings.pos',
  appName: "Llama's Wings POS",
  webDir: 'dist',
  ...(useDevServer
    ? {
        server: {
          url: devServerUrl ?? 'http://10.0.2.2:4173',
          cleartext: (devServerUrl ?? 'http://10.0.2.2:4173').startsWith('http://'),
        },
      }
    : {}),
};

export default config;
