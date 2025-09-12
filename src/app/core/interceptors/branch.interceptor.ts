import { HttpInterceptorFn, HttpRequest, HttpHandlerFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { StateService } from '../services/state.service';
import { Injector } from '@angular/core';

/**
 * Automatically inject branch context into HTTP requests
 * Following POS Toko Eniwan patterns dengan modern interceptor
 */
export const branchInterceptor: HttpInterceptorFn = (req: HttpRequest<any>, next: HttpHandlerFn) => {
  // Skip branch injection for authentication, system, and ML training endpoints
  const skipBranchInjection = [
    '/auth/',
    '/login',
    '/register', 
    '/logout',
    '/public/',
    '/system/',
    '/swagger',
    '/api/auth'
  ].some(path => req.url.includes(path));

  // Skip branch injection for ML training endpoints (these are branch-agnostic)
  const skipMLTrainingEndpoints = [
    '/api/ml/inventory/training-status',
    '/api/ml/inventory/train-model',
    '/api/ml/inventory/model-health',
    '/api/ml/inventory/train-models',
    '/api/ml/inventory/model-explanation'
  ].some(path => req.url.includes(path));

  if (skipBranchInjection || skipMLTrainingEndpoints) {
    console.log('🔄 Branch interceptor: Skipping branch injection for:', req.url);
    // Log specifically for ML endpoints to confirm they're being skipped
    if (skipMLTrainingEndpoints) {
      console.log('✅ ML Training endpoint bypassed branch injection:', req.url);
    }
    return next(req);
  }

  // Safely inject StateService to avoid circular dependency during auth
  try {
    const injector = inject(Injector);
    const stateService = injector.get(StateService, null);
    
    // If StateService is not available (during bootstrap), skip branch injection
    if (!stateService) {
      console.log('⚠️ Branch interceptor: StateService not available, skipping branch injection');
      return next(req);
    }

    // Get current branch context
    const selectedBranchId = stateService.selectedBranchId();
    const user = stateService.user();

    // Clone request untuk modification
    let modifiedReq = req;

    // Add branch context headers
    if (selectedBranchId) {
      modifiedReq = modifiedReq.clone({
        setHeaders: {
          'X-Branch-Id': selectedBranchId.toString(),
          'X-Branch-Context': 'true'
        }
      });
    }

    // Add user context untuk multi-branch operations
    if (user?.isMultiBranchUser) {
      modifiedReq = modifiedReq.clone({
        setHeaders: {
          'X-Multi-Branch-User': 'true',
          'X-User-Role': user.role
        }
      });
    }

    // Add branch parameter to query string untuk GET requests
    // Skip if allBranches=true is specified to get notifications from all branches
    if (modifiedReq.method === 'GET' && selectedBranchId && 
        !modifiedReq.params.has('branchId') && 
        !modifiedReq.params.has('allBranches')) {
      modifiedReq = modifiedReq.clone({
        setParams: {
          branchId: selectedBranchId.toString()
        }
      });
    }

    // Add branch context to request body untuk POST/PUT requests
    if (['POST', 'PUT', 'PATCH'].includes(modifiedReq.method) && selectedBranchId) {
      const body = modifiedReq.body || {};
      
      // Only add branchId if not already present
      if (typeof body === 'object' && !body.hasOwnProperty('branchId')) {
        modifiedReq = modifiedReq.clone({
          body: {
            ...body,
            branchId: selectedBranchId
          }
        });
      }
    }

    return next(modifiedReq);
  } catch (error) {
    // If there's any error getting StateService (like circular dependency),
    // just proceed without branch injection
    console.warn('⚠️ Branch interceptor: Skipping branch injection due to error:', error);
    console.log('🔄 Branch interceptor: Proceeding with original request for:', req.url);
    return next(req);
  }
};