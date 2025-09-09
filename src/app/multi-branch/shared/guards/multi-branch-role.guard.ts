import { Injectable, inject } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { map, Observable, of } from 'rxjs';
import { StateService } from '../../../core/services/state.service';
import { CurrentUser } from '../../../core/services/auth.service';

// Multi-branch specific roles and permissions
export interface MultiBranchPermissions {
  canViewCoordination: boolean;
  canManageTransfers: boolean;
  canApproveTransfers: boolean;
  canManageBranches: boolean;
  canViewAnalytics: boolean;
  canViewSystemHealth: boolean;
  canManageSystemSettings: boolean;
  canAccessAllBranches: boolean;
  canViewFinancialData: boolean;
  canExportData: boolean;
}

export interface RolePermissionMap {
  [key: string]: MultiBranchPermissions;
}

// Role-based permission mapping
const MULTI_BRANCH_ROLE_PERMISSIONS: RolePermissionMap = {
  'Admin': {
    canViewCoordination: true,
    canManageTransfers: true,
    canApproveTransfers: true,
    canManageBranches: true,
    canViewAnalytics: true,
    canViewSystemHealth: true,
    canManageSystemSettings: true,
    canAccessAllBranches: true,
    canViewFinancialData: true,
    canExportData: true
  },
  'HeadManager': {
    canViewCoordination: true,
    canManageTransfers: true,
    canApproveTransfers: true,
    canManageBranches: true,
    canViewAnalytics: true,
    canViewSystemHealth: true,
    canManageSystemSettings: false,
    canAccessAllBranches: true,
    canViewFinancialData: true,
    canExportData: true
  },
  'BranchManager': {
    canViewCoordination: true,
    canManageTransfers: true,
    canApproveTransfers: false, // Only for own branch
    canManageBranches: false,
    canViewAnalytics: true, // Limited to own branch
    canViewSystemHealth: false,
    canManageSystemSettings: false,
    canAccessAllBranches: false,
    canViewFinancialData: true, // Own branch only
    canExportData: false
  },
  'Manager': {
    canViewCoordination: false,
    canManageTransfers: true, // Request only
    canApproveTransfers: false,
    canManageBranches: false,
    canViewAnalytics: true, // Own branch only
    canViewSystemHealth: false,
    canManageSystemSettings: false,
    canAccessAllBranches: false,
    canViewFinancialData: false,
    canExportData: false
  },
  'User': {
    canViewCoordination: false,
    canManageTransfers: false,
    canApproveTransfers: false,
    canManageBranches: false,
    canViewAnalytics: false,
    canViewSystemHealth: false,
    canManageSystemSettings: false,
    canAccessAllBranches: false,
    canViewFinancialData: false,
    canExportData: false
  },
  'Cashier': {
    canViewCoordination: false,
    canManageTransfers: false,
    canApproveTransfers: false,
    canManageBranches: false,
    canViewAnalytics: false,
    canViewSystemHealth: false,
    canManageSystemSettings: false,
    canAccessAllBranches: false,
    canViewFinancialData: false,
    canExportData: false
  }
};

@Injectable({
  providedIn: 'root'
})
export class MultiBranchRoleService {
  private stateService = inject(StateService);
  private router = inject(Router);

  /**
   * Get permissions for current user's role
   */
  getCurrentUserPermissions(): Observable<MultiBranchPermissions> {
    const user = this.stateService.user();
    return of(user).pipe(
      map(user => {
        if (!user || !user.role) {
          return this.getDefaultPermissions();
        }

        const permissions = MULTI_BRANCH_ROLE_PERMISSIONS[user.role];
        return permissions || this.getDefaultPermissions();
      })
    );
  }

  /**
   * Check if current user has specific permission
   */
  hasPermission(permission: keyof MultiBranchPermissions): Observable<boolean> {
    return this.getCurrentUserPermissions().pipe(
      map(permissions => permissions[permission])
    );
  }

  /**
   * Check if current user has any of the specified permissions
   */
  hasAnyPermission(permissions: (keyof MultiBranchPermissions)[]): Observable<boolean> {
    return this.getCurrentUserPermissions().pipe(
      map(userPermissions => 
        permissions.some(permission => userPermissions[permission])
      )
    );
  }

