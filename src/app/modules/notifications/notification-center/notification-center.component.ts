// src/app/modules/notifications/notification-center/notification-center.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subject, timer } from 'rxjs';
import { takeUntil, finalize } from 'rxjs/operators';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';

// Import real service and interfaces
import { NotificationService, NotificationDto, NotificationSummaryDto } from '../../../core/services/notification.service';

// Type alias for template usage
type NotificationModel = NotificationDto;

type FilterType = 'all' | 'unread' | 'low_stock' | 'system' | 'sales';

@Component({
  selector: 'app-notification-center',
  templateUrl: './notification-center.component.html',
  styleUrls: ['./notification-center.component.scss'],
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule, MatTooltipModule]
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
    console.log('🔔 NotificationCenter component initialized');
    
    // 🧪 DEBUG: Test API connection first
    this.notificationService.testApiConnection().subscribe({
      next: (result) => {
        console.log('🧪 API connection test result:', result);
      },
      error: (error) => {
        console.error('🧪 API connection test failed:', error);
      }
    });
    
    this.loadNotifications();
    this.loadSummary();
    this.setupReactiveUpdates();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Load notifications from real service (including smart notifications)
   */
  private loadNotifications() {
    console.log('🔔 Component loadNotifications called');
    this.isLoading = true;
    this.error = null;
    
    const isReadFilter = this.selectedFilter === 'unread' ? false : undefined;
    
    // STEP 1: Try combined notifications first
    console.log('🔔 Attempting to load combined notifications...');
    this.notificationService.getCombinedNotifications(this.page, this.pageSize, isReadFilter)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.isLoading = false)
      )
      .subscribe({
        next: (notifications) => {
          console.log('✅ Combined notifications loaded:', notifications.length);
          if (this.page === 1) {
            this.notifications = notifications;
          } else {
            this.notifications = [...this.notifications, ...notifications];
          }
          this.hasMoreNotifications = notifications.length === this.pageSize;
          this.updateFilterCounts();
        },
        error: (error) => {
          console.error('❌ Combined notifications failed:', error);
          this.error = 'Gagal memuat notifikasi kombinasi. Mencoba notifikasi regular...';
          
          // FALLBACK: Try regular notifications only
          this.notificationService.getAllBranchNotifications(this.page, this.pageSize, isReadFilter)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
              next: (notifications) => {
                console.log('✅ Fallback regular notifications loaded:', notifications.length);
                if (this.page === 1) {
                  this.notifications = notifications;
                } else {
                  this.notifications = [...this.notifications, ...notifications];
                }
                this.hasMoreNotifications = notifications.length === this.pageSize;
                this.updateFilterCounts();
                this.error = null; // Clear error since fallback worked
              },
              error: (fallbackError) => {
                console.error('❌ Fallback regular notifications also failed:', fallbackError);
                this.error = 'Gagal memuat notifikasi. Silakan coba lagi.';
              }
            });
        }
      });
  }

  /**
   * Load notification summary from real service (including smart notifications)
   */
  private loadSummary() {
    console.log('🔔 Component loadSummary called');
    this.notificationService.getCombinedNotificationSummary()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (summary) => {
          console.log('🔔 Component received combined summary:', summary);
          this.summary = summary;
          this.updateFilterCounts();
        },
        error: (error) => {
          console.error('Error loading combined summary:', error);
          // Fallback to regular summary
          this.notificationService.getNotificationSummary()
            .pipe(takeUntil(this.destroy$))
            .subscribe({
              next: (summary) => {
                this.summary = summary;
                this.updateFilterCounts();
              }
            });
        }
      });
  }

  /**
   * Setup reactive updates for real-time notifications
   */
  private setupReactiveUpdates() {
    console.log('🔔 Setting up reactive updates...');
    
    // Listen for unread count changes for real-time badge updates
    this.notificationService.unreadCount$
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (count) => {
          console.log('🔔 Real-time unread count update:', count);
          // Update filter counts when unread count changes
          this.updateFilterCounts();
        }
      });

    // Listen for summary updates
    this.notificationService.summary$
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (summary) => {
          if (summary) {
            console.log('🔔 Real-time summary update:', summary);
            this.summary = summary;
            this.updateFilterCounts();
          }
        }
      });

    // Auto-refresh every 30 seconds for real-time updates
    timer(30000, 30000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        console.log('🔄 Auto-refreshing notifications...');
        this.loadNotifications();
        this.loadSummary();
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
            ['LOW_STOCK', 'OUT_OF_STOCK', 'low_stock', 'BatchExpiry', 'CriticalExpiry'].includes(n.type)
          ).length;
          break;
        case 'system':
          filter.count = this.notifications.filter(n => 
            ['SYSTEM_MAINTENANCE', 'BACKUP_COMPLETED', 'USER_LOGIN', 'system', 'alert'].includes(n.type)
          ).length;
          break;
        case 'sales':
          filter.count = this.notifications.filter(n => 
            ['SALE_COMPLETED', 'MONTHLY_REVENUE', 'INVENTORY_AUDIT', 'sales', 'SALE_COMPLETED', 'daily-credit-summary'].includes(n.type)
          ).length;
          break;
      }
    });
    console.log('🔔 Filter counts updated:', this.filterOptions.map(f => `${f.label}: ${f.count}`));
  }

  // Stats getter methods for template
  getLowStockCount(): number {
    return this.notifications.filter(n => 
      ['LOW_STOCK', 'OUT_OF_STOCK', 'low_stock', 'BatchExpiry', 'CriticalExpiry'].includes(n.type)
    ).length;
  }

  getSystemCount(): number {
    return this.notifications.filter(n => 
      ['SYSTEM_MAINTENANCE', 'BACKUP_COMPLETED', 'USER_LOGIN', 'system', 'alert'].includes(n.type)
    ).length;
  }

  getSalesCount(): number {
    return this.notifications.filter(n => 
      ['SALE_COMPLETED', 'MONTHLY_REVENUE', 'INVENTORY_AUDIT', 'sales', 'SALE_COMPLETED', 'daily-credit-summary'].includes(n.type)
    ).length;
  }

  getCriticalCount(): number {
    return this.notifications.filter(n => 
      n.priority === 'Critical' || n.priority === 'High' || n.type === 'CriticalExpiry'
    ).length;
  }

  /**
   * Get notification icon berdasarkan tipe backend
   */
  getNotificationIcon(notification: NotificationDto | undefined): string {
    const iconMap: { [key: string]: string } = {
      // Stock Related
      'LOW_STOCK': 'inventory_2',
      'OUT_OF_STOCK': 'production_quantity_limits',
      'low_stock': 'inventory_2',
      'BatchExpiry': 'schedule',
      'CriticalExpiry': 'warning_amber',
      
      // Sales Related
      'SALE_COMPLETED': 'point_of_sale',
      'MONTHLY_REVENUE': 'trending_up',
      'INVENTORY_AUDIT': 'fact_check',
      'sales': 'point_of_sale',
      'daily-credit-summary': 'account_balance',
      
      // System Related
      'SYSTEM_MAINTENANCE': 'build',
      'BACKUP_COMPLETED': 'backup',
      'USER_LOGIN': 'login',
      'system': 'settings',
      'alert': 'notification_important',
      'success': 'check_circle',
      'TEST': 'bug_report',
      
      // Smart Notifications (handled separately below)
      
      // Facture/Invoice
      'facture-due-today': 'receipt',
      'facture-overdue': 'receipt_long',
      
      // Default
      'string': 'info',
      'CUSTOM': 'notifications'
    };
    
    // Check if it's a smart notification
    if (notification?.metadata?.isSmartNotification) {
      return 'smart_toy'; // Robot icon for smart notifications
    }
    
    return iconMap[notification?.type || 'default'] || 'notifications';
  }

  /**
   * Get CSS class untuk styling notification berdasarkan tipe
   */
  getNotificationTypeClass(notification: NotificationDto | undefined): string {
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
    return classMap[notification?.type || 'default'] || 'type-default';
  }

  /**
   * Get color untuk notification icon
   */
  getNotificationColor(notification: NotificationDto | undefined): string {
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
    return colorMap[notification?.type || 'default'] || '#9e9e9e';
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
  getNotificationBadge(notification: NotificationDto | undefined): string {
    // Smart notification badge
    if (notification?.metadata?.isSmartNotification) {
      return '🤖';
    }

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
    return badges[notification?.type || 'default'] || 'INFO';
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
  deleteNotification(notification: NotificationDto | undefined, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    
    if (!notification?.id) {
      this.showError('Invalid notification');
      return;
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
   * Handle notification click with smart navigation
   */
  onNotificationClick(notification: NotificationDto | undefined): void {
    if (!notification) {
      console.warn('🔔 Notification click called with undefined notification');
      return;
    }
    
    console.log('🔔 Notification clicked in center:', notification);
    
    // Use the notification service's smart click handler
    this.notificationService.handleNotificationClick(notification);
  }

  /**
   * Check if notification is expired
   */
  isNotificationExpired(notification: NotificationDto | undefined): boolean {
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
  getNotificationPriorityClass(notification: NotificationDto | undefined): string {
    if (!notification?.priority) return 'priority-medium';
    return `priority-${notification.priority.toLowerCase()}`;
  }

  /**
   * Track by function for notifications
   */
  trackByNotificationId(index: number, notification: NotificationDto): number {
    return notification?.id || index;
  }

  /**
   * Format notification time
   */
  formatNotificationTime(date: string | undefined): string {
    if (!date) return 'N/A';
    
    try {
      const now = new Date();
      const notificationDate = new Date(date);
      
      if (isNaN(notificationDate.getTime())) {
        return 'Invalid Date';
      }
      
      const diffInHours = Math.floor((now.getTime() - notificationDate.getTime()) / (1000 * 60 * 60));
      
      if (diffInHours < 1) {
        return 'Baru saja';
      } else if (diffInHours < 24) {
        return `${diffInHours} jam yang lalu`;
      } else {
        return notificationDate.toLocaleDateString('id-ID');
      }
    } catch (error) {
      return 'Error';
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

  /**
   * Check if notification is a smart notification
   */
  isSmartNotification(notification: NotificationDto): boolean {
    return notification?.metadata?.isSmartNotification === true;
  }

  /**
   * Get formatted potential loss for smart notifications
   */
  getFormattedPotentialLoss(notification: NotificationDto): string {
    const loss = notification?.metadata?.potentialLoss;
    if (!loss) return '';
    
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(loss);
  }

  /**
   * Get action items count for smart notifications
   */
  getActionItemsCount(notification: NotificationDto): number {
    return notification?.metadata?.actionItems?.length || 0;
  }

  /**
   * Check if notification has action items
   */
  hasActionItems(notification: NotificationDto): boolean {
    return this.getActionItemsCount(notification) > 0;
  }
}