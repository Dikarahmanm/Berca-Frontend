// src/app/shared/components/base-layout/base-layout.component.ts
// Base layout component yang digunakan oleh Dashboard, POS, dan Notifications
import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, ViewChild, ElementRef, Injector, runInInjectionContext } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { toObservable } from '@angular/core/rxjs-interop';

import { SidebarComponent } from '../sidebar/sidebar.component';
import { TopbarComponent } from '../../topbar/topbar.component';
import { LayoutService } from '../../services/layout.service';
import { AuthService } from '../../../core/services/auth.service';
import { StateService } from '../../../core/services/state.service';

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

  // Layout state (dibaca dari StateService)
  sidebarCollapsed: boolean = false;
  isMobile: boolean = false;
  breadcrumb: string[] = [];

  // User data (dibaca dari StateService)
  username: string = '';
  role: string = '';
  userPhoto?: string;

  // Notifications (dibaca dari StateService)
  notificationCount: number = 0;

  constructor(
    private layoutService: LayoutService,   // masih dipakai untuk canAccess() & init page info
    private authService: AuthService,       // dipakai untuk logout()
    private snackBar: MatSnackBar,
    private state: StateService,            // sumber kebenaran tunggal (signals)
    private injector: Injector              // untuk toObservable dalam injection context
  ) {}

  ngOnInit(): void {
    this.initializeLayout();
    this.subscribeToPageInfo(); // breadcrumb & title dari LayoutService sekali ini

    // ====== Signals → Observable (safe injection context) ======
    const unread$  = runInInjectionContext(this.injector, () => toObservable(this.state.unreadNotificationCount));
    const sideCol$ = runInInjectionContext(this.injector, () => toObservable(this.state.sidebarCollapsed));
    const mobile$  = runInInjectionContext(this.injector, () => toObservable(this.state.isMobile));
    const user$    = runInInjectionContext(this.injector, () => toObservable(this.state.user));

    unread$.pipe(takeUntil(this.destroy$)).subscribe(c => this.notificationCount = c);
    sideCol$.pipe(takeUntil(this.destroy$)).subscribe(v => this.sidebarCollapsed = v);
    mobile$.pipe(takeUntil(this.destroy$)).subscribe(v => this.isMobile = v);
    user$.pipe(takeUntil(this.destroy$)).subscribe(u => {
      this.username = u?.username ?? this.username;
      this.role = u?.role ?? this.role;
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeLayout(): void {
    // Seed awal dari service lama (sekali di init)
    this.sidebarCollapsed = this.layoutService.getSidebarCollapsed();
    this.isMobile = this.layoutService.getIsMobile();

    // Seed user dari AuthService (kalau StateService belum sempat mirror)
    const currentUser = this.authService.getCurrentUser(); // cookie-based user:contentReference[oaicite:3]{index=3}
    if (currentUser) {
      this.username = currentUser.username || '';
      this.role = currentUser.role || '';
    } else {
      this.username = localStorage.getItem('username') || '';
      this.role = localStorage.getItem('role') || '';
    }
  }

  private subscribeToPageInfo(): void {
    // Tetap gunakan currentPage$ dari LayoutService untuk breadcrumb/title
    this.layoutService.currentPage$
      .pipe(takeUntil(this.destroy$))
      .subscribe(pageInfo => {
        this.breadcrumb = pageInfo.breadcrumb;
        if (!this.pageTitle || this.pageTitle === 'Dashboard') {
          this.pageTitle = pageInfo.title;
        }
      });
  }

  // Layout control methods
  toggleMobileSidebar(): void {
    if (this.isMobile) {
      // Toggle via StateService supaya sinkron lintas komponen
      this.state.toggleSidebar(); // akan memanggil LayoutService.setSidebarCollapsed() di dalamnya:contentReference[oaicite:4]{index=4}
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
      this.mainContentRef.nativeElement.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  // Check if user can access certain features
  canAccess(feature: string): boolean {
    return this.layoutService.canAccess(`/dashboard/${feature}`, this.role); // rules by LayoutService:contentReference[oaicite:5]{index=5}
  }

  // Update notification count (called by parent components)
  updateNotificationCount(count: number): void {
    this.notificationCount = count;
  }
}
