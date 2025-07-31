// src/app/shared/components/base-layout/base-layout.component.ts
// Base layout component yang digunakan oleh Dashboard, POS, dan Notifications

import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { SidebarComponent } from '../sidebar/sidebar.component';
import { TopbarComponent } from '../../topbar/topbar.component';
import { LayoutService } from '../../services/layout.service';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';

@Component({
  selector: 'app-base-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    SidebarComponent,
    TopbarComponent
  ],
  template: `
    <div class="base-layout" [class.sidebar-collapsed]="sidebarCollapsed" [class.mobile]="isMobile">
      
      <!-- Topbar -->
      <app-topbar
        [pageTitle]="pageTitle"
        [username]="username"
        [role]="role"
        [userPhoto]="userPhoto"
        [notificationCount]="notificationCount"
        [showMenuToggle]="isMobile"
        [showBreadcrumb]="showBreadcrumb"
        [breadcrumb]="breadcrumb"
        (logoutClicked)="handleLogout()"
        (menuToggleClicked)="toggleMobileSidebar()">
      </app-topbar>

      <!-- Sidebar -->
      <app-sidebar
        [brandTitle]="brandTitle"
        [username]="username"
        [role]="role"
        [userPhoto]="userPhoto"
        [notificationCount]="notificationCount"
        (logoutClicked)="handleLogout()"
        (sidebarToggled)="onSidebarToggled($event)">
      </app-sidebar>

      <!-- Main Content Area -->
      <main class="main-content" #mainContent>
        
        <!-- Page Header (Optional) -->
        <header class="page-header" *ngIf="showPageHeader">
          <div class="page-header-content">
            <div class="page-title-section">
              <h1 class="page-title">{{ pageTitle }}</h1>
              <p class="page-subtitle" *ngIf="pageSubtitle">{{ pageSubtitle }}</p>
            </div>
            
            <!-- Custom header actions slot -->
            <div class="page-actions" *ngIf="showHeaderActions">
              <ng-content select="[slot=header-actions]"></ng-content>
            </div>
          </div>
        </header>

        <!-- Main Content Body -->
        <div class="content-body" [class.with-header]="showPageHeader">
          
          <!-- Loading Overlay -->
          <div class="loading-overlay" *ngIf="isLoading">
            <div class="loading-content">
              <mat-spinner [diameter]="48"></mat-spinner>
              <p>{{ loadingMessage || 'Loading...' }}</p>
            </div>
          </div>

          <!-- Error State -->
          <div class="error-state" *ngIf="errorMessage && !isLoading">
            <div class="error-content">
              <mat-icon>error_outline</mat-icon>
              <h3>Terjadi Kesalahan</h3>
              <p>{{ errorMessage }}</p>
              <button class="retry-btn" (click)="handleRetry()" *ngIf="showRetryButton">
                <mat-icon>refresh</mat-icon>
                Coba Lagi
              </button>
            </div>
          </div>

          <!-- Main Content Slot -->
          <div class="page-content" *ngIf="!isLoading && !errorMessage">
            <ng-content></ng-content>
          </div>

        </div>

      </main>

    </div>
  `,
  styleUrls: ['./base-layout.component.scss']
})
export class BaseLayoutComponent implements OnInit, OnDestroy {
  @ViewChild('mainContent', { static: true }) mainContentRef!: ElementRef;

  // Input properties
  @Input() pageTitle: string = 'Dashboard';
  @Input() pageSubtitle?: string;
  @Input() brandTitle: string = 'Toko Eniwan';
  @Input() showPageHeader: boolean = true;
  @Input() showHeaderActions: boolean = false;
  @Input() showBreadcrumb: boolean = true;
  @Input() showRetryButton: boolean = true;
  @Input() isLoading: boolean = false;
  @Input() loadingMessage?: string;
  @Input() errorMessage?: string;

  // Output events
  @Output() retryClicked = new EventEmitter<void>();
  @Output() sidebarToggled = new EventEmitter<boolean>();

  private destroy$ = new Subject<void>();

  // Layout state
  sidebarCollapsed: boolean = false;
  isMobile: boolean = false;
  breadcrumb: string[] = [];

  // User data
  username: string = '';
  role: string = '';
  userPhoto?: string;
  notificationCount: number = 0;

