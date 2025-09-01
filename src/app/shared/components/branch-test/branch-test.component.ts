// src/app/shared/components/branch-test/branch-test.component.ts
// Test component to demonstrate multi-branch functionality
// Angular 20 with Signal-based reactive architecture

import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { StateService } from '../../../core/services/state.service';
import { AuthService } from '../../../core/services/auth.service';
import { BranchAwareDataService } from '../../../core/services/branch-aware-data.service';

@Component({
  selector: 'app-branch-test',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    MatIconModule,
    MatButtonModule,
    MatCardModule,
    MatProgressSpinnerModule
  ],
  template: `
    <div class="branch-test-container">
      
      <!-- Header -->
      <div class="test-header">
        <h2>Multi-Branch System Test</h2>
        <p>This component demonstrates the multi-branch functionality</p>
      </div>

      <!-- Branch State Display -->
      <mat-card class="state-card">
        <mat-card-header>
          <mat-card-title>Current Branch State</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          
          <!-- User Info -->
          <div class="info-section">
            <h4>User Information</h4>
            <div class="info-grid">
              <div class="info-item">
                <span class="label">Username:</span>
                <span class="value">{{ stateService.user()?.username || 'Not logged in' }}</span>
              </div>
              <div class="info-item">
                <span class="label">Role:</span>
                <span class="value">{{ stateService.user()?.role || 'N/A' }}</span>
              </div>
              <div class="info-item">
                <span class="label">Can Switch Branches:</span>
                <span class="value" [class.success]="stateService.canSwitchBranches()" [class.error]="!stateService.canSwitchBranches()">
                  {{ stateService.canSwitchBranches() ? 'Yes' : 'No' }}
                </span>
              </div>
            </div>
          </div>

          <!-- Branch Selection -->
          <div class="info-section">
            <h4>Branch Selection</h4>
            <div class="info-grid">
              <div class="info-item">
                <span class="label">Selected Branch:</span>
                <span class="value">{{ stateService.activeBranch()?.branchName || 'None selected' }}</span>
              </div>
              <div class="info-item">
                <span class="label">Selected IDs:</span>
                <span class="value">{{ stateService.activeBranchIds().join(', ') || 'None' }}</span>
              </div>
              <div class="info-item">
                <span class="label">Multi-Select Mode:</span>
                <span class="value" [class.success]="stateService.isMultiSelectMode()" [class.info]="!stateService.isMultiSelectMode()">
                  {{ stateService.isMultiSelectMode() ? 'Enabled' : 'Disabled' }}
                </span>
              </div>
            </div>
          </div>

          <!-- Available Branches -->
          <div class="info-section">
            <h4>Available Branches ({{ stateService.accessibleBranches().length }})</h4>
            <div class="branch-list">
              <div 
                *ngFor="let branch of stateService.accessibleBranches(); trackBy: trackByBranch"
                class="branch-item"
                [class.selected]="stateService.activeBranchIds().includes(branch.branchId)"
                [class.head-office]="branch.isHeadOffice">
                
                <mat-icon class="branch-icon">{{ getBranchIcon(branch.branchType) }}</mat-icon>
                
                <div class="branch-info">
                  <span class="branch-name">{{ branch.branchName }}</span>
                  <small class="branch-details">
                    {{ branch.branchCode }} • {{ branch.branchType }} • {{ branch.accessLevel }}
                  </small>
                </div>
                
                <div class="branch-permissions">
                  <span class="permission-badge" [class.active]="branch.canRead">R</span>
                  <span class="permission-badge" [class.active]="branch.canWrite">W</span>
                  <span class="permission-badge" [class.active]="branch.canManage">M</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Data Summary -->
          <div class="info-section" *ngIf="dataService.salesData().length > 0 || dataService.inventoryData().length > 0">
            <h4>Branch Data Summary</h4>
            <div class="info-grid">
              <div class="info-item">
                <span class="label">Sales Records:</span>
                <span class="value">{{ dataService.filteredSalesData().length }}</span>
              </div>
              <div class="info-item">
                <span class="label">Inventory Items:</span>
                <span class="value">{{ dataService.filteredInventoryData().length }}</span>
              </div>
              <div class="info-item">
                <span class="label">Needs Refresh:</span>
                <span class="value" [class.warning]="dataService.needsDataRefresh()">
                  {{ dataService.needsDataRefresh() ? 'Yes' : 'No' }}
                </span>
              </div>
            </div>

            <!-- Branch Sales Summary -->
            <div class="summary-section" *ngIf="dataService.branchSalesSummary().length > 0">
              <h5>Sales by Branch</h5>
              <div class="summary-grid">
                <div 
                  *ngFor="let summary of dataService.branchSalesSummary()"
                  class="summary-item">
                  <span class="summary-name">{{ summary.branchName }}</span>
                  <span class="summary-value">{{ formatCurrency(summary.totalSales) }}</span>
                  <small class="summary-details">{{ summary.transactionCount }} transactions</small>
                </div>
              </div>
            </div>

            <!-- Branch Inventory Summary -->
            <div class="summary-section" *ngIf="dataService.branchInventorySummary().length > 0">
              <h5>Inventory by Branch</h5>
              <div class="summary-grid">
                <div 
                  *ngFor="let summary of dataService.branchInventorySummary()"
                  class="summary-item">
                  <span class="summary-name">{{ summary.branchName }}</span>
                  <span class="summary-value">{{ summary.totalProducts }} products</span>
                  <small class="summary-details">{{ formatCurrency(summary.totalStockValue) }} value</small>
                </div>
              </div>
            </div>
          </div>

        </mat-card-content>
      </mat-card>

      <!-- Action Buttons -->
      <div class="action-section">
        <button mat-raised-button color="primary" (click)="loadTestData()" [disabled]="dataService.loading()">
          <mat-icon>refresh</mat-icon>
          {{ dataService.loading() ? 'Loading...' : 'Load Test Data' }}
        </button>

        <button mat-raised-button (click)="debugBranchState()">
          <mat-icon>bug_report</mat-icon>
          Debug State
        </button>

        <button mat-raised-button (click)="refreshBranchAccess()">
          <mat-icon>sync</mat-icon>
          Refresh Branch Access
        </button>

        <button mat-raised-button color="warn" (click)="clearTestData()">
          <mat-icon>clear</mat-icon>
          Clear Data
        </button>
      </div>

      <!-- Debug Output -->
      <mat-card class="debug-card" *ngIf="debugOutput">
        <mat-card-header>
          <mat-card-title>Debug Output</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <pre class="debug-content">{{ debugOutput }}</pre>
        </mat-card-content>
      </mat-card>

    </div>
  `,
  styles: [`
    .branch-test-container {
      padding: var(--s6);
      max-width: 1000px;
      margin: 0 auto;
      
      --success: #22c55e;
      --error: #ef4444;
      --warning: #f59e0b;
      --info: #3b82f6;
      --s2: 8px;
      --s3: 12px;
      --s4: 16px;
      --s6: 24px;
      --text-sm: 14px;
      --text-base: 16px;
      --text-lg: 18px;
      --radius: 6px;
    }

    .test-header {
      margin-bottom: var(--s6);
      text-align: center;
      
      h2 {
        margin: 0 0 var(--s3) 0;
        font-size: var(--text-lg);
      }
      
      p {
        margin: 0;
        color: #666;
        font-size: var(--text-sm);
      }
    }

    .state-card {
      margin-bottom: var(--s6);
    }

    .info-section {
      margin-bottom: var(--s6);
      
      h4, h5 {
        margin: 0 0 var(--s4) 0;
        font-size: var(--text-base);
        color: #333;
      }
    }

    .info-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: var(--s3);
    }

    .info-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: var(--s3);
      background: #f8f9fa;
      border-radius: var(--radius);
      
      .label {
        font-weight: 600;
        color: #555;
      }
      
      .value {
        font-family: monospace;
        
        &.success { color: var(--success); font-weight: 600; }
        &.error { color: var(--error); font-weight: 600; }
        &.warning { color: var(--warning); font-weight: 600; }
        &.info { color: var(--info); font-weight: 600; }
      }
    }

    .branch-list {
      display: flex;
      flex-direction: column;
      gap: var(--s2);
    }

    .branch-item {
      display: flex;
      align-items: center;
      gap: var(--s3);
      padding: var(--s3);
      border: 2px solid #e5e7eb;
      border-radius: var(--radius);
      transition: all 0.2s ease;
      
      &.selected {
        border-color: var(--success);
        background: rgba(34, 197, 94, 0.05);
      }
      
      &.head-office {
        background: linear-gradient(90deg, rgba(59, 130, 246, 0.05) 0%, transparent 100%);
      }
      
      .branch-icon {
        color: #666;
        font-size: 20px;
      }
      
      .branch-info {
        flex: 1;
        
        .branch-name {
          font-weight: 600;
          display: block;
          margin-bottom: 2px;
        }
        
        .branch-details {
          color: #666;
          font-size: 12px;
        }
      }
      
      .branch-permissions {
        display: flex;
        gap: 4px;
        
        .permission-badge {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #e5e7eb;
          color: #666;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
          font-weight: 600;
          
          &.active {
            background: var(--success);
            color: white;
          }
        }
      }
    }

    .summary-section {
      margin-top: var(--s4);
    }

    .summary-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: var(--s3);
    }

    .summary-item {
      padding: var(--s3);
      border: 1px solid #e5e7eb;
      border-radius: var(--radius);
      
      .summary-name {
        font-weight: 600;
        display: block;
        margin-bottom: 2px;
      }
      
      .summary-value {
        font-weight: 700;
        color: var(--success);
        display: block;
        margin-bottom: 2px;
      }
      
      .summary-details {
        color: #666;
        font-size: 12px;
      }
    }

    .action-section {
      display: flex;
      gap: var(--s3);
      flex-wrap: wrap;
      margin-bottom: var(--s6);
      
      button {
        display: flex;
        align-items: center;
        gap: var(--s2);
      }
    }

    .debug-card {
      .debug-content {
        background: #1e1e1e;
        color: #d4d4d4;
        padding: var(--s4);
        border-radius: var(--radius);
        font-size: 12px;
        line-height: 1.5;
        overflow-x: auto;
        max-height: 400px;
        overflow-y: auto;
      }
    }

    @media (max-width: 640px) {
      .branch-test-container {
        padding: var(--s4);
      }
      
      .info-grid {
        grid-template-columns: 1fr;
      }
      
      .action-section {
        flex-direction: column;
        
        button {
          width: 100%;
          justify-content: center;
        }
      }
    }
  `]
})
export class BranchTestComponent implements OnInit, OnDestroy {
  // Inject services
  readonly stateService = inject(StateService);
  readonly authService = inject(AuthService);
  readonly dataService = inject(BranchAwareDataService);

