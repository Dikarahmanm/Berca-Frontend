import { Component, OnInit, OnDestroy, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MultiBranchCoordinationService } from '../../../core/services/multi-branch-coordination.service';
import { StateService } from '../../../core/services/state.service';
import { Branch } from '../../../core/models/branch.models';
import { Subscription, interval } from 'rxjs';

// Admin Dashboard Interfaces
export interface SystemHealth {
  overallStatus: 'excellent' | 'good' | 'warning' | 'critical';
  uptime: string;
  totalUsers: number;
  activeUsers: number;
  totalTransactions: number;
  systemLoad: number;
  memoryUsage: number;
  diskUsage: number;
  networkLatency: number;
  lastBackup: string;
  criticalAlerts: number;
  warningAlerts: number;
  infoAlerts: number;
}

export interface BranchSummary {
  totalBranches: number;
  activeBranches: number;
  offlineBranches: number;
  pendingApprovals: number;
  totalRevenue: number;
  avgPerformance: number;
  newBranchesThisMonth: number;
  branchesNeedingAttention: Branch[];
}

export interface UserManagementSummary {
  totalUsers: number;
  activeUsers: number;
  newUsersToday: number;
  pendingActivations: number;
  blockedUsers: number;
  roleDistribution: { [role: string]: number };
  recentActivity: UserActivity[];
}

export interface UserActivity {
  id: number;
  userId: number;
  username: string;
  action: string;
  branchName: string;
  timestamp: string;
  severity: 'info' | 'warning' | 'error';
}

export interface SystemConfiguration {
  maintenanceMode: boolean;
  autoBackupEnabled: boolean;
  backupFrequency: string;
  sessionTimeout: number;
  maxLoginAttempts: number;
  enableNotifications: boolean;
  enableAuditLog: boolean;
  dataRetentionDays: number;
}

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.scss']
})
export class AdminDashboardComponent implements OnInit, OnDestroy {
  // Service dependencies - will be initialized in constructor
  coordinationHealth: any;
  availableBranches: any;
  currentUser: any;

  // Component state signals
  private readonly _isLoading = signal<boolean>(false);
  private readonly _systemHealth = signal<SystemHealth | null>(null);
  private readonly _branchSummary = signal<BranchSummary | null>(null);
  private readonly _userSummary = signal<UserManagementSummary | null>(null);
  private readonly _systemConfig = signal<SystemConfiguration | null>(null);
  private readonly _selectedTimeframe = signal<'24h' | '7d' | '30d'>('24h');

  // Component state getters
  isLoading = this._isLoading.asReadonly();
  systemHealth = this._systemHealth.asReadonly();
  branchSummary = this._branchSummary.asReadonly();
  userSummary = this._userSummary.asReadonly();
  systemConfig = this._systemConfig.asReadonly();
  selectedTimeframe = this._selectedTimeframe.asReadonly();

  // Computed analytics
  systemStatus = computed(() => {
    const health = this._systemHealth();
    if (!health) return 'loading';
    
    if (health.criticalAlerts > 0) return 'critical';
    if (health.warningAlerts > 5) return 'warning';
    if (health.systemLoad > 80 || health.memoryUsage > 85) return 'warning';
    return health.overallStatus;
  });

  alertsSummary = computed(() => {
    const health = this._systemHealth();
    if (!health) return null;

    return {
      total: health.criticalAlerts + health.warningAlerts + health.infoAlerts,
      critical: health.criticalAlerts,
      warning: health.warningAlerts,
      info: health.infoAlerts
    };
  });

  quickStats = computed(() => {
    const health = this._systemHealth();
    const branches = this._branchSummary();
    const users = this._userSummary();

    if (!health || !branches || !users) return null;

    return {
      totalRevenue: branches.totalRevenue,
      activeUsers: users.activeUsers,
      activeBranches: branches.activeBranches,
      systemUptime: health.uptime,
      todayTransactions: health.totalTransactions,
      avgPerformance: branches.avgPerformance
    };
  });

