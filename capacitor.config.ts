import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.aoneahsan.twofastudio',
  appName: '2FA Studio',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    iosScheme: 'capacitor',
    hostname: 'app.2fastudio.com',
    cleartext: false
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert']
    },
    LocalNotifications: {
      smallIcon: 'ic_stat_icon_config_sample',
      iconColor: '#488AFF',
      sound: 'beep.wav'
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#ffffff'
    },
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      launchFadeOutDuration: 1000,
      backgroundColor: '#ffffff',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      iosSpinnerStyle: 'small',
      spinnerColor: '#999999',
      splashFullScreen: true,
      splashImmersive: true
    },
    Keyboard: {
      resize: 'body',
      style: 'DARK',
      resizeOnFullScreen: true
    },
    App: {
      launchUrl: 'https://app.2fastudio.com'
    },
    Camera: {
      permissions: [
        'camera',
        'photos',
        'photosAddOnly'
      ]
    },
    Device: {
      permissions: [
        'device'
      ]
    },
    BiometricAuth: {
      allowDeviceCredential: true
    }
  },
  ios: {
    scheme: '2FA Studio',
    contentInset: 'automatic',
    scrollEnabled: true,
    allowsLinkPreview: false,
    handleApplicationNotifications: true,
    limitsNavigationsToAppBoundDomains: true,
    preferredContentMode: 'mobile',
    backgroundColor: '#ffffff'
  },
  android: {
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
    initialFocus: true,
    appendUserAgent: '2FAStudio/1.0.0',
    backgroundColor: '#ffffff',
    buildOptions: {
      keystorePath: undefined,
      keystorePassword: undefined,
      keystoreAlias: undefined,
      keystoreAliasPassword: undefined,
      releaseType: 'AAB',
      signingType: 'apksigner'
    }
  }
};

export default config;
