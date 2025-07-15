import { Component } from '@angular/core';
import { AuthService } from '../../core/services/auth.service';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-register',
  templateUrl: './register.html',
  styleUrls: ['./register.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule,RouterModule],
})
export class RegisterComponent {
  credentials = { username: '', password: '' };
  errorMessage = '';
  successMessage = '';

  constructor(private authService: AuthService, private router: Router) {}

  isLoading = false;

register() {
  this.isLoading = true;
  this.authService.register(this.credentials).subscribe({
    next: () => {
      this.successMessage = 'Registrasi berhasil. Mengalihkan ke halaman login...';
      this.errorMessage = '';
      this.isLoading = false;
      setTimeout(() => {
        this.router.navigate(['/login']);
      }, 2000);
    },
    error: (err) => {
      console.error('Register error', err);
      this.errorMessage = 'Registrasi gagal. Username mungkin sudah dipakai.';
      this.successMessage = '';
      this.isLoading = false;
    },
  });
}

  
}
