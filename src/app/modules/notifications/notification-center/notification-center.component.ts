// src/app/modules/notifications/notification-center/notification-center.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil, finalize } from 'rxjs/operators';

// Import real service and interfaces
import { NotificationService, NotificationDto, NotificationSummaryDto } from '../../../core/services/notification.service';

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
   * Setup reactive updates from service
   */
  private setupReactiveUpdates() {
    // Subscribe to real-time updates
    this.notificationService.summary$
      .pipe(takeUntil(this.destroy$))
      .subscribe((summary) => {
        if (summary) {
          this.summary = summary;
          this.updateFilterCounts();
        }
      });

    this.notificationService.notifications$
      .pipe(takeUntil(this.destroy$))
      .subscribe((notifications) => {
        this.notifications = notifications;
      });

    this.notificationService.error$
      .pipe(takeUntil(this.destroy$))
      .subscribe((error) => {
        this.error = error;
      });
  }

  /**
   * Get dynamic count for specific notification types
   */
  getLowStockCount(): number {
    return this.notifications.filter(n => n.type === 'LOW_STOCK').length;
  }

  getSystemCount(): number {
    return this.notifications.filter(n => 
      ['SYSTEM_MAINTENANCE', 'BACKUP_COMPLETED'].includes(n.type)
    ).length;
  }

  getSalesCount(): number {
    return this.notifications.filter(n => 
      ['SALE_COMPLETED', 'MONTHLY_REVENUE'].includes(n.type)
    ).length;
  }

  /**
   * Update filter counts based on summary
   */
  private updateFilterCounts() {
    if (!this.summary) return;
    
    this.filterOptions[0].count = this.summary.totalCount; // all
    this.filterOptions[1].count = this.summary.unreadCount; // unread
    
    // Calculate type-specific counts from actual notifications
    const lowStockCount = this.notifications.filter(n => n.type === 'LOW_STOCK').length;
    const systemCount = this.notifications.filter(n => 
      ['SYSTEM_MAINTENANCE', 'BACKUP_COMPLETED'].includes(n.type)
    ).length;
    const salesCount = this.notifications.filter(n => 
      ['SALE_COMPLETED', 'MONTHLY_REVENUE'].includes(n.type)
    ).length;
    
    this.filterOptions[2].count = lowStockCount; // low_stock
    this.filterOptions[3].count = systemCount; // system
    this.filterOptions[4].count = salesCount; // sales
  }

  /**
   * Change filter and reload notifications
   */
  changeFilter(filter: FilterType, index: number) {
    this.selectedFilter = filter;
    this.selectedFilterIndex = index;
    this.page = 1;
    this.hasMoreNotifications = true;
    this.loadNotifications();
  }

  /**
   * Get filtered notifications for display
   */
  getFilteredNotifications(): NotificationDto[] {
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
   * Mark notification as read using real service
   */
  markAsRead(notification: NotificationDto) {
    if (notification.isRead) return;

    this.notificationService.markAsRead(notification.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (success) => {
          if (success) {
            notification.isRead = true;
            notification.readAt = new Date().toISOString();
            this.loadSummary(); // Refresh summary
          }
        },
        error: (error) => {
          console.error('Error marking notification as read:', error);
        }
      });
  }

  /**
   * Mark all notifications as read using real service
   */
  markAllAsRead() {
    this.notificationService.markAllAsRead()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (success) => {
          if (success) {
            this.notifications.forEach(n => {
              n.isRead = true;
              n.readAt = new Date().toISOString();
            });
            this.loadSummary(); // Refresh summary
          }
        },
        error: (error) => {
          console.error('Error marking all notifications as read:', error);
        }
      });
  }

  /**
   * Delete notification using real service
   */
  deleteNotification(notification: NotificationDto, event: Event) {
    event.stopPropagation();

    if (confirm('Yakin ingin menghapus notifikasi ini?')) {
      this.notificationService.deleteNotification(notification.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (success) => {
            if (success) {
              const index = this.notifications.findIndex(n => n.id === notification.id);
              if (index > -1) {
                this.notifications.splice(index, 1);
                this.loadSummary(); // Refresh summary
              }
            }
          },
          error: (error) => {
            console.error('Error deleting notification:', error);
          }
        });
    }
  }

  /**
   * Refresh notifications from service
   */
  refresh() {
    this.page = 1;
    this.hasMoreNotifications = true;
    this.error = null;
    this.loadNotifications();
    this.loadSummary();
  }

  /**
   * Load more notifications (pagination)
   */
  loadMore() {
    if (!this.hasMoreNotifications || this.isLoading) return;
    
    this.page++;
    this.loadNotifications();
  }

  /**
   * Handle notification click
   */
  onNotificationClick(notification: NotificationDto) {
    this.markAsRead(notification);
    
    if (notification.actionUrl) {
      this.router.navigate([notification.actionUrl]);
    }
  }

  /**
   * Get notification icon
   */
  getNotificationIcon(notification: NotificationDto): string {
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
  getNotificationColor(notification: NotificationDto): string {
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
  isNotificationExpired(notification: NotificationDto): boolean {
    const now = new Date();
    const notificationDate = new Date(notification.createdAt);
    const diffDays = Math.floor((now.getTime() - notificationDate.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays > 30; // Consider expired after 30 days
  }

  /**
   * Get notification priority class
   */
  getNotificationPriorityClass(notification: NotificationDto): string {
    return `priority-${notification.priority.toLowerCase()}`;
  }

  /**
   * Track by function for ngFor performance
   */
  trackByNotificationId(index: number, notification: NotificationDto): number {
    return notification.id;
  }

  /**
   * Clear error
   */
  clearError() {
    this.error = null;
    this.notificationService.clearError();
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