// src/app/shared/components/unified-notification-center/unified-notification-center.component.ts
import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatBadgeModule } from '@angular/material/badge';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Subject, takeUntil, timer } from 'rxjs';

// Import notification service and interfaces
import { NotificationService, NotificationDto, NotificationSummaryDto } from '../../../core/services/notification.service';

@Component({
  selector: 'app-unified-notification-center',
  templateUrl: './unified-notification-center.component.html',
  styleUrls: ['./unified-notification-center.component.scss'],
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
export class UnifiedNotificationCenterComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // Data from notification service
  recentNotifications: NotificationDto[] = [];
  summary: NotificationSummaryDto | null = null;

  // UI State
  isLoading = false;
  isOpen = false;
  error: string | null = null;

  constructor(
    private router: Router,
    private notificationService: NotificationService
  ) {
    console.log('🏗️ UnifiedNotificationCenter constructor called');
  }

  ngOnInit() {
    console.log('🔔 Unified Notification Center initialized - ngOnInit called');
    this.loadRecentNotifications();
    this.loadNotificationCounts();
    this.setupReactiveUpdates();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    const dropdown = target.closest('.unified-notification-dropdown');
    if (!dropdown) {
      this.closeDropdown();
    }
  }

  /**
   * Load notification summary from service (combined notifications)
   */
  private loadNotificationSummary() {
    this.isLoading = true;
    console.log('🔔 UnifiedNotificationCenter: Loading combined notifications...');
    
    // STEP 1: Load recent notifications directly (like notification center)
    this.loadRecentNotifications();
    
    // STEP 2: Load summary for counts
    this.loadNotificationCounts();
  }

  /**
   * Load recent notifications directly (not just from summary)
   */
  private loadRecentNotifications() {
    console.log('🔔 UnifiedNotificationCenter: Loading recent notifications directly...');
    
    // STEP 1: Try combined notifications first (includes smart notifications)
    this.notificationService.getCombinedNotifications(1, 8, undefined) // Load 8 most recent
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (notifications) => {
          console.log('✅ UnifiedNotificationCenter: Combined notifications loaded for dropdown:', notifications.length, notifications);
          this.recentNotifications = notifications;
          this.error = null;
        },
        error: (error) => {
          console.error('❌ UnifiedNotificationCenter: Combined notifications failed:', error);
          console.log('🔄 UnifiedNotificationCenter: Fallback to regular notifications...');
          
          // FALLBACK: Try regular notifications only
          this.notificationService.getAllBranchNotifications(1, 8, undefined)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
              next: (notifications) => {
                console.log('✅ UnifiedNotificationCenter: Fallback regular notifications loaded:', notifications.length, notifications);
                this.recentNotifications = notifications;
                this.error = null;
              },
              error: (fallbackError) => {
                console.error('❌ UnifiedNotificationCenter: Fallback regular notifications also failed:', fallbackError);
                this.error = 'Gagal memuat notifikasi';
                this.recentNotifications = [];
              }
            });
        }
      });
  }

  /**
   * Load notification counts and summary
   */
  private loadNotificationCounts() {
    console.log('🔔 UnifiedNotificationCenter: Loading notification counts...');
    
    // STEP 1: Try combined summary first
    this.notificationService.getCombinedNotificationSummary()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (summary) => {
          console.log('✅ UnifiedNotificationCenter: Combined summary loaded for counts:', summary);
          this.summary = summary;
          this.isLoading = false;
        },
        error: (error) => {
          console.error('❌ UnifiedNotificationCenter: Combined summary failed:', error);
          console.log('🔄 UnifiedNotificationCenter: Fallback to regular summary...');
          
          // FALLBACK: Try regular summary
          this.notificationService.getNotificationSummary()
            .pipe(takeUntil(this.destroy$))
            .subscribe({
              next: (summary) => {
                console.log('✅ UnifiedNotificationCenter: Fallback regular summary loaded:', summary);
                this.summary = summary;
                this.isLoading = false;
              },
              error: (fallbackError) => {
                console.error('❌ UnifiedNotificationCenter: Fallback summary also failed:', fallbackError);
                this.error = 'Gagal memuat notifikasi';
                this.isLoading = false;
              }
            });
        }
      });
  }

  /**
   * Setup reactive updates from service (combined notifications)
   */
  private setupReactiveUpdates() {
    // Subscribe to combined summary updates (includes smart notifications)
    this.notificationService.summary$
      .pipe(takeUntil(this.destroy$))
      .subscribe((summary) => {
        if (summary) {
          this.summary = summary;
          // Don't override recentNotifications from summary, use direct load instead
        }
      });

    // Subscribe to unread count updates
    this.notificationService.unreadCount$
      .pipe(takeUntil(this.destroy$))
      .subscribe((count) => {
        if (this.summary) {
          this.summary.unreadCount = count;
        }
      });

    // Subscribe to notifications list updates (combined) - this is the key improvement
    this.notificationService.notifications$
      .pipe(takeUntil(this.destroy$))
      .subscribe((notifications) => {
        // Update recent notifications from the full list (take first 8)
        if (notifications && notifications.length > 0) {
          console.log('📡 Real-time notifications update:', notifications.length);
          this.recentNotifications = notifications.slice(0, 8);
        }
      });

    // Auto-refresh every 30 seconds like notification center
    timer(30000, 30000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        console.log('🔄 Auto-refreshing unified notifications...');
        this.loadRecentNotifications();
        this.loadNotificationCounts();
      });
  }

  /**
   * Toggle dropdown visibility
   */
  toggleDropdown() {
    this.isOpen = !this.isOpen;
    if (this.isOpen) {
      // Always refresh when opening dropdown to get latest notifications
      console.log('🔔 Dropdown opened, refreshing notifications...');
      this.refreshNotifications();
    }
  }

  /**
   * Close dropdown
   */
  closeDropdown() {
    this.isOpen = false;
  }

  /**
   * Navigate to full notification center
   */
  viewAllNotifications() {
    this.closeDropdown();
    this.router.navigate(['/dashboard/notifications']);
  }

  /**
   * Mark all notifications as read
   */
  markAllAsRead() {
    if (!this.hasUnreadNotifications()) return;

    this.notificationService.markAllAsRead()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.loadNotificationSummary();
        },
        error: (error) => {
          console.error('Error marking all as read:', error);
        }
      });
  }

  /**
   * Mark single notification as read
   */
  markAsRead(notification: NotificationDto) {
    if (notification.isRead) return;

    this.notificationService.markAsRead(notification.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          notification.isRead = true;
          notification.readAt = new Date().toISOString();
          this.loadNotificationSummary();
        },
        error: (error) => {
          console.error('Error marking notification as read:', error);
        }
      });
  }

  /**
   * Handle notification click
   */
  onNotificationClick(notification: NotificationDto) {
    this.markAsRead(notification);
    
    if (notification.actionUrl) {
      this.closeDropdown();
      this.router.navigate([notification.actionUrl]);
    }
  }

  /**
   * Check if there are unread notifications
   */
  hasUnreadNotifications(): boolean {
    return this.summary ? this.summary.unreadCount > 0 : false;
  }

  /**
   * Get badge count for display
   */
  getBadgeCount(): number {
    return this.summary ? this.summary.unreadCount : 0;
  }

  /**
   * Get formatted badge text
   */
  getBadgeText(): string {
    const count = this.getBadgeCount();
    return count > 99 ? '99+' : count.toString();
  }

  /**
   * Get empty state message
   */
  getEmptyStateMessage(): string {
    return 'Tidak ada notifikasi terbaru';
  }

  /**
   * Get notification icon based on type
   */
  getNotificationIcon(notification: NotificationDto): string {
    switch (notification.type?.toLowerCase()) {
      case 'low_stock':
      case 'stock':
        return 'inventory_2';
      case 'system':
        return 'settings';
      case 'sales':
      case 'transaction':
        return 'point_of_sale';
      case 'user':
        return 'person';
      case 'warning':
        return 'warning';
      case 'error':
        return 'error';
      case 'success':
        return 'check_circle';
      default:
        return 'notifications';
    }
  }

  /**
   * Get notification priority class
   */
  getNotificationPriorityClass(notification: NotificationDto): string {
    switch (notification.priority?.toLowerCase()) {
      case 'high':
        return 'priority-high';
      case 'medium':
        return 'priority-medium';
      case 'low':
        return 'priority-low';
      default:
        return 'priority-normal';
    }
  }

  /**
   * Get time ago text
   */
  getTimeAgoText(notification: NotificationDto): string {
    return notification.timeAgo || 'Baru saja';
  }

  /**
   * Refresh notifications (load all types)
   */
  refreshNotifications() {
    console.log('🔄 Manual refresh triggered');
    this.loadRecentNotifications();
    this.loadNotificationCounts();
  }

  /**
   * Track by function for ngFor optimization
   */
  trackByNotificationId(index: number, notification: NotificationDto): number {
    return notification.id;
  }

  /**
   * Get notification tooltip text
   */
  getNotificationTooltip(notification: NotificationDto): string {
    return `${notification.title} - ${notification.timeAgo}`;
  }

  /**
   * Get priority display text
   */
  getPriorityText(priority: string): string {
    switch (priority?.toLowerCase()) {
      case 'high':
        return 'TINGGI';
      case 'medium':
        return 'SEDANG';
      case 'low':
        return 'RENDAH';
      default:
        return 'NORMAL';
    }
  }

  /**
   * Get type display text
   */
  getTypeDisplayText(type: string): string {
    switch (type?.toLowerCase()) {
      case 'low_stock':
      case 'stock':
        return 'Stok';
      case 'system':
        return 'Sistem';
      case 'sales':
      case 'transaction':
        return 'Penjualan';
      case 'user':
        return 'Pengguna';
      case 'warning':
        return 'Peringatan';
      case 'error':
        return 'Error';
      case 'success':
        return 'Berhasil';
      case 'smart_notification':
        return 'Smart Alert';
      default:
        return 'Umum';
    }
  }
}