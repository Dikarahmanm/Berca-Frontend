import { SupplierSummaryDto, ApiResponse } from '../../supplier/interfaces/supplier.interfaces';

// ==================== FACTURE CORE INTERFACES ==================== //

export enum FactureStatus {
  RECEIVED = 0,        // Just received from supplier
  VERIFICATION = 1,    // Under verification
  VERIFIED = 2,        // Verified, ready for approval
  APPROVED = 3,        // Approved for payment
  PAID = 4,           // Payment completed
  DISPUTED = 5,       // Under dispute
  CANCELLED = 6,      // Cancelled/Rejected
  PARTIAL_PAID = 7    // Partially paid
}

export enum FacturePriority {
  LOW = 0,
  NORMAL = 1,
  HIGH = 2,
  URGENT = 3
}

export interface FactureDto {
  id: number;
  supplierInvoiceNumber: string;
  internalReferenceNumber: string;
  supplierId: number;
  supplierName: string;
  supplierCode: string;
  branchId: number;
  branchName: string;
  branchDisplay: string;
  
  // Dates
  invoiceDate: Date;
  dueDate: Date;
  supplierPONumber?: string;
  deliveryDate?: Date;
  deliveryNoteNumber?: string;
  
  // Financial Information
  totalAmount: number;
  paidAmount: number;
  outstandingAmount: number;
  tax: number;
  discount: number;
  
  // Status and Workflow
  status: FactureStatus;
  statusDisplay: string;
  verificationStatus: string;
  paymentPriority: FacturePriority;
  priorityDisplay: string;
  
  // Workflow Users and Dates
  receivedBy: number;
  receivedByName: string;
  receivedAt: Date;
  verifiedBy?: number;
  verifiedByName?: string;
  verifiedAt?: Date;
  approvedBy?: number;
  approvedByName?: string;
  approvedAt?: Date;
  
  // Files
  supplierInvoiceFile?: string;
  receiptFile?: string;
  supportingDocs?: string;
  
  // Additional Information
  notes?: string;
  description?: string;
  disputeReason?: string;
  
  // Audit Trail
  createdBy: number;
  createdByName: string;
  updatedBy?: number;
  updatedByName?: string;
  createdAt: Date;
  updatedAt: Date;
  
  // Computed Fields
  daysOverdue: number;
  daysUntilDue: number;
  paymentProgress: number;
  isOverdue: boolean;
  requiresApproval: boolean;
  
  // Display Fields
  totalAmountDisplay: string;
  paidAmountDisplay: string;
  outstandingAmountDisplay: string;
  
  // Permission Flags
  canVerify: boolean;
  canApprove: boolean;
  canDispute: boolean;
  canCancel: boolean;
  canSchedulePayment: boolean;
  canReceivePayment: boolean;
  
  // Related Data
  items?: FactureItemDetailDto[];
  payments?: FacturePaymentDto[];
}

export interface FactureItemDto {
  id: number;
  factureId: number;
  productId?: number;
  productName: string;
  productCode?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  tax: number;
  discount: number;
  
  // Verification fields
  verifiedQuantity?: number;
  verificationNotes?: string;
  isVerified: boolean;
  hasDiscrepancy: boolean;
}

// Enhanced interface for detailed item view (API response)
export interface FactureItemDetailDto {
  id: number;
  factureId: number;
  productId?: number;
  productName: string;
  productBarcode?: string;
  supplierItemCode?: string;
  supplierItemDescription: string;
  itemDescription: string;
  itemCode?: string;
  quantity: number;
  unitPrice: number;
  receivedQuantity: number;
  acceptedQuantity: number;
  taxRate: number;
  discountAmount: number;
  lineTotal: number;
  taxAmount: number;
  lineTotalWithTax: number;
  notes?: string;
  verificationNotes?: string;
  isVerified: boolean;
  verifiedAt?: Date;
  verifiedByName?: string;
  isProductMapped: boolean;
  hasQuantityVariance: boolean;
  hasAcceptanceVariance: boolean;
  verificationStatus: string;
  quantityVariance: number;
  acceptanceVariance: number;
  unitDisplay: string;
  unitPriceDisplay: string;
  lineTotalDisplay: string;
  lineTotalWithTaxDisplay: string;
  requiresApproval: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Payment interface for detailed view
export interface FacturePaymentDto {
  id: number;
  factureId: number;
  paymentDate: Date;
  amount: number;
  paymentMethod: number;
  paymentMethodDisplay: string;
  status: number;
  statusDisplay: string;
  ourPaymentReference?: string;
  supplierAckReference?: string;
  bankAccount?: string;
  checkNumber?: string;
  transferReference?: string;
  paymentReference?: string;
  processedBy?: number;
  processedByName?: string;
  approvedBy?: number;
  approvedByName?: string;
  approvedAt?: Date;
  confirmedAt?: Date;
  confirmedByName?: string;
  notes?: string;
  failureReason?: string;
  disputeReason?: string;
  paymentReceiptFile?: string;
  confirmationFile?: string;
  scheduledDate?: Date;
  requiresApproval: boolean;
  isOverdue: boolean;
  daysOverdue: number;
  daysUntilPayment: number;
  isDueToday: boolean;
  isDueSoon: boolean;
  processingStatus: string;
  hasConfirmation: boolean;
  amountDisplay: string;
  canEdit: boolean;
  canProcess: boolean;
  canConfirm: boolean;
  canCancel: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface FactureListDto {
  id: number;
  supplierName: string;
  supplierInvoiceNumber: string;
  internalReferenceNumber: string;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  invoiceDate: Date;
  dueDate: Date;
  status: FactureStatus;
  priority: FacturePriority;
  isOverdue: boolean;
  daysUntilDue: number;
  receivedAt: Date;
  receivedBy: string;
  branchName: string;
}

// ==================== FACTURE WORKFLOW DTOs ==================== //

export interface ReceiveFactureDto {
  supplierId: number;
  branchId: number;
  supplierInvoiceNumber: string;
  supplierPONumber?: string;
  invoiceDate: Date;
  dueDate: Date;
  deliveryDate?: Date;
  totalAmount: number;
  tax: number;
  discount: number;
  priority?: FacturePriority;
  description?: string;
  notes?: string;
  deliveryNoteNumber?: string;
  
