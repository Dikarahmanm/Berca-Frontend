// src/app/modules/notifications/notification-center/notification-center.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subject, interval } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

// Simple notification interfaces
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

type FilterType = 'all' | 'unread' | 'low_stock' | 'system' | 'sales';

@Component({
  selector: 'app-notification-center',
  templateUrl: './notification-center.component.html',
  styleUrls: ['./notification-center.component.scss'],
  standalone: true,
  imports: [CommonModule]
})
export class NotificationCenterComponent implements OnInit, OnDestroy {
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
  error: string | null = null;
  selectedFilter: FilterType = 'all';
  selectedFilterIndex = 0;
  page = 1;
  pageSize = 20;
  hasMoreNotifications = true;

  // Filter options
  filterOptions = [
    { value: 'all' as FilterType, label: 'Semua', icon: 'notifications', count: 0 },
    { value: 'unread' as FilterType, label: 'Belum Dibaca', icon: 'notifications_active', count: 0 },
    { value: 'low_stock' as FilterType, label: 'Stok Menipis', icon: 'inventory_2', count: 0 },
    { value: 'system' as FilterType, label: 'Sistem', icon: 'settings', count: 0 },
    { value: 'sales' as FilterType, label: 'Penjualan', icon: 'point_of_sale', count: 0 }
  ];

  constructor(private router: Router) {}

