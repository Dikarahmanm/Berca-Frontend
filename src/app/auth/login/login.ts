import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { RouterModule } from '@angular/router';
import { ActivatedRoute } from '@angular/router';


@Component({
  selector: 'app-login',
  templateUrl: './login.html',
  styleUrls: ['./login.scss'],
  standalone: true,
  imports: [FormsModule, CommonModule,RouterModule],
})
export class LoginComponent {
  credentials = { username: '', password: '' };
  errorMessage: string = '';
  isLoading: boolean = false;

  constructor(
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.route.queryParams.subscribe(params => {
      if (params['sessionExpired']) {
        this.errorMessage = 'Anda perlu login terlebih dahulu.';
      }
    });
  }
  

  login() {
    this.isLoading = true;
    this.authService.login(this.credentials).subscribe({
      next: (response: any) => {
        this.errorMessage = '';
        this.isLoading = false;
  
        // Simpan username di localStorage
        localStorage.setItem('username', response.user); // pastikan backend mengirim field `user`
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.errorMessage = 'Invalid username or password.';
        this.isLoading = false;
      }
    });
  }
  
  showComingSoon() {
    alert('Feature coming soon!');
  }
  
  
  
  
}
