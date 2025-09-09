import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { StateService } from '../services/state.service';

/**
 * Guard untuk routes yang memerlukan branch context
 * Mengikuti pattern POS Toko Eniwan dengan functional guards
 */
export const branchRequiredGuard: CanActivateFn = (route, state) => {
  const stateService = inject(StateService);
  const router = inject(Router);

  const user = stateService.user();
  const selectedBranchId = stateService.selectedBranchId();
  const isMultiBranchMode = stateService.isMultiBranchMode();

  // Allow access if user is not in multi-branch mode (single branch user)
  if (!isMultiBranchMode && user?.branchId) {
    return true;
  }

  // For multi-branch users, require branch selection
  if (isMultiBranchMode && !selectedBranchId) {
    // Set branch required flag untuk UI indication
    stateService.setBranchRequired(true);
    
    // Redirect to branch selection page
    router.navigate(['/select-branch'], {
      queryParams: { returnUrl: state.url }
    });
    return false;
  }

  // Check if user has access to selected branch
  if (selectedBranchId && !stateService.canAccessBranch(selectedBranchId)) {
    router.navigate(['/unauthorized']);
    return false;
  }

  return true;
};

/**
 * Guard untuk multi-branch admin operations
 */
export const multiBranchAdminGuard: CanActivateFn = (route, state) => {
  const stateService = inject(StateService);
  const router = inject(Router);

  const user = stateService.user();
  
  // Only Admin and HeadManager can access multi-branch admin features
  if (!['Admin', 'HeadManager'].includes(user?.role || '')) {
    router.navigate(['/unauthorized']);
    return false;
  }

  return true;
};

/**
 * Guard untuk coordination features
 */
export const coordinationAccessGuard: CanActivateFn = (route, state) => {
  const stateService = inject(StateService);
  const router = inject(Router);

  const user = stateService.user();
  
  // Allow access for users with multi-branch permissions or management roles
  const allowedRoles = ['Admin', 'HeadManager', 'BranchManager', 'Manager'];
  const hasAccess = allowedRoles.includes(user?.role || '') || stateService.hasMultiBranchAccess();
  
  if (!hasAccess) {
    router.navigate(['/unauthorized']);
    return false;
  }

  return true;
};