  ngOnInit() {
    this.loadMockData();
    this.updateFilterCounts();
    this.startPolling();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Load mock notification data
   */
  private loadMockData() {
    this.isLoading = true;
    
    // Simulate API delay
    setTimeout(() => {
      this.notifications = [
        {
          id: 1,
          type: 'LOW_STOCK',
          title: 'Stok Menipis',
          message: 'Produk Mie Instan Sedap Goreng tinggal 5 unit. Segera lakukan restocking untuk menghindari kehabisan stok.',
          actionUrl: '/inventory',
          actionText: 'Lihat Inventori',
          isRead: false,
          priority: 'High',
          createdAt: new Date(Date.now() - 5 * 60000).toISOString(), // 5 minutes ago
          timeAgo: '5 menit lalu',
          isExpired: false
        },
        {
          id: 2,
          type: 'MONTHLY_REVENUE',
          title: 'Laporan Bulanan Tersedia',
          message: 'Laporan penjualan bulan Januari 2025 sudah siap. Total pendapatan Rp 15.200.000 dengan peningkatan 12% dari bulan sebelumnya.',
          actionUrl: '/reports',
          actionText: 'Lihat Laporan',
          isRead: false,
          priority: 'Normal',
          createdAt: new Date(Date.now() - 2 * 3600000).toISOString(), // 2 hours ago
          timeAgo: '2 jam lalu',
          isExpired: false
        },
        {
          id: 3,
          type: 'SALE_COMPLETED',
          title: 'Transaksi Besar Selesai',
          message: 'Transaksi #001234 senilai Rp 850.000 berhasil diselesaikan oleh kasir Siti.',
          actionUrl: '/pos',
          actionText: 'Lihat Detail',
          isRead: true,
          priority: 'Normal',
          createdAt: new Date(Date.now() - 24 * 3600000).toISOString(), // 1 day ago
          timeAgo: '1 hari lalu',
          isExpired: false
        },
        {
          id: 4,
          type: 'INVENTORY_AUDIT',
          title: 'Audit Inventori Diperlukan',
          message: 'Sudah 30 hari sejak audit inventori terakhir. Waktu untuk melakukan pengecekan stok menyeluruh.',
          actionUrl: '/inventory/audit',
          actionText: 'Mulai Audit',
          isRead: false,
          priority: 'High',
          createdAt: new Date(Date.now() - 3 * 24 * 3600000).toISOString(), // 3 days ago
          timeAgo: '3 hari lalu',
          isExpired: false
        },
        {
          id: 5,
          type: 'SYSTEM_MAINTENANCE',
          title: 'Pemeliharaan Sistem Terjadwal',
          message: 'Sistem akan menjalani pemeliharaan rutin pada Minggu, 2 Februari 2025 pukul 02:00 - 04:00 WIB.',
          isRead: true,
          priority: 'Low',
          createdAt: new Date(Date.now() - 7 * 24 * 3600000).toISOString(), // 7 days ago
          timeAgo: '1 minggu lalu',
          isExpired: false
        },
        {
          id: 6,
          type: 'LOW_STOCK',
          title: 'Stok Kritis',
          message: 'Produk Susu UHT Indomilk habis. Perlu segera melakukan pembelian ulang.',
          actionUrl: '/inventory',
          actionText: 'Lihat Inventori',
          isRead: false,
          priority: 'Critical',
          createdAt: new Date(Date.now() - 30 * 60000).toISOString(), // 30 minutes ago
          timeAgo: '30 menit lalu',
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

      this.updateFilterCounts();
      this.isLoading = false;
    }, 1000);
  }

  /**
   * Start polling for new notifications
   */
  private startPolling() {
    interval(30000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        console.log('🔔 Polling for new notifications...');
        // In real implementation, call API to check for new notifications
      });
  }

  /**
   * Update filter counts
   */
  private updateFilterCounts() {
    this.filterOptions[0].count = this.summary.totalCount; // all
    this.filterOptions[1].count = this.summary.unreadCount; // unread
    this.filterOptions[2].count = this.summary.lowStockCount; // low_stock
    this.filterOptions[3].count = this.summary.systemCount; // system
    this.filterOptions[4].count = this.summary.salesCount; // sales
  }

  /**
   * Change filter
   */
  changeFilter(filter: FilterType, index: number) {
    this.selectedFilter = filter;
    this.selectedFilterIndex = index;
    this.page = 1;
    this.hasMoreNotifications = true;
    // In real implementation, load filtered notifications from API
  }

  /**
   * Get filtered notifications for display
   */
  getFilteredNotifications(): Notification[] {
    switch (this.selectedFilter) {
      case 'unread':
        return this.notifications.filter(n => !n.isRead);
      case 'low_stock':
        return this.notifications.filter(n => n.type === 'LOW_STOCK');
      case 'system':
        return this.notifications.filter(n => 
          ['SYSTEM_MAINTENANCE', 'BACKUP_COMPLETED'].includes(n.type)
        );
      case 'sales':
        return this.notifications.filter(n => 
          ['SALE_COMPLETED', 'MONTHLY_REVENUE'].includes(n.type)
        );
      default:
        return this.notifications;
    }
  }

  /**
   * Mark notification as read
   */
  markAsRead(notification: Notification) {
    if (notification.isRead) return;

    notification.isRead = true;
    this.summary.unreadCount = Math.max(0, this.summary.unreadCount - 1);
    this.updateFilterCounts();
    
    console.log('📧 Marked notification as read:', notification.id);
  }

  /**
   * Mark all notifications as read
   */
  markAllAsRead() {
    this.notifications.forEach(n => n.isRead = true);
    this.summary.unreadCount = 0;
    this.updateFilterCounts();
    console.log('📧 Marked all notifications as read');
  }

  /**
   * Delete notification
   */
  deleteNotification(notification: Notification, event: Event) {
    event.stopPropagation();

    if (confirm('Yakin ingin menghapus notifikasi ini?')) {
      const index = this.notifications.findIndex(n => n.id === notification.id);
      if (index > -1) {
        this.notifications.splice(index, 1);
        this.summary.totalCount--;
        if (!notification.isRead) {
          this.summary.unreadCount--;
        }
        this.updateFilterCounts();
        console.log('🗑️ Deleted notification:', notification.id);
      }
    }
  }

  /**
   * Refresh notifications
   */
  refresh() {
    this.page = 1;
    this.hasMoreNotifications = true;
    this.error = null;
    this.loadMockData();
  }

  /**
   * Load more notifications
   */
  loadMore() {
    if (!this.hasMoreNotifications || this.isLoading) return;
    
    this.page++;
    // In real implementation, load more from API
    console.log('Loading more notifications, page:', this.page);
  }

  /**
   * Handle notification click
   */
  onNotificationClick(notification: Notification) {
    this.markAsRead(notification);
    
    if (notification.actionUrl) {
      this.router.navigate([notification.actionUrl]);
    }
  }

  /**
   * Get notification icon
   */
  getNotificationIcon(notification: Notification): string {
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
    return icons[notification.type] || 'notifications';
  }

  /**
   * Get notification color
   */
  getNotificationColor(notification: Notification): string {
    const colors: { [key: string]: string } = {
      'Low': '#4BBF7B',      // Green
      'Normal': '#FF914D',   // Orange
      'High': '#FFB84D',     // Warning yellow
      'Critical': '#E15A4F'  // Red
    };
    return colors[notification.priority] || '#FF914D';
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
   * Check if notification is expired
   */
  isNotificationExpired(notification: Notification): boolean {
    return notification.isExpired;
  }

  /**
   * Get notification priority class
   */
  getNotificationPriorityClass(notification: Notification): string {
    return `priority-${notification.priority.toLowerCase()}`;
  }

  /**
   * Track by function for ngFor performance
   */
  trackByNotificationId(index: number, notification: Notification): number {
    return notification.id;
  }

  /**
   * Clear error
   */
  clearError() {
    this.error = null;
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
   * Check if there are any notifications
   */
  hasNotifications(): boolean {
    return this.getFilteredNotifications().length > 0;
  }

  /**
   * Get empty state message
   */
  getEmptyStateMessage(): string {
    switch (this.selectedFilter) {
      case 'unread':
        return 'Tidak ada notifikasi yang belum dibaca';
      case 'low_stock':
        return 'Tidak ada notifikasi stok menipis';
      case 'system':
        return 'Tidak ada notifikasi sistem';
      case 'sales':
        return 'Tidak ada notifikasi penjualan';
      default:
        return 'Tidak ada notifikasi';
    }
  }
}