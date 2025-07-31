// src/app/shared/components/sidebar/sidebar.component.ts
// Shared sidebar component yang digunakan oleh Dashboard, POS, dan Notifications

import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { LayoutService, NavigationSection } from '../../services/layout.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule
  ],
  template: `
    <aside class="sidebar" [class.collapsed]="collapsed" [class.mobile]="isMobile">
      
      <!-- Sidebar Header -->
      <div class="sidebar-header">
        <div class="sidebar-brand" (click)="navigateHome()">
          <div class="brand-icon">
            <mat-icon>store</mat-icon>
          </div>
          <span class="brand-text" *ngIf="!collapsed">{{ brandTitle }}</span>
        </div>

        <button 
          class="collapse-btn" 
          (click)="toggleSidebar()" 
          [matTooltip]="collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'"
          [matTooltipPosition]="'right'"
          *ngIf="!isMobile">
          <mat-icon>{{ collapsed ? 'menu_open' : 'menu' }}</mat-icon>
        </button>

        <!-- Mobile close button -->
        <button 
          class="mobile-close-btn" 
          (click)="closeMobileSidebar()"
          *ngIf="isMobile">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <!-- Sidebar Navigation -->
      <nav class="sidebar-nav">
        <div class="nav-section" *ngFor="let section of navigationSections; trackBy: trackBySection">
          <span class="nav-section-title" *ngIf="!collapsed || isMobile">{{ section.title }}</span>

          <ul class="nav-list">
            <li class="nav-item" *ngFor="let item of section.items; trackBy: trackByNavItem">
              <a 
                class="nav-link" 
                [routerLink]="item.route" 
                routerLinkActive="active"
                [routerLinkActiveOptions]="item.route === '/dashboard' ? {exact: true} : {exact: false}"
                [matTooltip]="collapsed && !isMobile ? item.label : ''"
                [matTooltipPosition]="'right'"
                (click)="onNavItemClick(item)">
                
                <mat-icon class="nav-icon">{{ item.icon }}</mat-icon>
                <span class="nav-text" *ngIf="!collapsed || isMobile">{{ item.label }}</span>
                
                <!-- Badge for notifications, updates, etc -->
                <span 
                  class="nav-badge" 
                  *ngIf="item.badge && (!collapsed || isMobile)"
                  [ngClass]="'badge-' + (item.badgeColor || 'primary')">
                  {{ item.badge }}
                </span>

                <!-- Notification count badge for collapsed state -->
                <span 
                  class="nav-badge-dot" 
                  *ngIf="item.badge && collapsed && !isMobile && item.id === 'notifications'"
                  [ngClass]="'badge-' + (item.badgeColor || 'primary')">
                  {{ item.badge }}
                </span>
              </a>
            </li>
          </ul>
        </div>
      </nav>

      <!-- Sidebar Footer with User Info -->
      <div class="sidebar-footer" *ngIf="!collapsed || isMobile">
        <div class="footer-content">
          <div class="user-info" (click)="navigateToProfile()">
            <div class="user-avatar">
              <img *ngIf="userPhoto; else userInitials" [src]="userPhoto" [alt]="username">
              <ng-template #userInitials>
                <span>{{ getInitials(username) }}</span>
              </ng-template>
            </div>
            <div class="user-details">
              <span class="user-name">{{ username }}</span>
              <span class="user-role">{{ getRoleDisplay(role) }}</span>
            </div>
          </div>

          <button 
            class="logout-btn" 
            (click)="handleLogout()" 
            matTooltip="Logout"
            [disabled]="isLoggingOut">
            <mat-icon>{{ isLoggingOut ? 'hourglass_empty' : 'logout' }}</mat-icon>
          </button>
        </div>
      </div>

      <!-- Collapsed state user avatar -->
      <div class="sidebar-footer-collapsed" *ngIf="collapsed && !isMobile">
        <button 
          class="user-avatar-collapsed" 
          (click)="navigateToProfile()"
          [matTooltip]="username + ' - ' + getRoleDisplay(role)"
          [matTooltipPosition]="'right'">
          <img *ngIf="userPhoto; else userInitialsCollapsed" [src]="userPhoto" [alt]="username">
          <ng-template #userInitialsCollapsed>
            <span>{{ getInitials(username) }}</span>
          </ng-template>
        </button>
      </div>

    </aside>

    <!-- Mobile Overlay -->
    <div 
      class="mobile-overlay" 
      *ngIf="isMobile && !collapsed"
      (click)="closeMobileSidebar()">
    </div>
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

  private destroy$ = new Subject<void>();

  collapsed: boolean = false;
  isMobile: boolean = false;
  navigationSections: NavigationSection[] = [];
  isLoggingOut: boolean = false;

  private roleDisplayMap: { [key: string]: string } = {
    'Admin': 'Administrator',
    'Manager': 'Manager',
    'User': 'Kasir',
    'Cashier': 'Kasir',
    'Staff': 'Staff'
  };

  constructor(
    private layoutService: LayoutService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.initializeSidebar();
    this.subscribeToLayoutChanges();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeSidebar(): void {
    // Get navigation based on user role
    this.navigationSections = this.layoutService.getNavigationForRole(this.role);
    
    // Update notification badge
    this.layoutService.updateNotificationBadge(this.notificationCount);
  }

  private subscribeToLayoutChanges(): void {
    // Subscribe to sidebar state
    this.layoutService.sidebarCollapsed$
      .pipe(takeUntil(this.destroy$))
      .subscribe(collapsed => {
        this.collapsed = collapsed;
      });

    // Subscribe to mobile state
    this.layoutService.isMobile$
      .pipe(takeUntil(this.destroy$))
      .subscribe(isMobile => {
        this.isMobile = isMobile;
      });
  }

  // Navigation methods
  toggleSidebar(): void {
    this.layoutService.toggleSidebar();
    this.sidebarToggled.emit(!this.collapsed);
  }

  closeMobileSidebar(): void {
    if (this.isMobile) {
      this.layoutService.setSidebarCollapsed(true);
    }
  }

  navigateHome(): void {
    this.router.navigate(['/dashboard']);
    if (this.isMobile) {
      this.closeMobileSidebar();
    }
  }

  navigateToProfile(): void {
    this.router.navigate(['/profile']);
    if (this.isMobile) {
      this.closeMobileSidebar();
    }
  }

  onNavItemClick(item: any): void {
    if (this.isMobile) {
      // Close sidebar on mobile after navigation
      setTimeout(() => this.closeMobileSidebar(), 100);
    }
  }

  handleLogout(): void {
    this.isLoggingOut = true;
    this.logoutClicked.emit();
    
    // Reset loading state after timeout (in case parent doesn't handle it)
    setTimeout(() => {
      this.isLoggingOut = false;
    }, 5000);
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

  // Track by functions for performance
  trackBySection(index: number, section: NavigationSection): string {
    return section.title;
  }

  trackByNavItem(index: number, item: any): string {
    return item.id;
  }

  // Update notification count from parent
  updateNotificationCount(count: number): void {
    this.notificationCount = count;
    this.layoutService.updateNotificationBadge(count);
    this.initializeSidebar(); // Refresh navigation to show updated badge
  }
}