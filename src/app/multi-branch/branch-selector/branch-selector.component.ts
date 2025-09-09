import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { StateService } from '../../core/services/state.service';
import { MultiBranchCoordinationService } from '../../core/services/multi-branch-coordination.service';
import { Branch } from '../../core/models/branch.models';

@Component({
  selector: 'app-branch-selector',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './branch-selector.component.html',
  styleUrls: ['./branch-selector.component.scss']
})
export class BranchSelectorComponent implements OnInit {
  availableBranches!: typeof this.stateService.availableBranches;
  isLoading = false;
  returnUrl = '/dashboard';

  constructor(
    private stateService: StateService,
    private coordinationService: MultiBranchCoordinationService,
    public router: Router,
    private route: ActivatedRoute
  ) {
    this.availableBranches = this.stateService.availableBranches;
  }

  ngOnInit() {
    // Get return URL from query params
    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/dashboard';
    
    // Load available branches if not already loaded
    this.loadBranches();
  }

  private loadBranches() {
    this.isLoading = true;
    this.coordinationService.getBranchPerformances().subscribe({
      next: () => {
        this.isLoading = false;
      },
      error: (error: any) => {
        console.error('Failed to load branches:', error);
        this.isLoading = false;
      }
    });
  }

  selectBranch(branch: Branch) {
    this.stateService.selectBranch(branch.id);
    this.stateService.setBranchRequired(false);
    
    // Navigate to return URL
    this.router.navigate([this.returnUrl]);
  }

  getBranchStatusClass(branch: Branch): string {
    const status = branch.coordinationStatus || 'offline';
    return `status-${status}`;
  }

  getBranchStatusText(branch: Branch): string {
    const status = branch.coordinationStatus || 'offline';
    const statusMap: Record<string, string> = {
      optimal: 'Optimal',
      warning: 'Warning',
      error: 'Error',
      offline: 'Offline'
    };
    return statusMap[status] || 'Unknown';
  }

  getHealthScoreClass(healthScore: number | undefined): string {
    if (!healthScore) return 'health-unknown';
    if (healthScore >= 80) return 'health-excellent';
    if (healthScore >= 60) return 'health-good';
    if (healthScore >= 40) return 'health-fair';
    return 'health-poor';
  }
}