  // Component state
  debugOutput: string = '';

  ngOnInit(): void {
    console.log('🧪 Branch Test Component initialized');
  }

  ngOnDestroy(): void {
    console.log('🧪 Branch Test Component destroyed');
  }

  // TrackBy function
  trackByBranch = (index: number, branch: any): number => branch.branchId;

  // Event handlers
  loadTestData(): void {
    console.log('🧪 Loading test data...');
    
    // Generate some mock data for testing
    this.dataService.loadSalesData().subscribe({
      next: (response) => {
        if (!response.success) {
          // Generate mock data if API fails
          this.generateMockData();
        }
      },
      error: () => {
        // Generate mock data on error
        this.generateMockData();
      }
    });
  }

  debugBranchState(): void {
    const stateSnapshot = this.stateService.getBranchStateSnapshot();
    const branchContext = this.stateService.branchSwitchContext();
    const dataStats = this.dataService.getDataStats();
    
    const debugInfo = {
      timestamp: new Date().toISOString(),
      stateSnapshot,
      branchContext,
      dataStats,
      computedProperties: {
        activeBranch: this.stateService.activeBranch(),
        activeBranchIds: this.stateService.activeBranchIds(),
        canSwitchBranches: this.stateService.canSwitchBranches(),
        branchDisplayText: this.stateService.branchDisplayText(),
        hasMultipleBranches: this.stateService.hasMultipleBranches()
      }
    };

    this.debugOutput = JSON.stringify(debugInfo, null, 2);
    
    // Also log to console
    console.log('🐛 Branch State Debug:', debugInfo);
    
    // Test data service debug
    this.dataService.debugBranchData();
  }

