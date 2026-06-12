import { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.fis.installer',
  appName: 'FIS Installer',
  webDir: 'tools/capacitor-web',
  // When deployed to App Store, the webview loads the live site.
  // This means web updates don't require App Store review.
  server: {
    url: 'https://job.floorinteriorservices.com/installer/login',
    cleartext: false,
  },
  ios: {
    contentInset: 'always',
    scheme: 'fis-installer',
    backgroundColor: '#ffffff',
    allowsLinkPreview: false,
    scrollEnabled: true,
    limitsNavigationsToAppBoundDomains: true,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 0,
      launchAutoHide: true,
      backgroundColor: '#ffffff',
      showSpinner: false,
    },
    StatusBar: {
      style: 'LIGHT',
      backgroundColor: '#ffffff',
      overlaysWebView: false,
    },
  },
}

export default config
