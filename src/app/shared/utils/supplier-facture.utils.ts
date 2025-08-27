import { HttpParams } from '@angular/common/http';
import { environment } from '../../../environment/environment';

/**
 * Supplier & Facture API Utils
 * Utility functions for handling API endpoints, query parameters, and data transformations
 */

export class SupplierFactureUtils {
  
  // ==================== URL BUILDERS ==================== //
  
  static buildSupplierUrl(endpoint: string = ''): string {
    const baseUrl = `${environment.apiUrl}/Supplier`;
    return endpoint ? `${baseUrl}/${endpoint}` : baseUrl;
  }

  static buildFactureUrl(endpoint: string = ''): string {
    const baseUrl = `${environment.apiUrl}/Facture`;
    return endpoint ? `${baseUrl}/${endpoint}` : baseUrl;
  }

  // ==================== HTTP OPTIONS BUILDERS ==================== //
  
  static getHttpOptions(includeCredentials: boolean = true): any {
    return {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      withCredentials: includeCredentials
    };
  }

  static getHttpOptionsWithParams(params: HttpParams, includeCredentials: boolean = true): any {
    return {
      ...this.getHttpOptions(includeCredentials),
      params
    };
  }

  // ==================== DATA FORMATTERS ==================== //
  
  static formatCurrency(amount: number): string {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  }

  static formatDate(date: Date | string): string {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return new Intl.DateTimeFormat('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }).format(dateObj);
  }

  static formatDateTime(date: Date | string): string {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return new Intl.DateTimeFormat('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).format(dateObj);
  }

  // ==================== STATUS HELPERS ==================== //
  
  static getFactureStatusLabel(status: number): string {
    const statusLabels: Record<number, string> = {
      0: 'Received',
      1: 'Under Verification',
      2: 'Verified',
      3: 'Approved',
      4: 'Paid',
      5: 'Disputed',
      6: 'Cancelled',
      7: 'Partially Paid'
    };
    return statusLabels[status] || 'Unknown';
  }

  static getFactureStatusColor(status: number): string {
    const statusColors: Record<number, string> = {
      0: 'blue',        // Received
      1: 'orange',      // Under Verification
      2: 'purple',      // Verified
      3: 'green',       // Approved
      4: 'success',     // Paid
      5: 'red',         // Disputed
      6: 'grey',        // Cancelled
      7: 'yellow'       // Partially Paid
    };
    return statusColors[status] || 'default';
  }

  // ==================== ERROR HANDLING ==================== //
  
  static getApiErrorMessage(error: any): string {
    if (error?.status === 0) {
      return 'Cannot connect to server. Please check your internet connection.';
    } else if (error?.status === 401) {
      return 'Authentication required. Please log in.';
    } else if (error?.status === 403) {
      return 'Access denied. You do not have permission to perform this action.';
    } else if (error?.status === 404) {
      return 'The requested resource was not found.';
    } else if (error?.status >= 500) {
      return 'Server error occurred. Please try again later.';
    } else if (error?.error?.message) {
      return error.error.message;
    } else if (error?.message) {
      return error.message;
    }
    return 'An unexpected error occurred. Please try again.';
  }

  // ==================== DATE HELPERS ==================== //
  
  static isOverdue(dueDate: Date | string): boolean {
    const due = typeof dueDate === 'string' ? new Date(dueDate) : dueDate;
    return due < new Date();
  }

  static getDaysUntilDue(dueDate: Date | string): number {
    const due = typeof dueDate === 'string' ? new Date(dueDate) : dueDate;
    const today = new Date();
    const diffTime = due.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  static getDaysOverdue(dueDate: Date | string): number {
    const daysUntil = this.getDaysUntilDue(dueDate);
    return daysUntil < 0 ? Math.abs(daysUntil) : 0;
  }
}

// Export commonly used constants
export const SUPPLIER_FACTURE_CONSTANTS = {
  MAX_PAGE_SIZE: 100,
  DEFAULT_PAGE_SIZE: 20,
  MAX_SEARCH_LENGTH: 255,
  
  // Facture constants
  MAX_INVOICE_NUMBER_LENGTH: 50,
  MAX_PO_NUMBER_LENGTH: 50,
  MAX_DESCRIPTION_LENGTH: 500,
  MAX_DISPUTE_REASON_LENGTH: 1000,
  
  // File upload limits
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
  ALLOWED_FILE_TYPES: ['pdf', 'jpg', 'jpeg', 'png', 'gif', 'doc', 'docx', 'xls', 'xlsx']
} as const;