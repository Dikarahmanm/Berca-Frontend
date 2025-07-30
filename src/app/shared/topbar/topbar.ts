// src/app/shared/topbar/topbar.component.ts
// ✅ FIXED: TopbarComponent dengan proper @Input properties
// Mengatasi NG8002 error dengan menambahkan notificationCount input

import { Component, OnInit, OnDestroy, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatBadgeModule } from '@angular/material/badge';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { Subject } from 'rxjs';
import { takeUntil, debounceTime } from 'rxjs/operators';

// Import notification service dan types
import { NotificationService, NotificationDto } from '../../core/services/notification.service';

@Component({
  selector: 'app-topbar',
  templateUrl: './topbar.html',
  styleUrls: ['./topbar.scss'],
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    MatMenuModule,
    MatDividerModule,
    MatSnackBarModule,
    MatBadgeModule,
    MatDialogModule
  ]
})
export class TopbarComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // ===== INPUT PROPERTIES ===== //
  @Input() pageTitle: string = 'Dashboard';
  @Input() username: string = '';
  @Input() role: string = '';
  @Input() avatarUrl: string = '';
  @Input() notificationCount!: number; // ✅ FIXED: Added required input for NG8002

  // ===== OUTPUT EVENTS ===== //
  @Output() logoutClicked = new EventEmitter<void>();

  // ===== INTERNAL STATE ===== //
  recentNotifications: NotificationDto[] = [];
  isLoadingNotifications: boolean = false;
  notificationError: string | null = null;
  isLoading = false;

  // ===== ROLE DISPLAY MAPPING ===== //
  roleDisplayMap: { [key: string]: string } = {
    'Admin': 'Administrator',
    'Manager': 'Manager',
    'User': 'Kasir',
    'Cashier': 'Kasir',
    'Staff': 'Staff'
  };

  constructor(
    private router: Router,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    private notificationService: NotificationService
  ) {}

  ngOnInit() {
    console.log('🔧 Fixed Topbar initialized with proper inputs');
    this.subscribeToNotificationData();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ===== NOTIFICATION DATA SUBSCRIPTION ===== //

  /**
   * Subscribe ke notification data dari service
   */
  private subscribeToNotificationData(): void {
    // Subscribe ke recent notifications untuk dropdown
    this.notificationService.notifications$
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (notifications: NotificationDto[]) => {
          this.recentNotifications = notifications.slice(0, 5);
          console.log('📧 Recent notifications updated in topbar:', this.recentNotifications.length);
        },
        error: (error: any) => {
          console.error('Error loading recent notifications:', error);
          this.notificationError = 'Failed to load recent notifications';
        }
      });

    // Subscribe ke loading state
    this.notificationService.isLoading$
      .pipe(takeUntil(this.destroy$))
      .subscribe(isLoading => {
        this.isLoadingNotifications = isLoading;
      });

    // Subscribe ke error state
    this.notificationService.error$
      .pipe(takeUntil(this.destroy$))
      .subscribe(error => {
        this.notificationError = error;
      });

    // Initial load notifications
    this.loadInitialNotifications();
  }

  /**
   * Load initial notification data
   */
  private loadInitialNotifications(): void {
    this.notificationService.getUserNotifications(1, 5).subscribe({
      next: (notifications: NotificationDto[]) => {
        this.recentNotifications = notifications;
      },
      error: (error: any) => {
        console.error('Error loading initial notifications:', error);
      }
    });
  }

  // ===== NOTIFICATION METHODS ===== //

  /**
   * Mark notification as read
   */
  markNotificationAsRead(notificationId: number): void {
    this.notificationService.markAsRead(notificationId).subscribe({
      next: (success: boolean) => {
        if (success) {
          console.log('✅ Notification marked as read:', notificationId);
          this.showSuccess('Notifikasi ditandai sebagai dibaca');
        } else {
          this.showError('Gagal menandai notifikasi sebagai dibaca');
        }
      },
      error: (error: any) => {
        console.error('Error marking notification as read:', error);
        this.showError('Terjadi kesalahan saat menandai notifikasi');
      }
    });
  }

  /**
   * Mark all notifications as read
   */
  markAllNotificationsAsRead(): void {
    this.notificationService.markAllAsRead().subscribe({
      next: (success: boolean) => {
        if (success) {
          console.log('✅ All notifications marked as read');
          this.showSuccess('Semua notifikasi ditandai sebagai dibaca');
        } else {
          this.showError('Gagal menandai semua notifikasi sebagai dibaca');
        }
      },
      error: (error: any) => {
        console.error('Error marking all notifications as read:', error);
        this.showError('Terjadi kesalahan saat menandai notifikasi');
      }
    });
  }

  /**
   * Handle notification click
   */
  onNotificationClick(notification: NotificationDto): void {
    // Mark as read jika belum dibaca
    if (!notification.isRead) {
      this.markNotificationAsRead(notification.id);
    }

    // Navigate ke action URL atau notification center
    if (notification.actionUrl) {
      this.navigateTo(notification.actionUrl);
    } else {
      this.navigateTo('/notifications');
    }
  }

  /**
   * Refresh notification data
   */
  refreshNotifications(): void {
    console.log('🔄 Refreshing notifications from backend...');
    
    this.notificationService.refreshNotifications().subscribe({
      next: () => {
        this.showSuccess('Notifikasi berhasil diperbarui');
      },
      error: (error: any) => {
        console.error('Error refreshing notifications:', error);
        this.showError('Gagal memperbarui notifikasi');
      }
    });
  }

  // ===== NAVIGATION METHODS ===== //

  /**
   * Navigate to route
   */
  navigateTo(route: string): void {
    this.router.navigate([route]);
  }

  /**
   * Navigate to settings page
   */
  navigateToSettings(): void {
    this.navigateTo('/settings');
  }

  /**
   * Navigate to profile page
   */
  navigateToProfile(): void {
    this.navigateTo('/profile');
  }

  /**
   * Navigate to notifications center
   */
  navigateToNotifications(): void {
    this.navigateTo('/notifications');
  }

  /**
   * Show change user dialog
   */
  showChangeUserDialog(): void {
    this.snackBar.open('Fitur ganti user akan segera hadir', 'Tutup', { 
      duration: 3000,
      panelClass: ['snackbar-info']
    });
  }

  /**
   * Handle logout
   */
  logout(): void {
    this.isLoading = true;
    
    // Clear notification service state
    this.notificationService.clearError();
    
    // Emit logout event ke parent component
    this.logoutClicked.emit();
    
    // Simulate logout process (actual logout handled by parent)
    setTimeout(() => {
      this.isLoading = false;
    }, 1500);
  }

  // ===== UTILITY METHODS ===== //

  /**
   * Get user initials for avatar
   */
  getInitials(name: string): string {
    if (!name) return 'U';
    
    const words = name.trim().split(' ');
    if (words.length === 1) {
      return words[0].charAt(0).toUpperCase();
    } else {
      return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
    }
  }

  /**
   * Get notification type icon
   */
  getNotificationIcon(type: string): string {
    const iconMap: { [key: string]: string } = {
      'LOW_STOCK': 'warning',
      'SALE_COMPLETED': 'point_of_sale',
      'SYSTEM_MAINTENANCE': 'settings',
      'USER_ACTION': 'person',
      'BACKUP_COMPLETED': 'backup',
      'ERROR': 'error',
      'INFO': 'info',
      'SUCCESS': 'check_circle'
    };
    
    return iconMap[type] || 'notifications';
  }

  /**
   * Get notification type class for styling
   */
  getNotificationTypeClass(type: string): string {
    const classMap: { [key: string]: string } = {
      'LOW_STOCK': 'type-warning',
      'SALE_COMPLETED': 'type-success',
      'SYSTEM_MAINTENANCE': 'type-info',
      'USER_ACTION': 'type-info',
      'BACKUP_COMPLETED': 'type-success',
      'ERROR': 'type-error',
      'INFO': 'type-info',
      'SUCCESS': 'type-success'
    };
    
    return classMap[type] || 'type-info';
  }

  /**
   * Get relative time untuk notification
   */
  getRelativeTime(timestamp: string): string {
    const now = new Date();
    const date = new Date(timestamp);
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / 60000);
    
    if (diffMinutes < 1) return 'Baru saja';
    if (diffMinutes < 60) return `${diffMinutes} menit yang lalu`;
    
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours} jam yang lalu`;
    
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays} hari yang lalu`;
    
    return date.toLocaleDateString('id-ID');
  }

  /**
   * Truncate text untuk display
   */
  truncateText(text: string, maxLength: number = 60): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  }

  // ===== NOTIFICATION METHODS ===== //

  /**
   * Show success message
   */
  private showSuccess(message: string): void {
    this.snackBar.open(message, 'Tutup', {
      duration: 3000,
      panelClass: ['snackbar-success']
    });
  }

  /**
   * Show error message
   */
  private showError(message: string): void {
    this.snackBar.open(message, 'Tutup', {
      duration: 5000,
      panelClass: ['snackbar-error']
    });
  }

  // ===== TRACK BY FUNCTIONS ===== //

  /**
   * Track by function untuk notifications
   */
  trackByNotificationId(index: number, item: NotificationDto): number {
    return item.id;
  }

  // ===== COMPUTED PROPERTIES ===== //

  /**
   * Check if there are unread notifications
   */
  get hasUnreadNotifications(): boolean {
    return this.notificationCount > 0;
  }

  /**
   * Get notification badge text
   */
  get notificationBadgeText(): string {
    if (this.notificationCount === 0) return '';
    if (this.notificationCount > 99) return '99+';
    return this.notificationCount.toString();
  }

  /**
   * Check if notifications are available
   */
  get hasNotifications(): boolean {
    return this.recentNotifications.length > 0;
  }

  /**
   * Get notification dropdown title
   */
  get notificationDropdownTitle(): string {
    if (this.isLoadingNotifications) return 'Memuat...';
    if (this.notificationError) return 'Error';
    if (this.notificationCount === 0) return 'Tidak ada notifikasi';
    return `${this.notificationCount} notifikasi baru`;
  }

  /**
   * Check if should show notification error
   */
  get shouldShowNotificationError(): boolean {
    return !this.isLoadingNotifications && !!this.notificationError;
  }
}