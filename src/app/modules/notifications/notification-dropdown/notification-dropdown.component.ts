// src/app/shared/notification-dropdown/notification-dropdown.component.ts
import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatBadgeModule } from '@angular/material/badge';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Subject, takeUntil, interval } from 'rxjs';

// Simple notification interface (matches backend DTO)
interface Notification {
  id: number;
  type: string;
  title: string;
  message: string;
  actionUrl?: string;
  actionText?: string;
  isRead: boolean;
  priority: string; // "Low", "Normal", "High", "Critical"
  createdAt: string;
  readAt?: string;
  timeAgo: string;
  isExpired: boolean;
}

interface NotificationSummary {
  totalCount: number;
  unreadCount: number;
  lowStockCount: number;
  systemCount: number;
  salesCount: number;
  lastUpdated: Date;
}

@Component({
  selector: 'app-notification-dropdown',
  templateUrl: './notification-dropdown.component.html',
  styleUrls: ['./notification-dropdown.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatButtonModule,
    MatBadgeModule,
    MatTooltipModule,
    MatDividerModule,
    MatProgressSpinnerModule
  ]
})
export class NotificationDropdownComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // Data
  notifications: Notification[] = [];
  summary: NotificationSummary = {
    totalCount: 0,
    unreadCount: 0,
    lowStockCount: 0,
    systemCount: 0,
    salesCount: 0,
    lastUpdated: new Date()
  };

  // UI State
  isLoading = false;
  isOpen = false;

  constructor(private router: Router) {}

  ngOnInit() {
    this.loadMockData();
    this.startPolling();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    const dropdown = target.closest('.notification-dropdown');
    if (!dropdown) {
      this.closeDropdown();
    }
  }

  /**
   * Load mock notification data (replace with real service call)
   */
  private loadMockData() {
    // Mock notifications for demo
    this.notifications = [
      {
        id: 1,
        type: 'LOW_STOCK',
        title: 'Stok Menipis',
        message: 'Produk Mie Instan tinggal 5 unit',
        actionUrl: '/inventory',
        actionText: 'Lihat Inventori',
        isRead: false,
        priority: 'High',
        createdAt: new Date().toISOString(),
        timeAgo: '5 menit lalu',
        isExpired: false
      },
      {
        id: 2,
        type: 'MONTHLY_REVENUE',
        title: 'Laporan Bulanan',
        message: 'Laporan penjualan bulan ini sudah tersedia',
        actionUrl: '/reports',
        actionText: 'Lihat Laporan',
        isRead: false,
        priority: 'Normal',
        createdAt: new Date().toISOString(),
        timeAgo: '2 jam lalu',
        isExpired: false
      },
      {
        id: 3,
        type: 'SALE_COMPLETED',
        title: 'Penjualan Selesai',
        message: 'Transaksi #001234 berhasil diselesaikan',
        actionUrl: '/pos',
        actionText: 'Lihat Detail',
        isRead: true,
        priority: 'Normal',
        createdAt: new Date().toISOString(),
        timeAgo: '1 hari lalu',
        isExpired: false
      }
    ];

    this.summary = {
      totalCount: this.notifications.length,
      unreadCount: this.notifications.filter(n => !n.isRead).length,
      lowStockCount: this.notifications.filter(n => n.type === 'LOW_STOCK').length,
      systemCount: this.notifications.filter(n => n.type === 'SYSTEM_MAINTENANCE').length,
      salesCount: this.notifications.filter(n => n.type === 'SALE_COMPLETED').length,
      lastUpdated: new Date()
    };
  }

  /**
   * Start polling for new notifications (replace with SignalR)
   */
  private startPolling() {
    interval(30000) // Poll every 30 seconds
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        // In real implementation, call notification service
        console.log('🔔 Polling for new notifications...');
      });
  }

  /**
   * Toggle dropdown
   */
  toggleDropdown() {
    this.isOpen = !this.isOpen;
    if (this.isOpen) {
      this.loadMockData(); // Refresh data when opening
    }
  }

  /**
   * Close dropdown
   */
  closeDropdown() {
    this.isOpen = false;
  }

  /**
   * Handle notification click
   */
  onNotificationClick(notification: Notification) {
    // Mark as read
    if (!notification.isRead) {
      notification.isRead = true;
      this.summary.unreadCount = Math.max(0, this.summary.unreadCount - 1);
      // In real implementation, call service to mark as read
      console.log('📧 Marked notification as read:', notification.id);
    }

    // Navigate to action URL
    if (notification.actionUrl) {
      this.router.navigate([notification.actionUrl]);
    }

    this.closeDropdown();
  }

  /**
   * Navigate to notification center
   */
  viewAllNotifications() {
    this.router.navigate(['/notifications']);
    this.closeDropdown();
  }

  /**
   * Mark all as read
   */
  markAllAsRead() {
    this.notifications.forEach(n => n.isRead = true);
    this.summary.unreadCount = 0;
    // In real implementation, call service
    console.log('📧 Marked all notifications as read');
  }

  /**
   * Get notification icon
   */
  getNotificationIcon(type: string): string {
    const icons: { [key: string]: string } = {
      'LOW_STOCK': 'inventory_2',
      'MONTHLY_REVENUE': 'analytics',
      'INVENTORY_AUDIT': 'fact_check',
      'SYSTEM_MAINTENANCE': 'build',
      'SALE_COMPLETED': 'point_of_sale',
      'USER_LOGIN': 'person',
      'BACKUP_COMPLETED': 'backup',
      'CUSTOM': 'notifications'
    };
    return icons[type] || 'notifications';
  }

  /**
   * Get notification color
   */
  getNotificationColor(priority: string): string {
    const colors: { [key: string]: string } = {
      'Low': '#4BBF7B',      // Green
      'Normal': '#FF914D',   // Orange
      'High': '#FFB84D',     // Warning yellow
      'Critical': '#E15A4F'  // Red
    };
    return colors[priority] || '#FF914D';
  }

  /**
   * Format notification time
   */
  formatNotificationTime(date: string): string {
    const now = new Date();
    const notificationDate = new Date(date);
    const diffMs = now.getTime() - notificationDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Baru saja';
    if (diffMins < 60) return `${diffMins} menit lalu`;
    if (diffHours < 24) return `${diffHours} jam lalu`;
    if (diffDays < 7) return `${diffDays} hari lalu`;
    
    return notificationDate.toLocaleDateString('id-ID');
  }

  /**
   * Get badge count
   */
  getBadgeCount(): number {
    return this.summary.unreadCount;
  }

  /**
   * Check if has unread notifications
   */
  hasUnreadNotifications(): boolean {
    return this.summary.unreadCount > 0;
  }

  /**
   * Get notification type label
   */
  getNotificationTypeLabel(type: string): string {
    const labels: { [key: string]: string } = {
      'LOW_STOCK': 'Stok Menipis',
      'MONTHLY_REVENUE': 'Laporan Bulanan', 
      'INVENTORY_AUDIT': 'Audit Inventori',
      'SYSTEM_MAINTENANCE': 'Pemeliharaan Sistem',
      'SALE_COMPLETED': 'Penjualan Selesai',
      'USER_LOGIN': 'Login User',
      'BACKUP_COMPLETED': 'Backup Selesai',
      'CUSTOM': 'Kustom'
    };
    return labels[type] || type;
  }

  /**
   * Truncate message
   */
  truncateMessage(message: string, maxLength: number = 60): string {
    if (message.length <= maxLength) return message;
    return message.substring(0, maxLength) + '...';
  }

  /**
   * Get empty state message
   */
  getEmptyStateMessage(): string {
    return 'Tidak ada notifikasi baru';
  }

  /**
   * Track by function for ngFor performance
   */
  trackByNotificationId(index: number, notification: Notification): number {
    return notification.id;
  }
}