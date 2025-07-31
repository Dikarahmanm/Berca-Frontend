// src/app/core/guards/role.guard.ts
// ✅ NEW: Role guard untuk protecting routes berdasarkan user role

import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class RoleGuard implements CanActivate {

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> | Promise<boolean> | boolean {

    const requiredRoles = route.data['requiredRoles'] as string[];
    
    if (!requiredRoles || requiredRoles.length === 0) {
      return true; // No role requirement
    }

    return this.authService.currentUser$.pipe(
      map(user => {
        if (!user) {
          this.router.navigate(['/login']);
          return false;
        }

        const hasRole = requiredRoles.includes(user.role);
        
        if (!hasRole) {
          // Redirect to dashboard or show access denied
          this.router.navigate(['/dashboard']);
          return false;
        }

        return true;
      })
    );
  }
}