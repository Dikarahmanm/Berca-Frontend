// src/app/shared/components/sidebar/sidebar.component.ts
import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, Injector, runInInjectionContext } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { toObservable, takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { LayoutService, NavigationSection } from '../../services/layout.service';
import { AuthService } from '../../../core/services/auth.service';
import { StateService } from '../../../core/services/state.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule, MatButtonModule, MatTooltipModule],
  // ⬇️ inline template supaya tidak butuh sidebar.component.html
  template: `
    <aside class="sidebar" [class.collapsed]="collapsed" [class.mobile]="isMobile">
      <div class="sidebar-header">
        <button class="collapse-btn" (click)="toggleSidebar()" [matTooltip]="collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'" [matTooltipPosition]="'right'" *ngIf="!isMobile">
          <mat-icon>{{ collapsed ? 'menu_open' : 'menu' }}</mat-icon>
        </button>
        <button class="mobile-close-btn" (click)="closeMobileSidebar()" *ngIf="isMobile">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <nav class="sidebar-nav">
        <div class="nav-section" *ngFor="let section of navigationSections; trackBy: trackBySection">
          <span class="nav-section-title" *ngIf="!collapsed || isMobile">{{ section.title }}</span>
          <ul class="nav-list">
            <li class="nav-item" *ngFor="let item of section.items; trackBy: trackByNavItem">
              <a class="nav-link" [routerLink]="item.route" routerLinkActive="active"
                 [routerLinkActiveOptions]="item.route === '/dashboard' ? {exact: true} : {exact: false}"
                 [matTooltip]="collapsed && !isMobile ? item.label : ''"
                 [matTooltipPosition]="'right'"
                 (click)="onNavItemClick(item)">
                <mat-icon class="nav-icon">{{ item.icon }}</mat-icon>
                <span class="nav-text" *ngIf="!collapsed || isMobile">{{ item.label }}</span>
                <span class="nav-badge" *ngIf="item.badge && (!collapsed || isMobile)" [ngClass]="'badge-' + (item.badgeColor || 'primary')">{{ item.badge }}</span>
                <span class="nav-badge-dot" *ngIf="item.badge && collapsed && !isMobile && item.id === 'notifications'" [ngClass]="'badge-' + (item.badgeColor || 'primary')">
                  {{ item.badge }}
                </span>
              </a>
            </li>
          </ul>
        </div>
      </nav>

      <div class="sidebar-footer" *ngIf="!collapsed || isMobile">
        <div class="footer-content">
          <div class="user-info" (click)="navigateToProfile()">
            <div class="user-avatar">
              <img *ngIf="userPhoto; else userInitials" [src]="userPhoto" [alt]="username">
              <ng-template #userInitials><span>{{ getInitials(username) }}</span></ng-template>
            </div>
            <div class="user-details">
              <span class="user-name">{{ username }}</span>
              <span class="user-role">{{ getRoleDisplay(role) }}</span>
            </div>
          </div>
          <button class="logout-btn" (click)="handleLogout()" matTooltip="Logout" [disabled]="isLoggingOut">
            <mat-icon>{{ isLoggingOut ? 'hourglass_empty' : 'logout' }}</mat-icon>
          </button>
        </div>
      </div>

      <div class="sidebar-footer-collapsed" *ngIf="collapsed && !isMobile">
        <button class="user-avatar-collapsed" (click)="navigateToProfile()" [matTooltip]="username + ' - ' + getRoleDisplay(role)" [matTooltipPosition]="'right'">
          <img *ngIf="userPhoto; else userInitialsCollapsed" [src]="userPhoto" [alt]="username">
          <ng-template #userInitialsCollapsed><span>{{ getInitials(username) }}</span></ng-template>
        </button>
      </div>
    </aside>

    <div class="mobile-overlay" *ngIf="isMobile && !collapsed" (click)="closeMobileSidebar()"></div>
  `,
  styleUrls: ['./sidebar.component.scss']
})
export class SidebarComponent implements OnInit, OnDestroy {
  @Input() brandTitle: string = 'Toko Eniwan';
  @Input() username: string = '';
  @Input() role: string = '';
  @Input() userPhoto?: string;
  @Input() notificationCount: number = 0;

