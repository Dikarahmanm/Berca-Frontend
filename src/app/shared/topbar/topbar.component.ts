// src/app/shared/components/topbar/topbar.component.ts
// src/app/shared/components/topbar/topbar.component.ts
// ✅ Refactor: sinkron dgn StateService (signals) + tetap pertahankan fungsi yang ada
import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, Injector, runInInjectionContext, ChangeDetectionStrategy, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatBadgeModule } from '@angular/material/badge';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { toObservable } from '@angular/core/rxjs-interop';

import { AuthService } from '../../core/services/auth.service';
import { NotificationDto, NotificationService } from '../../core/services/notification.service';
import { StateService } from '../../core/services/state.service';

@Component({
  selector: 'app-topbar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    RouterModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    MatBadgeModule,
    MatTooltipModule,
    MatDividerModule,
    MatProgressSpinnerModule,
    MatSnackBarModule
  ],
  templateUrl: './topbar.component.html',
  styleUrls: ['./topbar.component.scss']
})
export class TopbarComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // Inputs (tetap)
  @Input() pageTitle: string = '';
  @Input() brandTitle: string = 'Toko Eniwan';
  @Input() username: string = '';
  @Input() role: string = '';
  @Input() userPhoto?: string;
  @Input() notificationCount: number = 0;
  @Input() showMenuToggle: boolean = false;
  @Input() showBreadcrumb: boolean = true;
  @Input() showQuickActions: boolean = false;
  @Input() breadcrumb: string[] = [];
  @Input() isMobile: boolean = false;

  // Outputs (tetap)
  @Output() logoutClicked = new EventEmitter<void>();
  @Output() menuToggleClicked = new EventEmitter<void>();

  // State internal (tetap)
  recentNotifications: NotificationDto[] = [];
  isLoadingNotifications: boolean = false;
  notificationError: string | null = null;
  isLoggingOut: boolean = false;
  isDarkMode: boolean = false;
  showNotificationDropdown: boolean = false;
  showProfileDropdown: boolean = false;
  selectedFilter: 'all' | 'unread' | 'read' = 'all';
  Math = Math;

  private roleDisplayMap: { [key: string]: string } = {
    'Admin': 'Administrator',
    'Manager': 'Manager',
    'User': 'Kasir',
    'Cashier': 'Kasir',
    'Staff': 'Staff'
  };

  constructor(
    private router: Router,
    private notificationService: NotificationService,
    private authService: AuthService,
    private snackBar: MatSnackBar,
    private state: StateService,         // ⬅️ NEW
    private injector: Injector           // ⬅️ NEW (toObservable context)
  ) {}

  ngOnInit(): void {
    this.initializeTopbar();
    this.subscribeToNotifications();  // existing
    this.checkMobileState();
    this.setupDocumentClickListener();

    // ===== Signals → Observable (aman NG0203) =====
    const user$    = runInInjectionContext(this.injector, () => toObservable(this.state.user));
    const unread$  = runInInjectionContext(this.injector, () => toObservable(this.state.unreadNotificationCount));
    const mobile$  = runInInjectionContext(this.injector, () => toObservable(this.state.isMobile));

    user$.pipe(takeUntil(this.destroy$)).subscribe(u => {
      if (u) {
        this.username = u.username ?? this.username;
        this.role = u.role ?? this.role;
      }
    });
    unread$.pipe(takeUntil(this.destroy$)).subscribe(c => this.notificationCount = c);
    mobile$.pipe(takeUntil(this.destroy$)).subscribe(v => {
      this.isMobile = v;
      if (this.isMobile && !this.showMenuToggle) this.showMenuToggle = true;
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    document.removeEventListener('click', this.onDocumentClick.bind(this));
    document.body.style.overflow = '';
  }

  private initializeTopbar(): void {
    console.log('🔝 Topbar initialized');
    
    // Load theme preference
    this.isDarkMode = localStorage.getItem('darkMode') === 'true';
    
    // Load initial notifications from API only - same as /notifications page
    this.loadNotifications();
  }

  private loadNotifications(): void {
    console.log('🔄 Loading notifications from API...');
    this.isLoadingNotifications = true;
    this.notificationError = null;
    
    // First try to get all notifications like the backend test
    this.notificationService.getUserNotifications(1, 20).subscribe({
      next: (notifications) => {
        console.log('📬 Direct API Response (getUserNotifications):', notifications);
        this.recentNotifications = notifications.slice(0, 5); // Take first 5 for dropdown
        this.notificationCount = notifications.filter(n => !n.isRead).length;
        this.isLoadingNotifications = false;
        
        console.log('✅ Notifications loaded:', {
          total: notifications.length,
          displayed: this.recentNotifications.length,
          unread: this.notificationCount
        });
      },
      error: (error: any) => {
        console.error('❌ Error with getUserNotifications, trying getNotificationSummary:', error);
        
        // Fallback to summary endpoint
        this.notificationService.getNotificationSummary().subscribe({
          next: (summary) => {
            console.log('📬 Notification Summary Response:', summary);
            
            if (summary) {
              this.recentNotifications = summary.recentNotifications || [];
              this.notificationCount = summary.unreadCount || 0;
              console.log('✅ Notifications loaded from summary:', {
                total: this.recentNotifications.length,
                unread: this.notificationCount
              });
            } else {
              this.recentNotifications = [];
              this.notificationCount = 0;
            }
            this.isLoadingNotifications = false;
          },
          error: (summaryError: any) => {
            console.error('❌ Error loading notifications from both endpoints:', summaryError);
            this.notificationError = 'Failed to load notifications';
            this.recentNotifications = [];
            this.notificationCount = 0;
            this.isLoadingNotifications = false;
          }
        });
      }
    });
  }

  private subscribeToNotifications(): void {
    // Subscribe to notifications from service
    this.notificationService.notifications$
      .pipe(takeUntil(this.destroy$))
      .subscribe((notifications: NotificationDto[]) => {
        console.log('📬 Notifications subscription update:', notifications);
        // Take only first 5 for dropdown
        this.recentNotifications = notifications.slice(0, 5);
      });

    // Subscribe to unread count changes
    this.notificationService.unreadCount$
      .pipe(takeUntil(this.destroy$))
      .subscribe((count: number) => {
        console.log('🔢 Unread count update:', count);
        this.notificationCount = count;
      });

    // Subscribe to loading state
    this.notificationService.isLoading$
      .pipe(takeUntil(this.destroy$))
      .subscribe((isLoading: boolean) => {
        this.isLoadingNotifications = isLoading;
      });

    // Subscribe to error state
    this.notificationService.error$
      .pipe(takeUntil(this.destroy$))
      .subscribe((error: string | null) => {
        this.notificationError = error;
      });
  }

  private checkMobileState(): void {
    this.isMobile = window.innerWidth <= 768;
    
    // Also check for showMenuToggle on mobile
    if (this.isMobile && !this.showMenuToggle) {
      this.showMenuToggle = true;
    }
    
    window.addEventListener('resize', () => {
      const wasMobile = this.isMobile;
      this.isMobile = window.innerWidth <= 768;
      
      // Update showMenuToggle based on mobile state
      if (this.isMobile && !this.showMenuToggle) {
        this.showMenuToggle = true;
      }
      
      // Close dropdowns when switching between mobile/desktop
      if (wasMobile !== this.isMobile) {
        this.showNotificationDropdown = false;
        this.showProfileDropdown = false;
      }
    });
  }

  private setupDocumentClickListener(): void {
    document.addEventListener('click', this.onDocumentClick.bind(this));
  }

  private onDocumentClick(event: Event): void {
    const target = event.target as HTMLElement;
    const notificationWrapper = target.closest('.notification-wrapper');
    const profileWrapper = target.closest('.profile-wrapper');
    
    if (!notificationWrapper) {
      this.showNotificationDropdown = false;
    }
    
    if (!profileWrapper) {
      this.showProfileDropdown = false;
    }
  }

  // Dropdown toggle methods
  toggleNotificationDropdown(): void {
    this.showNotificationDropdown = !this.showNotificationDropdown;
    this.showProfileDropdown = false; // Close other dropdown
    
    // Prevent body scroll on mobile when dropdown is open
    if (this.isMobile) {
      if (this.showNotificationDropdown) {
        document.body.style.overflow = 'hidden';
      } else {
        document.body.style.overflow = '';
      }
    }
  }

  toggleProfileDropdown(): void {
    this.showProfileDropdown = !this.showProfileDropdown;
    this.showNotificationDropdown = false; // Close other dropdown
  }

  // Helper methods for templates
  getTimeAgo(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Baru saja';
    if (diffInMinutes < 60) return `${diffInMinutes} menit yang lalu`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours} jam yang lalu`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays} hari yang lalu`;
  }

  markAsRead(notification: NotificationDto): void {
    if (!notification.isRead) {
      notification.isRead = true;
      notification.readAt = new Date().toISOString();
      this.notificationCount = this.recentNotifications.filter(n => !n.isRead).length;
      // TODO: Call API to mark as read
    }
  }

  viewAllNotifications(): void {
    this.showNotificationDropdown = false;
    // Restore body scroll on mobile
    if (this.isMobile) {
      document.body.style.overflow = '';
    }
    this.router.navigate(['/dashboard/notifications']);
  }

  markAllAsRead(): void {
    // Update local state first for immediate UI feedback
    this.recentNotifications.forEach(notification => {
      if (!notification.isRead) {
        notification.isRead = true;
        notification.readAt = new Date().toISOString();
      }
    });
    this.notificationCount = 0;
    
    // Then call API
    this.notificationService.markAllAsRead().subscribe({
      next: (success: boolean) => {
        if (success) {
          console.log('✅ All notifications marked as read');
          this.showSuccessMessage('All notifications marked as read');
          // Refresh notifications to get latest data
          this.refreshNotifications();
        }
      },
      error: (error: any) => {
        console.error('Error marking all as read:', error);
        this.showErrorMessage('Failed to mark all as read');
        // Revert local changes on error
        this.refreshNotifications();
      }
    });
  }

  // Navigation methods
  navigateHome(): void {
    this.router.navigate(['/dashboard']);
  }

  navigateToProfile(): void {
    this.router.navigate(['/dashboard/profile']);
  }

  navigateToSettings(): void {
    this.router.navigate(['/dashboard/settings']);
  }

  navigateToNotifications(): void {
    this.router.navigate(['/dashboard/notifications']);
  }

  // Notification methods
  onNotificationClick(notification: NotificationDto): void {
    // Close notification dropdown
    this.showNotificationDropdown = false;
    
    // Use smart navigation from notification service
    this.notificationService.handleNotificationClick(notification);
  }

  markNotificationAsRead(id: number): void {
    this.notificationService.markAsRead(id).subscribe({
      next: (success: boolean) => {
        if (success) {
          const notification = this.recentNotifications.find(n => n.id === id);
          if (notification) {
            notification.isRead = true;
          }
        }
      },
      error: (error: any) => {
        console.error('Error marking notification as read:', error);
      }
    });
  }

  refreshNotifications(): void {
    console.log('🔄 Refreshing notifications...');
    this.loadNotifications();
  }

  /**
   * ✅ NEW: Force refresh with instant response
   */
  forceRefreshNotifications(): void {
    console.log('⚡ Force refreshing notifications...');
    this.isLoadingNotifications = true;
    
    this.notificationService.refreshInstantly().subscribe({
      next: () => {
        console.log('✅ Force refresh completed');
        this.isLoadingNotifications = false;
        this.notificationError = null;
      },
      error: (error) => {
        console.error('❌ Force refresh failed:', error);
        this.isLoadingNotifications = false;
        this.notificationError = 'Failed to refresh notifications';
      }
    });
  }

  // User actions
  logout(): void {
    this.isLoggingOut = true;
    this.logoutClicked.emit();
    
    // Reset loading state after timeout
    setTimeout(() => {
      this.isLoggingOut = false;
    }, 3000);
  }

  toggleTheme(): void {
    this.isDarkMode = !this.isDarkMode;
    localStorage.setItem('darkMode', this.isDarkMode.toString());
    document.body.classList.toggle('dark-mode', this.isDarkMode);
    
    this.showSuccessMessage(`Switched to ${this.isDarkMode ? 'dark' : 'light'} mode`);
  }

  // Utility methods
  getInitials(name: string): string {
    if (!name) return 'U';
    
    const words = name.trim().split(' ');
    if (words.length === 1) {
      return words[0].charAt(0).toUpperCase();
    } else {
      return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
    }
  }

  getRoleDisplay(role: string): string {
    return this.roleDisplayMap[role] || role;
  }

  getNotificationIcon(type: string): string {
    const iconMap: { [key: string]: string } = {
      'order': 'shopping_cart',
      'warning': 'warning',
      'success': 'check_circle',
      'info': 'info',
      'error': 'error',
      'LOW_STOCK': 'warning',
      'SALE_COMPLETED': 'point_of_sale',
      'SYSTEM_MAINTENANCE': 'build',
      'USER_ACTION': 'person',
      'BACKUP_COMPLETED': 'backup',
      'ERROR': 'error',
      'INFO': 'info',
      'SUCCESS': 'check_circle'
    };
    return iconMap[type] || 'notifications';
  }

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

  getRelativeTime(timestamp: string): string {
    // Use Asia/Jakarta timezone for all calculations
    const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
    const date = new Date(new Date(timestamp).toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / 60000);

    if (diffMinutes < 1) return 'Baru saja';
    if (diffMinutes < 60) return `${diffMinutes} menit yang lalu`;

    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours} jam yang lalu`;

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays} hari yang lalu`;

    return date.toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta' });
  }

  private showSuccessMessage(message: string): void {
    this.snackBar.open(message, 'Tutup', {
      duration: 3000,
      panelClass: ['snackbar-success']
    });
  }

  private showErrorMessage(message: string): void {
    this.snackBar.open(message, 'Tutup', {
      duration: 5000,
      panelClass: ['snackbar-error']
    });
  }

  trackByNotificationId(index: number, notification: NotificationDto): number {
    return notification.id;
  }

  // ===== ENHANCED NOTIFICATION METHODS ===== //

  getNotificationSummaryText(): string {
    if (this.notificationCount === 0) {
      return 'You\'re all caught up!';
    } else if (this.notificationCount === 1) {
      return '1 new notification';
    } else {
      return `${this.notificationCount} new notifications`;
    }
  }

  setNotificationFilter(filter: 'all' | 'unread' | 'read'): void {
    this.selectedFilter = filter;
  }

  getFilterCount(filter: 'all' | 'unread' | 'read'): number {
    switch (filter) {
      case 'all':
        return this.recentNotifications.length;
      case 'unread':
        return this.recentNotifications.filter(n => !n.isRead).length;
      case 'read':
        return this.recentNotifications.filter(n => n.isRead).length;
      default:
        return 0;
    }
  }

  getFilteredNotifications(): NotificationDto[] {
    switch (this.selectedFilter) {
      case 'unread':
        return this.recentNotifications.filter(n => !n.isRead);
      case 'read':
        return this.recentNotifications.filter(n => n.isRead);
      case 'all':
      default:
        return this.recentNotifications;
    }
  }

  formatNotificationType(type: string): string {
    const typeMap: { [key: string]: string } = {
      'LOW_STOCK': 'Low Stock',
      'OUT_OF_STOCK': 'Out of Stock',
      'SALE_COMPLETED': 'Sale',
      'SYSTEM_MAINTENANCE': 'System',
      'USER_ACTION': 'User',
      'BACKUP_COMPLETED': 'Backup',
      'ERROR': 'Error',
      'INFO': 'Info',
      'SUCCESS': 'Success',
      'low_stock': 'Low Stock',
      'string': 'General'
    };
    return typeMap[type] || type.charAt(0).toUpperCase() + type.slice(1).toLowerCase();
  }

  getEmptyStateIcon(): string {
    switch (this.selectedFilter) {
      case 'unread':
        return 'notifications_active';
      case 'read':
        return 'check_circle';
      default:
        return 'notifications_none';
    }
  }

  getEmptyStateTitle(): string {
    switch (this.selectedFilter) {
      case 'unread':
        return 'No unread notifications';
      case 'read':
        return 'No read notifications';
      default:
        return 'No notifications';
    }
  }

  getEmptyStateMessage(): string {
    switch (this.selectedFilter) {
      case 'unread':
        return 'All notifications have been read. Great job staying on top of things!';
      case 'read':
        return 'No notifications have been read yet.';
      default:
        return 'You\'re all caught up! New notifications will appear here.';
    }
  }
}