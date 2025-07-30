// src/app/core/services/error-handler.service.ts
import { Injectable } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { environment } from '../../../environment/environment';

export interface AppError {
  code: string;
  message: string;
  details?: any;
  timestamp: Date;
  userMessage: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
}

@Injectable({
  providedIn: 'root'
})
export class ErrorHandlerService {
  private errorLog: AppError[] = [];
  private readonly maxLogSize = 100;

  constructor() {}

  /**
   * Handle HTTP errors and convert to user-friendly messages
   */
  handleHttpError(error: HttpErrorResponse): Observable<never> {
    const appError = this.createAppError(error);
    this.logError(appError);
    return throwError(() => new Error(appError.userMessage));
  }

  /**
   * Handle general application errors
   */
  handleError(error: any, context?: string): AppError {
    const appError = this.createAppError(error, context);
    this.logError(appError);
    return appError;
  }

  /**
   * Create standardized error object
   */
  private createAppError(error: any, context?: string): AppError {
    let appError: AppError = {
      code: 'UNKNOWN_ERROR',
      message: 'An unknown error occurred',
      timestamp: new Date(),
      userMessage: 'Terjadi kesalahan yang tidak diketahui',
      severity: 'error'
    };

    if (error instanceof HttpErrorResponse) {
      appError = this.handleHttpErrorResponse(error);
    } else if (error instanceof Error) {
      appError = this.handleJavaScriptError(error);
    } else if (typeof error === 'string') {
      appError = this.handleStringError(error);
    }

    // Add context if provided
    if (context) {
      appError.details = { ...appError.details, context };
    }

    return appError;
  }

  /**
   * Handle HTTP error responses
   */
  private handleHttpErrorResponse(error: HttpErrorResponse): AppError {
    const baseError: Partial<AppError> = {
      timestamp: new Date(),
      details: {
        status: error.status,
        statusText: error.statusText,
        url: error.url
      }
    };

    switch (error.status) {
      case 0:
        return {
          ...baseError,
          code: 'NETWORK_ERROR',
          message: 'Network connection failed',
          userMessage: 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda.',
          severity: 'error'
        } as AppError;

      case 400:
        return {
          ...baseError,
          code: 'BAD_REQUEST',
          message: error.error?.message || 'Bad request',
          userMessage: this.getApiErrorMessage(error.error?.message) || 'Data yang dikirim tidak valid',
          severity: 'warning'
        } as AppError;

      case 401:
        return {
          ...baseError,
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
          userMessage: 'Sesi Anda telah berakhir. Silakan login kembali.',
          severity: 'warning'
        } as AppError;

      case 403:
        return {
          ...baseError,
          code: 'FORBIDDEN',
          message: 'Access denied',
          userMessage: 'Anda tidak memiliki izin untuk melakukan tindakan ini.',
          severity: 'warning'
        } as AppError;

      case 404:
        return {
          ...baseError,
          code: 'NOT_FOUND',
          message: 'Resource not found',
          userMessage: 'Data yang dicari tidak ditemukan.',
          severity: 'info'
        } as AppError;

      case 409:
        return {
          ...baseError,
          code: 'CONFLICT',
          message: error.error?.message || 'Conflict',
          userMessage: this.getApiErrorMessage(error.error?.message) || 'Data sudah ada atau sedang digunakan.',
          severity: 'warning'
        } as AppError;

      case 422:
        return {
          ...baseError,
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          userMessage: this.getValidationErrorMessage(error.error),
          severity: 'warning',
          details: { ...baseError.details, validationErrors: error.error?.errors }
        } as AppError;

      case 500:
        return {
          ...baseError,
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Internal server error',
          userMessage: 'Terjadi kesalahan pada server. Silakan coba lagi nanti.',
          severity: 'error'
        } as AppError;

      case 503:
        return {
          ...baseError,
          code: 'SERVICE_UNAVAILABLE',
          message: 'Service temporarily unavailable',
          userMessage: 'Layanan sedang tidak tersedia. Silakan coba lagi nanti.',
          severity: 'error'
        } as AppError;

      default:
        return {
          ...baseError,
          code: `HTTP_${error.status}`,
          message: error.error?.message || error.message || 'HTTP error',
          userMessage: 'Terjadi kesalahan pada server.',
          severity: 'error'
        } as AppError;
    }
  }

  /**
   * Handle JavaScript errors
   */
  private handleJavaScriptError(error: Error): AppError {
    // Check for specific error types
    if (error.name === 'ChunkLoadError') {
      return {
        code: 'CHUNK_LOAD_ERROR',
        message: 'Failed to load application chunk',
        userMessage: 'Gagal memuat aplikasi. Silakan refresh halaman.',
        severity: 'error',
        timestamp: new Date(),
        details: { errorName: error.name, stack: error.stack }
      };
    }

    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      return {
        code: 'FETCH_ERROR',
        message: 'Network fetch failed',
        userMessage: 'Gagal mengambil data. Periksa koneksi internet Anda.',
        severity: 'error',
        timestamp: new Date(),
        details: { errorName: error.name, stack: error.stack }
      };
    }

