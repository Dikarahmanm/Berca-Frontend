// src/app/modules/notifications/notification-item/notification-item.component.ts
// ✅ FIXED: Added CommonModule import for *ngIf directive (NG8103)

import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common'; // ✅ FIXED: Added CommonModule import

// Simple notification interface to avoid circular dependencies
interface NotificationItem {
  id: number;
  type: string;
  title: string;
  message: string;
  actionUrl?: string;
  actionText?: string;
  isRead: boolean;
  priority: string;
  createdAt: string;
  readAt?: string;
}

@Component({
  selector: 'app-notification-item',
  templateUrl: './notification-item.component.html',
  styleUrls: ['./notification-item.component.scss'],
  standalone: true,
  imports: [CommonModule] // ✅ FIXED: Added CommonModule to imports array
})
export class NotificationItemComponent {
  @Input() notification!: NotificationItem;
  @Output() itemClicked = new EventEmitter<NotificationItem>();
  @Output() itemDeleted = new EventEmitter<number>();
  @Output() itemRead = new EventEmitter<number>();

  /**
   * Handle notification item click
   */
  onItemClick(): void {
    if (!this.notification.isRead) {
      this.markAsRead();
    }
    this.itemClicked.emit(this.notification);
  }

  /**
   * Handle delete button click
   */
  onDeleteClick(event: Event): void {
    event.stopPropagation(); // Prevent triggering item click
    this.itemDeleted.emit(this.notification.id);
  }

  /**
   * Mark notification as read
   */
  private markAsRead(): void {
    this.itemRead.emit(this.notification.id);
  }

  /**
   * Get notification icon based on type
   */
  getIcon(): string {
    const iconMap: { [key: string]: string } = {
      'LOW_STOCK': 'inventory_2',
      'MONTHLY_REVENUE': 'trending_up',
      'INVENTORY_AUDIT_DUE': 'fact_check',
      'SYSTEM_UPDATE': 'system_update',
      'PAYMENT_SUCCESS': 'payment',
      'PAYMENT_FAILED': 'payment',
      'USER_LOGIN': 'login',
      'BACKUP_COMPLETE': 'backup',
      'SECURITY_ALERT': 'security'
    };
    return iconMap[this.notification.type] || 'notifications';
  }

  /**
   * Get icon color based on priority
   */
  getIconColor(): string {
    const colorMap: { [key: string]: string } = {
      'Low': '#4CAF50',
      'Normal': '#2196F3', 
      'High': '#FF9800',
      'Critical': '#F44336'
    };
    return colorMap[this.notification.priority] || '#757575';
  }

  /**
   * Get priority CSS class
   */
  getPriorityClass(): string {
    return `priority-${this.notification.priority.toLowerCase()}`;
  }

  /**
   * Get readable type label
   */
  getTypeLabel(): string {
    const labelMap: { [key: string]: string } = {
      'LOW_STOCK': 'Stok Menipis',
      'MONTHLY_REVENUE': 'Pendapatan Bulanan',
      'INVENTORY_AUDIT_DUE': 'Audit Inventori',
      'SYSTEM_UPDATE': 'Update Sistem',
      'PAYMENT_SUCCESS': 'Pembayaran Berhasil',
      'PAYMENT_FAILED': 'Pembayaran Gagal',
      'USER_LOGIN': 'Login Pengguna',
      'BACKUP_COMPLETE': 'Backup Selesai',
      'SECURITY_ALERT': 'Peringatan Keamanan'
    };
    return labelMap[this.notification.type] || 'Notifikasi';
  }

  /**
   * Format timestamp to relative time
   */
  formatTime(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) {
      return 'Baru saja';
    } else if (diffInMinutes < 60) {
      return `${diffInMinutes} menit yang lalu`;
    } else if (diffInMinutes < 1440) { // 24 hours
      const hours = Math.floor(diffInMinutes / 60);
      return `${hours} jam yang lalu`;
    } else {
      const days = Math.floor(diffInMinutes / 1440);
      return `${days} hari yang lalu`;
    }
  }

  /**
   * Check if notification is expired (older than 30 days)
   */
  isExpired(): boolean {
    const date = new Date(this.notification.createdAt);
    const now = new Date();
    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    return diffInDays > 30;
  }
}