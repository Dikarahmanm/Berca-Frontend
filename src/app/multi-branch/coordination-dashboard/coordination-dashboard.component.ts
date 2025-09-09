import { Component, OnInit, OnDestroy, computed, effect, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MultiBranchCoordinationService } from '../../core/services/multi-branch-coordination.service';
import { StateService } from '../../core/services/state.service';
import { Branch } from '../../core/models/branch.models';
import { Subscription, interval } from 'rxjs';

@Component({
  selector: 'app-coordination-dashboard',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './coordination-dashboard.component.html',
  styleUrls: ['./coordination-dashboard.component.scss']
})
export class CoordinationDashboardComponent implements OnInit, OnDestroy {
  // Reactive signals from services
  coordinationHealth = computed(() => this.coordinationService.coordinationHealth());
  branchPerformances = computed(() => this.coordinationService.branchPerformances());
  optimizationOpportunities = computed(() => this.coordinationService.optimizationOpportunities());
  availableBranches = computed(() => this.stateService.availableBranches());
  currentUser = computed(() => this.stateService.user());

  // Component state
  isLoading = signal(false);
  refreshInterval?: Subscription;
  lastUpdated = new Date();

  // Computed values
  totalBranches = computed(() => this.availableBranches().length);
  
  activeBranches = computed(() => 
    this.availableBranches().filter(branch => branch.isActive).length
  );

  offlineBranches = computed(() =>
    this.availableBranches().filter(branch => 
      branch.coordinationStatus === 'offline'
    ).length
  );

  criticalAlerts = computed(() => {
    const health = this.coordinationHealth();
    return health?.criticalAlerts || 0;
  });

  systemStatus = computed(() => {
    const health = this.coordinationHealth();
    return health?.systemStatus || 'offline';
  });

  topPerformingBranches = computed(() =>
    this.branchPerformances()
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
  );

  todayRevenue = computed(() => {
    const performances = this.branchPerformances();
    return performances.reduce((total, performance) => {
      return total + (performance.revenue || 0);
    }, 0);
  });

  revenueGrowth = computed(() => {
    // Calculate average revenue growth from all branches
    const performances = this.branchPerformances();
    if (performances.length === 0) return 0;
    
    const avgGrowth = performances.reduce((sum, perf) => {
      return sum + (perf.trends?.revenueGrowth || 0);
    }, 0) / performances.length;
    
    return Math.round(avgGrowth * 100) / 100; // Round to 2 decimal places
  });

  constructor(
    private coordinationService: MultiBranchCoordinationService,
    private stateService: StateService,
    public router: Router
  ) {
    // Auto-refresh effect
    effect(() => {
      if (this.coordinationHealth()) {
        this.lastUpdated = new Date();
      }
    });
  }

  ngOnInit() {
    console.log('Coordination Dashboard Component initialized');
    
    // Force refresh all data
    this.coordinationService.refreshAllData();
    
    this.loadDashboardData();
    this.startAutoRefresh();
  }

  ngOnDestroy() {
    this.stopAutoRefresh();
  }

  private loadDashboardData() {
    this.isLoading.set(true);
    console.log('Loading dashboard data...');
    
    // Load all dashboard data
    Promise.all([
      this.coordinationService.getCoordinationHealth().toPromise(),
      this.coordinationService.getBranchPerformances().toPromise(),
      this.coordinationService.getOptimizationOpportunities().toPromise()
    ]).then(([healthResponse, performanceResponse, optimizationResponse]) => {
      console.log('Dashboard data loaded:', {
        health: healthResponse,
        performance: performanceResponse,
        optimization: optimizationResponse
      });
    }).catch(error => {
      console.error('Error loading dashboard data:', error);
    }).finally(() => {
      this.isLoading.set(false);
    });
  }

  private startAutoRefresh() {
    // Refresh every 30 seconds
    this.refreshInterval = interval(30000).subscribe(() => {
      this.loadDashboardData();
    });
  }

  private stopAutoRefresh() {
    if (this.refreshInterval) {
      this.refreshInterval.unsubscribe();
    }
  }

  // Navigation methods
  navigateToTransfers() {
    this.router.navigate(['/coordination/transfers']);
  }

  navigateToPerformance() {
    this.router.navigate(['/coordination/performance']);
  }

  navigateToBranch(branchId: number) {
    this.router.navigate(['/branches/view', branchId]);
  }

  // Action methods
  refreshDashboard() {
    this.loadDashboardData();
  }

  executeOptimization(opportunityId: string) {
    this.coordinationService.executeOptimization(opportunityId).subscribe({
      next: (result) => {
        console.log('Optimization executed:', result);
        this.loadDashboardData(); // Refresh data
      },
      error: (error) => {
        console.error('Optimization failed:', error);
      }
    });
  }

  // Utility methods
  getStatusClass(status: string): string {
    const statusMap: Record<string, string> = {
      optimal: 'status-optimal',
      good: 'status-good', 
      warning: 'status-warning',
      critical: 'status-critical',
      offline: 'status-offline'
    };
    return statusMap[status] || 'status-unknown';
  }

  getHealthScoreClass(score: number): string {
    if (score >= 90) return 'health-excellent';
    if (score >= 75) return 'health-good';
    if (score >= 60) return 'health-fair';
    if (score >= 40) return 'health-poor';
    return 'health-critical';
  }

  formatLastUpdated(): string {
    const now = new Date();
    const diff = now.getTime() - this.lastUpdated.getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes === 0) return 'Just now';
    if (minutes === 1) return '1 minute ago';
    return `${minutes} minutes ago`;
  }

  getBranchStatusIcon(branch: Branch): string {
    const statusIconMap: Record<string, string> = {
      optimal: 'icon-check-circle',
      warning: 'icon-alert-triangle',
      error: 'icon-x-circle',
      offline: 'icon-wifi-off'
    };
    return statusIconMap[branch.coordinationStatus || 'offline'] || 'icon-help-circle';
  }
}