    return {
      code: 'JAVASCRIPT_ERROR',
      message: error.message,
      userMessage: 'Terjadi kesalahan pada aplikasi.',
      severity: 'error',
      timestamp: new Date(),
      details: { errorName: error.name, stack: error.stack }
    };
  }

  /**
   * Handle string errors
   */
  private handleStringError(error: string): AppError {
    return {
      code: 'STRING_ERROR',
      message: error,
      userMessage: error,
      severity: 'error',
      timestamp: new Date()
    };
  }

  /**
   * Get user-friendly message from API error
   */
  private getApiErrorMessage(apiMessage?: string): string | null {
    if (!apiMessage) return null;

    const messageMap: { [key: string]: string } = {
      // Product errors
      'Product not found': 'Produk tidak ditemukan',
      'Product already exists': 'Produk sudah ada',
      'Insufficient stock': 'Stok tidak mencukupi',
      'Product is inactive': 'Produk tidak aktif',
      'Barcode already exists': 'Barcode sudah digunakan',

      // Category errors
      'Category not found': 'Kategori tidak ditemukan',
      'Category already exists': 'Kategori sudah ada',
      'Category is in use': 'Kategori sedang digunakan',

      // POS errors
      'Sale not found': 'Transaksi tidak ditemukan',
      'Invalid payment amount': 'Jumlah pembayaran tidak valid',
      'Payment method required': 'Metode pembayaran wajib dipilih',
      'Cart is empty': 'Keranjang kosong',

      // User errors
      'User not found': 'Pengguna tidak ditemukan',
      'Invalid credentials': 'Username atau password salah',
      'User already exists': 'Pengguna sudah ada',
      'Email already exists': 'Email sudah digunakan',

      // Member errors
      'Member not found': 'Member tidak ditemukan',
      'Member already exists': 'Member sudah ada',
      'Insufficient points': 'Poin tidak mencukupi',

      // General errors
      'Invalid request': 'Permintaan tidak valid',
      'Database connection failed': 'Gagal terhubung ke database',
      'File upload failed': 'Gagal mengunggah file',
      'File format not supported': 'Format file tidak didukung'
    };

    return messageMap[apiMessage] || null;
  }

  /**
   * Get validation error message
   */
  private getValidationErrorMessage(errorResponse: any): string {
    if (errorResponse?.errors) {
      const errors = errorResponse.errors;
      const errorMessages = Object.keys(errors).map(key => {
        const fieldErrors = errors[key];
        return `${this.translateFieldName(key)}: ${fieldErrors.join(', ')}`;
      });
      return errorMessages.join('; ');
    }

    return errorResponse?.message || 'Data tidak valid';
  }

  /**
   * Translate field names to Indonesian
   */
  private translateFieldName(fieldName: string): string {
    const fieldMap: { [key: string]: string } = {
      'name': 'Nama',
      'email': 'Email',
      'password': 'Password',
      'phone': 'Nomor Telepon',
      'barcode': 'Barcode',
      'price': 'Harga',
      'stock': 'Stok',
      'quantity': 'Jumlah',
      'category': 'Kategori',
      'description': 'Deskripsi',
      'address': 'Alamat'
    };

    return fieldMap[fieldName] || fieldName;
  }

  /**
   * Log error to local storage and console
   */
  private logError(error: AppError): void {
    // Add to error log
    this.errorLog.unshift(error);
    
    // Keep only recent errors
    if (this.errorLog.length > this.maxLogSize) {
      this.errorLog = this.errorLog.slice(0, this.maxLogSize);
    }

    // Console logging based on environment
    if (environment.logging.enableConsoleLogging) {
      switch (error.severity) {
        case 'critical':
        case 'error':
          console.error('[POS Error]', error);
          break;
        case 'warning':
          console.warn('[POS Warning]', error);
          break;
        case 'info':
          console.info('[POS Info]', error);
          break;
      }
    }

    // Save to localStorage for debugging
    try {
      localStorage.setItem('pos_error_log', JSON.stringify(this.errorLog.slice(0, 10)));
    } catch (e) {
      // Handle localStorage quota exceeded
      console.warn('Could not save error log to localStorage');
    }

    // Send to remote logging service in production
    if (environment.logging.enableRemoteLogging && environment.production) {
      this.sendToRemoteLogging(error);
    }
  }

  /**
   * Send error to remote logging service
   */
  private sendToRemoteLogging(error: AppError): void {
    // Implement remote logging here
    // Could integrate with services like Sentry, LogRocket, etc.
    console.log('Would send to remote logging:', error);
  }

  /**
   * Get recent errors for debugging
   */
  getRecentErrors(count: number = 10): AppError[] {
    return this.errorLog.slice(0, count);
  }

  /**
   * Clear error log
   */
  clearErrorLog(): void {
    this.errorLog = [];
    try {
      localStorage.removeItem('pos_error_log');
    } catch (e) {
      console.warn('Could not clear error log from localStorage');
    }
  }

  /**
   * Get error statistics
   */
  getErrorStats(): {
    total: number;
    byCode: { [code: string]: number };
    bySeverity: { [severity: string]: number };
    recent24h: number;
  } {
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const stats = {
      total: this.errorLog.length,
      byCode: {} as { [code: string]: number },
      bySeverity: {} as { [severity: string]: number },
      recent24h: 0
    };

    this.errorLog.forEach(error => {
      // Count by code
      stats.byCode[error.code] = (stats.byCode[error.code] || 0) + 1;
      
      // Count by severity
      stats.bySeverity[error.severity] = (stats.bySeverity[error.severity] || 0) + 1;
      
      // Count recent errors
      if (error.timestamp > yesterday) {
        stats.recent24h++;
      }
    });

    return stats;
  }

  /**
   * Check if error should trigger user notification
   */
  shouldNotifyUser(error: AppError): boolean {
    // Don't notify for info messages
    if (error.severity === 'info') {
      return false;
    }

    // Don't notify for repeated errors within short time
    const recentSimilar = this.errorLog
      .filter(e => 
        e.code === error.code && 
        (new Date().getTime() - e.timestamp.getTime()) < 5000
      );

    return recentSimilar.length <= 1;
  }
}