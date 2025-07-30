// src/environments/environment.ts
export const environment = {
  production: false,
  apiUrl: 'http://localhost:5171/api',
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
    // Notification polling interval (ms)
    notificationPollingInterval: 30000,
    
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
      cameraFacingMode: 'environment', // 'user' for front camera
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