// src/app/modules/notifications/notification-center/notification-center.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil, finalize } from 'rxjs/operators';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';

// Import real service and interfaces
import { NotificationService, NotificationDto, NotificationSummaryDto } from '../../../core/services/notification.service';
import { BaseLayoutComponent } from '../../../shared/components/base-layout/base-layout.component';

type FilterType = 'all' | 'unread' | 'low_stock' | 'system' | 'sales';

@Component({
  selector: 'app-notification-center',
  templateUrl: './notification-center.component.html',
  styleUrls: ['./notification-center.component.scss'],
  standalone: true,
  imports: [CommonModule, BaseLayoutComponent, MatIconModule, MatButtonModule, MatTooltipModule]
})
export class NotificationCenterComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // Data from real service
  notifications: NotificationDto[] = [];
  summary: NotificationSummaryDto | null = null;

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

  constructor(
    private router: Router,
    private notificationService: NotificationService
  ) {}

  ngOnInit() {
    this.loadNotifications();
    this.loadSummary();
    this.setupReactiveUpdates();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Load notifications from real service
   */
  private loadNotifications() {
    this.isLoading = true;
    this.error = null;
    
    const isReadFilter = this.selectedFilter === 'unread' ? false : undefined;
    
    this.notificationService.getUserNotifications(this.page, this.pageSize, isReadFilter)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.isLoading = false)
      )
      .subscribe({
        next: (notifications) => {
          if (this.page === 1) {
            this.notifications = notifications;
          } else {
            this.notifications = [...this.notifications, ...notifications];
          }
          this.hasMoreNotifications = notifications.length === this.pageSize;
          this.updateFilterCounts();
        },
        error: (error) => {
          this.error = 'Gagal memuat notifikasi. Silakan coba lagi.';
          console.error('Error loading notifications:', error);
        }
      });
  }

  /**
   * Load notification summary from real service
   */
  private loadSummary() {
    this.notificationService.getNotificationSummary()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (summary) => {
          this.summary = summary;
          this.updateFilterCounts();
        },
        error: (error) => {
          console.error('Error loading summary:', error);
        }
      });
  }

  /**
   * Setup reactive updates for real-time notifications
   */
  private setupReactiveUpdates() {
    // Listen for new notifications in real-time if service supports it
    this.notificationService.notifications$
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (notifications) => {
          this.notifications = notifications;
          this.updateFilterCounts();
        }
      });
  }

  /**
   * Get filtered notifications berdasarkan backend mapping
   */
  getFilteredNotifications(): NotificationDto[] {
    const filtered = this.notifications.filter(notification => {
      switch (this.selectedFilter) {
        case 'all':
          return true;
        case 'unread':
          return !notification.isRead;
        case 'low_stock':
          return ['LOW_STOCK', 'OUT_OF_STOCK', 'low_stock'].includes(notification.type);
        case 'system':
          return ['SYSTEM_MAINTENANCE', 'BACKUP_COMPLETED', 'USER_LOGIN', 'string'].includes(notification.type);
        case 'sales':
          return ['SALE_COMPLETED', 'MONTHLY_REVENUE', 'INVENTORY_AUDIT'].includes(notification.type);
        default:
          return true;
      }
    });
    console.log(`Filtered notifications (${this.selectedFilter}):`, filtered.length, 'out of', this.notifications.length);
    return filtered;
  }

  /**
   * Update filter counts berdasarkan data aktual
   */
  private updateFilterCounts() {
    this.filterOptions.forEach(filter => {
      switch (filter.value) {
        case 'all':
          filter.count = this.notifications.length;
          break;
        case 'unread':
          filter.count = this.notifications.filter(n => !n.isRead).length;
          break;
        case 'low_stock':
          filter.count = this.notifications.filter(n => 
            ['LOW_STOCK', 'OUT_OF_STOCK', 'low_stock'].includes(n.type)
          ).length;
          break;
        case 'system':
          filter.count = this.notifications.filter(n => 
            ['SYSTEM_MAINTENANCE', 'BACKUP_COMPLETED', 'USER_LOGIN', 'string'].includes(n.type)
          ).length;
          break;
        case 'sales':
          filter.count = this.notifications.filter(n => 
            ['SALE_COMPLETED', 'MONTHLY_REVENUE', 'INVENTORY_AUDIT'].includes(n.type)
          ).length;
          break;
      }
    });
  }

  /**
   * Get notification icon berdasarkan tipe backend
   */
  getNotificationIcon(notification: NotificationDto): string {
    const iconMap: { [key: string]: string } = {
      // Stock Related
      'LOW_STOCK': 'inventory_2',
      'OUT_OF_STOCK': 'production_quantity_limits',
      'low_stock': 'inventory_2',
      
      // Sales Related
      'SALE_COMPLETED': 'point_of_sale',
      'MONTHLY_REVENUE': 'trending_up',
      'INVENTORY_AUDIT': 'fact_check',
      
      // System Related
      'SYSTEM_MAINTENANCE': 'build',
      'BACKUP_COMPLETED': 'backup',
      'USER_LOGIN': 'login',
      'string': 'info',
      
      // Default
      'CUSTOM': 'notifications'
    };
    return iconMap[notification.type] || 'notifications';
  }

  /**
   * Get CSS class untuk styling notification berdasarkan tipe
   */
  getNotificationTypeClass(notification: NotificationDto): string {
    const classMap: { [key: string]: string } = {
      // Stock Related - Orange/Red theme
      'LOW_STOCK': 'type-stock-warning',
      'OUT_OF_STOCK': 'type-stock-critical',
      'low_stock': 'type-stock-warning',
      
      // Sales Related - Green theme
      'SALE_COMPLETED': 'type-sales-success',
      'MONTHLY_REVENUE': 'type-sales-info',
      'INVENTORY_AUDIT': 'type-sales-audit',
      
      // System Related - Blue theme
      'SYSTEM_MAINTENANCE': 'type-system-warning',
      'BACKUP_COMPLETED': 'type-system-success',
      'USER_LOGIN': 'type-system-info',
      'string': 'type-system-general',
      
      // Default
      'CUSTOM': 'type-custom'
    };
    return classMap[notification.type] || 'type-default';
  }

  /**
   * Get color untuk notification icon
   */
  getNotificationColor(notification: NotificationDto): string {
    const colorMap: { [key: string]: string } = {
      // Stock Related
      'LOW_STOCK': '#ff9800',
      'OUT_OF_STOCK': '#f44336',
      'low_stock': '#ff9800',
      
      // Sales Related
      'SALE_COMPLETED': '#4caf50',
      'MONTHLY_REVENUE': '#2196f3',
      'INVENTORY_AUDIT': '#673ab7',
      
      // System Related
      'SYSTEM_MAINTENANCE': '#ff5722',
      'BACKUP_COMPLETED': '#4caf50',
      'USER_LOGIN': '#2196f3',
      'string': '#607d8b',
      
      // Default
      'CUSTOM': '#9e9e9e'
    };
    return colorMap[notification.type] || '#9e9e9e';
  }

  /**
   * Get notification type label yang sesuai dengan backend
   */
  getNotificationTypeLabel(type: string): string {
    const labels: { [key: string]: string } = {
      // Stock Related
      'LOW_STOCK': 'Stok Menipis',
      'OUT_OF_STOCK': 'Stok Habis',
      'low_stock': 'Stok Menipis',
      
      // Sales Related
      'SALE_COMPLETED': 'Penjualan Selesai',
      'MONTHLY_REVENUE': 'Laporan Bulanan', 
      'INVENTORY_AUDIT': 'Audit Inventori',
      
      // System Related
      'SYSTEM_MAINTENANCE': 'Pemeliharaan Sistem',
      'BACKUP_COMPLETED': 'Backup Selesai',
      'USER_LOGIN': 'Login User',
      'string': 'Notifikasi Umum',
      
      // Default
      'CUSTOM': 'Kustom'
    };
    return labels[type] || type;
  }

  /**
   * Get notification badge text berdasarkan tipe
   */
  getNotificationBadge(notification: NotificationDto): string {
    const badges: { [key: string]: string } = {
      'LOW_STOCK': 'STOK',
      'OUT_OF_STOCK': 'HABIS',
      'low_stock': 'STOK',
      'SALE_COMPLETED': 'JUAL',
      'MONTHLY_REVENUE': 'LAPORAN',
      'SYSTEM_MAINTENANCE': 'SISTEM',
      'BACKUP_COMPLETED': 'BACKUP',
      'USER_LOGIN': 'USER',
      'string': 'INFO'
    };
    return badges[notification.type] || 'INFO';
  }

  /**
   * Get priority display text
   */
  getPriorityDisplayText(priority: string): string {
    const priorityMap: { [key: string]: string } = {
      'Low': 'Rendah',
      'Medium': 'Sedang', 
      'High': 'Tinggi',
      'Critical': 'Kritis'
    };
    return priorityMap[priority] || priority;
  }

  /**
   * Mark notification as read
   */
  markAsRead(notificationId: number): void {
    this.notificationService.markAsRead(notificationId).subscribe({
      next: () => {
        // Update the local notification state
        const notification = this.notifications.find(n => n.id === notificationId);
        if (notification) {
          notification.isRead = true;
        }
        this.updateFilterCounts();
      },
      error: (error) => {
        console.error('Error marking notification as read:', error);
        this.showError('Gagal menandai notifikasi sebagai sudah dibaca');
      }
    });
  }

  /**
   * Delete notification
   */
  deleteNotification(notification: NotificationDto, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    
    if (confirm('Apakah Anda yakin ingin menghapus notifikasi ini?')) {
      this.notificationService.deleteNotification(notification.id).subscribe({
        next: () => {
          this.notifications = this.notifications.filter(n => n.id !== notification.id);
          this.updateFilterCounts();
        },
        error: (error) => {
          console.error('Error deleting notification:', error);
          this.showError('Gagal menghapus notifikasi');
        }
      });
    }
  }

  /**
   * Handle notification click
   */
  onNotificationClick(notification: NotificationDto): void {
    if (!notification.isRead) {
      this.markAsRead(notification.id);
    }
    
    // Navigate to action URL if available
    if (notification.actionUrl) {
      window.open(notification.actionUrl, '_blank');
    }
  }

  /**
   * Check if notification is expired
   */
  isNotificationExpired(notification: NotificationDto): boolean {
    // Since backend doesn't have expiryDate, return false for now
    return false;
  }

  /**
   * Check if has notifications
   */
  hasNotifications(): boolean {
    return this.notifications.length > 0;
  }

  /**
   * Load more notifications
   */
  loadMore(): void {
    if (this.hasMoreNotifications && !this.isLoading) {
      this.page++;
      this.loadNotifications();
    }
  }

  /**
   * Show error message
   */
  private showError(message: string): void {
    this.error = message;
    // Auto-clear error after 5 seconds
    setTimeout(() => {
      this.clearError();
    }, 5000);
  }

  /**
   * Clear error message
   */
  clearError(): void {
    this.error = null;
  }

  /**
   * Change filter
   */
  changeFilter(filterValue: FilterType, index: number) {
    console.log(`Filter changed to: ${filterValue}, index: ${index}`);
    this.selectedFilter = filterValue;
    this.selectedFilterIndex = index;
    this.page = 1;
    this.loadNotifications();
  }

  /**
   * Refresh notifications
   */
  refresh() {
    this.page = 1;
    this.loadNotifications();
    this.loadSummary();
  }

  /**
   * Get notification priority class
   */
  getNotificationPriorityClass(notification: NotificationDto): string {
    return `priority-${notification.priority.toLowerCase()}`;
  }

  /**
   * Track by function for notifications
   */
  trackByNotificationId(index: number, notification: NotificationDto): number {
    return notification.id;
  }

  /**
   * Format notification time
   */
  formatNotificationTime(date: string): string {
    const now = new Date();
    const notificationDate = new Date(date);
    const diffInHours = Math.floor((now.getTime() - notificationDate.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) {
      return 'Baru saja';
    } else if (diffInHours < 24) {
      return `${diffInHours} jam yang lalu`;
    } else {
      return notificationDate.toLocaleDateString('id-ID');
    }
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

  /**
   * Get filter counts
   */
  getTotalCount(): number {
    return this.notifications.length;
  }

  getUnreadCount(): number {
    return this.notifications.filter(n => !n.isRead).length;
  }

  getLowStockCount(): number {
    return this.notifications.filter(n => 
      ['LOW_STOCK', 'OUT_OF_STOCK', 'low_stock'].includes(n.type)
    ).length;
  }

  getSystemCount(): number {
    return this.notifications.filter(n => 
      ['SYSTEM_MAINTENANCE', 'BACKUP_COMPLETED', 'USER_LOGIN', 'string'].includes(n.type)
    ).length;
  }

  getSalesCount(): number {
    return this.notifications.filter(n => 
      ['SALE_COMPLETED', 'MONTHLY_REVENUE', 'INVENTORY_AUDIT'].includes(n.type)
    ).length;
  }

  /**
   * Mark all notifications as read
   */
  markAllAsRead(): void {
    const unreadNotifications = this.notifications.filter(n => !n.isRead);
    if (unreadNotifications.length === 0) return;

    // Update local state immediately for better UX
    this.notifications.forEach(n => n.isRead = true);
    this.updateFilterCounts();

    // Call service to persist changes
    this.notificationService.markAllAsRead().subscribe({
      next: () => {
        console.log('All notifications marked as read successfully');
      },
      error: (error) => {
        console.error('Error marking all as read:', error);
        // Revert changes on error
        unreadNotifications.forEach(n => n.isRead = false);
        this.updateFilterCounts();
        this.showError('Gagal menandai semua notifikasi sebagai sudah dibaca');
      }
    });
  }
}