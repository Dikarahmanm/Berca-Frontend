// src/app/core/services/auth.service.ts - Enhanced with Multi-Branch Support
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, tap, catchError, throwError, map, of } from 'rxjs';
import { 
  BranchAccessDto, 
  BranchHierarchyDto, 
  BranchUserRoleDto 
} from '../interfaces/branch.interfaces';

interface LoginRequest {
  username: string;
  password: string;
}

interface RegisterRequest {
  username: string;
  password: string;
}

interface LoginResponse {
  message: string;
  user: string;
  role: string;
  success: boolean;
}

interface RegisterResponse {
  message: string;
}

// User management interfaces
export interface User {
  id: number;
  username: string;
  role: string;
  isActive: boolean;
  isDeleted?: boolean;
  email?: string;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string;
}

export interface UsersResponse {
  total: number;
  users: User[];
}

export interface UpdateUserRequest {
  role?: string;
  isActive: boolean;
}

// Current user interface for POS Component - Enhanced with Branch Support
export interface CurrentUser {
  id: number;
  username: string;
  role: string;
  isActive: boolean;
  // NEW: Multi-branch properties
  defaultBranchId?: number;
  accessibleBranches?: number[];
  branchRole?: string;
  canSwitchBranches?: boolean;
}

// NEW: Branch access response interface
export interface UserBranchAccessResponse {
  success: boolean;
  data: {
    accessibleBranches: BranchAccessDto[];
    branchHierarchy: BranchHierarchyDto[];
    userBranchRoles: BranchUserRoleDto[];
    defaultBranchId: number;
  };
  message?: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  // DIRECT URLS TO BACKEND (Cookie-based auth)
  private baseUrl = 'http://localhost:5171';
  
  private isLoggedInSubject = new BehaviorSubject<boolean>(false);
  public isLoggedIn$ = this.isLoggedInSubject.asObservable();

  // Current user data
  private currentUserSubject = new BehaviorSubject<CurrentUser | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  // NEW: Multi-branch data
  private userBranchAccessSubject = new BehaviorSubject<UserBranchAccessResponse | null>(null);
  public userBranchAccess$ = this.userBranchAccessSubject.asObservable();

  constructor(private http: HttpClient, private router: Router) {
    console.log('🔧 AuthService initialized with DIRECT URL:', this.baseUrl);
    this.checkAuthStatus();
  }

  login(data: LoginRequest): Observable<LoginResponse> {
    const url = `${this.baseUrl}/auth/login`;
    console.log('🔐 === LOGIN ATTEMPT (COOKIE-BASED) ===');
    console.log('URL:', url);
    console.log('Username:', data.username);
    console.log('🍪 Cookies BEFORE login:', document.cookie);
    
    return this.http.post<LoginResponse>(url, data, { 
      withCredentials: true,
      observe: 'response'
    }).pipe(
      tap((response: any) => {
        console.log('✅ === LOGIN SUCCESS (COOKIE-BASED) ===');
        console.log('Status:', response.status);
        console.log('Response body:', response.body);
        
        if (response.body?.success) {
          // Store user data immediately
          const userData: CurrentUser = {
            id: 1, // Will be set properly when we get user profile
            username: response.body.user,
            role: response.body.role,
            isActive: true,
            canSwitchBranches: ['Admin', 'Manager', 'BranchManager', 'HeadManager'].includes(response.body.role)
          };
          
          localStorage.setItem('username', response.body.user);
          localStorage.setItem('role', response.body.role);
          
          // Update state immediately
          this.currentUserSubject.next(userData);
          this.isLoggedInSubject.next(true);
          console.log('💾 User data stored in localStorage and state');
          
          // Load user branch access after successful login
          this.loadUserBranchAccess().subscribe({
            next: (branchAccess) => {
              if (branchAccess?.success) {
                console.log('🏢 Branch access loaded successfully');
                
                // Update user data with branch info
                const updatedUser = {
                  ...userData,
                  defaultBranchId: branchAccess.data.defaultBranchId,
                  accessibleBranches: branchAccess.data.accessibleBranches.map(b => b.branchId)
                };
                this.currentUserSubject.next(updatedUser);
              }
            },
            error: (error) => {
              console.warn('⚠️ Failed to load branch access, continuing without branch data:', error);
            }
          });
          
          // Navigate to dashboard after state is updated
          setTimeout(() => {
            this.router.navigate(['/dashboard']);
          }, 50);
        }
        
        // Check cookies after login (for debugging)
        setTimeout(() => {
          console.log('🍪 Cookies AFTER login:', document.cookie);
          this.debugCookies();
        }, 100);
      }),
      map((response: any) => response.body!),
      catchError(this.handleError.bind(this))
    );
  }