  refreshBranchAccess(): void {
    console.log('🔄 Refreshing branch access...');
    
    this.authService.refreshBranchAccess().subscribe({
      next: (branchAccess) => {
        if (branchAccess.success) {
          this.stateService.setAccessibleBranches(branchAccess.data.accessibleBranches);
          this.stateService.setBranchHierarchy(branchAccess.data.branchHierarchy);
          this.stateService.setUserBranchRoles(branchAccess.data.userBranchRoles);
          console.log('✅ Branch access refreshed successfully');
        }
      },
      error: (error) => {
        console.error('❌ Failed to refresh branch access:', error);
      }
    });
  }

  clearTestData(): void {
    this.dataService.clearData();
    this.debugOutput = '';
    console.log('🧹 Test data cleared');
  }

  // Utility methods
  getBranchIcon(branchType: string): string {
    switch (branchType) {
      case 'Head': return 'corporate_fare';
      case 'Branch': return 'store';
      case 'SubBranch': return 'storefront';
      default: return 'location_on';
    }
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  }

  private generateMockData(): void {
    // This is a simplified mock data generator for testing
    console.log('🧪 Generating mock data for testing...');
    
    // In a real implementation, this would call the actual data service methods
    // For now, just log the action
    console.log('📊 Mock sales and inventory data would be generated here');
  }
}