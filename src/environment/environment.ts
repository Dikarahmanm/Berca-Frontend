export const environment = {
  production: false,
  development: true,
  
  // ✅ REAL: Backend API URLs sesuai .NET 9 API
  apiUrl: 'http://localhost:5171/api', // HTTP as required, not HTTPS due to SSL cert issues
  apiVersion: 'v1',
  
  // App Configuration
  appName: 'Toko Eniwan POS',
  appVersion: '2.0.0',
  
  // ✅ REAL: API Endpoints sesuai Controllers di backend
  endpoints: {
    // Authentication
    auth: '/Auth',
    login: '/Auth/login',
    logout: '/Auth/logout',
    register: '/Auth/register',
    
    // User Management
    userProfile: '/UserProfile',
    users: '/User',
    
    // Core Business
    products: '/Product',
    categories: '/Category',
    inventory: '/Product', // Same as products untuk inventory operations
    
    // POS & Sales
    pos: '/POS',
    sales: '/Sale',
    
    // Membership
    members: '/Member',
    memberPoints: '/Member/points',
    
    // ✅ REAL: Notifications sesuai NotificationController
    notifications: '/Notification',
    notificationSummary: '/Notification/summary',
    markAsRead: '/Notification/{id}/read',
    markAllAsRead: '/Notification/read-all',
    
    // Reports & Analytics
    dashboard: '/Dashboard',
    reports: '/Report',
    analytics: '/Analytics'
  },
  
  // ✅ REAL: POS Configuration sesuai backend business rules
  pos: {
    taxRate: 0.11, // 11% PPN Indonesia
    defaultPageSize: 20,
    maxCartItems: 100,
    receiptSettings: {
      storeName: 'Toko Eniwan',
      storeAddress: 'Jl. Merdeka No. 123, Jakarta Pusat',
      storePhone: '(021) 1234-5678',
      storeEmail: 'info@tokoeniwan.com',
      footerMessage: 'Terima kasih atas kunjungan Anda!',
      logoUrl: '/assets/images/logo.png'
    }
  },
  
  // ✅ REAL: Notification Configuration sesuai backend capabilities
  notifications: {
    enableRealTime: true,
    signalRUrl: 'http://localhost:5171/hubs/notification', // SignalR hub - HTTP not HTTPS
    fallbackPollingInterval: 30000, // 30 seconds untuk polling
    maxNotifications: 50,
    types: {
      LOW_STOCK: 'Low Stock Alert',
      SALE_COMPLETED: 'Sale Completed',
      SYSTEM_MAINTENANCE: 'System Maintenance',
      USER_ACTION: 'User Action',
      BACKUP_COMPLETED: 'Backup Completed',
      ERROR: 'System Error',
      INFO: 'Information',
      SUCCESS: 'Success'
    }
  },
  
  // Storage Configuration
  storage: {
    tokenKey: 'pos_auth_token',
    userKey: 'pos_current_user',
    cartKey: 'pos_cart_items',
    settingsKey: 'pos_settings',
    sidebarKey: 'sidebar_collapsed'
  },
  
  // ✅ REAL: Feature Flags sesuai backend capabilities
  features: {
    offlineMode: true,
    barcodeScanner: true,
    receiptPrinter: true,
    loyaltyProgram: true,
    multiLanguage: false,
    darkMode: true,
    realTimeNotifications: true,
    signalRSupport: true,
    backgroundSync: true
  },
  
  // UI Configuration (Orange Modern Theme)
  ui: {
    primaryColor: '#FF914D',
    primaryColorDark: '#E07A3B',
    primaryColorLight: '#FFD3B3',
    accentColor: '#4BBF7B',
    warningColor: '#FFB84D',
    errorColor: '#E15A4F',
    
    // Animation settings sesuai guideline
    animationDuration: 120,
    animationEasing: 'ease-out',
    
    // Glass-morphism theme
    glassMorphism: true,
    borderRadius: '12px',
    backdropBlur: 'blur(20px)'
  },
  
  // ✅ REAL: Security Configuration sesuai backend
  security: {
    sessionTimeout: 480, // 8 hours in minutes (sesuai backend JWT expiry)
    maxLoginAttempts: 5,
    lockoutDuration: 900, // 15 minutes in seconds
    passwordMinLength: 8,
    requireStrongPassword: true,
    enableCSRF: true,
    cookieSecure: false, // Set true di production
    cookieSameSite: 'Lax'
  },
  
  // HTTP Configuration
  http: {
    timeout: 30000, // 30 seconds
    retryAttempts: 2,
    retryDelay: 1000, // 1 second
    withCredentials: true, // Untuk cookie-based auth
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }
  },
  
  // Logging Configuration
  logging: {
    level: 'debug', // 'error' | 'warn' | 'info' | 'debug'
    enableConsoleLogging: true,
    enableRemoteLogging: false,
    logApiErrors: true,
    logUserActions: true,
    logNotifications: true
  },
  
  // ✅ REAL: Pagination defaults sesuai backend
  pagination: {
    defaultPageSize: 20,
    maxPageSize: 100,
    pageSizeOptions: [10, 20, 50, 100]
  },
  
  // File Upload Configuration
  fileUpload: {
    maxFileSize: 5 * 1024 * 1024, // 5MB
    allowedImageTypes: ['image/jpeg', 'image/png', 'image/gif'],
    allowedDocumentTypes: ['application/pdf', 'text/csv'],
    uploadUrl: '/api/Upload'
  },
  
  // Barcode Configuration
  barcode: {
    supportedFormats: [
      'CODE128', 'EAN13', 'EAN8', 'UPC_A', 'UPC_E', 
      'CODE39', 'CODE93', 'CODABAR', 'ITF', 'QR_CODE'
    ],
    scanTimeout: 10000, // 10 seconds
    enableCameraFlash: true
  }
};