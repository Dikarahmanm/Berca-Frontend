import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { RouterModule } from '@angular/router';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
  standalone: true,
  imports: [FormsModule, CommonModule, RouterModule],
})
export class LoginComponent {
  credentials = { username: '', password: '' };
  errorMessage: string = '';
  isLoading: boolean = false;

  // ✅ NEW: Enhanced error types
  errorType: 'general' | 'inactive' | 'deleted' | 'credentials' | 'session' = 'general';

  constructor(
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.route.queryParams.subscribe(params => {
      if (params['sessionExpired']) {
        this.showError('Your session has expired. Please login again.', 'session');
      }
      if (params['accountInactive']) {
        this.showError('Your account is inactive. Please contact administrator.', 'inactive');
      }
      if (params['accountDeleted']) {
        this.showError('Your account has been deleted. Please contact administrator.', 'deleted');
      }
    });
  }

  login() {
    if (!this.validateInput()) {
      return;
    }

    this.isLoading = true;
    this.clearError();

    console.log('🔐 Attempting login for:', this.credentials.username);

    this.authService.login(this.credentials).subscribe({
      next: (response: any) => {
        console.log('✅ Login successful:', response);
        
        this.clearError();
        this.isLoading = false;

        // Auth service now handles localStorage storage and navigation
        console.log('� Login component: Auth service will handle navigation');
      },
      error: (err: any) => {
        console.error('❌ Login error:', err);
        this.isLoading = false;
        
        this.handleLoginError(err);
      }
    });
  }

  // ✅ NEW: Enhanced error handling
  private handleLoginError(error: any): void {
    console.log('🔍 Processing login error:', error);

    // Extract error details
    const errorBody = error.error || {};
    const errorCode = errorBody.errorCode || '';
    const errorMessage = errorBody.message || '';
    
    console.log('Error details:', {
      status: error.status,
      errorCode: errorCode,
      message: errorMessage
    });

    switch (errorCode) {
      case 'ACCOUNT_DELETED':
        this.showError(
          'Your account has been deleted. Please contact the system administrator to restore your account.',
          'deleted'
        );
        break;
        
      case 'ACCOUNT_INACTIVE':
        this.showError(
          'Your account is currently inactive. Please contact the administrator to activate your account.',
          'inactive'
        );
        break;
        
      case 'INVALID_CREDENTIALS':
        this.showError(
          'Invalid username or password. Please check your credentials and try again.',
          'credentials'
        );
        break;
        
      case 'INVALID_INPUT':
        this.showError(
          'Please enter both username and password.',
          'general'
        );
        break;
        
      default:
        // Handle HTTP status codes
        if (error.status === 401) {
          this.showError(
            errorMessage || 'Invalid username or password.',
            'credentials'
          );
        } else if (error.status === 403) {
          this.showError(
            'Access denied. Your account may be restricted.',
            'general'
          );
        } else if (error.status === 0) {
          this.showError(
            'Cannot connect to server. Please check your internet connection.',
            'general'
          );
        } else {
          this.showError(
            errorMessage || 'An unexpected error occurred. Please try again.',
            'general'
          );
        }
        break;
    }
  }

  // ✅ NEW: Show error with type
  private showError(message: string, type: 'general' | 'inactive' | 'deleted' | 'credentials' | 'session' = 'general'): void {
    this.errorMessage = message;
    this.errorType = type;
    console.log(`🚨 Showing ${type} error:`, message);
  }

  // ✅ NEW: Clear error
  private clearError(): void {
    this.errorMessage = '';
    this.errorType = 'general';
  }

  // ✅ NEW: Input validation
  private validateInput(): boolean {
    if (!this.credentials.username.trim()) {
      this.showError('Please enter your username.', 'general');
      return false;
    }

    if (!this.credentials.password.trim()) {
      this.showError('Please enter your password.', 'general');
      return false;
    }

    if (this.credentials.username.length < 3) {
      this.showError('Username must be at least 3 characters long.', 'general');
      return false;
    }

    return true;
  }

  // ✅ NEW: Get error CSS class
  getErrorClass(): string {
    switch (this.errorType) {
      case 'deleted':
        return 'error-deleted';
      case 'inactive':
        return 'error-inactive';
      case 'credentials':
        return 'error-credentials';
      case 'session':
        return 'error-session';
      default:
        return 'error-general';
    }
  }

  // ✅ NEW: Get error icon
  getErrorIcon(): string {
    switch (this.errorType) {
      case 'deleted':
        return '🗑️';
      case 'inactive':
        return '🚫';
      case 'credentials':
        return '🔐';
      case 'session':
        return '⏰';
      default:
        return '⚠️';
    }
  }

  // ✅ NEW: Show contact admin button for account issues
  shouldShowContactAdmin(): boolean {
    return this.errorType === 'deleted' || this.errorType === 'inactive';
  }

  // ✅ NEW: Contact admin action
  contactAdmin(): void {
    // This could open a modal, send an email, or redirect to a contact page
    alert('Please contact your system administrator at admin@company.com or call +1-234-567-8900');
  }

  showComingSoon() {
    alert('Feature coming soon!');
  }

  // ✅ NEW: Clear error when user starts typing
  onInputChange(): void {
    if (this.errorMessage) {
      this.clearError();
    }
  }
}