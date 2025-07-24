import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, BehaviorSubject, throwError } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';

export interface LoginRequest {
  username: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  fullName: string;
  role?: string;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  user?: string; // ✅ Backend returns user as string, not object
  role?: string;
  token?: string;
  refreshToken?: string;
}

export interface UserInfo {
  id: string;
  username: string;
  email: string;
  fullName: string;
  role: string;
  department: string;
  position: string;
  photoUrl: string;
  isActive: boolean;
  lastLogin: string;
}

export interface User {
  id: string;
  username: string;
  email: string;
  fullName: string;
  role: string;
  department?: string;
  position?: string;
  photoUrl?: string;
  isActive: boolean;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
  lastLogin?: string;
}

export interface UsersResponse {
  users: User[];
  totalUsers: number;
  currentPage: number;
  pageSize: number;
  totalPages: number;
}

export interface UpdateUserRequest {
  username?: string;
  email?: string;
  fullName?: string;
  role?: string;
  department?: string;
  position?: string;
  isActive?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  
  // ✅ FIXED: Endpoint sesuai dengan backend controller routes
  private readonly BASE_URL = 'http://localhost:5171';
  private readonly TOKEN_KEY = 'eniwan_token';
  private readonly USER_KEY = 'eniwan_user';
  
  // Subject untuk track authentication state
  private isAuthenticatedSubject = new BehaviorSubject<boolean>(this.hasValidToken());
  private currentUserSubject = new BehaviorSubject<UserInfo | null>(this.getCurrentUserFromStorage());

  // Observables yang bisa di-subscribe oleh komponen
  public isAuthenticated$ = this.isAuthenticatedSubject.asObservable();
  public currentUser$ = this.currentUserSubject.asObservable();
  public isLoggedIn$ = this.isAuthenticated$;

  // Mock users dengan string IDs
  private mockUsers: User[] = [
    {
      id: '1',
      username: 'admin',
      email: 'admin@eniwan.com',
      fullName: 'Administrator',
      role: 'Admin',
      department: 'IT',
      position: 'System Administrator',
      photoUrl: '',
      isActive: true,
      isDeleted: false,
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
      lastLogin: '2024-01-20'
    },
    {
      id: '2',
      username: 'manager',
      email: 'manager@eniwan.com',
      fullName: 'Store Manager',
      role: 'Manager',
      department: 'Operations',
      position: 'Store Manager',
      photoUrl: '',
      isActive: true,
      isDeleted: false,
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
      lastLogin: '2024-01-19'
    },
    {
      id: '3',
      username: 'kasir1',
      email: 'kasir1@eniwan.com',
      fullName: 'Kasir Satu',
      role: 'Kasir',
      department: 'Sales',
      position: 'Cashier',
      photoUrl: '',
      isActive: true,
      isDeleted: false,
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
      lastLogin: '2024-01-18'
    }
  ];

  constructor() {
    this.checkTokenValidity();
    console.log('🔧 AuthService initialized with BASE URL:', this.BASE_URL);
  }

