import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { HTTP_INTERCEPTORS, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';

import { AppHttpInterceptor } from './http.interceptor';
import { AuthService } from '../services/auth.service';
import { of, throwError } from 'rxjs';

describe('AppHttpInterceptor', () => {
  let httpMock: HttpTestingController;
  let httpClient: HttpClient;
  let authServiceSpy: jasmine.SpyObj<AuthService>;
  let routerSpy: jasmine.SpyObj<Router>;

  beforeEach(() => {
    const authSpy = jasmine.createSpyObj('AuthService', ['refreshToken', 'logout']);
    const routerSpyObj = jasmine.createSpyObj('Router', ['navigate']);

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        AppHttpInterceptor,
        { provide: AuthService, useValue: authSpy },
        { provide: Router, useValue: routerSpyObj },
        {
          provide: HTTP_INTERCEPTORS,
          useClass: AppHttpInterceptor,
          multi: true
        }
      ]
    });

    httpMock = TestBed.inject(HttpTestingController);
    httpClient = TestBed.inject(HttpClient);
    authServiceSpy = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
    routerSpy = TestBed.inject(Router) as jasmine.SpyObj<Router>;
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should add common headers to requests', () => {
    const testData = { message: 'test' };

    httpClient.get('/api/test').subscribe();

    const req = httpMock.expectOne('/api/test');
    
    // Check that common headers are added
    expect(req.request.headers.get('Accept')).toBe('application/json');
    expect(req.request.headers.get('X-Requested-With')).toBe('XMLHttpRequest');
    expect(req.request.headers.get('X-API-Version')).toBe('v1');
    expect(req.request.headers.get('X-Correlation-ID')).toBeTruthy();
    expect(req.request.headers.get('Content-Type')).toBe('application/json');
    expect(req.request.withCredentials).toBe(true);

    req.flush(testData);
  });

  it('should handle 401 errors and attempt token refresh', () => {
    authServiceSpy.refreshToken.and.returnValue(of('new-token'));

    httpClient.get('/api/protected').subscribe();

    const req = httpMock.expectOne('/api/protected');
    req.flush({ error: 'Unauthorized' }, { status: 401, statusText: 'Unauthorized' });

    // Should attempt refresh
    expect(authServiceSpy.refreshToken).toHaveBeenCalled();

    // Should retry the original request
    const retryReq = httpMock.expectOne('/api/protected');
    retryReq.flush({ message: 'success' });
  });

  it('should logout and redirect on refresh failure', () => {
    authServiceSpy.refreshToken.and.returnValue(throwError(() => new Error('Refresh failed')));
    authServiceSpy.logout.and.returnValue(of({}));

    httpClient.get('/api/protected').subscribe({
      error: () => {
        // Expected error
      }
    });

    const req = httpMock.expectOne('/api/protected');
    req.flush({ error: 'Unauthorized' }, { status: 401, statusText: 'Unauthorized' });

    expect(authServiceSpy.refreshToken).toHaveBeenCalled();
    expect(authServiceSpy.logout).toHaveBeenCalled();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/auth/login']);
  });

  it('should not add Content-Type header for FormData', () => {
    const formData = new FormData();
    formData.append('file', 'test');

    httpClient.post('/api/upload', formData).subscribe();

    const req = httpMock.expectOne('/api/upload');
    
    // Content-Type should not be set for FormData (browser sets it with boundary)
    expect(req.request.headers.get('Content-Type')).toBeNull();
    
    req.flush({ success: true });
  });

  it('should generate unique correlation IDs', () => {
    const interceptor = new AppHttpInterceptor(authServiceSpy, routerSpy);
    
    const id1 = (interceptor as any).generateCorrelationId();
    const id2 = (interceptor as any).generateCorrelationId();
    
    expect(id1).toBeTruthy();
    expect(id2).toBeTruthy();
    expect(id1).not.toBe(id2);
    expect(id1).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  });
});