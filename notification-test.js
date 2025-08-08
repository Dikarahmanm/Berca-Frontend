// Test script untuk memverifikasi pattern extraction notification
// Jalankan di browser console untuk test

// Sample notifications dari screenshot
const testNotifications = [
  {
    id: 1,
    title: "Penjualan Selesai",
    message: "Transaksi penjualan #TRX-20250808-0006 telah selesai. Total Rp5.000",
    type: "sales"
  },
  {
    id: 2,
    title: "Struk Dicetak",
    message: "Struk untuk transaksi TRX-20250808-0006 telah dicetak.",
    type: "receipt_printed"
  },
  {
    id: 3,
    title: "Transaction Complete",
    message: "Transaction #1067 has been completed successfully",
    type: "transaction"
  }
];

// Test patterns
const patterns = [
  /TRX-\d{8}-(\d{4})/,  // TRX-20250808-0006 format
  /transaksi\s*(?:#)?(\d+)/i,  // "transaksi #1067"
  /penjualan\s*(?:#)?(\d+)/i,  // "penjualan #1067"
  /transaction\s*(?:#)?(\d+)/i, // "transaction #1067"
  /ID[:\s]+(\d+)/i,  // "ID: 1067"
  /\b(\d{4,5})\b/  // any 4-5 digit number
];

function testExtraction(notification) {
  console.log('Testing notification:', notification.title, '-', notification.message);
  
  for (const pattern of patterns) {
    const messageMatch = notification.message.match(pattern);
    const titleMatch = notification.title.match(pattern);
    
    if (messageMatch && messageMatch[1]) {
      console.log('✅ Found in message:', messageMatch[1], 'pattern:', pattern.source);
      return parseInt(messageMatch[1], 10);
    }
    
    if (titleMatch && titleMatch[1]) {
      console.log('✅ Found in title:', titleMatch[1], 'pattern:', pattern.source);
      return parseInt(titleMatch[1], 10);
    }
  }
  
  console.log('❌ No match found');
  return null;
}

// Run tests
testNotifications.forEach(testExtraction);
