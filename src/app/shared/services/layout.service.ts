// src/app/shared/services/layout.service.ts
// ✅ UPDATED: Analytics integration + proper navigation structure

import { Injectable, signal, computed } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';

export interface NavigationItem {
  id: string;
  label: string;
  icon: string;
  route: string;
  badge?: string;
  badgeColor?: string;
  children?: NavigationItem[];
  roles?: string[];
  isActive?: boolean;
  isExpanded?: boolean;
}

export interface NavigationSection {
  title: string;
  items: NavigationItem[];
}

@Injectable({
  providedIn: 'root'
})
export class LayoutService {
  // Sidebar state management
  private sidebarCollapsedSubject = new BehaviorSubject<boolean>(false);
  public sidebarCollapsed$ = this.sidebarCollapsedSubject.asObservable();

  // Mobile state
  private isMobileSubject = new BehaviorSubject<boolean>(false);
  public isMobile$ = this.isMobileSubject.asObservable();

  // Current page info
  private currentPageSubject = new BehaviorSubject<{title: string, breadcrumb: string[]}>({
    title: 'Dashboard Analytics',
    breadcrumb: ['Dashboard', 'Analytics']
  });
  public currentPage$ = this.currentPageSubject.asObservable();

  // ✅ UPDATED: Navigation structure with Analytics properly integrated
  private navigationConfig: NavigationSection[] = [
    {
      title: 'MAIN',
      items: [
        {
          id: 'dashboard',
          label: 'Dashboard',
          icon: 'dashboard',
          route: '/dashboard', // ✅ FIXED: Point to dashboard home
          roles: ['Admin', 'Manager', 'User', 'Cashier']
        },
        {
          id: 'pos',
          label: 'POS',
          icon: 'point_of_sale',
          route: '/pos',
          badge: 'HOT',
          badgeColor: 'primary',
          roles: ['Admin', 'Manager', 'User', 'Cashier']
        },
        {
          id: 'notifications',
          label: 'Notifications',
          icon: 'notifications',
          route: '/notifications',
          roles: ['Admin', 'Manager', 'User', 'Cashier']
        }
      ]
    },
    {
      title: 'BUSINESS',
      items: [
        {
          id: 'inventory',
          label: 'Inventory',
          icon: 'inventory_2',
          route: '/dashboard/inventory',
          roles: ['Admin', 'Manager', 'User']
        },
        {
          id: 'categories',
          label: 'Categories',
          icon: 'category',
          route: '/dashboard/categories',
          roles: ['Admin', 'Manager']
        }
      ]
    },
    {
      title: 'ANALYTICS', // ✅ NEW: Dedicated analytics section
      items: [
        {
          id: 'analytics',
          label: 'Analytics',
          icon: 'analytics',
          route: '/dashboard/analytics',
          roles: ['Admin', 'Manager', 'User']
        },
        {
          id: 'reports',
          label: 'Reports',
          icon: 'assessment', // ✅ CHANGED: Better icon for reports
          route: '/dashboard/reports',
          roles: ['Admin', 'Manager']
        }
      ]
    },
    {
      title: 'MANAGEMENT',
      items: [
        {
          id: 'users',
          label: 'Users',
          icon: 'people',
          route: '/dashboard/users',
          roles: ['Admin', 'Manager']
        },
        {
          id: 'membership',
          label: 'Membership',
          icon: 'card_membership',
          route: '/dashboard/membership',
          roles: ['Admin', 'Manager', 'User']
        }
      ]
    },
    {
      title: 'SYSTEM',
      items: [
        {
          id: 'logs',
          label: 'Activity Logs',
          icon: 'history',
          route: '/dashboard/logs',
          roles: ['Admin', 'Manager']
        }
      ]
    },
    {
      title: 'SETTINGS',
      items: [
        {
          id: 'profile',
          label: 'Profile',
          icon: 'person',
          route: '/profile',
          roles: ['Admin', 'Manager', 'User', 'Cashier']
        },
        {
          id: 'settings',
          label: 'Settings',
          icon: 'settings',
          route: '/settings',
          roles: ['Admin', 'Manager']
        }
      ]
    }
  ];

  constructor(private router: Router) {
    this.initializeLayoutService();
    this.watchRouteChanges();
    this.checkMobileState();
  }

  private initializeLayoutService(): void {
    // Load saved preferences
    const savedCollapsed = localStorage.getItem('sidebarCollapsed');
    if (savedCollapsed) {
      this.sidebarCollapsedSubject.next(savedCollapsed === 'true');
    }

    // Check mobile on init
    this.checkMobileState();
    
    // Listen for resize
    window.addEventListener('resize', () => this.checkMobileState());
  }

