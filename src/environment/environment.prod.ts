// src/environments/environment.prod.ts
export const environment = {
  production: true,
  apiUrl: 'https://api.tokoeniwan.com/api', // Update dengan URL production
  baseUrl: 'https://api.tokoeniwan.com', // For auth and admin endpoints
  wsUrl: 'wss://api.tokoeniwan.com', // WebSocket URL for production
  appName: 'Toko Eniwan POS',
  version: '2.0.0',
  
  // Feature flags for Sprint 2
  features: {
    pos: true,
    notifications: true,
    barcode: true,
    receipt: true,
    inventory: false, // Will be enabled in future sprints
    membership: false, // Will be enabled in future sprints
    reports: false // Will be enabled in future sprints
  },
  
  // App configuration
  config: {
    // Notification polling interval (ms) - longer in production
    notificationPollingInterval: 60000,
    
    // Receipt settings
    receipt: {
      defaultTemplate: 'thermal58',
      storeName: 'Toko Eniwan',
      storeAddress: 'Jl. Raya No. 123, Jakarta',
      storePhone: '021-123456',
      footerMessage: 'Terima kasih atas kunjungan Anda!'
    },
    
    // POS settings
    pos: {
      defaultPaymentMethod: 'CASH',
      taxRate: 0.11, // 11% PPN
      enableLoyaltyPoints: true,
      enableDiscounts: true
    },
    
    // Barcode scanner settings
    barcode: {
      cameraFacingMode: 'environment',
      scannerWidth: 640,
      scannerHeight: 480,
      enableManualInput: true
    },
    
    // UI settings
    ui: {
      theme: 'orange-modern',
      language: 'id-ID',
      currency: 'IDR',
      dateFormat: 'dd/MM/yyyy',
      timeFormat: 'HH:mm:ss'
    }
  }
};