  register(data: RegisterRequest): Observable<RegisterResponse> {
    const url = `${this.baseUrl}/auth/register`;
    console.log('📝 === REGISTER ATTEMPT (COOKIE-BASED) ===');
    console.log('URL:', url);
    console.log('Username:', data.username);
    
    return this.http.post<RegisterResponse>(url, data, { 
      withCredentials: true
    }).pipe(
      tap((response: RegisterResponse) => {
        console.log('✅ Register successful:', response);
      }),
      catchError(this.handleError.bind(this))
    );
  }

  logout(): Observable<any> {
    const url = `${this.baseUrl}/auth/logout`;
    
    return this.http.post(url, {}, { 
      withCredentials: true 
    }).pipe(
      tap(() => {
        localStorage.removeItem('username');
        localStorage.removeItem('role');
        this.currentUserSubject.next(null);
        this.isLoggedInSubject.next(false);
        
        // Clear branch data
        this.userBranchAccessSubject.next(null);
        localStorage.removeItem('selected-branch-id');
        localStorage.removeItem('selected-branch-ids');
        localStorage.removeItem('is-multi-select-mode');
        
        console.log('✅ Logged out and cleared all localStorage + state');
        
        // Navigate to login page after successful logout
        this.router.navigate(['/login']);
      }),
      catchError((error) => {
        // Even if logout API fails, clear local data and redirect
        console.error('❌ Logout API failed, but clearing local data anyway:', error);
        localStorage.removeItem('username');
        localStorage.removeItem('role');
        this.currentUserSubject.next(null);
        this.isLoggedInSubject.next(false);
        
        // Clear branch data on logout error
        this.userBranchAccessSubject.next(null);
        localStorage.removeItem('selected-branch-id');
        localStorage.removeItem('selected-branch-ids');
        localStorage.removeItem('is-multi-select-mode');
        
        // Still redirect to login
        this.router.navigate(['/login']);
        
        return this.handleError(error);
      })
    );
  }

  // Auth status testing
  testAuthStatus(): Observable<any> {
    const url = `${this.baseUrl}/auth/debug-auth`;
    console.log('🧪 === TESTING AUTH STATUS (COOKIE-BASED) ===');
    console.log('URL:', url);
    console.log('🍪 Current cookies:', document.cookie);
    
    return this.http.get(url, { 
      withCredentials: true 
    }).pipe(
      tap((response: any) => {
        console.log('✅ Auth status response:', response);
      }),
      catchError((error: any) => {
        console.error('❌ Auth status failed:', error);
        return throwError(() => error);
      })
    );
  }

  // ===== NEW: METHODS FOR POS COMPONENT =====

  /**
   * Get current user data (for POS Component)
   */
  getCurrentUser(): CurrentUser | null {
    return this.currentUserSubject.value;
  }

  /**
   * Get current user observable
   */
  getCurrentUser$(): Observable<CurrentUser | null> {
    return this.currentUser$;
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return this.isLoggedInSubject.value;
  }

  /**
   * Get user role
   */
  getUserRole(): string | null {
    const user = this.getCurrentUser();
    return user ? user.role : localStorage.getItem('role');
  }

