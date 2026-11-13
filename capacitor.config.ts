import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.jongibit.reader',
  appName: '종이빛',
  webDir: 'dist',
  backgroundColor: '#f3efe6',
  ios: {
    contentInset: 'never',
    backgroundColor: '#f3efe6',
    preferredContentMode: 'mobile',
  },
  android: {
    backgroundColor: '#f3efe6',
    allowMixedContent: false,
    captureInput: true,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 450,
      launchAutoHide: true,
      backgroundColor: '#f3efe6',
      showSpinner: false,
      androidScaleType: 'CENTER_CROP',
      splashFullScreen: true,
      splashImmersive: false,
    },
    StatusBar: {
      style: 'LIGHT',
      backgroundColor: '#f3efe6',
    },
  },
};

export default config;