  /**
   * Check if current user has all of the specified permissions
   */
  hasAllPermissions(permissions: (keyof MultiBranchPermissions)[]): Observable<boolean> {
    return this.getCurrentUserPermissions().pipe(
      map(userPermissions => 
        permissions.every(permission => userPermissions[permission])
      )
    );
  }

  /**
   * Get permission level for a specific feature
   */
  getFeatureAccess(feature: string): Observable<'full' | 'limited' | 'none'> {
    const user = this.stateService.user();
    return of(user).pipe(
      map((user: CurrentUser | null) => {
        if (!user || !user.role) return 'none';

        const permissions = MULTI_BRANCH_ROLE_PERMISSIONS[user.role];
        if (!permissions) return 'none';

        switch (feature) {
          case 'analytics':
            if (permissions.canViewAnalytics && permissions.canAccessAllBranches) return 'full';
            if (permissions.canViewAnalytics) return 'limited';
            return 'none';

          case 'transfers':
            if (permissions.canManageTransfers && permissions.canApproveTransfers) return 'full';
            if (permissions.canManageTransfers) return 'limited';
            return 'none';

          case 'branches':
            if (permissions.canManageBranches) return 'full';
            if (permissions.canViewCoordination) return 'limited';
            return 'none';

          case 'financial':
            if (permissions.canViewFinancialData && permissions.canAccessAllBranches) return 'full';
            if (permissions.canViewFinancialData) return 'limited';
            return 'none';

          default:
            return 'none';
        }
      })
    );
  }

  /**
   * Check if user can access specific branch
   */
  canAccessBranch(branchId: number): Observable<boolean> {
    const user = this.stateService.user();
    return of(user).pipe(
      map((user: CurrentUser | null) => {
        if (!user) return false;

        const permissions = MULTI_BRANCH_ROLE_PERMISSIONS[user.role!];
        if (!permissions) return false;

        // Admin and HeadManager can access all branches
        if (permissions.canAccessAllBranches) return true;

        // Other roles can only access their assigned branch
        return user.branchId === branchId;
      })
    );
  }

  /**
   * Get accessible branches for current user
   */
  getAccessibleBranches(): Observable<number[]> {
    const user = this.stateService.user();
    return of(user).pipe(
      map((user: CurrentUser | null) => {
        if (!user) return [];

        const permissions = MULTI_BRANCH_ROLE_PERMISSIONS[user.role!];
        if (!permissions) return [];

        if (permissions.canAccessAllBranches) {
          // Return all available branch IDs
          const branches = this.stateService.availableBranches();
          return branches.map(branch => branch.branchId).filter((id): id is number => id !== undefined);
        }

        // Return only user's branch
        return user.branchId ? [user.branchId] : [];
      })
    );
  }

  /**
   * Check if user role is multi-branch capable
   */
  isMultiBranchRole(): Observable<boolean> {
    const user = this.stateService.user();
    return of(user).pipe(
      map((user: CurrentUser | null) => {
        if (!user || !user.role) return false;
        
        const multiBranchRoles = ['Admin', 'HeadManager', 'BranchManager'];
        return multiBranchRoles.includes(user.role);
      })
    );
  }

  /**
   * Get minimum role required for a feature
   */
  getMinimumRoleForFeature(feature: string): string | null {
    const featureRoleMap: { [key: string]: string } = {
      'system-admin': 'Admin',
      'branch-management': 'HeadManager',
      'transfer-approval': 'HeadManager',
      'coordination': 'BranchManager',
      'analytics-full': 'HeadManager',
      'financial-full': 'HeadManager'
    };

    return featureRoleMap[feature] || null;
  }

  private getDefaultPermissions(): MultiBranchPermissions {
    return {
      canViewCoordination: false,
      canManageTransfers: false,
      canApproveTransfers: false,
      canManageBranches: false,
      canViewAnalytics: false,
      canViewSystemHealth: false,
      canManageSystemSettings: false,
      canAccessAllBranches: false,
      canViewFinancialData: false,
      canExportData: false
    };
  }

  /**
   * Handle unauthorized access
   */
  handleUnauthorizedAccess(requiredPermission?: string): void {
    console.warn('Unauthorized access attempt:', requiredPermission);
    this.router.navigate(['/unauthorized'], {
      queryParams: { 
        reason: 'insufficient-permissions',
        required: requiredPermission
      }
    });
  }
}