  /**
   * Get username
   */
  getUsername(): string | null {
    const user = this.getCurrentUser();
    return user ? user.username : localStorage.getItem('username');
  }

  /**
   * Get token (returns null for cookie-based auth)
   * This method exists for compatibility with interceptor
   */
  getToken(): string | null {
    // Cookie-based auth doesn't use tokens
    return null;
  }

  /**
   * Refresh token (not needed for cookie-based auth)
   * This method exists for compatibility with interceptor
   */
  refreshToken(): Observable<string> {
    // For cookie-based auth, we just test the auth status
    return this.testAuthStatus().pipe(
      map(() => 'cookie-refreshed'), // Dummy token
      catchError(() => throwError(() => new Error('Cookie refresh failed')))
    );
  }

  // ===== COOKIE DEBUGGING =====

  debugCookies(): void {
    const cookies = document.cookie;
    console.log('🍪 === COOKIE DEBUG ===');
    console.log('Raw cookies:', cookies);
    
    if (cookies) {
      const cookieArray = cookies.split(';').map(c => c.trim());
      cookieArray.forEach(cookie => {
        const [name, value] = cookie.split('=');
        console.log(`🍪 ${name}: ${value ? value.substring(0, 20) + '...' : 'empty'}`);
      });
      
      const authCookie = cookieArray.find(c => c.startsWith('.AspNetCore.Cookies'));
      if (authCookie) {
        console.log('✅ Auth cookie FOUND!');
      } else {
        console.log('❌ Auth cookie NOT FOUND!');
      }
    } else {
      console.log('❌ NO COOKIES AT ALL!');
    }
  }

  private checkAuthStatus(): void {
    const username = localStorage.getItem('username');
    const role = localStorage.getItem('role');
    
    if (username && role) {
      console.log('🔍 Found user data in localStorage, testing auth...');
      
      // Set user data immediately
      const userData: CurrentUser = {
        id: 1, // Will be updated when we get full profile
        username: username,
        role: role,
        isActive: true,
        canSwitchBranches: ['Admin', 'Manager', 'BranchManager', 'HeadManager'].includes(role)
      };
      this.currentUserSubject.next(userData);
      
      // Load branch access for existing user
      this.loadUserBranchAccess().subscribe({
        next: (branchAccess) => {
          if (branchAccess?.success) {
            const updatedUser = {
              ...userData,
              defaultBranchId: branchAccess.data.defaultBranchId,
              accessibleBranches: branchAccess.data.accessibleBranches.map(b => b.branchId)
            };
            this.currentUserSubject.next(updatedUser);
          }
        },
        error: (error) => {
          console.warn('⚠️ Failed to load branch access during auth check:', error);
        }
      });
      
      // Test auth status
      this.testAuthStatus().subscribe({
        next: () => {
          this.isLoggedInSubject.next(true);
          console.log('✅ Auth status confirmed');
        },
        error: () => {
          console.log('❌ Auth status failed, clearing data');
          this.currentUserSubject.next(null);
          this.isLoggedInSubject.next(false);
          localStorage.removeItem('username');
          localStorage.removeItem('role');
        }
      });
    }
  }

  private handleError(error: HttpErrorResponse) {
    console.error('❌ === AUTH ERROR (COOKIE-BASED) ===');
    console.error('Status:', error.status);
    console.error('Message:', error.message);
    console.error('Error body:', error.error);
    return throwError(() => error);
  }

  // ===== USER MANAGEMENT METHODS =====

  private debugAuth(action: string): void {
    const username = localStorage.getItem('username');
    const role = localStorage.getItem('role');
    const cookies = document.cookie;
    
    console.log(`🔍 === AUTH DEBUG (${action}) ===`);
    console.log('- Username:', username);
    console.log('- Role:', role);
    console.log('- All Cookies:', cookies || 'No cookies found');
    
    if (cookies) {
      const cookieArray = cookies.split(';').map(c => c.trim());
      const authCookie = cookieArray.find(c => c.startsWith('.AspNetCore.Cookies'));
      
      if (authCookie) {
        console.log('✅ Auth Cookie FOUND:', authCookie.substring(0, 50) + '...');
      } else {
        console.log('❌ Auth Cookie NOT FOUND!');
        console.log('Available cookies:', cookieArray.map(c => c.split('=')[0]));
      }
    }
  }

