// src/app/shared/components/uat-runner/uat-runner.component.ts
// User Acceptance Testing Runner Component for Toko Eniwan Workflows

import { Component, signal, computed, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';

import { 
  TOKO_ENIWAN_UAT_SCENARIOS, 
  TokoEniwanUATRunner, 
  UATScenario, 
  UATExecutionResult,
  UATReport 
} from '../../../core/testing/toko-eniwan-uat.scenarios';
import { StateService } from '../../../core/services/state.service';

@Component({
  selector: 'app-uat-runner',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="uat-runner-container">
      <!-- Header -->
      <div class="flex justify-between items-center mb-6">
        <div>
          <h2 class="text-2xl font-bold text-gray-900">User Acceptance Testing</h2>
          <p class="text-gray-600 mt-1">Toko Eniwan Multi-Branch Workflow Validation</p>
        </div>
        
        <div class="flex gap-3">
          <button 
            class="btn btn-outline" 
            (click)="resetAllTests()"
            [disabled]="isRunning()">
            Reset Tests
          </button>
          <button 
            class="btn btn-primary" 
            (click)="runAllCriticalTests()"
            [disabled]="isRunning()">
            {{ isRunning() ? 'Running...' : 'Run Critical Tests' }}
          </button>
        </div>
      </div>

      <!-- Test Progress Overview -->
      <div class="grid grid-4 gap-4 mb-6" *ngIf="testReport()">
        <div class="card text-center">
          <div class="text-2xl font-bold text-green-600">{{ testReport()!.summary.passedScenarios }}</div>
          <div class="text-sm text-gray-600">Passed</div>
        </div>
        <div class="card text-center">
          <div class="text-2xl font-bold text-red-600">{{ testReport()!.summary.failedScenarios }}</div>
          <div class="text-sm text-gray-600">Failed</div>
        </div>
        <div class="card text-center">
          <div class="text-2xl font-bold text-orange-600">{{ testReport()!.summary.partialScenarios }}</div>
          <div class="text-sm text-gray-600">Partial</div>
        </div>
        <div class="card text-center">
          <div class="text-2xl font-bold" [class.text-green-600]="testReport()!.summary.successRate >= 90" 
               [class.text-orange-600]="testReport()!.summary.successRate >= 70 && testReport()!.summary.successRate < 90"
               [class.text-red-600]="testReport()!.summary.successRate < 70">
            {{ testReport()!.summary.successRate }}%
          </div>
          <div class="text-sm text-gray-600">Success Rate</div>
        </div>
      </div>

      <!-- System Readiness Status -->
      <div class="card mb-6" *ngIf="testReport()">
        <div class="flex items-center gap-4">
          <div class="readiness-indicator" 
               [class.ready]="testReport()!.readinessAssessment === 'ready'"
               [class.partial]="testReport()!.readinessAssessment === 'partial'"
               [class.not-ready]="testReport()!.readinessAssessment === 'not-ready'">
          </div>
          <div>
            <h3 class="font-semibold">System Readiness Assessment</h3>
            <p class="text-sm text-gray-600 mt-1">
              <span *ngIf="testReport()!.readinessAssessment === 'ready'" class="text-green-600">
                ✅ System ready for production deployment
              </span>
              <span *ngIf="testReport()!.readinessAssessment === 'partial'" class="text-orange-600">
                ⚠️ System mostly ready with minor issues
              </span>
              <span *ngIf="testReport()!.readinessAssessment === 'not-ready'" class="text-red-600">
                ❌ System not ready - critical issues found
              </span>
            </p>
          </div>
        </div>
      </div>

      <!-- Filter Controls -->
      <div class="card mb-6">
        <div class="grid grid-4 gap-4">
          <div class="form-field">
            <label>Filter by Priority</label>
            <select [(ngModel)]="priorityFilter" class="form-control">
              <option value="">All Priorities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
          
          <div class="form-field">
            <label>Filter by Role</label>
            <select [(ngModel)]="roleFilter" class="form-control">
              <option value="">All Roles</option>
              <option value="Admin">Admin</option>
              <option value="Manager">Manager</option>
              <option value="Cashier">Cashier</option>
              <option value="User">User</option>
            </select>
          </div>
          
          <div class="form-field">
            <label>Filter by Branch Type</label>
            <select [(ngModel)]="branchTypeFilter" class="form-control">
              <option value="">All Branch Types</option>
              <option value="Head">Head Office</option>
              <option value="Branch">Branch</option>
              <option value="SubBranch">Sub Branch</option>
              <option value="Any">Any Branch</option>
            </select>
          </div>
          
          <div class="form-field">
            <label>Filter by Status</label>
            <select [(ngModel)]="statusFilter" class="form-control">
              <option value="">All Status</option>
              <option value="not-run">Not Run</option>
              <option value="passed">Passed</option>
              <option value="failed">Failed</option>
              <option value="partial">Partial</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Scenarios List -->
      <div class="scenarios-grid">
        <div 
          *ngFor="let scenario of filteredScenarios(); trackBy: trackByScenario" 
          class="scenario-card card"
          [class.scenario-passed]="getScenarioResult(scenario.id)?.overallResult === 'passed'"
          [class.scenario-failed]="getScenarioResult(scenario.id)?.overallResult === 'failed'"
          [class.scenario-partial]="getScenarioResult(scenario.id)?.overallResult === 'partial'">
          
          <!-- Scenario Header -->
          <div class="flex justify-between items-start mb-4">
            <div class="flex-1">
              <h3 class="font-semibold text-gray-900">{{ scenario.title }}</h3>
              <p class="text-sm text-gray-600 mt-1">{{ scenario.description }}</p>
              
              <div class="flex gap-2 mt-2">
                <span class="badge" 
                      [class.badge-critical]="scenario.priority === 'critical'"
                      [class.badge-high]="scenario.priority === 'high'"
                      [class.badge-medium]="scenario.priority === 'medium'"
                      [class.badge-low]="scenario.priority === 'low'">
                  {{ scenario.priority | titlecase }}
                </span>
                <span class="badge badge-secondary">{{ scenario.userRole }}</span>
                <span class="badge badge-info">{{ scenario.branchType }}</span>
                <span class="badge badge-outline">{{ scenario.estimatedTime }}</span>
              </div>
            </div>
            
            <div class="flex flex-col gap-2 ml-4">
              <button 
                class="btn btn-sm btn-primary" 
                (click)="runScenario(scenario)"
                [disabled]="isRunning() || isScenarioRunning(scenario.id)">
                {{ isScenarioRunning(scenario.id) ? 'Running...' : 'Run Test' }}
              </button>
              
              <button 
                *ngIf="getScenarioResult(scenario.id)" 
                class="btn btn-sm btn-outline" 
                (click)="viewScenarioDetails(scenario)">
                View Details
              </button>
            </div>
          </div>

          <!-- Scenario Status -->
          <div class="scenario-status" *ngIf="getScenarioResult(scenario.id) as result">
            <div class="flex items-center gap-3 mb-3">
              <div class="status-icon"
                   [class.status-passed]="result.overallResult === 'passed'"
                   [class.status-failed]="result.overallResult === 'failed'"
                   [class.status-partial]="result.overallResult === 'partial'">
                <span *ngIf="result.overallResult === 'passed'">✅</span>
                <span *ngIf="result.overallResult === 'failed'">❌</span>
                <span *ngIf="result.overallResult === 'partial'">⚠️</span>
              </div>
              
              <div class="flex-1">
                <div class="text-sm font-medium">
                  Last executed: {{ formatDateTime(result.executedAt) }}
                </div>
                <div class="text-xs text-gray-600">
                  By: {{ result.executedBy }}
                </div>
              </div>
            </div>

            <!-- Step Progress -->
            <div class="step-progress mb-3">
              <div class="flex gap-1">
                <div 
                  *ngFor="let stepResult of result.stepResults" 
                  class="step-indicator"
                  [class.step-passed]="stepResult.result === 'passed'"
                  [class.step-failed]="stepResult.result === 'failed'"
                  [class.step-skipped]="stepResult.result === 'skipped'"
                  [title]="'Step ' + stepResult.stepNumber + ': ' + stepResult.result">
                </div>
              </div>
              <div class="text-xs text-gray-600 mt-1">
                {{ getPassedStepsCount(result) }} / {{ result.stepResults.length }} steps passed
              </div>
            </div>

            <!-- Issues Summary -->
            <div *ngIf="result.issues.length > 0" class="issues-summary">
              <div class="text-sm font-medium text-red-600 mb-2">
                {{ result.issues.length }} issue(s) found:
              </div>
              <ul class="text-xs text-gray-700 space-y-1">
                <li *ngFor="let issue of result.issues.slice(0, 3)">
                  • {{ issue.description }}
                </li>
                <li *ngIf="result.issues.length > 3" class="text-gray-500">
                  ... and {{ result.issues.length - 3 }} more issues
                </li>
              </ul>
            </div>
          </div>

          <!-- Scenario Steps Preview -->
          <div class="scenario-steps" *ngIf="!getScenarioResult(scenario.id)">
            <div class="text-sm font-medium text-gray-700 mb-2">Test Steps:</div>
            <ol class="text-xs text-gray-600 space-y-1 pl-4">
              <li *ngFor="let step of scenario.steps.slice(0, 3)">
                {{ step.stepNumber }}. {{ step.action }}
              </li>
              <li *ngIf="scenario.steps.length > 3" class="text-gray-500">
                ... and {{ scenario.steps.length - 3 }} more steps
              </li>
            </ol>
          </div>
        </div>
      </div>

      <!-- Critical Issues Panel -->
      <div class="card mt-6" *ngIf="criticalIssues().length > 0">
        <div class="flex items-center gap-2 mb-4">
          <span class="text-red-600 text-xl">🚨</span>
          <h3 class="font-semibold text-red-600">Critical Issues Requiring Immediate Attention</h3>
        </div>
        
        <div class="space-y-3">
          <div *ngFor="let issue of criticalIssues()" class="critical-issue-card">
            <div class="font-medium text-red-700">{{ issue.description }}</div>
            <div class="text-sm text-gray-600 mt-1">{{ issue.businessImpact }}</div>
            <div class="text-xs text-gray-500 mt-2">
              Scenario: {{ getScenarioTitle(issue) }}
            </div>
          </div>
        </div>
      </div>

      <!-- Overall Recommendations -->
      <div class="card mt-6" *ngIf="testReport()?.overallRecommendations && testReport()!.overallRecommendations.length > 0">
        <h3 class="font-semibold mb-3">Overall Recommendations</h3>
        <ul class="space-y-2">
          <li *ngFor="let recommendation of testReport()!.overallRecommendations" 
              class="flex items-start gap-2">
            <span class="text-blue-600 mt-1">💡</span>
            <span class="text-sm">{{ recommendation }}</span>
          </li>
        </ul>
      </div>

      <!-- Export Controls -->
      <div class="card mt-6">
        <div class="flex justify-between items-center">
          <div>
            <h3 class="font-semibold">Export Test Results</h3>
            <p class="text-sm text-gray-600 mt-1">Generate comprehensive UAT report untuk stakeholders</p>
          </div>
          
          <div class="flex gap-2">
            <button class="btn btn-outline" (click)="exportToCSV()" [disabled]="!testReport()">
              Export CSV
            </button>
            <button class="btn btn-outline" (click)="exportToPDF()" [disabled]="!testReport()">
              Export PDF
            </button>
            <button class="btn btn-outline" (click)="exportToJSON()" [disabled]="!testReport()">
              Export JSON
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .uat-runner-container {
      padding: var(--s6);
      max-width: 1400px;
      margin: 0 auto;
    }

    .scenarios-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
      gap: var(--s4);
    }

    .scenario-card {
      transition: var(--transition);
      border: 2px solid var(--border);
      
      &:hover {
        border-color: var(--primary);
      }
      
      &.scenario-passed {
        border-left-color: var(--success);
        border-left-width: 4px;
      }
      
      &.scenario-failed {
        border-left-color: var(--error);
        border-left-width: 4px;
      }
      
      &.scenario-partial {
        border-left-color: var(--warning);
        border-left-width: 4px;
      }
    }

    .badge {
      padding: var(--s1) var(--s2);
      border-radius: var(--radius);
      font-size: var(--text-xs);
      font-weight: var(--font-medium);
      
      &.badge-critical {
        background: var(--error);
        color: white;
      }
      
      &.badge-high {
        background: var(--warning);
        color: white;
      }
      
      &.badge-medium {
        background: var(--info);
        color: white;
      }
      
      &.badge-low {
        background: var(--bg-secondary);
        color: var(--text);
      }
      
      &.badge-secondary {
        background: var(--bg-secondary);
        color: var(--text);
      }
      
      &.badge-info {
        background: var(--info);
        color: white;
      }
      
      &.badge-outline {
        background: transparent;
        border: 1px solid var(--border);
        color: var(--text-secondary);
      }
    }

    .step-progress {
      .step-indicator {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: var(--border);
        
        &.step-passed {
          background: var(--success);
        }
        
        &.step-failed {
          background: var(--error);
        }
        
        &.step-skipped {
          background: var(--warning);
        }
      }
    }

    .readiness-indicator {
      width: 20px;
      height: 20px;
      border-radius: 50%;
      
      &.ready {
        background: var(--success);
      }
      
      &.partial {
        background: var(--warning);
      }
      
      &.not-ready {
        background: var(--error);
      }
    }

    .critical-issue-card {
      padding: var(--s3);
      background: rgba(239, 68, 68, 0.05);
      border: 1px solid rgba(239, 68, 68, 0.2);
      border-radius: var(--radius);
    }

    .btn-sm {
      padding: var(--s2) var(--s3);
      font-size: var(--text-xs);
      min-height: 36px;
    }

    // Mobile responsiveness
    @media (max-width: 768px) {
      .uat-runner-container {
        padding: var(--s4);
      }
      
      .scenarios-grid {
        grid-template-columns: 1fr;
      }
      
      .grid-4 {
        grid-template-columns: repeat(2, 1fr);
      }
      
      .flex {
        flex-direction: column;
        gap: var(--s3);
      }
    }
  `]
})
export class UATRunnerComponent {
  private stateService = inject(StateService);
  private uatRunner = new TokoEniwanUATRunner();

  // Signal-based state
  allScenarios = signal<UATScenario[]>(TOKO_ENIWAN_UAT_SCENARIOS);
  executionResults = signal<UATExecutionResult[]>([]);
  isRunning = signal<boolean>(false);
  runningScenarios = signal<Set<string>>(new Set());
  testReport = signal<UATReport | null>(null);

  // Filter state
  priorityFilter = signal<string>('');
  roleFilter = signal<string>('');
  branchTypeFilter = signal<string>('');
  statusFilter = signal<string>('');

  // Computed properties
  filteredScenarios = computed(() => {
    let filtered = this.allScenarios();

    const priority = this.priorityFilter();
    if (priority) {
      filtered = filtered.filter(s => s.priority === priority);
    }

    const role = this.roleFilter();
    if (role) {
      filtered = filtered.filter(s => s.userRole === role);
    }

    const branchType = this.branchTypeFilter();
    if (branchType) {
      filtered = filtered.filter(s => s.branchType === branchType);
    }

    const status = this.statusFilter();
    if (status) {
      const results = this.executionResults();
      if (status === 'not-run') {
        filtered = filtered.filter(s => !results.find(r => r.scenarioId === s.id));
      } else {
        filtered = filtered.filter(s => {
          const result = results.find(r => r.scenarioId === s.id);
          return result?.overallResult === status;
        });
      }
    }

    return filtered;
  });

  criticalIssues = computed(() => {
    return this.executionResults()
      .flatMap(r => r.issues)
      .filter(i => i.severity === 'critical');
  });

  ngOnInit() {
    this.loadPreviousResults();
  }

  // Test execution methods
  async runScenario(scenario: UATScenario): Promise<void> {
    if (this.isRunning() || this.isScenarioRunning(scenario.id)) {
      return;
    }

    this.runningScenarios.update(running => new Set([...running, scenario.id]));

    try {
      const user = this.stateService.user();
      const executedBy = user?.username || 'Anonymous';
      
      const result = await this.uatRunner.executeScenario(scenario, executedBy);
      
      // Update results
      this.executionResults.update(results => {
        const existing = results.findIndex(r => r.scenarioId === scenario.id);
        if (existing >= 0) {
          results[existing] = result;
          return [...results];
        } else {
          return [...results, result];
        }
      });

      // Update report
      this.updateTestReport();
      
      // Save results
      this.saveResults();
      
    } catch (error) {
      console.error('Error running scenario:', error);
    } finally {
      this.runningScenarios.update(running => {
        const newSet = new Set(running);
        newSet.delete(scenario.id);
        return newSet;
      });
    }
  }

  async runAllCriticalTests(): Promise<void> {
    if (this.isRunning()) return;

    this.isRunning.set(true);

    try {
      const criticalScenarios = this.allScenarios().filter(s => s.priority === 'critical');
      
      for (const scenario of criticalScenarios) {
        await this.runScenario(scenario);
        // Small delay between scenarios
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } finally {
      this.isRunning.set(false);
    }
  }

  resetAllTests(): void {
    this.executionResults.set([]);
    this.testReport.set(null);
    this.runningScenarios.set(new Set());
    localStorage.removeItem('uat-results');
  }

  // Utility methods
  trackByScenario = (index: number, scenario: UATScenario): string => scenario.id;

  isScenarioRunning(scenarioId: string): boolean {
    return this.runningScenarios().has(scenarioId);
  }

  getScenarioResult(scenarioId: string): UATExecutionResult | undefined {
    return this.executionResults().find(r => r.scenarioId === scenarioId);
  }

  getScenarioTitle(issue: any): string {
    const scenario = this.allScenarios().find(s => 
      this.executionResults().find(r => r.scenarioId === s.id)?.issues.includes(issue)
    );
    return scenario?.title || 'Unknown Scenario';
  }

  viewScenarioDetails(scenario: UATScenario): void {
    const result = this.getScenarioResult(scenario.id);
    if (result) {
      // Show detailed modal or navigate to details page
      console.log('Scenario details:', { scenario, result });
    }
  }

  formatDateTime(isoString: string): string {
    return new Date(isoString).toLocaleString('id-ID', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  // Export methods
  exportToCSV(): void {
    if (!this.testReport()) return;

    const report = this.testReport()!;
    const csvData = [
      ['Scenario ID', 'Title', 'Priority', 'Role', 'Result', 'Success Rate', 'Issues', 'Executed At', 'Executed By'],
      ...report.executionResults.map((result: UATExecutionResult) => {
        const scenario = this.allScenarios().find(s => s.id === result.scenarioId);
        const successRate = Math.round((result.stepResults.filter((s: any) => s.result === 'passed').length / result.stepResults.length) * 100);
        
        return [
          result.scenarioId,
          scenario?.title || '',
          scenario?.priority || '',
          scenario?.userRole || '',
          result.overallResult,
          `${successRate}%`,
          result.issues.length.toString(),
          result.executedAt,
          result.executedBy
        ];
      })
    ];

    const csvContent = csvData.map(row => row.map((cell: string) => `"${cell}"`).join(',')).join('\n');
    this.downloadFile(csvContent, 'toko-eniwan-uat-results.csv', 'text/csv');
  }

  exportToPDF(): void {
    // Implementation would use a PDF generation library
    console.log('PDF export functionality to be implemented');
  }

  exportToJSON(): void {
    if (!this.testReport()) return;

    const jsonContent = JSON.stringify(this.testReport(), null, 2);
    this.downloadFile(jsonContent, 'toko-eniwan-uat-results.json', 'application/json');
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

  private updateTestReport(): void {
    this.testReport.set(this.uatRunner.generateUATReport());
  }

  private saveResults(): void {
    const results = this.executionResults();
    localStorage.setItem('uat-results', JSON.stringify(results));
  }

  getPassedStepsCount(result: UATExecutionResult): number {
    return result.stepResults.filter((s: any) => s.result === 'passed').length;
  }

  private loadPreviousResults(): void {
    const saved = localStorage.getItem('uat-results');
    if (saved) {
      try {
        const results = JSON.parse(saved) as UATExecutionResult[];
        this.executionResults.set(results);
        this.updateTestReport();
      } catch (error) {
        console.error('Error loading previous UAT results:', error);
      }
    }
  }
}