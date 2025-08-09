// src/app/shared/services/toast.service.ts
import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { ToastNotification } from '../components/toast-notification/toast-notification.component';

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  private toastsSubject = new BehaviorSubject<ToastNotification[]>([]);
  public toasts$ = this.toastsSubject.asObservable();
  
  private nextId = 1;
  private readonly maxToasts = 5;

  /**
   * Show success toast notification
   */
  showSuccess(title: string, message: string, actionText?: string, actionUrl?: string): void {
    this.addToast({
      id: this.nextId++,
      title,
      message,
      type: 'success',
      actionText,
      actionUrl,
      autoClose: true,
      duration: 5000
    });
  }

  /**
   * Show info toast notification
   */
  showInfo(title: string, message: string, actionText?: string, actionUrl?: string): void {
    this.addToast({
      id: this.nextId++,
      title,
      message,
      type: 'info',
      actionText,
      actionUrl,
      autoClose: true,
      duration: 6000
    });
  }

  /**
   * Show warning toast notification
   */
  showWarning(title: string, message: string, actionText?: string, actionUrl?: string): void {
    this.addToast({
      id: this.nextId++,
      title,
      message,
      type: 'warning',
      actionText,
      actionUrl,
      autoClose: true,
      duration: 7000
    });
  }

  /**
   * Show error toast notification
   */
  showError(title: string, message: string, actionText?: string, actionUrl?: string): void {
    this.addToast({
      id: this.nextId++,
      title,
      message,
      type: 'error',
      actionText,
      actionUrl,
      autoClose: true,
      duration: 8000
    });
  }

  /**
   * ✅ NEW: Show low stock warning with specific styling
   */
  showLowStock(productName: string, currentStock: number, minStock: number): void {
    this.addToast({
      id: this.nextId++,
      title: '⚠️ Stok Menipis',
      message: `${productName} tersisa ${currentStock} unit (minimum: ${minStock})`,
      type: 'warning',
      actionText: 'Kelola Stok',
      actionUrl: '/dashboard/inventory',
      autoClose: true,
      duration: 8000 // Longer duration for important stock alerts
    });
  }

  /**
   * Show notification from NotificationDto
   */
  showNotification(notification: { title: string, message: string, type?: string, actionUrl?: string }): void {
    const type = this.mapNotificationType(notification.type);
    const actionText = notification.actionUrl ? 'Lihat Detail' : undefined;

    this.addToast({
      id: this.nextId++,
      title: notification.title,
      message: notification.message,
      type,
      actionText,
      actionUrl: notification.actionUrl,
      autoClose: true,
      duration: this.getDurationByType(type)
    });
  }

  /**
   * ✅ IMPROVED: Add toast with priority-based ordering
   */
  private addToast(toast: ToastNotification): void {
    const currentToasts = this.toastsSubject.value;
    
    console.log('🍞 ADDING TOAST:', {
      title: toast.title,
      type: toast.type,
      currentCount: currentToasts.length
    });
    
    // Remove duplicate notifications for same content (prevent spam)
    const filteredToasts = currentToasts.filter(existing => 
      !(existing.title === toast.title && existing.message === toast.message)
    );
    
    // Add new toast at the beginning (newest first, stack from top)
    const newToasts = [toast, ...filteredToasts];
    
    // Limit to maximum toasts, remove oldest (from bottom)
    if (newToasts.length > this.maxToasts) {
      newToasts.splice(this.maxToasts);
    }
    
    console.log('🍞 TOAST QUEUE:', {
      newToastTitle: toast.title,
      totalToasts: newToasts.length,
      toastTitles: newToasts.map(t => t.title)
    });
    
    this.toastsSubject.next(newToasts);
  }

  /**
   * Remove toast by ID
   */
  removeToast(id: number): void {
    const currentToasts = this.toastsSubject.value;
    const filteredToasts = currentToasts.filter(toast => toast.id !== id);
    this.toastsSubject.next(filteredToasts);
  }

  /**
   * Clear all toasts
   */
  clearAll(): void {
    this.toastsSubject.next([]);
  }

  /**
   * Get current notifications synchronously
   */
  getCurrentToasts(): ToastNotification[] {
    return this.toastsSubject.value;
  }

  /**
   * ✅ NEW: Get duration based on toast type (important messages last longer)
   */
  private getDurationByType(type: 'success' | 'info' | 'warning' | 'error'): number {
    switch (type) {
      case 'success': return 5000;
      case 'info': return 6000;
      case 'warning': return 7000;
      case 'error': return 8000;
      default: return 6000;
    }
  }

  /**
   * Map notification type to toast type
   */
  private mapNotificationType(type?: string): 'success' | 'info' | 'warning' | 'error' {
    if (!type) return 'info';
    
    switch (type.toLowerCase()) {
      case 'success':
      case 'sale':
      case 'transaction':
        return 'success';
      case 'warning':
      case 'stock':
      case 'inventory':
      case 'low_stock':
      case 'lowstock':
        return 'warning';
      case 'error':
      case 'failed':
        return 'error';
      default:
        return 'info';
    }
  }
}