// Route guard functions using functional approach

/**
 * Guard for multi-branch coordination access
 */
export const multiBranchCoordinationGuard: CanActivateFn = (
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot
): Observable<boolean> => {
  const roleService = inject(MultiBranchRoleService);
  
  return roleService.hasPermission('canViewCoordination').pipe(
    map(hasPermission => {
      if (!hasPermission) {
        roleService.handleUnauthorizedAccess('coordination-access');
        return false;
      }
      return true;
    })
  );
};

/**
 * Guard for transfer management access
 */
export const transferManagementGuard: CanActivateFn = (
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot
): Observable<boolean> => {
  const roleService = inject(MultiBranchRoleService);
  
  return roleService.hasPermission('canManageTransfers').pipe(
    map(hasPermission => {
      if (!hasPermission) {
        roleService.handleUnauthorizedAccess('transfer-management');
        return false;
      }
      return true;
    })
  );
};

/**
 * Guard for transfer approval access
 */
export const transferApprovalGuard: CanActivateFn = (
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot
): Observable<boolean> => {
  const roleService = inject(MultiBranchRoleService);
  
  return roleService.hasPermission('canApproveTransfers').pipe(
    map(hasPermission => {
      if (!hasPermission) {
        roleService.handleUnauthorizedAccess('transfer-approval');
        return false;
      }
      return true;
    })
  );
};

/**
 * Guard for branch management access
 */
export const branchManagementGuard: CanActivateFn = (
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot
): Observable<boolean> => {
  const roleService = inject(MultiBranchRoleService);
  
  return roleService.hasPermission('canManageBranches').pipe(
    map(hasPermission => {
      if (!hasPermission) {
        roleService.handleUnauthorizedAccess('branch-management');
        return false;
      }
      return true;
    })
  );
};

/**
 * Guard for multi-branch analytics access
 */
export const multiBranchAnalyticsGuard: CanActivateFn = (
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot
): Observable<boolean> => {
  const roleService = inject(MultiBranchRoleService);
  
  return roleService.hasPermission('canViewAnalytics').pipe(
    map(hasPermission => {
      if (!hasPermission) {
        roleService.handleUnauthorizedAccess('analytics-access');
        return false;
      }
      return true;
    })
  );
};

/**
 * Guard for system administration access
 */
export const systemAdminGuard: CanActivateFn = (
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot
): Observable<boolean> => {
  const roleService = inject(MultiBranchRoleService);
  
  return roleService.hasAllPermissions(['canViewSystemHealth', 'canManageSystemSettings']).pipe(
    map(hasPermissions => {
      if (!hasPermissions) {
        roleService.handleUnauthorizedAccess('system-administration');
        return false;
      }
      return true;
    })
  );
};

/**
 * Guard for specific branch access
 */
export const branchAccessGuard: CanActivateFn = (
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot
): Observable<boolean> => {
  const roleService = inject(MultiBranchRoleService);
  const branchId = route.params['branchId'] ? parseInt(route.params['branchId']) : null;
  
  if (!branchId) {
    return roleService.hasPermission('canAccessAllBranches');
  }
  
  return roleService.canAccessBranch(branchId).pipe(
    map(canAccess => {
      if (!canAccess) {
        roleService.handleUnauthorizedAccess(`branch-${branchId}-access`);
        return false;
      }
      return true;
    })
  );
};

/**
 * Guard for financial data access
 */
export const financialDataGuard: CanActivateFn = (
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot
): Observable<boolean> => {
  const roleService = inject(MultiBranchRoleService);
  
  return roleService.hasPermission('canViewFinancialData').pipe(
    map(hasPermission => {
      if (!hasPermission) {
        roleService.handleUnauthorizedAccess('financial-data');
        return false;
      }
      return true;
    })
  );
};

/**
 * Guard for data export functionality
 */
export const dataExportGuard: CanActivateFn = (
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot
): Observable<boolean> => {
  const roleService = inject(MultiBranchRoleService);
  
  return roleService.hasPermission('canExportData').pipe(
    map(hasPermission => {
      if (!hasPermission) {
        roleService.handleUnauthorizedAccess('data-export');
        return false;
      }
      return true;
    })
  );
};