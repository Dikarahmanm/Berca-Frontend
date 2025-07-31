// src/app/shared/components/topbar/topbar.component.ts
// ✅ REDESIGNED: Topbar Component dengan Glass Morphism Orange Modern Theme

import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
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

import { AuthService } from '../../core/services/auth.service';
import { NotificationDto,NotificationService } from '../../core/services/notification.service';

@Component({
  selector: 'app-topbar',
  standalone: true,
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
  template: `
    <header class="topbar">
      <div class="topbar-container glass-surface">
        
        <!-- Left Section: Brand & Page Info -->
        <div class="topbar-left">
          
          <!-- Mobile Menu Toggle -->
          <button 
            class="menu-toggle-btn" 
            *ngIf="showMenuToggle"
            (click)="menuToggleClicked.emit()"
            matTooltip="Toggle Menu"
            [matTooltipPosition]="'below'">
            <mat-icon>menu</mat-icon>
          </button>

          <!-- Brand Logo & Name -->
          <div class="brand-section" (click)="navigateHome()">
            <div class="brand-logo">
              <mat-icon>store</mat-icon>
            </div>
            <span class="brand-text" *ngIf="!isMobile">{{ brandTitle }}</span>
          </div>

          <!-- Page Title & Breadcrumb -->
          <div class="page-info" *ngIf="pageTitle">
            <h1 class="page-title">{{ pageTitle }}</h1>
            
            <!-- Breadcrumb Navigation -->
            <nav class="breadcrumb-nav" *ngIf="showBreadcrumb && breadcrumb.length > 0">
              <ol class="breadcrumb">
                <li class="breadcrumb-item" *ngFor="let crumb of breadcrumb; let last = last">
                  <span [class.active]="last">{{ crumb }}</span>
                  <mat-icon *ngIf="!last" class="breadcrumb-separator">chevron_right</mat-icon>
                </li>
              </ol>
            </nav>
          </div>
        </div>

        <!-- Right Section: Actions & User -->
        <div class="topbar-right">
          
          <!-- Quick Actions (Optional) -->
          <div class="quick-actions" *ngIf="showQuickActions">
            <button class="quick-action-btn" matTooltip="Scan Barcode" [matTooltipPosition]="'below'">
              <mat-icon>qr_code_scanner</mat-icon>
            </button>
            
            <button class="quick-action-btn" matTooltip="Print Receipt" [matTooltipPosition]="'below'">
              <mat-icon>print</mat-icon>
            </button>
          </div>

          <!-- Notifications -->
          <div class="notification-section">
            <button 
              class="notification-btn"
              [matMenuTriggerFor]="notificationMenu"
              [matBadge]="notificationCount > 0 ? (notificationCount > 99 ? '99+' : notificationCount) : null"
              [matBadgeHidden]="notificationCount === 0"
              matBadgeColor="warn"
              matBadgeSize="small"
              matTooltip="Notifications"
              [matTooltipPosition]="'below'"
              [class.has-notifications]="notificationCount > 0">
              <mat-icon>notifications</mat-icon>
            </button>

            <!-- Notification Dropdown Menu -->
            <mat-menu #notificationMenu="matMenu" class="notification-dropdown" xPosition="before">
              
              <!-- Notification Header -->
              <div class="notification-header" (click)="$event.stopPropagation()">
                <div class="header-title">
                  <h3>Notifications</h3>
                  <span class="notification-count" *ngIf="notificationCount > 0">
                    {{ notificationCount }} unread
                  </span>
                </div>
                
                <div class="header-actions">
                  <button class="header-action-btn" (click)="refreshNotifications()" matTooltip="Refresh">
                    <mat-icon [class.spinning]="isLoadingNotifications">refresh</mat-icon>
                  </button>
                  
                  <button 
                    class="header-action-btn" 
                    (click)="markAllAsRead()" 
                    [disabled]="notificationCount === 0"
                    matTooltip="Mark All Read">
                    <mat-icon>mark_email_read</mat-icon>
                  </button>
                </div>
              </div>

              <mat-divider></mat-divider>

              <!-- Notification List -->
              <div class="notification-list" *ngIf="!isLoadingNotifications && !notificationError">
                
                <!-- Individual Notifications -->
                <div 
                  class="notification-item" 
                  *ngFor="let notification of recentNotifications.slice(0, 5); trackBy: trackByNotificationId"
                  [class.unread]="!notification.isRead"
                  (click)="onNotificationClick(notification)">
                  
                  <div class="notification-icon" [ngClass]="getNotificationTypeClass(notification.type)">
                    <mat-icon>{{ getNotificationIcon(notification.type) }}</mat-icon>
                  </div>
                  
                  <div class="notification-content">
                    <div class="notification-title">{{ notification.title }}</div>
                    <div class="notification-message">{{ notification.message }}</div>
                    <div class="notification-time">{{ getRelativeTime(notification.createdAt) }}</div>
                  </div>

                  <div class="unread-indicator" *ngIf="!notification.isRead"></div>
                </div>

                <!-- Empty State -->
                <div class="notification-empty" *ngIf="recentNotifications.length === 0">
                  <mat-icon>notifications_none</mat-icon>
                  <p>No notifications</p>
                </div>
              </div>

              <!-- Loading State -->
              <div class="notification-loading" *ngIf="isLoadingNotifications" (click)="$event.stopPropagation()">
                <mat-spinner diameter="32"></mat-spinner>
                <p>Loading notifications...</p>
              </div>

              <!-- Error State -->
              <div class="notification-error" *ngIf="notificationError" (click)="$event.stopPropagation()">
                <mat-icon>error_outline</mat-icon>
                <p>{{ notificationError }}</p>
                <button class="retry-btn" (click)="refreshNotifications()">
                  <mat-icon>refresh</mat-icon>
                  Retry
                </button>
              </div>

              <mat-divider *ngIf="recentNotifications.length > 0"></mat-divider>

              <!-- Footer Actions -->
              <div class="notification-footer" (click)="$event.stopPropagation()">
                <button class="footer-action-btn" (click)="navigateToNotifications()">
                  <mat-icon>visibility</mat-icon>
                  View All Notifications
                </button>
              </div>
            </mat-menu>
          </div>

          <!-- User Profile -->
          <div class="profile-section">
            <button 
              class="profile-btn"
              [matMenuTriggerFor]="profileMenu"
              matTooltip="Profile Menu"
              [matTooltipPosition]="'below'">
              
              <div class="profile-avatar">
                <img *ngIf="userPhoto; else avatarInitials" [src]="userPhoto" [alt]="username + ' avatar'">
                <ng-template #avatarInitials>
                  <span class="avatar-initials">{{ getInitials(username) }}</span>
                </ng-template>
              </div>
              
              <span class="profile-name" *ngIf="!isMobile">{{ username }}</span>
              <mat-icon class="profile-arrow" *ngIf="!isMobile">expand_more</mat-icon>
            </button>

            <!-- Profile Dropdown Menu -->
            <mat-menu #profileMenu="matMenu" class="profile-dropdown" xPosition="before">
              
              <!-- Profile Header -->
              <div class="profile-header" (click)="$event.stopPropagation()">
                <div class="profile-avatar-large">
                  <img *ngIf="userPhoto; else avatarInitialsLarge" [src]="userPhoto" [alt]="username + ' avatar'">
                  <ng-template #avatarInitialsLarge>
                    <span class="avatar-initials-large">{{ getInitials(username) }}</span>
                  </ng-template>
                </div>
                
                <div class="profile-details">
                  <h4>{{ username || 'Guest User' }}</h4>
                  <p>{{ getRoleDisplay(role) }}</p>
                </div>
              </div>

              <mat-divider></mat-divider>

              <!-- Profile Menu Items -->
              <button mat-menu-item (click)="navigateToProfile()">
                <mat-icon>person</mat-icon>
                <span>Edit Profile</span>
              </button>

              <button mat-menu-item (click)="navigateToSettings()">
                <mat-icon>settings</mat-icon>
                <span>Settings</span>
              </button>

              <button mat-menu-item (click)="toggleTheme()">
                <mat-icon>{{ isDarkMode ? 'light_mode' : 'dark_mode' }}</mat-icon>
                <span>{{ isDarkMode ? 'Light Mode' : 'Dark Mode' }}</span>
              </button>

              <mat-divider></mat-divider>

              <!-- Logout -->
              <button mat-menu-item class="logout-item" (click)="logout()" [disabled]="isLoggingOut">
                <mat-icon>logout</mat-icon>
                <span>Logout</span>
                <mat-spinner *ngIf="isLoggingOut" diameter="16" class="logout-spinner"></mat-spinner>
              </button>
            </mat-menu>
          </div>

        </div>
      </div>
    </header>
  `,
  styleUrls: ['./topbar.component.scss']
})
export class TopbarComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // Input properties
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

  // Output events
  @Output() logoutClicked = new EventEmitter<void>();
  @Output() menuToggleClicked = new EventEmitter<void>();

  // Component state
  recentNotifications: NotificationDto[] = [];
  isLoadingNotifications: boolean = false;
  notificationError: string | null = null;
  isLoggingOut: boolean = false;
  isDarkMode: boolean = false;

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
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.initializeTopbar();
    this.subscribeToNotifications();
    this.checkMobileState();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeTopbar(): void {
    console.log('🔝 Redesigned Topbar initialized');
    
    // Load theme preference
    this.isDarkMode = localStorage.getItem('darkMode') === 'true';
    
    // Load initial notifications
    this.loadNotifications();
  }

  private subscribeToNotifications(): void {
    // Subscribe to notifications
    this.notificationService.notifications$
      .pipe(takeUntil(this.destroy$))
      .subscribe((notifications: NotificationDto[]) => {
        this.recentNotifications = notifications.slice(0, 5);
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
    window.addEventListener('resize', () => {
      this.isMobile = window.innerWidth <= 768;
    });
  }

  private loadNotifications(): void {
    this.notificationService.getNotificationSummary().subscribe({
      next: (summary: any) => {
        this.recentNotifications = summary.recentNotifications.slice(0, 5);
      },
      error: (error: any) => {
        console.error('Error loading notifications:', error);
      }
    });
  }

  // Navigation methods
  navigateHome(): void {
    this.router.navigate(['/dashboard']);
  }

  navigateToProfile(): void {
    this.router.navigate(['/profile']);
  }

  navigateToSettings(): void {
    this.router.navigate(['/settings']);
  }

  navigateToNotifications(): void {
    this.router.navigate(['/notifications']);
  }

  // Notification methods
  onNotificationClick(notification: NotificationDto): void {
    if (!notification.isRead) {
      this.markNotificationAsRead(notification.id);
    }

    if (notification.actionUrl) {
      this.router.navigate([notification.actionUrl]);
    } else {
      this.navigateToNotifications();
    }
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

  markAllAsRead(): void {
    this.notificationService.markAllAsRead().subscribe({
      next: (success: boolean) => {
        if (success) {
          this.recentNotifications.forEach(n => n.isRead = true);
          this.showSuccessMessage('All notifications marked as read');
        }
      },
      error: (error: any) => {
        console.error('Error marking all as read:', error);
        this.showErrorMessage('Failed to mark all as read');
      }
    });
  }

  refreshNotifications(): void {
    this.loadNotifications();
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
}