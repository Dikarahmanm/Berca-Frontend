import { Component } from '@angular/core';
import { AuthService, RegisterRequest } from '../../core/services/auth.service';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-register',
  templateUrl: './register.html',
  styleUrls: ['./register.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
})
export class RegisterComponent {
  // ✅ FIXED: Complete credentials object matching RegisterRequest interface
  credentials: RegisterRequest = {
    username: '',
    email: '',
    password: '',
    fullName: '',
    role: 'User' // Default role
  };
  
  errorMessage = '';
  successMessage = '';
  isLoading = false;

  constructor(private authService: AuthService, private router: Router) {}

  register() {
    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    // ✅ Validate required fields
    if (!this.credentials.username || !this.credentials.email || 
        !this.credentials.password || !this.credentials.fullName) {
      this.errorMessage = 'Semua field wajib diisi.';
      this.isLoading = false;
      return;
    }

    // ✅ Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.credentials.email)) {
      this.errorMessage = 'Format email tidak valid.';
      this.isLoading = false;
      return;
    }

    // ✅ Now credentials matches RegisterRequest interface perfectly
    this.authService.register(this.credentials).subscribe({
      next: (response) => {
        console.log('✅ Register successful:', response);
        this.successMessage = 'Registrasi berhasil. Mengalihkan ke halaman login...';
        this.errorMessage = '';
        this.isLoading = false;
        
        setTimeout(() => {
          this.router.navigate(['/login']);
        }, 2000);
      },
      error: (err: any) => {
        console.error('❌ Register error:', err);
        this.errorMessage = err?.message || 'Registrasi gagal. Username atau email mungkin sudah dipakai.';
        this.successMessage = '';
        this.isLoading = false;
      },
    });
  }
}