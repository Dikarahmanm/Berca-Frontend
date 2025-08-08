export interface TransactionDetailResponse {
  success: boolean;
  message: string;
  data: TransactionDetail;
  timestamp: string;
  errors: any;
}

export interface TransactionDetail {
  id: number;
  saleNumber: string;
  saleDate: string;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  total: number;
  amountPaid: number;
  changeAmount: number;
  paymentMethod: string;
  paymentReference?: string;
  memberId?: number;
  memberName?: string;
  memberNumber?: string;
  customerName?: string;
  cashierId: number;
  cashierName: string;
  status: string;
  notes?: string;
  receiptPrinted: boolean;
  receiptPrintedAt?: string;
  items: TransactionItem[];
  createdAt: string;
  totalItems: number;
  totalProfit: number;
  discountPercentage: number;
  redeemedPoints: number;
  receiptFooterMessage?: string;
  receiptStoreName: string;
  receiptStoreAddress: string;
  receiptStorePhone: string;
  receiptStoreEmail?: string;
  receiptStoreLogoUrl?: string;
  receiptStoreWebsite?: string;
  receiptStoreTitle: string;
}

export interface TransactionItem {
  id: number;
  productId: number;
  productName: string;
  productBarcode: string;
  quantity: number;
  unitPrice: number;
  unitCost: number;
  discountAmount: number;
  subtotal: number;
  unit: string;
  notes?: string;
  totalProfit: number;
  discountPercentage: number;
}

export interface ReceiptConfig {
  storeName: string;
  storeAddress: string;
  storePhone: string;
  storeEmail?: string;
  storeWebsite?: string;
  logoUrl?: string;
  footerMessage?: string;
}