  getUsers(page: number = 1, pageSize: number = 10, search: string = ''): Observable<UsersResponse> {
    this.debugAuth('GET_USERS');
    
    let params = new HttpParams()
      .set('page', page.toString())
      .set('pageSize', pageSize.toString());
    
    if (search) {
      params = params.set('search', search);
    }

    const url = `${this.baseUrl}/admin/users`;
    console.log('🔄 GET Request (with cookies):', { url, params: params.toString() });

    return this.http.get<UsersResponse>(url, {
      params,
      withCredentials: true
    }).pipe(
      tap(response => {
        console.log('✅ Users fetched successfully:', response);
      }),
      catchError(this.handleError.bind(this))
    );
  }

  updateUser(id: number, userData: UpdateUserRequest): Observable<any> {
    this.debugAuth('UPDATE_USER');
    
    const url = `${this.baseUrl}/admin/users/${id}`;
    console.log('🔄 PUT Request (with cookies):', { 
      url, 
      payload: userData, 
      withCredentials: true,
      timestamp: new Date().toISOString()
    });

    return this.http.put(url, userData, {
      withCredentials: true
    }).pipe(
      tap(response => {
        console.log('✅ User updated successfully:', response);
      }),
      catchError(this.handleError.bind(this))
    );
  }

  deleteUser(id: number): Observable<any> {
    this.debugAuth('DELETE_USER');
    
    const url = `${this.baseUrl}/admin/users/${id}`;
    console.log('🔄 DELETE Request (with cookies):', { url, withCredentials: true });

    return this.http.delete(url, {
      withCredentials: true
    }).pipe(
      tap(response => {
        console.log('✅ User deleted successfully:', response);
      }),
      catchError(this.handleError.bind(this))
    );
  }

  getDeletedUsers(page: number = 1, pageSize: number = 10): Observable<UsersResponse> {
    this.debugAuth('GET_DELETED_USERS');
    
    let params = new HttpParams()
      .set('page', page.toString())
      .set('pageSize', pageSize.toString());

    const url = `${this.baseUrl}/admin/users/deleted`;
    console.log('🔄 GET Deleted Users (with cookies):', { url, params: params.toString() });

    return this.http.get<UsersResponse>(url, {
      params,
      withCredentials: true
    }).pipe(
      tap(response => {
        console.log('✅ Deleted users fetched successfully:', response);
      }),
      catchError(this.handleError.bind(this))
    );
  }

  restoreUser(id: number): Observable<any> {
    this.debugAuth('RESTORE_USER');
    
    const url = `${this.baseUrl}/admin/users/${id}/restore`;
    console.log('🔄 PUT Restore (with cookies):', { url, withCredentials: true });

    return this.http.put(url, {}, {
      withCredentials: true
    }).pipe(
      tap(response => {
        console.log('✅ User restored successfully:', response);
      }),
      catchError(this.handleError.bind(this))
    );
  }

  // ===== NEW: MULTI-BRANCH METHODS =====