  // Auto-refresh and subscriptions
  private refreshInterval?: Subscription;
  private subscriptions = new Subscription();

  constructor(
    private coordinationService: MultiBranchCoordinationService,
    private stateService: StateService,
    private router: Router
  ) {
    // Initialize service dependencies
    this.coordinationHealth = this.coordinationService.coordinationHealth;
    this.availableBranches = this.stateService.availableBranches;
    this.currentUser = this.stateService.user;

    // Auto-refresh effect when timeframe changes
    effect(() => {
      const timeframe = this._selectedTimeframe();
      this.loadDashboardData();
    });
  }

  ngOnInit() {
    this.loadDashboardData();
    this.startAutoRefresh();
  }

  ngOnDestroy() {
    this.stopAutoRefresh();
    this.subscriptions.unsubscribe();
  }

  // Data loading methods
  private loadDashboardData() {
    this._isLoading.set(true);
    
    // Load all admin dashboard data
    Promise.all([
      this.loadSystemHealth(),
      this.loadBranchSummary(),
      this.loadUserSummary(),
      this.loadSystemConfiguration()
    ]).finally(() => {
      this._isLoading.set(false);
    });
  }

  private async loadSystemHealth() {
    // Mock system health data - replace with actual service calls
    setTimeout(() => {
      const mockHealth: SystemHealth = {
        overallStatus: 'good',
        uptime: '15 days, 4 hours',
        totalUsers: 127,
        activeUsers: 45,
        totalTransactions: 2847,
        systemLoad: 65,
        memoryUsage: 72,
        diskUsage: 45,
        networkLatency: 12,
        lastBackup: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(), // 6 hours ago
        criticalAlerts: 0,
        warningAlerts: 3,
        infoAlerts: 8
      };
      
      this._systemHealth.set(mockHealth);
    }, 500);
  }

  private async loadBranchSummary() {
    const branches = this.availableBranches();
    
    // Mock branch summary data
    setTimeout(() => {
      const mockSummary: BranchSummary = {
        totalBranches: branches.length,
        activeBranches: branches.filter((b: Branch) => b.isActive).length,
        offlineBranches: branches.filter((b: Branch) => !b.isActive || b.coordinationStatus === 'offline').length,
        pendingApprovals: 7,
        totalRevenue: 2847500000, // IDR
        avgPerformance: 78.5,
        newBranchesThisMonth: 2,
        branchesNeedingAttention: branches.slice(-2) // Last 2 branches as needing attention
      };
      
      this._branchSummary.set(mockSummary);
    }, 600);
  }

  private async loadUserSummary() {
    // Mock user management data
    setTimeout(() => {
      const mockUserSummary: UserManagementSummary = {
        totalUsers: 127,
        activeUsers: 45,
        newUsersToday: 3,
        pendingActivations: 5,
        blockedUsers: 2,
        roleDistribution: {
          'Admin': 5,
          'HeadManager': 3,
          'BranchManager': 12,
          'Manager': 28,
          'User': 65,
          'Cashier': 14
        },
        recentActivity: [
          {
            id: 1,
            userId: 23,
            username: 'sarah.manager',
            action: 'Created new transfer request',
            branchName: 'Branch Surabaya',
            timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
            severity: 'info'
          },
          {
            id: 2,
            userId: 45,
            username: 'john.admin',
            action: 'Updated system configuration',
            branchName: 'Head Office',
            timestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
            severity: 'warning'
          },
          {
            id: 3,
            userId: 67,
            username: 'mike.cashier',
            action: 'Failed login attempt',
            branchName: 'Branch Malang',
            timestamp: new Date(Date.now() - 75 * 60 * 1000).toISOString(),
            severity: 'error'
          }
        ]
      };
      
      this._userSummary.set(mockUserSummary);
    }, 700);
  }