  // File uploads (base64 or file paths)
  supplierInvoiceFile?: string;
  receiptFile?: string;
  supportingDocs?: string;
  
  // Items
  items: CreateFactureItemDto[];
}

export interface CreateFactureItemDto {
  productId?: number;
  supplierItemCode?: string;
  supplierItemDescription: string;  // ✅ Required field from API
  quantity: number;
  unitPrice: number;
  taxRate?: number;                 // ✅ Correct field name (optional)
  discountAmount?: number;          // ✅ Correct field name (optional)
  notes?: string;                   // ✅ Additional field from API
}

export interface VerifyFactureDto {
  factureId: number;
  verificationNotes?: string;
  items: VerifyFactureItemDto[];
}

export interface VerifyFactureItemDto {
  itemId: number;
  receivedQuantity: number;
  acceptedQuantity: number;
  verificationNotes?: string;
  isVerified: boolean;
}

export interface DisputeFactureDto {
  factureId: number;
  disputeReason: string;
  additionalNotes?: string;
  supportingDocuments?: string;
}

export interface UpdateFactureDto {
  description?: string;
  notes?: string;
  dueDate?: Date;
  priority?: FacturePriority;
}

// ==================== PAYMENT PROCESSING DTOs ==================== //

export enum PaymentMethod {
  BANK_TRANSFER = 0,
  CHECK = 1,
  CASH = 2,
  CREDIT_CARD = 3,
  DIGITAL_WALLET = 4
}

export enum PaymentStatus {
  SCHEDULED = 0,
  PENDING = 1,
  PROCESSING = 2,
  COMPLETED = 3,
  FAILED = 4,
  CANCELLED = 5,
  DISPUTED = 6
}

export interface SchedulePaymentDto {
  factureId: number;
  paymentDate: Date;
  amount: number;
  paymentMethod: PaymentMethod;
  bankAccount?: string;
  ourPaymentReference?: string;
  notes?: string;
  isRecurring?: boolean;
  recurrencePattern?: string;
}

export interface ProcessPaymentDto {
  paymentId: number;
  bankAccount?: string;
  checkNumber?: string;
  transferReference?: string;
  paymentReference?: string;
  notes?: string;
}

export interface ConfirmPaymentDto {
  paymentId: number;
  confirmedAmount: number;
  confirmationReference?: string;
  supplierAckReference?: string;
  notes?: string;
  confirmationFile?: string;
}

export interface CancelPaymentDto {
  paymentId: number;
  cancellationReason: string;
  notes?: string;
}

// ==================== FACTURE QUERY & PAGINATION ==================== //

export interface FactureQueryParams {
  search?: string;
  supplierId?: number;
  branchId?: number;
  status?: FactureStatus | FactureStatus[];
  priority?: FacturePriority;
  
  // Date filters
  invoiceDateFrom?: Date;
  invoiceDateTo?: Date;
  dueDateFrom?: Date;
  dueDateTo?: Date;
  receivedDateFrom?: Date;
  receivedDateTo?: Date;
  
  // Amount filters
  minAmount?: number;
  maxAmount?: number;
  
  // Status filters
  isOverdue?: boolean;
  isPaid?: boolean;
  hasDispute?: boolean;
  
  // Pagination
  page: number;
  pageSize: number; // max 100
  sortBy: string; // 'invoiceDate' | 'dueDate' | 'totalAmount' | 'supplierName' | 'status'
  sortOrder: 'asc' | 'desc';
}

export interface FacturePagedResponseDto {
  factures: FactureListDto[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  
  // Summary statistics
  totalAmount: number;
  totalPaidAmount: number;
  totalOutstanding: number;
  overdueCount: number;
  overdueAmount: number;
}

// ==================== FACTURE ANALYTICS ==================== //

export interface FactureStatsDto {
  totalFactures: number;
  totalAmount: number;
  paidAmount: number;
  outstandingAmount: number;
  overdueCount: number;
  overdueAmount: number;
  
  statusBreakdown: FactureStatusStatsDto[];
  supplierBreakdown: FactureSupplierStatsDto[];
  monthlyTrend: FactureMonthlyTrendDto[];
  averagePaymentDays: number;
  
  topOverdueFactures: FactureListDto[];
  upcomingDueFactures: FactureListDto[];
}

export interface FactureStatusStatsDto {
  status: FactureStatus;
  count: number;
  totalAmount: number;
  percentage: number;
}

export interface FactureSupplierStatsDto {
  supplierId: number;
  supplierName: string;
  factureCount: number;
  totalAmount: number;
  outstandingAmount: number;
  averagePaymentDays: number;
}

export interface FactureMonthlyTrendDto {
  month: string;
  year: number;
  factureCount: number;
  totalAmount: number;
  paidAmount: number;
  averagePaymentDays: number;
}