  /**
   * Load user's accessible branches and roles
   */
  loadUserBranchAccess(): Observable<UserBranchAccessResponse> {
    const url = `${this.baseUrl}/branch/user-access`;
    console.log('🏢 Loading user branch access...');
    
    return this.http.get<UserBranchAccessResponse>(url, {
      withCredentials: true
    }).pipe(
      tap(response => {
        if (response.success) {
          console.log('✅ User branch access loaded:', {
            accessibleBranches: response.data.accessibleBranches.length,
            defaultBranchId: response.data.defaultBranchId,
            userRoles: response.data.userBranchRoles.length
          });
          
          // Store branch access data
          this.userBranchAccessSubject.next(response);
          
          // Store default branch ID
          if (response.data.defaultBranchId) {
            localStorage.setItem('default-branch-id', response.data.defaultBranchId.toString());
          }
        } else {
          console.warn('⚠️ Branch access request failed:', response.message);
        }
      }),
      catchError(error => {
        console.error('❌ Error loading user branch access:', error);
        
        // Return mock data for development
        const mockResponse: UserBranchAccessResponse = {
          success: true,
          data: {
            accessibleBranches: this.generateMockBranchAccess(),
            branchHierarchy: this.generateMockBranchHierarchy(),
            userBranchRoles: this.generateMockUserBranchRoles(),
            defaultBranchId: 1
          },
          message: 'Using mock branch data for development'
        };
        
        this.userBranchAccessSubject.next(mockResponse);
        console.log('📝 Using mock branch access data');
        
        return of(mockResponse);
      })
    );
  }

  /**
   * Get current branch access data
   */
  getCurrentBranchAccess(): UserBranchAccessResponse | null {
    return this.userBranchAccessSubject.value;
  }

  /**
   * Refresh user branch access (after role changes, etc.)
   */
  refreshBranchAccess(): Observable<UserBranchAccessResponse> {
    console.log('🔄 Refreshing user branch access...');
    return this.loadUserBranchAccess();
  }

  /**
   * Check if user can access specific branch
   */
  canAccessBranch(branchId: number): boolean {
    const branchAccess = this.userBranchAccessSubject.value;
    if (!branchAccess?.success) return false;
    
    return branchAccess.data.accessibleBranches.some(b => 
      b.branchId === branchId && b.canRead
    );
  }

  /**
   * Check if user can manage specific branch
   */
  canManageBranch(branchId: number): boolean {
    const branchAccess = this.userBranchAccessSubject.value;
    if (!branchAccess?.success) return false;
    
    return branchAccess.data.accessibleBranches.some(b => 
      b.branchId === branchId && b.canManage
    );
  }

  // ===== MOCK DATA GENERATORS FOR DEVELOPMENT =====

  private generateMockBranchAccess(): BranchAccessDto[] {
    const currentUser = this.getCurrentUser();
    const isAdmin = currentUser?.role === 'Admin';
    const isManager = ['Manager', 'BranchManager', 'HeadManager'].includes(currentUser?.role || '');
    
    return [
      {
        branchId: 1,
        branchCode: 'HQ001',
        branchName: 'Cabang Utama Jakarta',
        branchType: 'Head',
        isHeadOffice: true,
        level: 0,
        canRead: true,
        canWrite: isAdmin || isManager,
        canManage: isAdmin,
        canTransfer: isAdmin || isManager,
        accessLevel: isAdmin ? 'Full' : isManager ? 'Limited' : 'ReadOnly'
      },
      {
        branchId: 2,
        branchCode: 'BR002',
        branchName: 'Cabang Bekasi Timur',
        branchType: 'Branch',
        isHeadOffice: false,
        level: 1,
        canRead: true,
        canWrite: isAdmin || isManager,
        canManage: isAdmin,
        canTransfer: isAdmin || isManager,
        accessLevel: isAdmin ? 'Full' : isManager ? 'Limited' : 'ReadOnly'
      },
      {
        branchId: 3,
        branchCode: 'BR003',
        branchName: 'Cabang Tangerang Selatan',
        branchType: 'Branch',
        isHeadOffice: false,
        level: 1,
        canRead: true,
        canWrite: isAdmin || (isManager && currentUser?.username !== 'cashier'),
        canManage: isAdmin,
        canTransfer: isAdmin || isManager,
        accessLevel: isAdmin ? 'Full' : isManager ? 'Limited' : 'ReadOnly'
      },
      {
        branchId: 4,
        branchCode: 'BR004',
        branchName: 'Cabang Depok Margonda',
        branchType: 'SubBranch',
        isHeadOffice: false,
        level: 2,
        canRead: true,
        canWrite: isAdmin,
        canManage: isAdmin,
        canTransfer: isAdmin || isManager,
        accessLevel: isAdmin ? 'Full' : 'ReadOnly'
      }
    ];
  }

