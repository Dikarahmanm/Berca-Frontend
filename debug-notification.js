// DEBUG: Test navigation untuk notification
// Paste ini di browser console untuk test

// Test notification navigation dengan actionUrl yang benar
function testNotificationWithActionUrl() {
  // Simulate notification seperti dari backend
  const testNotification = {
    id: 1069,
    type: 'SALE_COMPLETED',
    title: 'Penjualan Selesai: TRX-20250808-0007',
    message: 'Transaksi penjualan #TRX-20250808-0007 telah selesai. Total: Rp35.000',
    actionUrl: '/sales/1076',  // actionUrl dari backend
    isRead: false,
    priority: 'Normal',
    createdAt: new Date().toISOString(),
    userId: 1,
    createdBy: 'system'
  };

  console.log("🧪 Testing notification with actionUrl:", testNotification);
  
  // Test manual navigation ke route yang benar
  if (window.location.pathname.includes('dashboard')) {
    // Get Angular router
    const angularElements = document.querySelectorAll('[ng-version]');
    if (angularElements.length > 0) {
      console.log("✅ Angular app detected");
      
      // Test manual navigation
      console.log("🔄 Testing manual navigation to transaction detail...");
      window.location.href = '/dashboard/pos/transaction/1076';
    }
  }
}

// Test direct URL navigation
function testDirectNavigation() {
  console.log("🧪 Testing direct navigation patterns:");
  
  // Test patterns
  const testUrls = [
    '/sales/1076',                    // Backend actionUrl
    '/dashboard/pos/transaction/1076' // Target route
  ];
  
  testUrls.forEach((url, index) => {
    console.log(`${index + 1}. Testing URL: ${url}`);
    
    // Simulate navigation
    const testRouter = {
      navigate: (route) => console.log('Would navigate to:', route),
      navigateByUrl: (url) => console.log('Would navigate by URL to:', url)
    };
    
    // Test URL conversion
    const salesMatch = url.match(/^\/sales\/(\d+)$/);
    if (salesMatch) {
      const transactionId = salesMatch[1];
      console.log('  ✅ Detected sales URL, extracted ID:', transactionId);
      console.log('  ✅ Would convert to:', `/dashboard/pos/transaction/${transactionId}`);
    } else if (url.includes('/dashboard/pos/transaction/')) {
      console.log('  ✅ Already correct transaction detail URL');
    } else {
      console.log('  ❌ Unknown URL pattern');
    }
  });
}

// Test pattern extraction dengan data real
function testRealPatternExtraction() {
  const realNotification = {
    title: 'Penjualan Selesai: TRX-20250808-0007',
    message: 'Transaksi penjualan #TRX-20250808-0007 telah selesai. Total: Rp35.000'
  };
  
  const patterns = [
    /TRX-\d{8}-(\d{4})/,  // TRX-20250808-0007 format
    /transaksi\s*(?:#)?(\d+)/i,  // "transaksi #1067"
    /penjualan\s*(?:#)?(\d+)/i,  // "penjualan #1067"
  ];
  
  console.log("🔍 Testing real notification pattern extraction:");
  console.log("Title:", realNotification.title);
  console.log("Message:", realNotification.message);
  
  patterns.forEach((pattern, index) => {
    const titleMatch = realNotification.title.match(pattern);
    const messageMatch = realNotification.message.match(pattern);
    
    if (titleMatch && titleMatch[1]) {
      console.log(`✅ Pattern ${index + 1} matched in TITLE:`, titleMatch[1], "->", pattern.source);
    }
    if (messageMatch && messageMatch[1]) {
      console.log(`✅ Pattern ${index + 1} matched in MESSAGE:`, messageMatch[1], "->", pattern.source);
    }
  });
}

console.log("🧪 Enhanced debug functions loaded:");
console.log("- testNotificationWithActionUrl() // Test dengan actionUrl real dari backend");  
console.log("- testDirectNavigation()          // Test URL conversion");
console.log("- testRealPatternExtraction()     // Test pattern dengan data real");
