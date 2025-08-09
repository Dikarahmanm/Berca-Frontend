// src/app/core/guard/role.guard.ts
import { inject } from '@angular/core';
import { CanActivateFn, ActivatedRouteSnapshot, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { map, take } from 'rxjs/operators';

export const roleGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const requiredRoles = (route.data['requiredRoles'] as string[]) || [];

  // Tidak ada syarat role -> allow
  if (requiredRoles.length === 0) return true;

  return authService.currentUser$.pipe(
    take(1),
    map(user => {
      if (!user) return router.createUrlTree(['/login']);
      const hasRole = requiredRoles.includes(user.role);
      return hasRole ? true : router.createUrlTree(['/dashboard']);
    })
  );
};