  private generateMockBranchHierarchy(): BranchHierarchyDto[] {
    return [
      {
        branchId: 1,
        branchName: 'Cabang Utama Jakarta',
        branchCode: 'HQ001',
        branchType: 'Head',
        level: 0,
        children: [
          {
            branchId: 2,
            branchName: 'Cabang Bekasi Timur',
            branchCode: 'BR002',
            branchType: 'Branch',
            level: 1,
            parentBranchId: 1,
            children: [],
            isExpanded: false
          },
          {
            branchId: 3,
            branchName: 'Cabang Tangerang Selatan',
            branchCode: 'BR003',
            branchType: 'Branch',
            level: 1,
            parentBranchId: 1,
            children: [
              {
                branchId: 4,
                branchName: 'Cabang Depok Margonda',
                branchCode: 'BR004',
                branchType: 'SubBranch',
                level: 2,
                parentBranchId: 3,
                children: [],
                isExpanded: false
              }
            ],
            isExpanded: false
          }
        ],
        isExpanded: true
      }
    ];
  }

  private generateMockUserBranchRoles(): BranchUserRoleDto[] {
    const currentUser = this.getCurrentUser();
    const userRole = currentUser?.role || 'User';
    
    const basePermissions = this.getRolePermissions(userRole);
    
    return [
      {
        branchId: 1,
        branchName: 'Cabang Utama Jakarta',
        role: userRole as any,
        permissions: basePermissions,
        canSwitchToOtherBranches: ['Admin', 'Manager', 'BranchManager', 'HeadManager'].includes(userRole),
        defaultBranch: true
      },
      {
        branchId: 2,
        branchName: 'Cabang Bekasi Timur',
        role: userRole as any,
        permissions: userRole === 'Admin' ? basePermissions : basePermissions.filter(p => p !== 'branch.manage'),
        canSwitchToOtherBranches: ['Admin', 'Manager', 'BranchManager', 'HeadManager'].includes(userRole),
        defaultBranch: false
      },
      {
        branchId: 3,
        branchName: 'Cabang Tangerang Selatan',
        role: userRole as any,
        permissions: userRole === 'Admin' ? basePermissions : basePermissions.filter(p => p !== 'branch.manage'),
        canSwitchToOtherBranches: ['Admin', 'Manager', 'BranchManager', 'HeadManager'].includes(userRole),
        defaultBranch: false
      },
      {
        branchId: 4,
        branchName: 'Cabang Depok Margonda',
        role: userRole as any,
        permissions: userRole === 'Admin' ? basePermissions : ['inventory.read', 'pos.operate'],
        canSwitchToOtherBranches: ['Admin', 'Manager'].includes(userRole),
        defaultBranch: false
      }
    ];
  }

  private getRolePermissions(role: string): string[] {
    const rolePermissions: Record<string, string[]> = {
      'Admin': ['inventory.write', 'facture.write', 'reports.export', 'users.manage', 'supplier.write', 'branch.manage', 'member-debt.write', 'pos.operate'],
      'HeadManager': ['inventory.write', 'facture.write', 'reports.export', 'supplier.write', 'branch.read', 'member-debt.write', 'pos.operate'],
      'BranchManager': ['inventory.write', 'reports.read', 'member-debt.write', 'pos.operate', 'branch.read'],
      'Manager': ['inventory.write', 'pos.operate', 'supplier.read', 'member-debt.read'],
      'User': ['inventory.read', 'pos.operate', 'member-debt.read'],
      'Cashier': ['pos.operate']
    };
    
    return rolePermissions[role] || ['pos.operate'];
  }
}