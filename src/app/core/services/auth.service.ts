import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, tap, catchError, throwError, map } from 'rxjs';

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

@Injectable({ providedIn: 'root' })
export class AuthService {
  // ✅ DIRECT URLS TO BACKEND
  private baseUrl = 'http://localhost:5171';
  
  private isLoggedInSubject = new BehaviorSubject<boolean>(false);
  public isLoggedIn$ = this.isLoggedInSubject.asObservable();

  constructor(private http: HttpClient) {
    console.log('🔧 AuthService initialized with DIRECT URL:', this.baseUrl);
    this.checkAuthStatus();
  }

  login(data: LoginRequest): Observable<LoginResponse> {
    const url = `${this.baseUrl}/auth/login`;
    console.log('🔐 === LOGIN ATTEMPT (DIRECT) ===');
    console.log('URL:', url);
    console.log('Username:', data.username);
    console.log('🍪 Cookies BEFORE login:', document.cookie);
    
    return this.http.post<LoginResponse>(url, data, { 
      withCredentials: true,
      observe: 'response'
    }).pipe(
      tap((response: any) => {
        console.log('✅ === LOGIN SUCCESS (DIRECT) ===');
        console.log('Status:', response.status);
        console.log('Response body:', response.body);
        
        // Check cookies after login
        setTimeout(() => {
          console.log('🍪 Cookies AFTER login:', document.cookie);
          this.debugCookies();
          
          if (response.body?.success) {
            localStorage.setItem('username', response.body.user);
            localStorage.setItem('role', response.body.role);
            this.isLoggedInSubject.next(true);
            console.log('💾 User data stored in localStorage');
          }
        }, 100);
      }),
      map((response: any) => response.body!),
      catchError(this.handleError.bind(this))
    );
  }

  register(data: RegisterRequest): Observable<RegisterResponse> {
    const url = `${this.baseUrl}/auth/register`;
    console.log('📝 === REGISTER ATTEMPT (DIRECT) ===');
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
        this.isLoggedInSubject.next(false);
        console.log('✅ Logged out and cleared localStorage');
      }),
      catchError(this.handleError.bind(this))
    );
  }

  testAuthStatus(): Observable<any> {
    const url = `${this.baseUrl}/auth/debug-auth`;
    console.log('🧪 === TESTING AUTH STATUS (DIRECT) ===');
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
    if (username) {
      console.log('🔍 Found username in localStorage, testing auth...');
      this.testAuthStatus().subscribe({
        next: () => this.isLoggedInSubject.next(true),
        error: () => this.isLoggedInSubject.next(false)
      });
    }
  }

  private handleError(error: HttpErrorResponse) {
    console.error('❌ === AUTH ERROR (DIRECT) ===');
    console.error('Status:', error.status);
    console.error('Message:', error.message);
    console.error('Error body:', error.error);
    return throwError(() => error);
  }

  isAuthenticated(): boolean {
    return this.isLoggedInSubject.value;
  }
}