  @Output() logoutClicked = new EventEmitter<void>();
  @Output() sidebarToggled = new EventEmitter<boolean>();

  collapsed: boolean = false;
  isMobile: boolean = false;
  navigationSections: NavigationSection[] = [];
  isLoggingOut: boolean = false;

  private roleDisplayMap: { [key: string]: string } = {
    'Admin': 'Administrator', 'Manager': 'Manager', 'User': 'Kasir', 'Cashier': 'Kasir', 'Staff': 'Staff'
  };

  constructor(
    private layoutService: LayoutService,
    private authService: AuthService,
    private router: Router,
    private state: StateService,
    private injector: Injector
  ) {}

  ngOnInit(): void {
    this.initializeSidebar();

    // Signals → Observable (tanpa subscribe ganda ke LayoutService)
    runInInjectionContext(this.injector, () => {
      toObservable(this.state.sidebarCollapsed).pipe(takeUntilDestroyed()).subscribe(v => this.collapsed = v);
      toObservable(this.state.isMobile).pipe(takeUntilDestroyed()).subscribe(v => this.isMobile = v);
      toObservable(this.state.user).pipe(takeUntilDestroyed()).subscribe(u => {
        if (u) {
          this.username = u.username ?? this.username;
          this.role = u.role ?? this.role;
          this.navigationSections = this.layoutService.getNavigationForRole(this.role);
        }
      });
      toObservable(this.state.unreadNotificationCount).pipe(takeUntilDestroyed()).subscribe(c => {
        this.notificationCount = c;
        this.layoutService.updateNotificationBadge(c);
        this.navigationSections = this.layoutService.getNavigationForRole(this.role);
      });
    });
  }

  ngOnDestroy(): void {}

  private initializeSidebar(): void {
    const u = this.authService.getCurrentUser?.();
    if (u) { this.username = u.username ?? this.username; this.role = u.role ?? this.role; }
    else { this.username = localStorage.getItem('username') || this.username; this.role = localStorage.getItem('role') || this.role; }

    this.collapsed = this.layoutService.getSidebarCollapsed();
    this.isMobile = this.layoutService.getIsMobile();
    this.navigationSections = this.layoutService.getNavigationForRole(this.role);
    this.layoutService.updateNotificationBadge(this.notificationCount);
  }

  // === API lama dipertahankan ===
  toggleSidebar(): void { this.layoutService.toggleSidebar(); this.sidebarToggled.emit(!this.collapsed); }
  closeMobileSidebar(): void { if (this.isMobile) this.layoutService.setSidebarCollapsed(true); }
  navigateHome(): void { this.router.navigate(['/dashboard']); if (this.isMobile) this.closeMobileSidebar(); }
  navigateToProfile(): void { this.router.navigate(['/dashboard/profile']); if (this.isMobile) this.closeMobileSidebar(); }
  onNavItemClick(_: any): void { if (this.isMobile) setTimeout(() => this.closeMobileSidebar(), 100); }
  handleLogout(): void { this.isLoggingOut = true; this.logoutClicked.emit(); setTimeout(() => { this.isLoggingOut = false; }, 5000); }
  getInitials(name: string): string { if (!name) return 'U'; const w = name.trim().split(' '); return w.length === 1 ? w[0][0].toUpperCase() : (w[0][0] + w[w.length - 1][0]).toUpperCase(); }
  getRoleDisplay(role: string): string { return this.roleDisplayMap[role] || role; }
  trackBySection(_: number, section: NavigationSection): string { return section.title; }
  trackByNavItem(_: number, item: any): string { return item.id; }
  updateNotificationCount(count: number): void { this.notificationCount = count; this.layoutService.updateNotificationBadge(count); this.navigationSections = this.layoutService.getNavigationForRole(this.role); }
}
