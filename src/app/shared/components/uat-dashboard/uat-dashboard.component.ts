// src/app/shared/components/uat-dashboard/uat-dashboard.component.ts
// UAT Dashboard for Toko Eniwan - Real-time testing status and business readiness

import { Component, signal, computed, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

import { 
  TOKO_ENIWAN_UAT_SCENARIOS, 
  TokoEniwanUATRunner, 
  UATReport,
  UATExecutionResult 
} from '../../../core/testing/toko-eniwan-uat.scenarios';
import { StateService } from '../../../core/services/state.service';

interface BusinessReadinessMetric {
  category: string;
  score: number;
  status: 'excellent' | 'good' | 'needs-improvement' | 'critical';
  description: string;
  impact: string;
}

@Component({
  selector: 'app-uat-dashboard',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="uat-dashboard-container">
      <!-- Dashboard Header -->
      <div class="dashboard-header mb-8">
        <div class="flex justify-between items-center">
          <div>
            <h1 class="text-3xl font-bold text-gray-900">UAT Dashboard</h1>
            <p class="text-gray-600 mt-2">Toko Eniwan Multi-Branch System Readiness</p>
          </div>
          
          <div class="flex gap-3">
            <button class="btn btn-outline" (click)="refreshData()">
              <span class="mr-2">🔄</span>
              Refresh
            </button>
            <button class="btn btn-primary" (click)="startQuickValidation()">
              <span class="mr-2">⚡</span>
              Quick Validation
            </button>
          </div>
        </div>
        
        <!-- Last Updated Info -->
        <div class="text-sm text-gray-500 mt-3" *ngIf="lastUpdated()">
          Last updated: {{ formatDateTime(lastUpdated()!) }}
        </div>
      </div>

      <!-- System Readiness Overview -->
      <div class="readiness-overview mb-8">
        <div class="grid grid-3 gap-6">
          <!-- Overall Readiness -->
          <div class="readiness-card card">
            <div class="flex items-center gap-4">
              <div class="readiness-icon" 
                   [class.ready]="overallReadiness() === 'ready'"
                   [class.partial]="overallReadiness() === 'partial'"
                   [class.not-ready]="overallReadiness() === 'not-ready'">
                <span *ngIf="overallReadiness() === 'ready'">✅</span>
                <span *ngIf="overallReadiness() === 'partial'">⚠️</span>
                <span *ngIf="overallReadiness() === 'not-ready'">❌</span>
              </div>
              
              <div>
                <h3 class="font-semibold text-lg">Overall Readiness</h3>
                <p class="text-sm text-gray-600 mt-1">
                  <span *ngIf="overallReadiness() === 'ready'" class="text-green-600">
                    Production Ready
                  </span>
                  <span *ngIf="overallReadiness() === 'partial'" class="text-orange-600">
                    Needs Minor Fixes
                  </span>
                  <span *ngIf="overallReadiness() === 'not-ready'" class="text-red-600">
                    Not Production Ready
                  </span>
                </p>
              </div>
            </div>
          </div>

          <!-- Success Rate -->
          <div class="success-rate-card card">
            <div class="text-center">
              <div class="text-4xl font-bold mb-2" 
                   [class.text-green-600]="successRate() >= 90"
                   [class.text-orange-600]="successRate() >= 70 && successRate() < 90"
                   [class.text-red-600]="successRate() < 70">
                {{ successRate() }}%
              </div>
              <h3 class="font-semibold">Success Rate</h3>
              <p class="text-sm text-gray-600 mt-1">
                {{ passedTests() }} of {{ totalTests() }} scenarios passed
              </p>
            </div>
          </div>

          <!-- Critical Issues -->
          <div class="issues-card card">
            <div class="text-center">
              <div class="text-4xl font-bold mb-2" 
                   [class.text-green-600]="criticalIssueCount() === 0"
                   [class.text-red-600]="criticalIssueCount() > 0">
                {{ criticalIssueCount() }}
              </div>
              <h3 class="font-semibold">Critical Issues</h3>
              <p class="text-sm text-gray-600 mt-1">
                {{ criticalIssueCount() === 0 ? 'No critical issues found' : 'Require immediate attention' }}
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- Business Readiness Metrics -->
      <div class="card mb-8">
        <h3 class="font-semibold text-lg mb-4">Business Readiness Metrics</h3>
        
        <div class="space-y-4">
          <div *ngFor="let metric of businessMetrics()" class="metric-row">
            <div class="flex justify-between items-center">
              <div class="flex-1">
                <div class="font-medium">{{ metric.category }}</div>
                <div class="text-sm text-gray-600">{{ metric.description }}</div>
              </div>
              
              <div class="flex items-center gap-4">
                <div class="metric-score">
                  <div class="text-right">
                    <div class="font-bold" 
                         [class.text-green-600]="metric.status === 'excellent'"
                         [class.text-blue-600]="metric.status === 'good'"
                         [class.text-orange-600]="metric.status === 'needs-improvement'"
                         [class.text-red-600]="metric.status === 'critical'">
                      {{ metric.score }}/100
                    </div>
                    <div class="text-xs text-gray-500">{{ metric.status | titlecase }}</div>
                  </div>
                </div>
                
                <div class="metric-bar">
                  <div class="metric-progress" 
                       [style.width.%]="metric.score"
                       [class.progress-excellent]="metric.status === 'excellent'"
                       [class.progress-good]="metric.status === 'good'"
                       [class.progress-needs-improvement]="metric.status === 'needs-improvement'"
                       [class.progress-critical]="metric.status === 'critical'">
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Recent Test Executions -->
      <div class="card mb-8">
        <div class="flex justify-between items-center mb-4">
          <h3 class="font-semibold text-lg">Recent Test Executions</h3>
          <button class="btn btn-outline btn-sm" (click)="viewAllResults()">
            View All Results
          </button>
        </div>
        
        <div class="space-y-3">
          <div *ngFor="let result of recentResults(); trackBy: trackByResult" 
               class="recent-execution-card">
            <div class="flex justify-between items-center">
              <div class="flex items-center gap-3">
                <div class="execution-status" 
                     [class.status-passed]="result.overallResult === 'passed'"
                     [class.status-failed]="result.overallResult === 'failed'"
                     [class.status-partial]="result.overallResult === 'partial'">
                  <span *ngIf="result.overallResult === 'passed'">✅</span>
                  <span *ngIf="result.overallResult === 'failed'">❌</span>
                  <span *ngIf="result.overallResult === 'partial'">⚠️</span>
                </div>
                
                <div>
                  <div class="font-medium">{{ getScenarioTitle(result.scenarioId) }}</div>
                  <div class="text-sm text-gray-600">
                    Executed by {{ result.executedBy }} • {{ formatDateTime(result.executedAt) }}
                  </div>
                </div>
              </div>
              
              <div class="text-right">
                <div class="text-sm font-medium">
                  {{ getStepSuccessRate(result) }}% success rate
                </div>
                <div class="text-xs text-gray-600">
                  {{ getPassedStepsCount(result) }}/{{ result.stepResults.length }} steps
                </div>
              </div>
            </div>
          </div>
          
          <div *ngIf="recentResults().length === 0" class="text-center py-8 text-gray-500">
            No test executions yet. Run your first scenario to get started.
          </div>
        </div>
      </div>

      <!-- Quick Actions -->
      <div class="card">
        <h3 class="font-semibold text-lg mb-4">Quick Actions</h3>
        
        <div class="grid grid-2 gap-4">
          <button class="action-card" (click)="runCriticalWorkflows()">
            <div class="action-icon">🚀</div>
            <div class="action-content">
              <div class="font-medium">Run Critical Workflows</div>
              <div class="text-sm text-gray-600">Test essential business operations</div>
            </div>
          </button>
          
          <button class="action-card" (click)="validateMobileExperience()">
            <div class="action-icon">📱</div>
            <div class="action-content">
              <div class="font-medium">Validate Mobile Experience</div>
              <div class="text-sm text-gray-600">Test mobile responsiveness and touch interactions</div>
            </div>
          </button>
          
          <button class="action-card" (click)="testBranchOperations()">
            <div class="action-icon">🏢</div>
            <div class="action-content">
              <div class="font-medium">Test Branch Operations</div>
              <div class="text-sm text-gray-600">Validate multi-branch workflows and data sync</div>
            </div>
          </button>
          
          <button class="action-card" (click)="generateComprehensiveReport()">
            <div class="action-icon">📊</div>
            <div class="action-content">
              <div class="font-medium">Generate Report</div>
              <div class="text-sm text-gray-600">Export comprehensive UAT results for stakeholders</div>
            </div>
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .uat-dashboard-container {
      padding: var(--s6);
      max-width: 1400px;
      margin: 0 auto;
      min-height: 100vh;
      background: var(--bg);
    }

    .readiness-card, .success-rate-card, .issues-card {
      text-align: center;
      min-height: 120px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .readiness-icon {
      width: 60px;
      height: 60px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
      
      &.ready {
        background: rgba(34, 197, 94, 0.1);
        border: 2px solid var(--success);
      }
      
      &.partial {
        background: rgba(245, 158, 11, 0.1);
        border: 2px solid var(--warning);
      }
      
      &.not-ready {
        background: rgba(239, 68, 68, 0.1);
        border: 2px solid var(--error);
      }
    }

    .metric-row {
      padding: var(--s3);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      background: var(--surface);
    }

    .metric-bar {
      width: 120px;
      height: 8px;
      background: var(--border);
      border-radius: var(--radius-xl);
      overflow: hidden;
      
      .metric-progress {
        height: 100%;
        transition: width 0.3s ease;
        
        &.progress-excellent {
          background: var(--success);
        }
        
        &.progress-good {
          background: var(--info);
        }
        
        &.progress-needs-improvement {
          background: var(--warning);
        }
        
        &.progress-critical {
          background: var(--error);
        }
      }
    }

    .recent-execution-card {
      padding: var(--s3);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      background: var(--surface);
      transition: var(--transition);
      
      &:hover {
        border-color: var(--primary);
      }
    }

    .execution-status {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      
      &.status-passed {
        background: rgba(34, 197, 94, 0.1);
      }
      
      &.status-failed {
        background: rgba(239, 68, 68, 0.1);
      }
      
      &.status-partial {
        background: rgba(245, 158, 11, 0.1);
      }
    }

    .action-card {
      display: flex;
      align-items: center;
      gap: var(--s4);
      padding: var(--s4);
      border: 2px solid var(--border);
      border-radius: var(--radius-lg);
      background: var(--surface);
      cursor: pointer;
      transition: var(--transition);
      text-align: left;
      width: 100%;
      
      &:hover {
        border-color: var(--primary);
        background: var(--primary-light);
      }
      
      .action-icon {
        font-size: 32px;
        min-width: 48px;
        text-align: center;
      }
      
      .action-content {
        flex: 1;
      }
    }

    .grid-2 {
      grid-template-columns: repeat(2, 1fr);
    }
    
    .grid-3 {
      grid-template-columns: repeat(3, 1fr);
    }

    // Mobile responsiveness
    @media (max-width: 768px) {
      .uat-dashboard-container {
        padding: var(--s4);
      }
      
      .grid-2, .grid-3 {
        grid-template-columns: 1fr;
      }
      
      .dashboard-header .flex {
        flex-direction: column;
        gap: var(--s4);
        align-items: start;
      }
      
      .readiness-overview .grid {
        gap: var(--s4);
      }
      
      .action-card {
        flex-direction: column;
        text-align: center;
        
        .action-icon {
          min-width: auto;
        }
      }
    }
  `]
})
export class UATDashboardComponent {
  private stateService = inject(StateService);
  private router = inject(Router);
  private uatRunner = new TokoEniwanUATRunner();

  // Signal-based state
  uatReport = signal<UATReport | null>(null);
  lastUpdated = signal<string | null>(null);
  isLoading = signal<boolean>(false);

  // Computed dashboard metrics
  overallReadiness = computed(() => {
    const report = this.uatReport();
    return report?.readinessAssessment || 'not-ready';
  });

  successRate = computed(() => {
    const report = this.uatReport();
    return report?.summary.successRate || 0;
  });

  totalTests = computed(() => {
    const report = this.uatReport();
    return report?.summary.totalScenarios || 0;
  });

  passedTests = computed(() => {
    const report = this.uatReport();
    return report?.summary.passedScenarios || 0;
  });

  criticalIssueCount = computed(() => {
    const report = this.uatReport();
    return report?.summary.criticalIssueCount || 0;
  });

  businessMetrics = computed((): BusinessReadinessMetric[] => {
    const report = this.uatReport();
    if (!report) return [];

    return [
      {
        category: 'Core Operations',
        score: this.calculateCoreOperationsScore(report),
        status: this.calculateCoreOperationsScore(report) >= 90 ? 'excellent' : 
               this.calculateCoreOperationsScore(report) >= 75 ? 'good' : 
               this.calculateCoreOperationsScore(report) >= 60 ? 'needs-improvement' : 'critical',
        description: 'Daily POS operations, transaction processing, inventory management',
        impact: 'Direct impact on daily revenue and customer satisfaction'
      },
      {
        category: 'Multi-Branch Coordination',
        score: this.calculateMultiBranchScore(report),
        status: this.calculateMultiBranchScore(report) >= 90 ? 'excellent' : 
               this.calculateMultiBranchScore(report) >= 75 ? 'good' : 
               this.calculateMultiBranchScore(report) >= 60 ? 'needs-improvement' : 'critical',
        description: 'Branch switching, stock transfers, cross-branch analytics',
        impact: 'Critical for multi-location business operations'
      },
      {
        category: 'Mobile Experience',
        score: this.calculateMobileScore(report),
        status: this.calculateMobileScore(report) >= 90 ? 'excellent' : 
               this.calculateMobileScore(report) >= 75 ? 'good' : 
               this.calculateMobileScore(report) >= 60 ? 'needs-improvement' : 'critical',
        description: 'Touch interfaces, responsive design, mobile POS functionality',
        impact: 'Essential for flexible operations and user productivity'
      },
      {
        category: 'Financial Operations',
        score: this.calculateFinancialScore(report),
        status: this.calculateFinancialScore(report) >= 90 ? 'excellent' : 
               this.calculateFinancialScore(report) >= 75 ? 'good' : 
               this.calculateFinancialScore(report) >= 60 ? 'needs-improvement' : 'critical',
        description: 'Member credit, supplier factures, payment processing',
        impact: 'Direct impact on cash flow and financial accuracy'
      }
    ];
  });

  recentResults = computed(() => {
    const report = this.uatReport();
    if (!report) return [];

    return report.executionResults
      .sort((a: UATExecutionResult, b: UATExecutionResult) => new Date(b.executedAt).getTime() - new Date(a.executedAt).getTime())
      .slice(0, 5);
  });

  ngOnInit() {
    this.loadDashboardData();
  }

  // Dashboard actions
  async refreshData(): Promise<void> {
    this.isLoading.set(true);
    
    try {
      await this.loadDashboardData();
      this.lastUpdated.set(new Date().toISOString());
    } finally {
      this.isLoading.set(false);
    }
  }

  async startQuickValidation(): Promise<void> {
    this.isLoading.set(true);
    
    try {
      // Run critical scenarios only
      const criticalScenarios = TOKO_ENIWAN_UAT_SCENARIOS.filter((s: any) => s.priority === 'critical');
      
      for (const scenario of criticalScenarios) {
        const user = this.stateService.user();
        const executedBy = user?.username || 'Quick Validation';
        await this.uatRunner.executeScenario(scenario, executedBy);
      }
      
      // Update dashboard
      const report = this.uatRunner.generateUATReport();
      this.uatReport.set(report);
      this.lastUpdated.set(new Date().toISOString());
      
    } finally {
      this.isLoading.set(false);
    }
  }

  runCriticalWorkflows(): void {
    this.router.navigate(['/dashboard/uat-runner'], { 
      queryParams: { filter: 'critical' } 
    });
  }

  validateMobileExperience(): void {
    this.router.navigate(['/dashboard/mobile-responsive-debugger']);
  }

  testBranchOperations(): void {
    this.router.navigate(['/dashboard/uat-runner'], { 
      queryParams: { filter: 'branch' } 
    });
  }

  generateComprehensiveReport(): void {
    const report = this.uatReport();
    if (report) {
      const jsonContent = JSON.stringify(report, null, 2);
      this.downloadFile(jsonContent, 'toko-eniwan-comprehensive-uat-report.json', 'application/json');
    }
  }

  viewAllResults(): void {
    this.router.navigate(['/dashboard/uat-runner']);
  }

  // Utility methods
  trackByResult = (index: number, result: UATExecutionResult): string => 
    `${result.scenarioId}-${result.executedAt}`;

  getScenarioTitle(scenarioId: string): string {
    const scenario = TOKO_ENIWAN_UAT_SCENARIOS.find((s: any) => s.id === scenarioId);
    return scenario?.title || 'Unknown Scenario';
  }

  getStepSuccessRate(result: UATExecutionResult): number {
    if (result.stepResults.length === 0) return 0;
    const passed = result.stepResults.filter((s: any) => s.result === 'passed').length;
    return Math.round((passed / result.stepResults.length) * 100);
  }

  getPassedStepsCount(result: UATExecutionResult): number {
    return result.stepResults.filter((s: any) => s.result === 'passed').length;
  }

  formatDateTime(isoString: string): string {
    return new Date(isoString).toLocaleString('id-ID', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  // Business metric calculations
  private calculateCoreOperationsScore(report: UATReport): number {
    const coreScenarios = ['daily-opening-procedure', 'customer-transaction-flow'];
    return this.calculateScoreForScenarios(report, coreScenarios);
  }

  private calculateMultiBranchScore(report: UATReport): number {
    const branchScenarios = ['inter-branch-stock-transfer'];
    return this.calculateScoreForScenarios(report, branchScenarios);
  }

  private calculateMobileScore(report: UATReport): number {
    const mobileScenarios = ['mobile-cashier-workflow'];
    return this.calculateScoreForScenarios(report, mobileScenarios);
  }

  private calculateFinancialScore(report: UATReport): number {
    const financialScenarios = ['member-credit-management', 'supplier-facture-workflow'];
    return this.calculateScoreForScenarios(report, financialScenarios);
  }

  private calculateScoreForScenarios(report: UATReport, scenarioIds: string[]): number {
    const relevantResults = report.executionResults.filter((r: UATExecutionResult) => scenarioIds.includes(r.scenarioId));
    
    if (relevantResults.length === 0) return 0;
    
    const totalSteps = relevantResults.reduce((sum: number, r: UATExecutionResult) => sum + r.stepResults.length, 0);
    const passedSteps = relevantResults.reduce((sum: number, r: UATExecutionResult) => 
      sum + r.stepResults.filter((s: any) => s.result === 'passed').length, 0
    );
    
    return totalSteps > 0 ? Math.round((passedSteps / totalSteps) * 100) : 0;
  }

  private async loadDashboardData(): Promise<void> {
    // Load any existing UAT results
    const saved = localStorage.getItem('uat-results');
    if (saved) {
      try {
        const results = JSON.parse(saved);
        const report = this.uatRunner.generateUATReport();
        this.uatReport.set(report);
      } catch (error) {
        console.error('Error loading UAT dashboard data:', error);
      }
    }
  }

  private downloadFile(content: string, filename: string, contentType: string): void {
    const blob = new Blob([content], { type: contentType });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    window.URL.revokeObjectURL(url);
  }
}