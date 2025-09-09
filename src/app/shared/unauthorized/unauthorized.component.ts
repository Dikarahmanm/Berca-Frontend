import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { StateService } from '../../core/services/state.service';

@Component({
  selector: 'app-unauthorized',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './unauthorized.component.html',
  styleUrls: ['./unauthorized.component.scss']
})
export class UnauthorizedComponent {
  user!: typeof this.stateService.user;
  selectedBranch!: typeof this.stateService.selectedBranch;

  constructor(
    private router: Router,
    private authService: AuthService,
    private stateService: StateService
  ) {
    this.user = this.stateService.user;
    this.selectedBranch = this.stateService.selectedBranch;
  }

  goBack() {
    window.history.back();
  }

  goToDashboard() {
    this.router.navigate(['/dashboard']);
  }

  goToSelectBranch() {
    this.router.navigate(['/select-branch']);
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  contactAdmin() {
    // This could open a modal, send email, or navigate to support
    console.log('Contact admin functionality');
  }
}