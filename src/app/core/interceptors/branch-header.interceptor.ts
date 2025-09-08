// src/app/core/interceptors/branch-header.interceptor.ts
// Multi-Branch HTTP Interceptor - Automatically adds branch context to API calls
// Angular 20 with enhanced branch filtering

import { Injectable, inject } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent } from '@angular/common/http';
import { Observable } from 'rxjs';
import { StateService } from '../services/state.service';

@Injectable()
export class BranchHeaderInterceptor implements HttpInterceptor {
  private stateService = inject(StateService);

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const branchIds = this.stateService.activeBranchIds();
    
    // Add branch context to API calls that need it
    if (branchIds.length > 0 && this.shouldAddBranchContext(req)) {
      const modifiedReq = req.clone({
        setParams: {
          branchIds: branchIds.join(',')
        }
      });
      
      console.log('🌐 Adding branch context to API call:', {
        url: req.url,
        branchIds: branchIds,
        method: req.method
      });
      
      return next.handle(modifiedReq);
    }
    
    return next.handle(req);
  }

  private shouldAddBranchContext(req: HttpRequest<any>): boolean {
    // Add branch context to business endpoints but skip auth endpoints
    const businessEndpoints = [
      '/inventory',
      '/sales',
      '/pos',
      '/member',
      '/supplier',
      '/facture',
      '/analytics',
      '/reports',
      '/dashboard',
      '/branch-coordination'
    ];
    
    const skipEndpoints = [
      '/auth',
      '/user',
      '/admin/users',
      '/branch/user-access' // Skip the branch access endpoint itself
    ];
    
    // Skip if it's an auth-related endpoint
    if (skipEndpoints.some(endpoint => req.url.includes(endpoint))) {
      return false;
    }
    
    // Add for business endpoints
    if (businessEndpoints.some(endpoint => req.url.includes(endpoint))) {
      return true;
    }
    
    // Default: don't add branch context
    return false;
  }
}