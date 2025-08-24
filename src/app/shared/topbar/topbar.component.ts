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
import { StateService } from '../../core/services/state.service';
import { UnifiedNotificationCenterComponent } from '../components/unified-notification-center/unified-notification-center.component';

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
    MatSnackBarModule,
    UnifiedNotificationCenterComponent
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

  // State internal (simplified - notifications now handled by UnifiedNotificationCenterComponent)
  isLoggingOut: boolean = false;
  isDarkMode: boolean = false;
  showProfileDropdown: boolean = false;

  private roleDisplayMap: { [key: string]: string } = {
    'Admin': 'Administrator',
    'Manager': 'Manager',
    'User': 'Kasir',
    'Cashier': 'Kasir',
    'Staff': 'Staff'
  };

  constructor(
    private router: Router,
    private authService: AuthService,
    private snackBar: MatSnackBar,
    private state: StateService,
    private injector: Injector
  ) {}

  ngOnInit(): void {
    this.initializeTopbar();
    this.checkMobileState();
    this.setupDocumentClickListener();

    // ===== Signals → Observable (aman NG0203) =====
    const user$    = runInInjectionContext(this.injector, () => toObservable(this.state.user));
    const mobile$  = runInInjectionContext(this.injector, () => toObservable(this.state.isMobile));

    user$.pipe(takeUntil(this.destroy$)).subscribe(u => {
      if (u) {
        this.username = u.username ?? this.username;
        this.role = u.role ?? this.role;
      }
    });
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
        this.showProfileDropdown = false;
      }
    });
  }

  private setupDocumentClickListener(): void {
    document.addEventListener('click', this.onDocumentClick.bind(this));
  }

  private onDocumentClick(event: Event): void {
    const target = event.target as HTMLElement;
    const profileWrapper = target.closest('.profile-wrapper');
    
    if (!profileWrapper) {
      this.showProfileDropdown = false;
    }
  }

  toggleProfileDropdown(): void {
    this.showProfileDropdown = !this.showProfileDropdown;
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

}