  constructor(
    private layoutService: LayoutService,
    private authService: AuthService,
    private notificationService: NotificationService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.initializeLayout();
    this.subscribeToLayoutChanges();
    this.subscribeToUserData();
    this.subscribeToNotifications();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeLayout(): void {
    // Initialize user data
    this.loadUserData();
    
    // Set initial layout state
    this.sidebarCollapsed = this.layoutService.getSidebarCollapsed();
    this.isMobile = this.layoutService.getIsMobile();
    
    // Set page info
    const currentPage = this.layoutService.getCurrentPage();
    this.breadcrumb = currentPage.breadcrumb;
  }

  private subscribeToLayoutChanges(): void {
    // Subscribe to sidebar state
    this.layoutService.sidebarCollapsed$
      .pipe(takeUntil(this.destroy$))
      .subscribe(collapsed => {
        this.sidebarCollapsed = collapsed;
      });

    // Subscribe to mobile state
    this.layoutService.isMobile$
      .pipe(takeUntil(this.destroy$))
      .subscribe(isMobile => {
        this.isMobile = isMobile;
      });

    // Subscribe to current page changes
    this.layoutService.currentPage$
      .pipe(takeUntil(this.destroy$))
      .subscribe(pageInfo => {
        this.breadcrumb = pageInfo.breadcrumb;
        if (!this.pageTitle || this.pageTitle === 'Dashboard') {
          this.pageTitle = pageInfo.title;
        }
      });
  }

  private subscribeToUserData(): void {
    // Get current user data
    this.authService.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => {
        if (user) {
          this.username = user.username || '';
          this.role = user.role || '';
          //this.userPhoto = user.photo;
        }
      });
  }

  private subscribeToNotifications(): void {
    // Subscribe to notification count
    this.notificationService.unreadCount$
      .pipe(takeUntil(this.destroy$))
      .subscribe(count => {
        this.notificationCount = count;
      });
  }

  private loadUserData(): void {
    try {
      const currentUser = this.authService.getCurrentUser();
      
      if (currentUser) {
        this.username = currentUser.username || '';
        this.role = currentUser.role || '';
        //this.userPhoto = currentUser.userPhoto;
      } else {
        // Fallback to localStorage
        this.username = localStorage.getItem('username') || '';
        this.role = localStorage.getItem('role') || '';
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  }

  // Layout control methods
  toggleMobileSidebar(): void {
    if (this.isMobile) {
      this.layoutService.setSidebarCollapsed(!this.sidebarCollapsed);
    }
  }

  onSidebarToggled(collapsed: boolean): void {
    this.sidebarToggled.emit(collapsed);
  }

  // Event handlers
  handleLogout(): void {
    this.isLoading = true;
    
    this.authService.logout().subscribe({
      next: () => {
        this.showSuccessMessage('Logout berhasil!');
        this.isLoading = false;
      },
      error: (error: any) => {
        console.error('Logout error:', error);
        this.showErrorMessage('Logout error, redirecting...');
        this.isLoading = false;
      }
    });
  }

  handleRetry(): void {
    this.retryClicked.emit();
  }

  // Utility methods
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

  // Public methods untuk parent components
  setPageTitle(title: string, subtitle?: string): void {
    this.pageTitle = title;
    this.pageSubtitle = subtitle;
  }

  setLoading(loading: boolean, message?: string): void {
    this.isLoading = loading;
    this.loadingMessage = message;
  }

  setError(error: string | null): void {
    this.errorMessage = error ?? undefined;
  }

  clearError(): void {
    this.errorMessage = undefined;
  }

  showNotification(message: string, type: 'success' | 'error' | 'info' = 'info'): void {
    const panelClass = [`snackbar-${type}`];
    this.snackBar.open(message, 'Tutup', {
      duration: type === 'error' ? 5000 : 3000,
      panelClass
    });
  }

  // Scroll to top of content
  scrollToTop(): void {
    if (this.mainContentRef?.nativeElement) {
      this.mainContentRef.nativeElement.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    }
  }

  // Check if user can access certain features
  canAccess(feature: string): boolean {
    return this.layoutService.canAccess(`/dashboard/${feature}`, this.role);
  }

  // Update notification count (called by parent components)
  updateNotificationCount(count: number): void {
    this.notificationCount = count;
  }
}