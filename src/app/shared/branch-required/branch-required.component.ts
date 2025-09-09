import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { StateService } from '../../core/services/state.service';

@Component({
  selector: 'app-branch-required',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './branch-required.component.html',
  styleUrls: ['./branch-required.component.scss']
})
export class BranchRequiredComponent implements OnInit {
  user!: typeof this.stateService.user;
  availableBranches!: typeof this.stateService.availableBranches;
  returnUrl = '/dashboard';

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private stateService: StateService
  ) {
    this.user = this.stateService.user;
    this.availableBranches = this.stateService.availableBranches;
  }

  ngOnInit() {
    // Get return URL from query params
    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/dashboard';
  }

  goToSelectBranch() {
    this.router.navigate(['/select-branch'], {
      queryParams: { returnUrl: this.returnUrl }
    });
  }

  goToDashboard() {
    this.router.navigate(['/dashboard']);
  }

  refreshPage() {
    window.location.reload();
  }
}