  private watchRouteChanges(): void {
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        this.updateCurrentPage(event.url);
      });
  }

  private checkMobileState(): void {
    const isMobile = window.innerWidth <= 768;
    this.isMobileSubject.next(isMobile);
    
    // Auto-collapse on mobile
    if (isMobile && !this.sidebarCollapsedSubject.value) {
      this.setSidebarCollapsed(true);
    }
  }

  // ✅ UPDATED: Route mapping with proper dashboard home and analytics separation
  private updateCurrentPage(url: string): void {
    const titleMap: { [key: string]: {title: string, breadcrumb: string[]} } = {
      '/dashboard': { title: 'Dashboard', breadcrumb: ['Dashboard'] }, // Dashboard home
      '/dashboard/analytics': { title: 'Dashboard Analytics', breadcrumb: ['Dashboard', 'Analytics'] },
      '/pos': { title: 'Point of Sale', breadcrumb: ['POS'] },
      '/notifications': { title: 'Notifications', breadcrumb: ['Notifications'] },
      '/dashboard/users': { title: 'User Management', breadcrumb: ['Dashboard', 'Users'] },
      '/dashboard/categories': { title: 'Categories', breadcrumb: ['Dashboard', 'Categories'] },
      '/dashboard/inventory': { title: 'Inventory', breadcrumb: ['Dashboard', 'Inventory'] },
      '/dashboard/reports': { title: 'Reports & Analytics', breadcrumb: ['Dashboard', 'Reports'] },
      '/dashboard/logs': { title: 'Activity Logs', breadcrumb: ['Dashboard', 'Logs'] },
      '/dashboard/membership': { title: 'Membership', breadcrumb: ['Dashboard', 'Membership'] },
      '/profile': { title: 'User Profile', breadcrumb: ['Profile'] },
      '/settings': { title: 'Settings', breadcrumb: ['Settings'] }
    };

    const pageInfo = titleMap[url] || { title: 'Dashboard', breadcrumb: ['Dashboard'] };
    this.currentPageSubject.next(pageInfo);
  }

  // Public methods
  toggleSidebar(): void {
    const newState = !this.sidebarCollapsedSubject.value;
    this.setSidebarCollapsed(newState);
  }

  setSidebarCollapsed(collapsed: boolean): void {
    this.sidebarCollapsedSubject.next(collapsed);
    localStorage.setItem('sidebarCollapsed', collapsed.toString());
  }

  getSidebarCollapsed(): boolean {
    return this.sidebarCollapsedSubject.value;
  }

  getIsMobile(): boolean {
    return this.isMobileSubject.value;
  }

  getCurrentPage(): {title: string, breadcrumb: string[]} {
    return this.currentPageSubject.value;
  }

  // Navigation methods
  getNavigationForRole(userRole: string): NavigationSection[] {
    return this.navigationConfig.map(section => ({
      ...section,
      items: section.items.filter(item => 
        !item.roles || item.roles.includes(userRole)
      ).map(item => ({
        ...item,
        isActive: this.router.url === item.route
      }))
    })).filter(section => section.items.length > 0);
  }

  // Notification badge update
  updateNotificationBadge(count: number): void {
    const navConfig = this.navigationConfig.find(section => section.title === 'MAIN');
    if (navConfig) {
      const notificationItem = navConfig.items.find(item => item.id === 'notifications');
      if (notificationItem) {
        if (count > 0) {
          notificationItem.badge = count > 99 ? '99+' : count.toString();
          notificationItem.badgeColor = 'error';
        } else {
          delete notificationItem.badge;
          delete notificationItem.badgeColor;
        }
      }
    }
  }

  // ✅ UPDATED: Page title mapping with proper dashboard home and analytics
  getPageTitle(route: string): string {
    const titleMap: { [key: string]: string } = {
      '/dashboard': 'Dashboard',
      '/dashboard/analytics': 'Dashboard Analytics',
      '/pos': 'Point of Sale',
      '/notifications': 'Notifications',
      '/dashboard/users': 'User Management',
      '/dashboard/categories': 'Categories',
      '/dashboard/inventory': 'Inventory',
      '/dashboard/reports': 'Reports & Analytics',
      '/dashboard/logs': 'Activity Logs',
      '/dashboard/membership': 'Membership',
      '/profile': 'User Profile',
      '/settings': 'Settings'
    };

    return titleMap[route] || 'Dashboard';
  }

  // Method untuk check apakah user dapat akses route
  canAccess(route: string, userRole: string): boolean {
    for (const section of this.navigationConfig) {
      const item = section.items.find(nav => nav.route === route);
      if (item) {
        return !item.roles || item.roles.includes(userRole);
      }
    }
    return false;
  }

  // ✅ UPDATED: Helper method untuk getting current active navigation
  getCurrentActiveNavigation(): NavigationItem | null {
    const currentUrl = this.router.url;
    for (const section of this.navigationConfig) {
      const activeItem = section.items.find(item => item.route === currentUrl);
      if (activeItem) {
        return activeItem;
      }
    }
    return null;
  }

  // ✅ UPDATED: Method untuk navigate ke dashboard home (not analytics)
  navigateToDashboard(): void {
    this.router.navigate(['/dashboard']);
  }

  // ✅ UPDATED: Method untuk check if current page is dashboard home
  isDashboardActive(): boolean {
    return this.router.url === '/dashboard';
  }

  // ✅ NEW: Method untuk check if current page is analytics
  isAnalyticsActive(): boolean {
    return this.router.url === '/dashboard/analytics';
  }
}