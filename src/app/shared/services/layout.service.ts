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
          route: '/dashboard/pos',
          badge: 'HOT',
          badgeColor: 'primary',
          roles: ['Admin', 'Manager', 'User', 'Cashier']
        },
        {
          id: 'notifications',
          label: 'Notifications',
          icon: 'notifications',
          route: '/dashboard/notifications',
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
        },
        {
          id: 'suppliers',
          label: 'Suppliers',
          icon: 'business',
          route: '/dashboard/supplier',
          roles: ['Admin', 'Manager']
        },
        {
          id: 'factures',
          label: 'Factures',
          icon: 'receipt_long',
          route: '/dashboard/facture',
          roles: ['Admin', 'Manager', 'User']
        }
      ]
    },
    {
      title: 'MULTI-BRANCH', // ✅ NEW: Multi-branch coordination section
      items: [
        {
          id: 'coordination-dashboard',
          label: 'Coordination',
          icon: 'hub',
          route: '/dashboard/coordination',
          roles: ['Admin', 'HeadManager', 'BranchManager', 'Manager']
        },
        {
          id: 'branch-performance',
          label: 'Branch Performance',
          icon: 'trending_up',
          route: '/dashboard/branch-performance',
          roles: ['Admin', 'HeadManager', 'BranchManager', 'Manager']
        },
        // DISABLED: Transfer Management temporarily disabled
        // {
        //   id: 'transfer-management',
        //   label: 'Transfer Management',
        //   icon: 'swap_horiz',
        //   route: '/dashboard/transfers',
        //   roles: ['Admin', 'HeadManager', 'BranchManager', 'Manager']
        // },
        {
          id: 'optimization',
          label: 'Analytics',
          icon: 'auto_fix_high',
          route: '/dashboard/multi-branch-analytics',
          roles: ['Admin', 'HeadManager']
        }
      ]
    },
    {
      title: 'BRANCH MANAGEMENT', // ✅ NEW: Branch administration section
      items: [
        {
          id: 'branch-list',
          label: 'Branches',
          icon: 'store',
          route: '/dashboard/branches',
          roles: ['Admin', 'HeadManager']
        },
        {
          id: 'branch-selector',
          label: 'Switch Branch',
          icon: 'swap_horizontal_circle',
          route: '/dashboard/select-branch',
          roles: ['Admin', 'HeadManager', 'BranchManager']
        }
      ]
    },
    {
      title: 'ANALYTICS', // ✅ EXISTING: Dedicated analytics section
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
        },
        {
          id: 'credit-dashboard',
          label: 'Credit Dashboard',
          icon: 'account_balance_wallet',
          route: '/dashboard/membership/credit-dashboard',
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
          route: '/dashboard/profile',
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
    const previousMobile = this.isMobileSubject.value;
    
    this.isMobileSubject.next(isMobile);
    
    // Auto-collapse on mobile
    if (isMobile && !this.sidebarCollapsedSubject.value) {
      this.setSidebarCollapsed(true);
    }
    
    // Auto-expand on desktop if was mobile
    if (!isMobile && previousMobile && this.sidebarCollapsedSubject.value) {
      this.setSidebarCollapsed(false);
    }
    
    console.log('📱 Mobile state checked:', {
      width: window.innerWidth,
      isMobile,
      previousMobile,
      sidebarCollapsed: this.sidebarCollapsedSubject.value
    });
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
      '/dashboard/supplier': { title: 'Supplier Management', breadcrumb: ['Dashboard', 'Suppliers'] },
      '/dashboard/facture': { title: 'Facture Management', breadcrumb: ['Dashboard', 'Factures'] },
      '/profile': { title: 'User Profile', breadcrumb: ['Profile'] },
      '/settings': { title: 'Settings', breadcrumb: ['Settings'] },
      // ✅ UPDATED: Multi-branch routes with dashboard paths
      '/dashboard/coordination': { title: 'Multi-Branch Coordination', breadcrumb: ['Dashboard', 'Multi-Branch', 'Coordination'] },
      '/dashboard/branches': { title: 'Branch Management', breadcrumb: ['Dashboard', 'Multi-Branch', 'Branches'] },
      '/dashboard/branch-performance': { title: 'Branch Performance', breadcrumb: ['Dashboard', 'Multi-Branch', 'Performance'] },
      // DISABLED: '/dashboard/transfers': { title: 'Transfer Management', breadcrumb: ['Dashboard', 'Multi-Branch', 'Transfers'] },
      '/dashboard/select-branch': { title: 'Select Branch', breadcrumb: ['Dashboard', 'Multi-Branch', 'Select Branch'] }
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

  // ✅ NEW: Coordination alerts badge update
  updateCoordinationBadge(count: number): void {
    const navConfig = this.navigationConfig.find(section => section.title === 'MULTI-BRANCH');
    if (navConfig) {
      const coordinationItem = navConfig.items.find(item => item.id === 'coordination-dashboard');
      if (coordinationItem) {
        if (count > 0) {
          coordinationItem.badge = count > 99 ? '99+' : count.toString();
          coordinationItem.badgeColor = 'warn';
        } else {
          delete coordinationItem.badge;
          delete coordinationItem.badgeColor;
        }
      }
    }
  }

  // ✅ NEW: Transfer alerts badge update
  updateTransferBadge(count: number): void {
    const navConfig = this.navigationConfig.find(section => section.title === 'MULTI-BRANCH');
    if (navConfig) {
      const transferItem = navConfig.items.find(item => item.id === 'transfer-management');
      if (transferItem) {
        if (count > 0) {
          transferItem.badge = count > 99 ? '99+' : count.toString();
          transferItem.badgeColor = 'primary';
        } else {
          delete transferItem.badge;
          delete transferItem.badgeColor;
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
      '/dashboard/supplier': 'Supplier Management',
      '/dashboard/facture': 'Facture Management',
      '/profile': 'User Profile',
      '/settings': 'Settings',
      // ✅ UPDATED: Multi-branch page titles with dashboard paths
      '/dashboard/coordination': 'Multi-Branch Coordination',
      '/dashboard/branches': 'Branch Management',
      '/dashboard/branch-performance': 'Branch Performance',
      // DISABLED: '/dashboard/transfers': 'Transfer Management',
      '/dashboard/select-branch': 'Select Branch',
      '/dashboard/multi-branch-analytics': 'Multi-Branch Analytics',
      '/admin/multi-branch/dashboard': 'Multi-Branch Administration'
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