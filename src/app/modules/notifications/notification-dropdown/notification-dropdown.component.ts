// src/app/modules/notifications/notification-dropdown/notification-dropdown.component.ts
import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatBadgeModule } from '@angular/material/badge';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Subject, takeUntil } from 'rxjs';

// Import real service and interfaces
import { NotificationService, NotificationDto, NotificationSummaryDto } from '../../../core/services/notification.service';

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

  // Data from real service
  recentNotifications: NotificationDto[] = [];
  summary: NotificationSummaryDto | null = null;

  // UI State
  isLoading = false;
  isOpen = false;

  constructor(
    private router: Router,
    private notificationService: NotificationService
  ) {}

  ngOnInit() {
    this.loadNotificationSummary();
    this.setupReactiveUpdates();
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
   * Load notification summary from real service
   */
  private loadNotificationSummary() {
    this.notificationService.getNotificationSummary()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (summary) => {
          this.summary = summary;
          this.recentNotifications = summary.recentNotifications || [];
        },
        error: (error) => {
          console.error('Error loading notification summary:', error);
        }
      });
  }

  /**
   * Setup reactive updates from service
   */
  private setupReactiveUpdates() {
    // Subscribe to real-time summary updates
    this.notificationService.summary$
      .pipe(takeUntil(this.destroy$))
      .subscribe((summary) => {
        if (summary) {
          this.summary = summary;
          this.recentNotifications = summary.recentNotifications || [];
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

    // Subscribe to loading state
    this.notificationService.isLoading$
      .pipe(takeUntil(this.destroy$))
      .subscribe((isLoading) => {
        this.isLoading = isLoading;
      });
  }

  /**
   * Toggle dropdown
   */
  toggleDropdown() {
    this.isOpen = !this.isOpen;
    if (this.isOpen) {
      this.loadNotificationSummary(); // Refresh data when opening
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
  onNotificationClick(notification: NotificationDto) {
    // Mark as read using real service
    if (!notification.isRead) {
      this.notificationService.markAsRead(notification.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (success) => {
            if (success) {
              notification.isRead = true;
              notification.readAt = new Date().toISOString();
            }
          },
          error: (error) => {
            console.error('Error marking notification as read:', error);
          }
        });
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
   * Mark all as read using real service
   */
  markAllAsRead() {
    this.notificationService.markAllAsRead()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (success) => {
          if (success) {
            this.recentNotifications.forEach(n => {
              n.isRead = true;
              n.readAt = new Date().toISOString();
            });
          }
        },
        error: (error) => {
          console.error('Error marking all notifications as read:', error);
        }
      });
  }

  /**
   * Get badge count
   */
  getBadgeCount(): number {
    return this.summary?.unreadCount || 0;
  }

  /**
   * Check if has unread notifications
   */
  hasUnreadNotifications(): boolean {
    return (this.summary?.unreadCount || 0) > 0;
  }

  /**
   * Check if has any notifications
   */
  hasNotifications(): boolean {
    return this.recentNotifications.length > 0;
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
  trackByNotificationId(index: number, notification: NotificationDto): number {
    return notification.id;
  }
}