// src/app/app-routing.module.ts
// ✅ FIXED: Complete routing integration untuk POS dan Notification modules
// Mengikuti guideline "Toko Eniwan" dengan lazy loading dan role-based permissions

import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LoginComponent } from './auth/login/login';
import { DashboardComponent } from './dashboard/dashboard.component';
import { RegisterComponent } from './auth/register/register';
import { AuthGuard } from './core/guard/auth.guard';

const routes: Routes = [
  // ===== AUTHENTICATION ROUTES =====
  { 
    path: '', 
    redirectTo: '/login', 
    pathMatch: 'full' 
  },
  { 
    path: 'login', 
    component: LoginComponent 
  },
  { 
    path: 'register', 
    component: RegisterComponent 
  },

  // ===== MAIN DASHBOARD ROUTE WITH CHILD MODULES =====
  {
    path: 'dashboard',
    component: DashboardComponent, // standalone component
    canActivate: [AuthGuard],
    children: [
      // User Management
      { 
        path: 'users', 
        loadChildren: () => import('./modules/user-management/user-management.module').then(m => m.UserManagementModule),
        data: { 
          title: 'User Management',
          requiredPermission: 'UserManagement.Read'
        }
      },
      
      // Activity Logs
      { 
        path: 'logs',  
        loadChildren: () => import('./modules/activity-log/activity-log.module').then(m => m.ActivityLogModule),
        data: { 
          title: 'Activity Logs',
          requiredPermission: 'Logs.Read'
        }
      },
      
      // Category Management - ✅ EXISTING
      { 
        path: 'categories',  
        loadChildren: () => import('./modules/category-management/category-management.module').then(m => m.CategoryManagementModule),
        data: { 
          title: 'Category Management',
          requiredPermission: 'Category.Read'
        }
      },
      
      // ✅ NEW: Inventory Management Module
      // { 
      //   path: 'inventory',  
      //   loadChildren: () => import('./modules/inventory/inventory.module').then(m => m.InventoryModule),
      //   data: { 
      //     title: 'Inventory Management',
      //     requiredPermission: 'Inventory.Read'
      //   }
      // },
      
      // ✅ NEW: Membership Module
      // { 
      //   path: 'membership',  
      //   loadChildren: () => import('./modules/membership/membership.module').then(m => m.MembershipModule),
      //   data: { 
      //     title: 'Membership Program',
      //     requiredPermission: 'Membership.Read'
      //   }
      // },
      
      // ✅ NEW: Reports Module
      // { 
      //   path: 'reports',  
      //   loadChildren: () => import('./modules/reports/reports.module').then(m => m.ReportsModule),
      //   data: { 
      //     title: 'Reports & Analytics',
      //     requiredPermission: 'Reports.Read'
      //   }
      // },
      
      // Dashboard Home
      { 
        path: '', 
        redirectTo: 'users', 
        pathMatch: 'full' 
      }
    ]
  },

  // ===== STANDALONE FEATURE ROUTES =====
  
  // ✅ NEW: POS (Point of Sale) - Standalone route untuk full-screen experience
  { 
    path: 'pos',
    loadChildren: () => import('./modules/pos/pos.module').then(m => m.POSModule),
    canActivate: [AuthGuard],
    data: { 
      title: 'Point of Sale',
      requiredPermission: 'POS.Write'
    }
  },

  // ✅ NEW: Notifications Center - Standalone route
  { 
    path: 'notifications',
    loadChildren: () => import('./modules/notifications/notifications.module').then(m => m.NotificationsModule),
    canActivate: [AuthGuard],
    data: { 
      title: 'Notification Center',
      requiredPermission: 'Notifications.Read'
    }
  },

  // ✅ NEW: User Profile - Standalone route
  { 
    path: 'profile', 
    loadComponent: () => import('./modules/user-profile/user-profile.component').then(m => m.UserProfileComponent),
    canActivate: [AuthGuard],
    data: { 
      title: 'User Profile',
      requiredPermission: 'Profile.Write'
    }
  },

  // ✅ NEW: Settings - Standalone route
  // { 
  //   path: 'settings', 
  //   loadComponent: () => import('./modules/settings/settings.component').then(m => m.SettingsComponent),
  //   canActivate: [AuthGuard],
  //   data: { 
  //     title: 'Settings',
  //     requiredPermission: 'Settings.Write'
  //   }
  // },

  // ===== CONVENIENCE REDIRECT ROUTES =====
  // Redirect ke dashboard untuk akses langsung ke modul
  { 
    path: 'users', 
    redirectTo: '/dashboard/users', 
    pathMatch: 'full' 
  },
  { 
    path: 'categories', 
    redirectTo: '/dashboard/categories', 
    pathMatch: 'full' 
  },
  { 
    path: 'inventory', 
    redirectTo: '/dashboard/inventory', 
    pathMatch: 'full' 
  },
  { 
    path: 'membership', 
    redirectTo: '/dashboard/membership', 
    pathMatch: 'full' 
  },
  { 
    path: 'reports', 
    redirectTo: '/dashboard/reports', 
    pathMatch: 'full' 
  },
  { 
    path: 'logs', 
    redirectTo: '/dashboard/logs', 
    pathMatch: 'full' 
  },
  
  // ✅ Wildcard route - MUST BE LAST
  { 
    path: '**', 
    redirectTo: '/dashboard', 
    pathMatch: 'full' 
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes, {
    // ✅ Additional routing configuration untuk PWA dan performance
    preloadingStrategy: 'lazy', // Lazy load modules
    enableTracing: false, // Set true untuk debugging routing
    scrollPositionRestoration: 'enabled', // Restore scroll position
    anchorScrolling: 'enabled', // Enable anchor scrolling
    scrollOffset: [0, 64], // Offset untuk topbar (64px)
    //relativeLinkResolution: 'legacy'
  })],
  exports: [RouterModule]
})
export class AppRoutingModule { 
  constructor() {
    console.log('🚀 App Routing Module initialized with POS & Notifications integration');
  }
}