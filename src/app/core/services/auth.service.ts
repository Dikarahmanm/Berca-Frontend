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
  // DESIGN GUIDE PROPERTIES
  branchId?: number;
  isMultiBranchUser?: boolean;
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
  // BACKEND API URLS - Updated untuk backend integration baru
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
    console.log('🔐 === LOGIN ATTEMPT (NEW BACKEND API) ===');
    console.log('URL:', url);
    console.log('Username:', data.username);
    console.log('Password length:', data.password?.length || 0);
    console.log('🍪 Cookies BEFORE login:', document.cookie);
    
    // Send username and password as expected by backend
    const loginPayload = {
      username: data.username,
      password: data.password
    };
    
    console.log('📤 Sending payload:', loginPayload);
    
    return this.http.post<any>(url, loginPayload, { 
      withCredentials: true
    }).pipe(
      tap((response: any) => {
        console.log('✅ === LOGIN SUCCESS (NEW BACKEND) ===');
        console.log('Response:', response);
        
        if (response?.success && response?.data?.user) {
          const user = response.data.user;
          
          // Store user data immediately - updated untuk backend baru format
          // ✅ FIX: Handle undefined username from backend
          const safeUsername = user.name || user.username || user.email?.split('@')[0] || `user_${user.id}` || 'user';
          
          const userData: CurrentUser = {
            id: user.id,
            username: safeUsername, // Use safe username with fallback
            role: user.role,
            isActive: true,
            defaultBranchId: user.branchId, // Backend returns 'branchId'
            accessibleBranches: response.data.accessibleBranches || [user.branchId],
            canSwitchBranches: ['Admin', 'HeadManager', 'BranchManager'].includes(user.role)
          };
          
          localStorage.setItem('username', safeUsername); // Use safe username
          localStorage.setItem('role', user.role);
          localStorage.setItem('userId', user.id.toString());
          localStorage.setItem('userBranchId', user.branchId?.toString() || ''); // Use 'branchId'
          
          // Update state immediately
          this.currentUserSubject.next(userData);
          this.isLoggedInSubject.next(true);
          console.log('💾 User data stored in localStorage and state');
          
          // Navigate to dashboard after state is updated
          setTimeout(() => {
            this.router.navigate(['/dashboard']);
          }, 50);
        }
        
        // Check cookies after login (for debugging) - updated cookie names
        setTimeout(() => {
          console.log('🍪 Cookies AFTER login:', document.cookie);
          this.debugCookies();
        }, 100);
      }),
      map((response: any) => {
        // Map new backend response to old format for compatibility
        if (response?.success && response?.data?.user) {
          return {
            success: true,
            message: response.message || 'Login successful',
            user: response.data.user.name, // Use 'name' field from backend
            role: response.data.user.role
          };
        }
        return response;
      }),
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

    console.log('🚪 === LOGOUT INITIATED ===');

    return this.http.post(url, {}, {
      withCredentials: true
    }).pipe(
      tap(() => {
        console.log('✅ Logout API successful, clearing all state...');
        this.performFullLogout();
      }),
      catchError((error) => {
        // Even if logout API fails, clear local data and redirect
        console.error('❌ Logout API failed, but clearing local data anyway:', error);
        this.performFullLogout();

        return this.handleError(error);
      })
    );
  }

  /**
   * Perform complete logout cleanup
   * Clears ALL application state and forces page reload
   */
  private performFullLogout(): void {
    console.log('🧹 Performing full logout cleanup...');

    // 1. Clear ALL localStorage items (not just specific ones)
    const keysToPreserve = ['theme', 'language']; // Optional: preserve user preferences
    const allKeys = Object.keys(localStorage);
    allKeys.forEach(key => {
      if (!keysToPreserve.includes(key)) {
        localStorage.removeItem(key);
      }
    });

    // 2. Clear ALL sessionStorage
    sessionStorage.clear();

    // 3. Reset ALL BehaviorSubjects
    this.currentUserSubject.next(null);
    this.isLoggedInSubject.next(false);
    this.userBranchAccessSubject.next(null);

    // 4. Clear ALL cookies (if needed)
    this.clearAllCookies();

    console.log('✅ All state cleared');
    console.log('🔄 Forcing page reload to clear Angular state...');

    // 5. Force complete page reload to clear ALL Angular state
    // This ensures no stale observables, subscriptions, or cached data
    window.location.href = '/login';
  }

  /**
   * Clear all cookies (optional, depends on your auth strategy)
   */
  private clearAllCookies(): void {
    const cookies = document.cookie.split(';');

    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i];
      const eqPos = cookie.indexOf('=');
      const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();

      // Clear cookie for all paths
      document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
      document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=${window.location.hostname}`;
    }

    console.log('🍪 All cookies cleared');
  }

  // Auth status testing
  testAuthStatus(): Observable<any> {
    const url = `${this.baseUrl}/auth/me`;
    console.log('🧪 === TESTING AUTH STATUS (NEW BACKEND API) ===');
    console.log('URL:', url);
    console.log('🍪 Current cookies:', document.cookie);
    
    return this.http.get(url, { 
      withCredentials: true 
    }).pipe(
      tap((response: any) => {
        console.log('✅ Auth status response:', response);
        
        // Update user data if we get valid response from /me endpoint
        if (response?.success && response?.data) {
          const user = response.data;
          const userData: CurrentUser = {
            id: user.id,
            username: user.name,
            role: user.role,
            isActive: true,
            defaultBranchId: user.currentBranch?.id,
            accessibleBranches: user.accessibleBranches?.map((b: any) => b.id) || [],
            canSwitchBranches: ['Admin', 'HeadManager', 'BranchManager'].includes(user.role)
          };
          
          this.currentUserSubject.next(userData);
          this.isLoggedInSubject.next(true);
          console.log('✅ User data updated from /me endpoint');
        }
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
      
      const sessionCookie = cookieArray.find(c => c.startsWith('.TokoEniwan.Session'));
      const branchCookie = cookieArray.find(c => c.startsWith('.TokoEniwan.BranchContext'));
      
      if (sessionCookie) {
        console.log('✅ Session cookie FOUND!');
      } else {
        console.log('❌ Session cookie NOT FOUND!');
      }
      
      if (branchCookie) {
        console.log('✅ Branch context cookie FOUND!');
      } else {
        console.log('❌ Branch context cookie NOT FOUND!');
      }
    } else {
      console.log('❌ NO COOKIES AT ALL!');
    }
  }

  private checkAuthStatus(): void {
    const username = localStorage.getItem('username');
    const role = localStorage.getItem('role');
    
    console.log('🔍 AuthService - Checking auth status on startup');
    console.log('🔍 localStorage username:', username);
    console.log('🔍 localStorage role:', role);
    
    if (username && role) {
      console.log('🔍 Found user data in localStorage, setting as authenticated...');
      
      // Set user data immediately
      const userData: CurrentUser = {
        id: 1, // Will be updated when we get full profile
        username: username,
        role: role,
        isActive: true,
        canSwitchBranches: ['Admin', 'Manager', 'BranchManager', 'HeadManager'].includes(role)
      };
      
      // Set authentication immediately - don't wait for server confirmation
      this.currentUserSubject.next(userData);
      this.isLoggedInSubject.next(true);
      console.log('✅ User set as authenticated immediately');
      
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
            console.log('✅ User data updated with branch access');
          }
        },
        error: (error) => {
          console.warn('⚠️ Failed to load branch access during auth check:', error);
        }
      });
      
      // Test auth status in background (don't fail if server unavailable)
      this.testAuthStatus().subscribe({
        next: () => {
          console.log('✅ Auth status confirmed by server');
        },
        error: () => {
          console.log('⚠️ Auth status test failed, but keeping local authentication');
          // Don't clear authentication if server test fails
        }
      });
    } else {
      console.log('❌ No user data in localStorage');
      this.currentUserSubject.next(null);
      this.isLoggedInSubject.next(false);
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
    const url = `${this.baseUrl}/api/UserBranchAssignment/user-access`;
    console.log('🏢 Loading user branch access from real API...');
    
    return this.http.get<any>(url, {
      withCredentials: true
    }).pipe(
      map(response => {
        // Transform API response to expected format
        if (response.success && response.data) {
          const transformedResponse: UserBranchAccessResponse = {
            success: true,
            data: {
              accessibleBranches: response.data.map((branch: any) => ({
                branchId: branch.branchId,
                branchCode: branch.branchCode,
                branchName: branch.branchName,
                branchType: this.mapBranchType(branch.branchType),
                isHeadOffice: branch.isHeadOffice || false,
                level: branch.level || (branch.isHeadOffice ? 0 : 1),
                canRead: branch.canRead || true,
                canWrite: branch.canWrite || false,
                canManage: branch.canManage || false,
                canTransfer: branch.canTransfer || false,
                canApprove: branch.canApprove || false,
                accessLevel: branch.accessLevel || 'ReadOnly',
                isActive: branch.isActive,
                address: branch.address || 'Alamat tidak tersedia',
                managerName: branch.managerName || 'Manager tidak diketahui',
                phone: branch.phone || '-',
                parentBranchId: branch.parentBranchId,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
              })),
              branchHierarchy: this.generateBranchHierarchy(response.data),
              userBranchRoles: this.generateUserBranchRoles(response.data),
              defaultBranchId: response.data.find((b: any) => b.isDefaultBranch)?.branchId || response.data[0]?.branchId || 1
            },
            message: response.message || 'User branch access loaded from API'
          };
          
          return transformedResponse;
        }
        
        throw new Error('Invalid API response format');
      }),
      tap(response => {
        console.log('✅ User branch access loaded from API:', {
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
      }),
      catchError(error => {
        console.error('❌ Error loading user branch access from API:', error);
        console.error('⚠️ Falling back to mock data - please check backend connectivity');
        
        // Fallback to mock data only if API is completely unreachable
        const mockResponse: UserBranchAccessResponse = {
          success: true,
          data: {
            accessibleBranches: this.generateMockBranchAccess(),
            branchHierarchy: this.generateMockBranchHierarchy(),
            userBranchRoles: this.generateMockUserBranchRoles(),
            defaultBranchId: 1
          },
          message: 'Using mock data - API unavailable'
        };
        
        this.userBranchAccessSubject.next(mockResponse);
        
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

  // ===== DATA TRANSFORMATION HELPERS =====

  private mapBranchType(branchType: number): 'Head' | 'Branch' | 'SubBranch' {
    switch (branchType) {
      case 0: return 'Head';
      case 1: return 'Branch';
      case 2: return 'SubBranch';
      default: return 'Branch';
    }
  }

  private generateBranchHierarchy(branches: any[]): BranchHierarchyDto[] {
    // Convert flat branch list to hierarchical structure
    const branchMap = new Map<number, any>();
    const rootBranches: BranchHierarchyDto[] = [];
    
    // First pass: create all nodes
    branches.forEach(branch => {
      const hierarchyBranch: BranchHierarchyDto = {
        branchId: branch.branchId,
        branchName: branch.branchName,
        branchCode: branch.branchCode,
        branchType: this.mapBranchType(branch.branchType),
        level: branch.level || (branch.isHeadOffice ? 0 : 1),
        parentBranchId: branch.parentBranchId,
        children: [],
        isExpanded: branch.isHeadOffice || false
      };
      
      branchMap.set(branch.branchId, hierarchyBranch);
      
      // Add to roots if no parent
      if (!branch.parentBranchId) {
        rootBranches.push(hierarchyBranch);
      }
    });
    
    // Second pass: build hierarchy
    branches.forEach(branch => {
      if (branch.parentBranchId) {
        const parent = branchMap.get(branch.parentBranchId);
        const child = branchMap.get(branch.branchId);
        if (parent && child) {
          parent.children.push(child);
        }
      }
    });
    
    return rootBranches;
  }

  private generateUserBranchRoles(branches: any[]): BranchUserRoleDto[] {
    const currentUser = this.getCurrentUser();
    const userRole = currentUser?.role || 'User';
    
    return branches.map(branch => ({
      branchId: branch.branchId,
      branchName: branch.branchName,
      role: userRole as any,
      permissions: this.getRolePermissions(userRole),
      canSwitchToOtherBranches: ['Admin', 'Manager', 'BranchManager', 'HeadManager'].includes(userRole),
      defaultBranch: branch.isDefaultBranch || false
    }));
  }

  // ===== MOCK DATA GENERATORS FOR DEVELOPMENT (FALLBACK ONLY) =====

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
        canApprove: isAdmin,
        accessLevel: isAdmin ? 'Full' : isManager ? 'Limited' : 'ReadOnly',
        isActive: true,
        address: 'Jl. Raya Jakarta No. 123',
        managerName: 'Budi Santoso',
        phone: '021-1234567',
        parentBranchId: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
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
        canApprove: isAdmin,
        accessLevel: isAdmin ? 'Full' : isManager ? 'Limited' : 'ReadOnly',
        isActive: true,
        address: 'Jl. Ahmad Yani No. 45, Bekasi',
        managerName: 'Siti Rahmatika',
        phone: '021-8765-4321',
        parentBranchId: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
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
        canApprove: isAdmin,
        accessLevel: isAdmin ? 'Full' : isManager ? 'Limited' : 'ReadOnly',
        isActive: true,
        address: 'Jl. BSD Raya No. 789, Tangerang Selatan',
        managerName: 'Ahmad Hidayat',
        phone: '021-5555-6666',
        parentBranchId: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
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
        canApprove: isAdmin,
        accessLevel: isAdmin ? 'Full' : 'ReadOnly',
        isActive: true,
        address: 'Jl. Margonda Raya No. 100, Depok',
        managerName: 'Siti Nurhaliza',
        phone: '021-7863456',
        parentBranchId: 3,
        createdAt: new Date('2024-01-15').toISOString(),
        updatedAt: new Date('2024-08-15').toISOString()
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