  private async loadSystemConfiguration() {
    // Mock system configuration
    setTimeout(() => {
      const mockConfig: SystemConfiguration = {
        maintenanceMode: false,
        autoBackupEnabled: true,
        backupFrequency: 'daily',
        sessionTimeout: 30,
        maxLoginAttempts: 5,
        enableNotifications: true,
        enableAuditLog: true,
        dataRetentionDays: 365
      };
      
      this._systemConfig.set(mockConfig);
    }, 400);
  }

  private startAutoRefresh() {
    // Refresh every 2 minutes
    this.refreshInterval = interval(120000).subscribe(() => {
      this.loadDashboardData();
    });
  }

  private stopAutoRefresh() {
    if (this.refreshInterval) {
      this.refreshInterval.unsubscribe();
    }
  }

  // Action methods
  setTimeframe(timeframe: '24h' | '7d' | '30d') {
    this._selectedTimeframe.set(timeframe);
  }

  refreshDashboard() {
    this.loadDashboardData();
  }

  // Navigation methods
  navigateToUserManagement() {
    this.router.navigate(['/dashboard/users']);
  }

  navigateToBranchManagement() {
    this.router.navigate(['/dashboard/branches']);
  }

  navigateToSystemLogs() {
    this.router.navigate(['/dashboard/logs']);
  }

  navigateToAnalytics() {
    this.router.navigate(['/dashboard/multi-branch-analytics']);
  }

  navigateToCoordination() {
    this.router.navigate(['/dashboard/coordination']);
  }

  viewBranchDetails(branchId: number) {
    this.router.navigate(['/dashboard/branches'], { queryParams: { id: branchId } });
  }

  // System management actions
  async toggleMaintenanceMode() {
    const config = this._systemConfig();
    if (!config) return;

    const updatedConfig = {
      ...config,
      maintenanceMode: !config.maintenanceMode
    };

    this._systemConfig.set(updatedConfig);
    
    // Show confirmation
    alert(`Maintenance mode ${updatedConfig.maintenanceMode ? 'enabled' : 'disabled'}`);
  }

  async runSystemBackup() {
    // Mock system backup
    const confirmed = confirm('Are you sure you want to run a manual system backup?');
    if (!confirmed) return;

    alert('System backup initiated. You will receive a notification when complete.');
  }

  async clearSystemCache() {
    const confirmed = confirm('Are you sure you want to clear the system cache? This may temporarily slow down the system.');
    if (!confirmed) return;

    alert('System cache cleared successfully.');
  }

  async restartSystem() {
    const confirmed = confirm('Are you sure you want to restart the system? All users will be logged out.');
    if (!confirmed) return;

    alert('System restart scheduled. All users will be notified.');
  }

  // Utility methods
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  }

  formatPercentage(value: number): string {
    return `${value.toFixed(1)}%`;
  }

  formatTimeAgo(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / 60000);
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes} minutes ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)} hours ago`;
    return `${Math.floor(diffInMinutes / 1440)} days ago`;
  }

  getStatusClass(status: string): string {
    const statusMap: Record<string, string> = {
      excellent: 'status-excellent',
      good: 'status-good',
      warning: 'status-warning',
      critical: 'status-critical',
      loading: 'status-loading'
    };
    return statusMap[status] || 'status-unknown';
  }

  getSeverityClass(severity: string): string {
    const severityMap: Record<string, string> = {
      info: 'severity-info',
      warning: 'severity-warning',
      error: 'severity-error'
    };
    return severityMap[severity] || 'severity-info';
  }

  getSystemLoadClass(load: number): string {
    if (load >= 90) return 'load-critical';
    if (load >= 70) return 'load-high';
    if (load >= 50) return 'load-medium';
    return 'load-low';
  }

  trackByActivityId(index: number, activity: UserActivity): number {
    return activity.id;
  }

  trackByRole(index: number, item: any): string {
    return item.key;
  }
}