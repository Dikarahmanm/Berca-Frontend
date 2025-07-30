export const environment = {
  production: false,
  development: true,
  apiUrl: 'http://localhost:5171/api',
  apiVersion: 'v1',
  
  // App Configuration
  appName: 'Toko Eniwan POS',
  appVersion: '2.0.0',
  
  // API Endpoints
  endpoints: {
    auth: '/auth',
    userProfile: '/UserProfile',
    products: '/Product',
    categories: '/Category',
    pos: '/POS',
    members: '/Member',
    notifications: '/Notification',
    dashboard: '/Dashboard'
  },
  
  // POS Configuration
  pos: {
    taxRate: 0.11, // 11% PPN
    defaultPageSize: 20,
    maxCartItems: 100,
    receiptSettings: {
      storeName: 'Toko Eniwan',
      storeAddress: 'Jl. Contoh No. 123, Jakarta',
      storePhone: '(021) 1234-5678',
      storeEmail: 'info@tokoeniwan.com',
      footerMessage: 'Terima kasih atas kunjungan Anda!'
    }
  },
  
  // Notification Configuration
  notifications: {
    enableRealTime: true,
    signalRUrl: 'http://localhost:5171/hubs/notification',
    fallbackPollingInterval: 30000, // 30 seconds
    maxNotifications: 50
  },
  
  // Storage Configuration
  storage: {
    tokenKey: 'pos_auth_token',
    userKey: 'pos_current_user',
    cartKey: 'pos_cart_items',
    settingsKey: 'pos_settings'
  },
  
  // Feature Flags
  features: {
    offlineMode: true,
    barcodeScanner: true,
    receiptPrinter: true,
    loyaltyProgram: true,
    multiLanguage: false,
    darkMode: true
  },
  
  // UI Configuration
  ui: {
    primaryColor: '#FF914D',
    primaryColorDark: '#E07A3B',
    primaryColorLight: '#FFD3B3',
    accentColor: '#4BBF7B',
    warningColor: '#FFB84D',
    errorColor: '#E15A4F',
    
    // Animation settings
    animationDuration: 120,
    animationEasing: 'ease-out',
    
    // Theme settings
    glassMorphism: true,
    borderRadius: '12px',
    backdropBlur: 'blur(20px)'
  },
  
  // Security Configuration
  security: {
    sessionTimeout: 480, // 8 hours in minutes
    maxLoginAttempts: 5,
    lockoutDuration: 900, // 15 minutes in seconds
    passwordMinLength: 8,
    requireStrongPassword: true
  },
  
  // Logging Configuration
  logging: {
    level: 'debug',
    enableConsoleLogging: true,
    enableRemoteLogging: false,
    logApiErrors: true,
    logUserActions: true
  }
};