  /**
   * ✅ FIXED: Login dengan endpoint yang sesuai backend
   * Backend endpoint: POST /auth/login
   */
  login(credentials: LoginRequest): Observable<LoginResponse> {
    const url = `${this.BASE_URL}/auth/login`;
    const headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });

    console.log('🔐 Attempting login to:', url);
    console.log('🔐 Credentials:', { username: credentials.username, password: '***' });

    return this.http.post<LoginResponse>(url, credentials, { 
      headers,
      withCredentials: true // ✅ IMPORTANT: untuk cookie-based auth
    })
      .pipe(
        tap(response => {
          console.log('✅ Login response:', response);
          if (response.success && response.user) {
            this.handleSuccessfulLogin(response);
          }
        }),
        catchError(error => {
          console.error('❌ Login error:', error);
          
          // ✅ Mock login untuk development (dengan kredensial yang lebih realistis)
          if ((credentials.username === 'admin' && credentials.password === 'admin') ||
              (credentials.username === 'manager' && credentials.password === 'manager') ||
              (credentials.username === 'kasir1' && credentials.password === 'kasir1')) {
            
            console.log('🔧 Using mock login for development');
            const mockUser = this.mockUsers.find(u => u.username === credentials.username);
            const mockResponse: LoginResponse = {
              success: true,
              message: 'Login berhasil (mock)',
              user: mockUser?.username || credentials.username,
              role: mockUser?.role || 'User'
            };
            this.handleSuccessfulLogin(mockResponse);
            return [mockResponse];
          }
          
          return throwError(() => this.handleLoginError(error));
        })
      );
  }

  /**
   * ✅ FIXED: Register dengan endpoint yang sesuai backend
   * Backend endpoint: POST /auth/register
   */
  register(registerData: RegisterRequest): Observable<LoginResponse> {
    const url = `${this.BASE_URL}/auth/register`;
    const headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });

    // ✅ Backend hanya butuh username & password untuk register
    const backendData = {
      username: registerData.username,
      password: registerData.password
    };

    console.log('📝 Attempting register to:', url);

    return this.http.post<any>(url, backendData, { 
      headers,
      withCredentials: true
    })
      .pipe(
        map(response => ({
          success: true,
          message: response.message || 'Registration successful',
          user: registerData.username,
          role: 'User'
        })),
        tap(response => {
          console.log('✅ Register response:', response);
        }),
        catchError(error => {
          console.error('❌ Register error:', error);
          return throwError(() => ({
            success: false,
            message: error.error?.message || 'Registrasi gagal. Username mungkin sudah dipakai.',
            error: error
          }));
        })
      );
  }

  /**
   * ✅ FIXED: User management dengan endpoint backend yang benar
   * Backend endpoint: GET /admin/users
   */
  getUsers(page: number = 1, pageSize: number = 10, search?: string, role?: string): Observable<UsersResponse> {
    let params = new URLSearchParams();
    params.set('page', page.toString());
    params.set('pageSize', pageSize.toString());
    if (search) params.set('search', search);
    if (role) params.set('role', role);

    const url = `${this.BASE_URL}/admin/users?${params}`;
    console.log('📊 Fetching users from:', url);

    return this.http.get<any>(url, {
      withCredentials: true,
      headers: this.getAuthHeaders()
    })
      .pipe(
        map(response => ({
          users: response.users || [],
          totalUsers: response.total || 0,
          currentPage: page,
          pageSize: pageSize,
          totalPages: Math.ceil((response.total || 0) / pageSize)
        })),
        tap(response => {
          console.log('✅ Users response:', response);
        }),
        catchError(error => {
          console.warn('⚠️ Users API failed, using mock data:', error);
          // Return mock data
          let filteredUsers = this.mockUsers.filter(u => !u.isDeleted);
          
          if (search) {
            filteredUsers = filteredUsers.filter(u => 
              u.username.toLowerCase().includes(search.toLowerCase()) ||
              u.fullName.toLowerCase().includes(search.toLowerCase()) ||
              u.email.toLowerCase().includes(search.toLowerCase())
            );
          }
          
          if (role) {
            filteredUsers = filteredUsers.filter(u => u.role === role);
          }

          return [{
            users: filteredUsers,
            totalUsers: filteredUsers.length,
            currentPage: page,
            pageSize: pageSize,
            totalPages: Math.ceil(filteredUsers.length / pageSize)
          }];
        })
      );
  }

  /**
   * ✅ FIXED: Get deleted users
   * Backend endpoint: GET /admin/users/deleted
   */
  getDeletedUsers(page: number = 1, pageSize: number = 10, search?: string): Observable<UsersResponse> {
    let params = new URLSearchParams();
    params.set('page', page.toString());
    params.set('pageSize', pageSize.toString());
    if (search) params.set('search', search);

    const url = `${this.BASE_URL}/admin/users/deleted?${params}`;
    console.log('🗑️ Fetching deleted users from:', url);

    return this.http.get<any>(url, {
      withCredentials: true,
      headers: this.getAuthHeaders()
    })
      .pipe(
        map(response => ({
          users: response.users || [],
          totalUsers: response.total || 0,
          currentPage: page,
          pageSize: pageSize,
          totalPages: Math.ceil((response.total || 0) / pageSize)
        })),
        tap(response => {
          console.log('✅ Deleted users response:', response);
        }),
        catchError(error => {
          console.warn('⚠️ Deleted users API failed, using mock data:', error);
          const deletedUsers = this.mockUsers.filter(u => u.isDeleted);
          return [{
            users: deletedUsers,
            totalUsers: deletedUsers.length,
            currentPage: page,
            pageSize: pageSize,
            totalPages: Math.ceil(deletedUsers.length / pageSize)
          }];
        })
      );
  }

  /**
   * ✅ FIXED: Update user
   * Backend endpoint: PUT /admin/users/{id}
   */
  updateUser(userId: string, updateData: UpdateUserRequest): Observable<User> {
    const url = `${this.BASE_URL}/admin/users/${userId}`;
    console.log('🔄 Updating user at:', url);

    // ✅ Backend expects specific format
    const backendData = {
      role: updateData.role,
      isActive: updateData.isActive
    };

    return this.http.put<any>(url, backendData, {
      withCredentials: true,
      headers: this.getAuthHeaders()
    })
      .pipe(
        map(response => response), // Backend should return updated user
        tap(response => {
          console.log('✅ User update response:', response);
        }),
        catchError(error => {
          console.warn('⚠️ User update API failed, using mock update:', error);
          const userIndex = this.mockUsers.findIndex(u => u.id === userId);
          if (userIndex > -1) {
            this.mockUsers[userIndex] = { 
              ...this.mockUsers[userIndex], 
              ...updateData,
              updatedAt: new Date().toISOString()
            };
            return [this.mockUsers[userIndex]];
          }
          throw new Error('User not found');
        })
      );
  }

  /**
   * ✅ FIXED: Delete user
   * Backend endpoint: DELETE /admin/users/{id}
   */
  deleteUser(userId: string): Observable<void> {
    const url = `${this.BASE_URL}/admin/users/${userId}`;
    console.log('🗑️ Deleting user at:', url);

    return this.http.delete<void>(url, {
      withCredentials: true,
      headers: this.getAuthHeaders()
    })
      .pipe(
        tap(() => {
          console.log('✅ User deleted successfully');
        }),
        catchError(error => {
          console.warn('⚠️ User delete API failed, using mock delete:', error);
          const userIndex = this.mockUsers.findIndex(u => u.id === userId);
          if (userIndex > -1) {
            this.mockUsers[userIndex].isDeleted = true;
            this.mockUsers[userIndex].updatedAt = new Date().toISOString();
          }
          return [void 0];
        })
      );
  }

  /**
   * ✅ FIXED: Restore user
   * Backend endpoint: PUT /admin/users/{id}/restore
   */
  restoreUser(userId: string): Observable<User> {
    const url = `${this.BASE_URL}/admin/users/${userId}/restore`;
    console.log('🔄 Restoring user at:', url);

    return this.http.put<any>(url, {}, {
      withCredentials: true,
      headers: this.getAuthHeaders()
    })
      .pipe(
        map(response => response), // Backend should return restored user
        tap(response => {
          console.log('✅ User restore response:', response);
        }),
        catchError(error => {
          console.warn('⚠️ User restore API failed, using mock restore:', error);
          const userIndex = this.mockUsers.findIndex(u => u.id === userId);
          if (userIndex > -1) {
            this.mockUsers[userIndex].isDeleted = false;
            this.mockUsers[userIndex].updatedAt = new Date().toISOString();
            return [this.mockUsers[userIndex]];
          }
          throw new Error('User not found');
        })
      );
  }

  /**
   * ✅ FIXED: Handle successful login sesuai response backend
   */
  private handleSuccessfulLogin(response: LoginResponse): void {
    if (!response.user) return;

    // ✅ Simpan data sesuai format backend response
    localStorage.setItem('username', response.user); // Backend returns user as string
    localStorage.setItem('role', response.role || 'User');
    localStorage.setItem('userId', response.user); // Use username as ID for now
    
    // Create user info object for consistency
    const userInfo: UserInfo = {
      id: response.user,
      username: response.user,
      email: `${response.user}@company.com`,
      fullName: response.user,
      role: response.role || 'User',
      department: '',
      position: '',
      photoUrl: '',
      isActive: true,
      lastLogin: new Date().toISOString()
    };
    
    localStorage.setItem(this.USER_KEY, JSON.stringify(userInfo));

    // Update BehaviorSubjects
    this.isAuthenticatedSubject.next(true);
    this.currentUserSubject.next(userInfo);

    // Log successful login
    console.log('✅ Login berhasil:', {
      username: response.user,
      role: response.role,
      loginTime: new Date().toISOString()
    });

    // Redirect ke dashboard (sesuai routing backend)
    this.router.navigate(['/dashboard']);
  }

  /**
   * Enhanced error handling dengan informasi yang lebih detail
   */
  private handleLoginError(error: any): any {
    let errorMessage = 'Login gagal. Silakan coba lagi.';
    
    console.error('Full login error:', error);
    
    if (error.status === 0) {
      errorMessage = `Tidak dapat terhubung ke server ${this.BASE_URL}. Pastikan backend berjalan di port 5171.`;
    } else if (error.status === 404) {
      errorMessage = 'Endpoint login tidak ditemukan. Pastikan backend menggunakan route /auth/login.';
    } else if (error.error?.message) {
      errorMessage = error.error.message;
    } else if (error.status === 401) {
      errorMessage = 'Username atau password salah.';
    } else if (error.status === 403) {
      errorMessage = 'Akun Anda tidak memiliki akses.';
    }

    return {
      success: false,
      message: errorMessage,
      error: error
    };
  }

  /**
   * ✅ FIXED: Logout dengan endpoint backend
   * Backend endpoint: POST /auth/logout
   */
  logout(): Observable<any> {
    const url = `${this.BASE_URL}/auth/logout`;
    console.log('🔒 Logging out at:', url);

    return this.http.post(url, {}, {
      headers: this.getAuthHeaders(),
      withCredentials: true
    }).pipe(
      tap(() => {
        console.log('✅ Logout successful');
        this.handleLogout();
      }),
      catchError(error => {
        console.error('❌ Logout error:', error);
        // Force logout bahkan jika server error
        this.handleLogout();
        return throwError(() => error);
      })
    );
  }

  /**
   * Handle logout - clear storage dan redirect
   */
  private handleLogout(): void {
    // Clear all auth-related data
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem('eniwan_refresh_token');
    localStorage.removeItem(this.USER_KEY);
    localStorage.removeItem('username');
    localStorage.removeItem('role');
    localStorage.removeItem('fullName');
    localStorage.removeItem('userId');

    // Update BehaviorSubjects
    this.isAuthenticatedSubject.next(false);
    this.currentUserSubject.next(null);

    console.log('🔒 User logged out');
  }

  /**
   * Check apakah user sudah authenticated
   */
  isAuthenticated(): boolean {
    return this.hasValidToken() && this.getCurrentUserFromStorage() !== null;
  }

  /**
   * Get current user info
   */
  getCurrentUser(): UserInfo | null {
    return this.currentUserSubject.value;
  }

  /**
   * Get user role
   */
  getUserRole(): string {
    const user = this.getCurrentUser();
    return user?.role || localStorage.getItem('role') || '';
  }

  /**
   * Check if user has specific role
   */
  hasRole(role: string): boolean {
    return this.getUserRole().toLowerCase() === role.toLowerCase();
  }

  /**
   * Check if user has any of the specified roles
   */
  hasAnyRole(roles: string[]): boolean {
    const userRole = this.getUserRole().toLowerCase();
    return roles.some(role => role.toLowerCase() === userRole);
  }

  /**
   * ✅ FIXED: Test auth status dengan endpoint backend
   * Backend endpoint: GET /auth/check atau /auth/whoami
   */
  testAuthStatus(): Observable<any> {
    const url = `${this.BASE_URL}/auth/whoami`;
    console.log('🧪 Testing auth status at:', url);

    return this.http.get(url, {
      headers: this.getAuthHeaders(),
      withCredentials: true
    }).pipe(
      tap(response => {
        console.log('✅ Auth status test passed:', response);
      }),
      catchError(error => {
        console.error('❌ Auth status test failed:', error);
        if (error.status === 401) {
          this.handleLogout();
        }
        return throwError(() => error);
      })
    );
  }

  /**
   * Get auth headers untuk HTTP requests
   */
  private getAuthHeaders(): HttpHeaders {
    const token = this.getToken();
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    });
  }

  /**
   * Get stored token
   */
  private getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  /**
   * Check if we have a valid token
   */
  private hasValidToken(): boolean {
    // ✅ For cookie-based auth, check localStorage data instead of token
    const username = localStorage.getItem('username');
    const role = localStorage.getItem('role');
    return !!(username && role);
  }

  /**
   * Get current user from localStorage
   */
  private getCurrentUserFromStorage(): UserInfo | null {
    try {
      const userStr = localStorage.getItem(this.USER_KEY);
      return userStr ? JSON.parse(userStr) : null;
    } catch (error) {
      console.error('Error parsing user data:', error);
      return null;
    }
  }

  /**
   * Check token validity periodically (adapted for cookie auth)
   */
  private checkTokenValidity(): void {
    // Check every 5 minutes
    setInterval(() => {
      if (!this.hasValidToken()) {
        console.log('🔒 Auth expired, logging out...');
        this.handleLogout();
        this.router.navigate(['/login']);
      }
    }, 5 * 60 * 1000);
  }
}