import { Component, OnInit, computed, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { SupplierFactureIntegrationService } from '../../services/supplier-facture-integration.service';
import { FactureService } from '../../../facture/services/facture.service';
import { 
  SupplierFactureIntegrationDto, 
  IntegratedSupplierStatsDto 
} from '../../services/supplier-facture-integration.service';

@Component({
  selector: 'app-supplier-facture-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="supplier-facture-dashboard">
      <!-- Header -->
      <div class="dashboard-header">
        <h2 class="text-2xl font-bold text-gray-900">Supplier & Facture Integration</h2>
        <p class="text-gray-600 mt-1">Comprehensive supplier payment and invoice management</p>
      </div>

      <!-- Loading State -->
      <div *ngIf="integrationService.loading()" class="loading-state">
        <div class="flex items-center justify-center py-12">
          <div class="loading-spinner"></div>
          <span class="ml-3 text-gray-600">Loading integration data...</span>
        </div>
      </div>

      <!-- Error State -->
      <div *ngIf="integrationService.error()" class="error-state mb-6">
        <div class="bg-red-50 border border-red-200 rounded-lg p-4">
          <div class="flex">
            <div class="ml-3">
              <h3 class="text-sm font-medium text-red-800">Integration Error</h3>
              <p class="mt-1 text-sm text-red-700">{{ integrationService.error() }}</p>
              <button 
                (click)="refreshData()"
                class="mt-2 btn btn-outline btn-sm text-red-700 border-red-300 hover:bg-red-50">
                Retry Connection
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Main Dashboard Content -->
      <div *ngIf="stats() && !integrationService.loading()" class="dashboard-content">
        
        <!-- Key Metrics Cards -->
        <div class="metrics-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          
          <!-- Total Outstanding Amount -->
          <div class="metric-card">
            <div class="card-header">
              <h3 class="text-sm font-medium text-gray-500">Total Outstanding</h3>
              <div class="icon bg-orange-100 text-orange-600">💰</div>
            </div>
            <div class="card-content">
              <p class="text-2xl font-bold text-gray-900">
                {{ formatCurrency(stats()!.totalOutstandingAmount) }}
              </p>
              <p class="text-sm text-gray-600">
                {{ stats()!.suppliersWithOutstandingFactures }} suppliers with outstanding
              </p>
            </div>
          </div>

          <!-- Overdue Amount -->
          <div class="metric-card">
            <div class="card-header">
              <h3 class="text-sm font-medium text-gray-500">Overdue Amount</h3>
              <div class="icon bg-red-100 text-red-600">⚠️</div>
            </div>
            <div class="card-content">
              <p class="text-2xl font-bold text-red-600">
                {{ formatCurrency(stats()!.overdueAmount) }}
              </p>
              <p class="text-sm text-gray-600">
                {{ stats()!.overdueSuppliers }} suppliers overdue
              </p>
            </div>
          </div>

          <!-- Active Suppliers -->
          <div class="metric-card">
            <div class="card-header">
              <h3 class="text-sm font-medium text-gray-500">Active Suppliers</h3>
              <div class="icon bg-green-100 text-green-600">🏢</div>
            </div>
            <div class="card-content">
              <p class="text-2xl font-bold text-green-600">
                {{ stats()!.activeSuppliers }}
              </p>
              <p class="text-sm text-gray-600">
                of {{ stats()!.totalSuppliers }} total suppliers
              </p>
            </div>
          </div>

          <!-- High Risk Suppliers -->
          <div class="metric-card">
            <div class="card-header">
              <h3 class="text-sm font-medium text-gray-500">High Risk</h3>
              <div class="icon bg-yellow-100 text-yellow-600">🚨</div>
            </div>
            <div class="card-content">
              <p class="text-2xl font-bold text-yellow-600">
                {{ stats()!.highRiskSuppliers.length }}
              </p>
              <p class="text-sm text-gray-600">
                suppliers need attention
              </p>
            </div>
          </div>

        </div>

        <!-- Two Column Layout -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          <!-- Top Suppliers by Outstanding Amount -->
          <div class="card">
            <div class="card-header-with-action">
              <h3 class="text-lg font-semibold text-gray-900">Top Suppliers by Outstanding</h3>
              <button class="btn btn-sm btn-outline">View All</button>
            </div>
            <div class="card-content">
              <div *ngIf="stats()!.topSuppliersByAmount.length === 0" class="empty-state py-8">
                <p class="text-gray-500 text-center">No outstanding amounts found</p>
              </div>
              
              <div *ngFor="let supplier of stats()!.topSuppliersByAmount; trackBy: trackBySupplier" 
                   class="supplier-item">
                <div class="flex justify-between items-center">
                  <div class="flex-1">
                    <h4 class="font-medium text-gray-900">{{ supplier.companyName }}</h4>
                    <p class="text-sm text-gray-600">{{ supplier.count }} factures</p>
                  </div>
                  <div class="text-right">
                    <p class="font-semibold text-gray-900">
                      {{ formatCurrency(supplier.totalAmount) }}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- High Risk Suppliers -->
          <div class="card">
            <div class="card-header-with-action">
              <h3 class="text-lg font-semibold text-gray-900">High Risk Suppliers</h3>
              <button class="btn btn-sm btn-outline">Manage Risks</button>
            </div>
            <div class="card-content">
              <div *ngIf="stats()!.highRiskSuppliers.length === 0" class="empty-state py-8">
                <div class="text-center">
                  <div class="text-4xl mb-2">✅</div>
                  <p class="text-gray-500">All suppliers are low risk</p>
                </div>
              </div>
              
              <div *ngFor="let supplier of stats()!.highRiskSuppliers; trackBy: trackByRiskSupplier" 
                   class="risk-supplier-item">
                <div class="flex justify-between items-start">
                  <div class="flex-1">
                    <h4 class="font-medium text-gray-900">{{ supplier.supplier.companyName }}</h4>
                    <p class="text-sm text-gray-600">{{ supplier.totalFactures }} factures</p>
                    <div class="flex items-center mt-1">
                      <span class="risk-badge" 
                            [class.risk-high]="supplier.paymentRisk === 'High'"
                            [class.risk-critical]="supplier.paymentRisk === 'Critical'">
                        {{ supplier.paymentRisk }} Risk
                      </span>
                    </div>
                  </div>
                  <div class="text-right">
                    <p class="font-semibold text-red-600">
                      {{ formatCurrency(supplier.overdueAmount) }}
                    </p>
                    <p class="text-xs text-gray-500">overdue</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>

        <!-- Branch Analysis -->
        <div class="card mt-8" *ngIf="stats()!.suppliersByBranch.length > 1">
          <div class="card-header-with-action">
            <h3 class="text-lg font-semibold text-gray-900">Suppliers by Branch</h3>
            <button class="btn btn-sm btn-outline">Branch Details</button>
          </div>
          <div class="card-content">
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div *ngFor="let branch of stats()!.suppliersByBranch" class="branch-card">
                <h4 class="font-medium text-gray-900">{{ branch.branchName }}</h4>
                <div class="mt-2 flex justify-between text-sm">
                  <span class="text-gray-600">Total Suppliers:</span>
                  <span class="font-medium">{{ branch.supplierCount }}</span>
                </div>
                <div class="flex justify-between text-sm">
                  <span class="text-gray-600">Active:</span>
                  <span class="font-medium text-green-600">{{ branch.activeCount }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Quick Actions -->
        <div class="card mt-8">
          <div class="card-header">
            <h3 class="text-lg font-semibold text-gray-900">Quick Actions</h3>
          </div>
          <div class="card-content">
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              <button 
                class="action-button" 
                (click)="navigateToSuppliers()">
                <div class="icon bg-blue-100 text-blue-600">👥</div>
                <div>
                  <h4 class="font-medium">Manage Suppliers</h4>
                  <p class="text-sm text-gray-600">Add, edit, or view suppliers</p>
                </div>
              </button>

              <button 
                class="action-button" 
                (click)="navigateToFactures()">
                <div class="icon bg-orange-100 text-orange-600">📋</div>
                <div>
                  <h4 class="font-medium">View Factures</h4>
                  <p class="text-sm text-gray-600">Process invoices and payments</p>
                </div>
              </button>

              <button 
                class="action-button" 
                (click)="testConnectivity()"
                [disabled]="testingConnection()">
                <div class="icon bg-green-100 text-green-600">🔍</div>
                <div>
                  <h4 class="font-medium">
                    {{ testingConnection() ? 'Testing...' : 'Test Integration' }}
                  </h4>
                  <p class="text-sm text-gray-600">Verify backend connectivity</p>
                </div>
              </button>

            </div>
          </div>
        </div>

        <!-- Connection Status -->
        <div class="connection-status mt-6">
          <div class="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div class="flex items-center">
              <div class="status-indicator" 
                   [class.status-connected]="isConnected()"
                   [class.status-disconnected]="!isConnected()">
              </div>
              <span class="ml-2 text-sm text-gray-600">
                Backend Status: {{ isConnected() ? 'Connected' : 'Disconnected' }}
              </span>
            </div>
            <button 
              (click)="refreshData()" 
              class="btn btn-sm btn-outline"
              [disabled]="integrationService.loading()">
              🔄 Refresh
            </button>
          </div>
        </div>

      </div>

      <!-- Empty State (when no data) -->
      <div *ngIf="!stats() && !integrationService.loading() && !integrationService.error()" 
           class="empty-state">
        <div class="text-center py-16">
          <div class="text-6xl mb-4">📊</div>
          <h3 class="text-lg font-medium text-gray-900 mb-2">No Integration Data</h3>
          <p class="text-gray-600 mb-6">Start by loading supplier and facture information</p>
          <button 
            (click)="refreshData()" 
            class="btn btn-primary">
            Load Data
          </button>
        </div>
      </div>

    </div>
  `,
  styles: [`
    .supplier-facture-dashboard {
      padding: 24px;
      max-width: 1400px;
      margin: 0 auto;
    }

    .dashboard-header {
      margin-bottom: 32px;
    }

    .metrics-grid {
      margin-bottom: 32px;
    }

    .metric-card {
      @apply bg-white border border-gray-200 rounded-lg p-6;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }

    .card-header {
      @apply flex items-center justify-between mb-4;
    }

    .card-header-with-action {
      @apply flex items-center justify-between p-6 border-b border-gray-200;
    }

    .card-content {
      @apply p-6;
    }

    .card {
      @apply bg-white border border-gray-200 rounded-lg;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }

    .icon {
      @apply w-10 h-10 rounded-lg flex items-center justify-center text-lg;
    }

    .supplier-item {
      @apply py-4 border-b border-gray-100 last:border-b-0;
    }

    .risk-supplier-item {
      @apply py-4 border-b border-gray-100 last:border-b-0;
    }

    .risk-badge {
      @apply px-2 py-1 text-xs font-medium rounded;
    }

    .risk-badge.risk-high {
      @apply bg-orange-100 text-orange-800;
    }

    .risk-badge.risk-critical {
      @apply bg-red-100 text-red-800;
    }

    .branch-card {
      @apply p-4 bg-gray-50 rounded-lg;
    }

    .action-button {
      @apply flex items-center p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors text-left;
    }

    .action-button .icon {
      @apply mr-4 flex-shrink-0;
    }

    .status-indicator {
      @apply w-3 h-3 rounded-full;
    }

    .status-indicator.status-connected {
      @apply bg-green-500;
    }

    .status-indicator.status-disconnected {
      @apply bg-red-500;
    }

    .loading-spinner {
      @apply w-6 h-6 border-2 border-gray-300 border-t-2 border-t-blue-600 rounded-full animate-spin;
    }

    .btn {
      @apply inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2;
    }

    .btn-primary {
      @apply text-white bg-blue-600 hover:bg-blue-700 focus:ring-blue-500;
    }

    .btn-outline {
      @apply text-gray-700 bg-white border-gray-300 hover:bg-gray-50 focus:ring-blue-500;
    }

    .btn-sm {
      @apply px-3 py-1.5 text-xs;
    }

    .btn:disabled {
      @apply opacity-50 cursor-not-allowed;
    }

    .empty-state {
      @apply text-center text-gray-500;
    }
  `]
})
export class SupplierFactureDashboardComponent implements OnInit {
  protected readonly integrationService = inject(SupplierFactureIntegrationService);
  private readonly factureService = inject(FactureService);

  // Component state
  protected readonly testingConnection = signal<boolean>(false);
  private readonly connectionStatus = signal<boolean>(false);

  // Computed properties
  readonly stats = this.integrationService.integratedStats;
  readonly isConnected = computed(() => this.connectionStatus());

  ngOnInit(): void {
    console.log('🚀 Supplier-Facture Dashboard initialized');
    this.loadDashboardData();
  }

  /**
   * Load all dashboard data
   */
  loadDashboardData(): void {
    console.log('📊 Loading dashboard data...');
    this.integrationService.getIntegratedSupplierAnalytics().subscribe({
      next: (stats) => {
        console.log('✅ Dashboard data loaded:', stats);
        this.connectionStatus.set(true);
      },
      error: (error) => {
        console.error('❌ Error loading dashboard data:', error);
        this.connectionStatus.set(false);
      }
    });
  }

  /**
   * Refresh all data
   */
  refreshData(): void {
    console.log('🔄 Refreshing dashboard data...');
    this.integrationService.refreshIntegratedData().subscribe({
      next: (stats) => {
        console.log('✅ Dashboard data refreshed');
        this.connectionStatus.set(true);
      },
      error: (error) => {
        console.error('❌ Error refreshing data:', error);
        this.connectionStatus.set(false);
      }
    });
  }

  /**
   * Test backend connectivity
   */
  testConnectivity(): void {
    this.testingConnection.set(true);
    console.log('🧪 Testing backend connectivity...');
    
    this.factureService.testConnection().subscribe({
      next: (result) => {
        console.log('✅ Backend connection successful:', result);
        this.connectionStatus.set(true);
        this.testingConnection.set(false);
        // Reload data after successful connection test
        this.loadDashboardData();
      },
      error: (error) => {
        console.error('❌ Backend connection failed:', error);
        this.connectionStatus.set(false);
        this.testingConnection.set(false);
      }
    });
  }

  /**
   * Navigation methods
   */
  navigateToSuppliers(): void {
    console.log('🔗 Navigate to suppliers');
    // Router navigation would go here
  }

  navigateToFactures(): void {
    console.log('🔗 Navigate to factures');
    // Router navigation would go here
  }

  /**
   * TrackBy functions for performance
   */
  trackBySupplier = (index: number, supplier: any): number => supplier.supplierId;
  trackByRiskSupplier = (index: number, supplier: SupplierFactureIntegrationDto): number => supplier.supplier.id;

  /**
   * Utility methods
   */
  formatCurrency(amount: number): string {
    return this.integrationService.formatCurrency(amount);
  }
}