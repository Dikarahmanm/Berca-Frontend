import { Component, OnInit, OnDestroy, inject, signal, computed, ChangeDetectionStrategy, effect, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { SupplierService } from '../../services/supplier.service';
import { FactureAnalyticsService } from '../../services/facture-analytics.service';
import { ToastService } from '../../../../shared/services/toast.service';
import {
  SupplierDto,
  SupplierStatsDto,
  SupplierQueryDto
} from '../../interfaces/supplier.interfaces';
import {
  OutstandingFactureDto,
  TopSupplierByFacturesDto,
  SuppliersByBranchDto,
  SupplierAlertsResponseDto,
  SupplierAlertDto
} from '../../interfaces/facture-analytics.interfaces';

@Component({
  selector: 'app-supplier-dashboard',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="supplier-dashboard">
      <!-- Header Section -->
      <div class="dashboard-header">
        <div class="header-content">
          <div class="header-main">
            <h1 class="dashboard-title">
              <span class="title-icon">🏢</span>
              Supplier Management
            </h1>
            <p class="dashboard-subtitle">
              Comprehensive supplier analytics and management dashboard
            </p>
          </div>
          <div class="header-actions">
            <button class="btn btn-outline" (click)="refreshData()">
              <span class="btn-icon">🔄</span>
              Refresh
            </button>
            <button class="btn btn-primary" (click)="navigateToCreate()">
              <span class="btn-icon">➕</span>
              Add Supplier
            </button>
            <button class="btn btn-secondary" (click)="navigateToList()">
              <span class="btn-icon">📋</span>
              View All
            </button>
          </div>
        </div>
      </div>

      <!-- Loading State -->
      <div *ngIf="loading()" class="loading-section">
        <div class="loading-content">
          <div class="loading-spinner"></div>
          <p class="loading-text">Loading supplier dashboard...</p>
        </div>
      </div>

      <!-- Error State -->
      <div *ngIf="error()" class="error-section card">
        <div class="error-content">
          <div class="error-icon">⚠️</div>
          <div class="error-details">
            <h3>Dashboard Load Error</h3>
            <p>{{ error() }}</p>
          </div>
          <button class="btn btn-outline" (click)="loadDashboardData()">
            Try Again
          </button>
        </div>
      </div>

      <!-- Dashboard Content -->
      <div *ngIf="!loading() && !error()" class="dashboard-content">
        
        <!-- Statistics Cards -->
        <div class="stats-grid">
          <div class="stat-card card stat-primary">
            <div class="stat-icon">
              <span class="icon">🏢</span>
            </div>
            <div class="stat-content">
              <h3 class="stat-number">{{ stats()?.totalSuppliers || 0 }}</h3>
              <p class="stat-label">Total Suppliers</p>
              <div class="stat-trend">
                <span class="trend-indicator positive">↗</span>
                <span class="trend-text">{{ getActivePercentage() }}% active</span>
              </div>
            </div>
          </div>

          <div class="stat-card card stat-success">
            <div class="stat-icon">
              <span class="icon">✅</span>
            </div>
            <div class="stat-content">
              <h3 class="stat-number">{{ stats()?.activeSuppliers || 0 }}</h3>
              <p class="stat-label">Active Suppliers</p>
              <div class="stat-trend">
                <span class="trend-indicator positive">+{{ getNewThisMonth() }}</span>
                <span class="trend-text">this month</span>
              </div>
            </div>
          </div>

          <div class="stat-card card stat-warning">
            <div class="stat-icon">
              <span class="icon">💰</span>
            </div>
            <div class="stat-content">
              <h3 class="stat-number">{{ formatCurrency(stats()?.totalCreditLimit || 0) }}</h3>
              <p class="stat-label">Total Credit Limit</p>
              <div class="stat-trend">
                <span class="trend-indicator neutral">~{{ stats()?.averagePaymentTerms || 0 }}</span>
                <span class="trend-text">avg payment days</span>
              </div>
            </div>
          </div>

          <div class="stat-card card stat-info">
            <div class="stat-icon">
              <span class="icon">📊</span>
            </div>
            <div class="stat-content">
              <h3 class="stat-number">{{ stats()?.suppliersWithOutstandingFactures || 0 }}</h3>
              <p class="stat-label">Outstanding Factures</p>
              <div class="stat-trend">
                <span class="trend-indicator" [class.negative]="(stats()?.suppliersWithOutstandingFactures || 0) > 0">
                  {{ (stats()?.suppliersWithOutstandingFactures || 0) > 0 ? '⚠️' : '✅' }}
                </span>
                <span class="trend-text">
                  {{ (stats()?.suppliersWithOutstandingFactures || 0) > 0 ? 'requires attention' : 'all clear' }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Quick Actions & Alerts Row -->
        <div class="action-alert-grid">
          
          <!-- Quick Actions Card -->
          <div class="quick-actions card">
            <div class="card-header">
              <h3 class="card-title">
                <span class="title-icon">⚡</span>
                Quick Actions
              </h3>
            </div>
            <div class="card-body">
              <div class="action-grid">
                <button class="action-btn action-primary" (click)="navigateToCreate()">
                  <div class="action-icon">➕</div>
                  <div class="action-content">
                    <span class="action-title">Add Supplier</span>
                    <span class="action-desc">Create new supplier</span>
                  </div>
                </button>

                <button class="action-btn action-secondary" (click)="navigateToList()">
                  <div class="action-icon">📋</div>
                  <div class="action-content">
                    <span class="action-title">View All</span>
                    <span class="action-desc">Browse suppliers</span>
                  </div>
                </button>

                <button class="action-btn action-info" (click)="navigateToAnalytics()">
                  <div class="action-icon">📈</div>
                  <div class="action-content">
                    <span class="action-title">Analytics</span>
                    <span class="action-desc">View reports</span>
                  </div>
                </button>

                <button class="action-btn action-warning" (click)="viewAlerts()">
                  <div class="action-icon">🔔</div>
                  <div class="action-content">
                    <span class="action-title">Alerts</span>
                    <span class="action-desc">{{ getTotalAlertsCount() }} alerts</span>
                  </div>
                </button>
              </div>
            </div>
          </div>

          <!-- Alerts Card -->
          <div class="alerts-card card">
            <div class="card-header">
              <h3 class="card-title">
                <span class="title-icon">🔔</span>
                Supplier Alerts
                <span class="alert-count" *ngIf="getTotalAlertsCount() > 0">{{ getTotalAlertsCount() }}</span>
              </h3>
              <button class="btn-link" (click)="viewAllAlerts()" *ngIf="getTotalAlertsCount() > 0">
                View All
              </button>
            </div>
            <div class="card-body">
              <div class="alerts-list" *ngIf="getTotalAlertsCount() > 0">
                <div *ngFor="let alert of getTopAlerts(); trackBy: trackByAlert" 
                     class="alert-item" 
                     [class]="'alert-' + alert.priority.toLowerCase()">
                  <div class="alert-icon">
                    <span [innerHTML]="getAlertIcon(alert.alertType)"></span>
                  </div>
                  <div class="alert-content">
                    <h5 class="alert-title">{{ alert.supplierName }}</h5>
                    <p class="alert-message">{{ alert.message }}</p>
                    <small class="alert-action">{{ alert.actionRequired }}</small>
                  </div>
                  <div class="alert-badge" [class]="'badge-' + alert.priority.toLowerCase()">
                    {{ alert.priority }}
                  </div>
                </div>
              </div>
              
              <div class="empty-alerts" *ngIf="getTotalAlertsCount() === 0">
                <div class="empty-icon">✅</div>
                <p class="empty-text">No active alerts</p>
                <small class="empty-subtext">All suppliers are in good standing</small>
              </div>
            </div>
          </div>
        </div>

        <!-- Performance Charts Row -->
        <div class="charts-grid">
          
          <!-- Top Suppliers Chart -->
          <div class="chart-card card">
            <div class="card-header">
              <h3 class="card-title">
                <span class="title-icon">🏆</span>
                Top Suppliers by Factures
              </h3>
            </div>
            <div class="card-body">
              <div class="chart-container">
                <div class="suppliers-ranking" *ngIf="stats()?.topSuppliersByFactureCount?.length; else noData">
                  <div *ngFor="let supplier of stats()!.topSuppliersByFactureCount; let i = index"
                       class="ranking-item"
                       [class]="'rank-' + (i + 1)">
                    <div class="rank-number">#{{ i + 1 }}</div>
                    <div class="rank-content">
                      <span class="rank-name">{{ supplier.companyName }}</span>
                      <span class="rank-value">{{ supplier.count }} factures</span>
                    </div>
                    <div class="rank-bar">
                      <div class="bar-fill" [style.width.%]="getRankingPercentage(supplier.count, stats()!.topSuppliersByFactureCount)"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Branch Distribution -->
          <div class="chart-card card">
            <div class="card-header">
              <h3 class="card-title">
                <span class="title-icon">🏪</span>
                Suppliers by Branch
              </h3>
            </div>
            <div class="card-body">
              <div class="branch-distribution" *ngIf="stats()?.suppliersByBranch?.length; else noData">
                <div *ngFor="let branch of stats()!.suppliersByBranch; trackBy: trackByBranch"
                     class="branch-item">
                  <div class="branch-info">
                    <span class="branch-name">{{ branch.branchName }}</span>
                    <span class="branch-count">{{ branch.supplierCount }} suppliers</span>
                  </div>
                  <div class="branch-stats">
                    <div class="stat-item">
                      <span class="stat-label">Active:</span>
                      <span class="stat-value">{{ branch.activeCount }}</span>
                    </div>
                    <div class="progress-bar">
                      <div class="progress-fill" 
                           [style.width.%]="getBranchActivePercentage(branch.activeCount, branch.supplierCount)"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Recent Activity -->
        <div class="activity-section">
          <div class="activity-card card">
            <div class="card-header">
              <h3 class="card-title">
                <span class="title-icon">📝</span>
                Recent Supplier Activity
              </h3>
              <div class="header-actions">
                <button class="btn btn-sm btn-outline" (click)="loadRecentSuppliers()">
                  <span class="btn-icon">🔄</span>
                  Refresh
                </button>
              </div>
            </div>
            <div class="card-body">
              <div class="activity-list" *ngIf="recentSuppliers().length > 0">
                <div *ngFor="let supplier of recentSuppliers(); trackBy: trackBySupplier"
                     class="activity-item"
                     (click)="navigateToSupplier(supplier.id)">
                  <div class="activity-avatar">
                    <span class="avatar-text">{{ getSupplierInitials(supplier.companyName) }}</span>
                  </div>
                  <div class="activity-content">
                    <h5 class="activity-title">{{ supplier.companyName || 'N/A' }}</h5>
                    <p class="activity-desc">
                      {{ supplier.contactPerson || 'N/A' }} • {{ supplier.supplierCode || 'N/A' }}
                    </p>
                    <small class="activity-time">{{ formatDate(supplier.createdAt) }}</small>
                  </div>
                  <div class="activity-status">
                    <span class="status-badge"
                          [class.status-active]="supplier.isActive"
                          [class.status-inactive]="!supplier.isActive">
                      {{ supplier.isActive ? 'Active' : 'Inactive' }}
                    </span>
                  </div>
                </div>
              </div>

              <div class="empty-activity" *ngIf="recentSuppliers().length === 0">
                <div class="empty-icon">📭</div>
                <p class="empty-text">No recent activity</p>
                <button class="btn btn-primary" (click)="navigateToCreate()">
                  Add First Supplier
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <ng-template #noData>
      <div class="no-data">
        <div class="no-data-icon">📊</div>
        <p class="no-data-text">No data available</p>
      </div>
    </ng-template>
  `,
  styles: [`
    .supplier-dashboard {
      padding: var(--s6);
      max-width: 1400px;
      margin: 0 auto;
      background: var(--bg-primary);
      min-height: 100vh;
    }

    // ===== HEADER =====
    .dashboard-header {
      margin-bottom: var(--s8);
    }

    .header-content {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: var(--s6);
    }

    .header-main {
      flex: 1;
    }

    .dashboard-title {
      font-size: var(--text-4xl);
      font-weight: var(--font-bold);
      color: var(--text);
      margin: 0 0 var(--s2) 0;
      display: flex;
      align-items: center;
      gap: var(--s3);
    }

    .title-icon {
      font-size: var(--text-3xl);
    }

    .dashboard-subtitle {
      font-size: var(--text-lg);
      color: var(--text-secondary);
      margin: 0;
      line-height: var(--leading-relaxed);
    }

    .header-actions {
      display: flex;
      gap: var(--s3);
      align-items: center;
      flex-wrap: wrap;
    }

    .btn-icon {
      margin-right: var(--s2);
      font-size: var(--text-base);
    }

    // ===== LOADING & ERROR =====
    .loading-section {
      display: flex;
      justify-content: center;
      align-items: center;
      padding: var(--s16);
    }

    .loading-content {
      text-align: center;
    }

    .loading-spinner {
      width: 40px;
      height: 40px;
      border: 4px solid var(--border);
      border-top: 4px solid var(--primary);
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin: 0 auto var(--s4);
    }

    .loading-text {
      font-size: var(--text-base);
      color: var(--text-secondary);
      margin: 0;
    }

    .error-section {
      margin-bottom: var(--s6);
      border-color: var(--error);
      background: var(--error-light);
    }

    .error-content {
      display: flex;
      align-items: center;
      gap: var(--s4);
      padding: var(--s5);
    }

    .error-icon {
      font-size: var(--text-2xl);
      flex-shrink: 0;
    }

    .error-details {
      flex: 1;
    }

    .error-details h3 {
      font-size: var(--text-lg);
      font-weight: var(--font-semibold);
      color: var(--error);
      margin: 0 0 var(--s1) 0;
    }

    .error-details p {
      font-size: var(--text-sm);
      color: var(--text-secondary);
      margin: 0;
    }

    // ===== STATS GRID =====
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: var(--s6);
      margin-bottom: var(--s8);
    }

    .stat-card {
      padding: var(--s6);
      display: flex;
      align-items: center;
      gap: var(--s4);
      border-radius: var(--radius-lg);
      transition: var(--transition);
      position: relative;
      overflow: hidden;

      &:hover {
        transform: translateY(-2px);
        box-shadow: var(--shadow-lg);
      }

      &::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 4px;
        background: var(--primary);
      }

      &.stat-primary::before { background: var(--primary); }
      &.stat-success::before { background: var(--success); }
      &.stat-warning::before { background: var(--warning); }
      &.stat-info::before { background: var(--info); }
    }

    .stat-icon {
      padding: var(--s4);
      background: var(--bg-secondary);
      border-radius: var(--radius-lg);
      flex-shrink: 0;
    }

    .stat-icon .icon {
      font-size: var(--text-2xl);
      display: block;
    }

    .stat-content {
      flex: 1;
      min-width: 0;
    }

    .stat-number {
      font-size: var(--text-3xl);
      font-weight: var(--font-bold);
      color: var(--text);
      margin: 0 0 var(--s1) 0;
      line-height: var(--leading-tight);
    }

    .stat-label {
      font-size: var(--text-base);
      color: var(--text-secondary);
      margin: 0 0 var(--s2) 0;
      font-weight: var(--font-medium);
    }

    .stat-trend {
      display: flex;
      align-items: center;
      gap: var(--s2);
    }

    .trend-indicator {
      padding: var(--s1) var(--s2);
      border-radius: var(--radius);
      font-size: var(--text-xs);
      font-weight: var(--font-medium);

      &.positive {
        background: var(--success-light);
        color: var(--success);
      }

      &.negative {
        background: var(--error-light);
        color: var(--error);
      }

      &.neutral {
        background: var(--bg-secondary);
        color: var(--text-secondary);
      }
    }

    .trend-text {
      font-size: var(--text-xs);
      color: var(--text-muted);
    }

    // ===== ACTION ALERT GRID =====
    .action-alert-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: var(--s6);
      margin-bottom: var(--s8);
    }

    // ===== QUICK ACTIONS =====
    .quick-actions {
      .card-body {
        padding: var(--s5);
      }
    }

    .action-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: var(--s4);
    }

    .action-btn {
      display: flex;
      align-items: center;
      gap: var(--s3);
      padding: var(--s4);
      background: var(--surface);
      border: 2px solid var(--border);
      border-radius: var(--radius-lg);
      cursor: pointer;
      transition: var(--transition);
      text-align: left;

      &:hover {
        border-color: var(--primary);
        transform: translateY(-1px);
        box-shadow: var(--shadow-md);
      }

      &.action-primary:hover { border-color: var(--primary); }
      &.action-secondary:hover { border-color: var(--text-secondary); }
      &.action-info:hover { border-color: var(--info); }
      &.action-warning:hover { border-color: var(--warning); }
    }

    .action-icon {
      font-size: var(--text-xl);
      padding: var(--s3);
      background: var(--bg-secondary);
      border-radius: var(--radius);
      flex-shrink: 0;
    }

    .action-content {
      flex: 1;
      min-width: 0;
    }

    .action-title {
      display: block;
      font-size: var(--text-sm);
      font-weight: var(--font-semibold);
      color: var(--text);
      margin-bottom: var(--s1);
    }

    .action-desc {
      display: block;
      font-size: var(--text-xs);
      color: var(--text-secondary);
    }

    // ===== ALERTS =====
    .alerts-card {
      .card-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
    }

    .alert-count {
      padding: var(--s1) var(--s2);
      background: var(--error);
      color: white;
      border-radius: var(--radius-full);
      font-size: var(--text-xs);
      font-weight: var(--font-bold);
      margin-left: var(--s2);
    }

    .alerts-list {
      display: flex;
      flex-direction: column;
      gap: var(--s4);
      max-height: 300px;
      overflow-y: auto;
    }

    .alert-item {
      display: flex;
      align-items: flex-start;
      gap: var(--s3);
      padding: var(--s4);
      background: var(--bg-secondary);
      border-radius: var(--radius);
      border-left: 4px solid transparent;

      &.alert-critical { border-left-color: var(--error); }
      &.alert-high { border-left-color: var(--warning); }
      &.alert-medium { border-left-color: var(--info); }
      &.alert-low { border-left-color: var(--text-muted); }
    }

    .alert-icon {
      font-size: var(--text-lg);
      flex-shrink: 0;
      padding: var(--s2);
      background: var(--surface);
      border-radius: var(--radius);
    }

    .alert-content {
      flex: 1;
      min-width: 0;
    }

    .alert-title {
      font-size: var(--text-sm);
      font-weight: var(--font-semibold);
      color: var(--text);
      margin: 0 0 var(--s1) 0;
    }

    .alert-message {
      font-size: var(--text-xs);
      color: var(--text-secondary);
      margin: 0 0 var(--s1) 0;
      line-height: var(--leading-relaxed);
    }

    .alert-action {
      font-size: var(--text-xs);
      color: var(--text-muted);
    }

    .alert-badge {
      padding: var(--s1) var(--s2);
      border-radius: var(--radius);
      font-size: var(--text-xs);
      font-weight: var(--font-medium);
      flex-shrink: 0;

      &.badge-critical {
        background: var(--error-light);
        color: var(--error);
      }

      &.badge-high {
        background: var(--warning-light);
        color: var(--warning);
      }

      &.badge-medium {
        background: var(--info-light);
        color: var(--info);
      }

      &.badge-low {
        background: var(--bg-secondary);
        color: var(--text-muted);
      }
    }

    .empty-alerts {
      text-align: center;
      padding: var(--s8);
    }

    .empty-icon {
      font-size: var(--text-4xl);
      margin-bottom: var(--s4);
    }

    .empty-text {
      font-size: var(--text-base);
      font-weight: var(--font-medium);
      color: var(--text);
      margin: 0 0 var(--s1) 0;
    }

    .empty-subtext {
      font-size: var(--text-sm);
      color: var(--text-secondary);
    }

    // ===== CHARTS GRID =====
    .charts-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
      gap: var(--s6);
      margin-bottom: var(--s8);
    }

    .chart-card {
      .card-body {
        padding: var(--s5);
      }
    }

    .chart-container {
      min-height: 250px;
    }

    // ===== SUPPLIERS RANKING =====
    .suppliers-ranking {
      display: flex;
      flex-direction: column;
      gap: var(--s4);
    }

    .ranking-item {
      display: flex;
      align-items: center;
      gap: var(--s3);
      padding: var(--s3);
      background: var(--bg-secondary);
      border-radius: var(--radius);

      &.rank-1 .rank-number {
        background: linear-gradient(135deg, #ffd700, #ffed4a);
        color: #744210;
      }

      &.rank-2 .rank-number {
        background: linear-gradient(135deg, #c0c0c0, #e2e8f0);
        color: #4a5568;
      }

      &.rank-3 .rank-number {
        background: linear-gradient(135deg, #cd7f32, #d69e2e);
        color: #744210;
      }
    }

    .rank-number {
      padding: var(--s2) var(--s3);
      background: var(--primary);
      color: white;
      border-radius: var(--radius);
      font-size: var(--text-sm);
      font-weight: var(--font-bold);
      flex-shrink: 0;
      min-width: 40px;
      text-align: center;
    }

    .rank-content {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: var(--s1);
    }

    .rank-name {
      font-size: var(--text-sm);
      font-weight: var(--font-semibold);
      color: var(--text);
    }

    .rank-value {
      font-size: var(--text-xs);
      color: var(--text-secondary);
    }

    .rank-bar {
      flex: 1;
      height: 6px;
      background: var(--border);
      border-radius: var(--radius-full);
      overflow: hidden;
      margin-left: var(--s4);
    }

    .bar-fill {
      height: 100%;
      background: var(--primary);
      transition: width 0.5s ease;
    }

    // ===== BRANCH DISTRIBUTION =====
    .branch-distribution {
      display: flex;
      flex-direction: column;
      gap: var(--s4);
    }

    .branch-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: var(--s4);
      background: var(--bg-secondary);
      border-radius: var(--radius);
      gap: var(--s4);
    }

    .branch-info {
      flex: 1;
      min-width: 0;
    }

    .branch-name {
      display: block;
      font-size: var(--text-sm);
      font-weight: var(--font-semibold);
      color: var(--text);
      margin-bottom: var(--s1);
    }

    .branch-count {
      font-size: var(--text-xs);
      color: var(--text-secondary);
    }

    .branch-stats {
      display: flex;
      align-items: center;
      gap: var(--s3);
      flex-shrink: 0;
    }

    .stat-item {
      display: flex;
      align-items: center;
      gap: var(--s1);
    }

    .stat-label {
      font-size: var(--text-xs);
      color: var(--text-secondary);
    }

    .stat-value {
      font-size: var(--text-xs);
      font-weight: var(--font-semibold);
      color: var(--text);
    }

    .progress-bar {
      width: 60px;
      height: 4px;
      background: var(--border);
      border-radius: var(--radius-full);
      overflow: hidden;
    }

    .progress-fill {
      height: 100%;
      background: var(--success);
      transition: width 0.5s ease;
    }

    // ===== ACTIVITY SECTION =====
    .activity-section {
      margin-bottom: var(--s8);
    }

    .activity-card {
      .card-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
    }

    .activity-list {
      display: flex;
      flex-direction: column;
      gap: var(--s4);
      max-height: 400px;
      overflow-y: auto;
    }

    .activity-item {
      display: flex;
      align-items: center;
      gap: var(--s4);
      padding: var(--s4);
      background: var(--bg-secondary);
      border-radius: var(--radius);
      cursor: pointer;
      transition: var(--transition);

      &:hover {
        background: var(--surface);
        transform: translateX(4px);
        box-shadow: var(--shadow-sm);
      }
    }

    .activity-avatar {
      width: 44px;
      height: 44px;
      background: var(--primary);
      border-radius: var(--radius-full);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .avatar-text {
      font-size: var(--text-sm);
      font-weight: var(--font-bold);
      color: white;
    }

    .activity-content {
      flex: 1;
      min-width: 0;
    }

    .activity-title {
      font-size: var(--text-sm);
      font-weight: var(--font-semibold);
      color: var(--text);
      margin: 0 0 var(--s1) 0;
    }

    .activity-desc {
      font-size: var(--text-xs);
      color: var(--text-secondary);
      margin: 0 0 var(--s1) 0;
    }

    .activity-time {
      font-size: var(--text-xs);
      color: var(--text-muted);
    }

    .activity-status {
      flex-shrink: 0;
    }

    .status-badge {
      padding: var(--s1) var(--s3);
      border-radius: var(--radius-full);
      font-size: var(--text-xs);
      font-weight: var(--font-medium);

      &.status-active {
        background: var(--success-light);
        color: var(--success);
      }

      &.status-inactive {
        background: var(--bg-secondary);
        color: var(--text-muted);
      }
    }

    .empty-activity {
      text-align: center;
      padding: var(--s12);
    }

    // ===== NO DATA =====
    .no-data {
      text-align: center;
      padding: var(--s8);
    }

    .no-data-icon {
      font-size: var(--text-4xl);
      margin-bottom: var(--s4);
      opacity: 0.5;
    }

    .no-data-text {
      font-size: var(--text-base);
      color: var(--text-secondary);
      margin: 0;
    }

    // ===== CARD COMPONENTS =====
    .card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      overflow: hidden;
    }

    .card-header {
      padding: var(--s5) var(--s6);
      border-bottom: 1px solid var(--border);
      background: var(--bg-secondary);
    }

    .card-title {
      font-size: var(--text-lg);
      font-weight: var(--font-semibold);
      color: var(--text);
      margin: 0;
      display: flex;
      align-items: center;
      gap: var(--s2);
    }

    .card-body {
      padding: var(--s6);
    }

    // ===== BUTTONS =====
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: var(--s3) var(--s5);
      border: 2px solid transparent;
      border-radius: var(--radius);
      font-size: var(--text-sm);
      font-weight: var(--font-medium);
      cursor: pointer;
      transition: var(--transition);
      text-decoration: none;
      min-height: 44px;

      &.btn-primary {
        background: var(--primary);
        color: white;
        border-color: var(--primary);

        &:hover {
          background: var(--primary-hover);
          border-color: var(--primary-hover);
        }
      }

      &.btn-secondary {
        background: var(--bg-secondary);
        color: var(--text);
        border-color: var(--border);

        &:hover {
          background: var(--border);
        }
      }

      &.btn-outline {
        background: var(--surface);
        color: var(--text);
        border-color: var(--border);

        &:hover {
          background: var(--primary);
          color: white;
          border-color: var(--primary);
        }
      }

      &.btn-sm {
        padding: var(--s2) var(--s3);
        font-size: var(--text-xs);
        min-height: 36px;
      }

      &.btn-link {
        background: transparent;
        color: var(--primary);
        border: none;
        text-decoration: underline;
        min-height: auto;
        padding: 0;

        &:hover {
          color: var(--primary-hover);
        }
      }
    }

    // ===== ANIMATIONS =====
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    // ===== RESPONSIVE =====
    @media (max-width: 768px) {
      .supplier-dashboard {
        padding: var(--s4);
      }

      .header-content {
        flex-direction: column;
        align-items: stretch;
        gap: var(--s4);
      }

      .dashboard-title {
        font-size: var(--text-2xl);
      }

      .stats-grid {
        grid-template-columns: 1fr;
        gap: var(--s4);
      }

      .action-alert-grid {
        grid-template-columns: 1fr;
        gap: var(--s4);
      }

      .action-grid {
        grid-template-columns: 1fr;
        gap: var(--s3);
      }

      .charts-grid {
        grid-template-columns: 1fr;
        gap: var(--s4);
      }
    }

    @media (max-width: 480px) {
      .dashboard-title {
        font-size: var(--text-xl);
        flex-direction: column;
        text-align: center;
        gap: var(--s2);
      }

      .header-actions {
        flex-direction: column;
        width: 100%;
      }

      .btn {
        width: 100%;
      }
    }
  `]
})
export class SupplierDashboardComponent implements OnInit, OnDestroy {
  // Injected services
  private readonly supplierService = inject(SupplierService);
  private readonly factureAnalyticsService = inject(FactureAnalyticsService);
  private readonly toastService = inject(ToastService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  // Component state
  private readonly destroy$ = new Subject<void>();

  // Signal state
  private _loading = signal<boolean>(false);
  private _error = signal<string | null>(null);
  private _stats = signal<SupplierStatsDto | null>(null);
  private _alerts = signal<SupplierAlertsResponseDto | null>(null);
  private _recentSuppliers = signal<SupplierDto[]>([]);
  private _outstandingFactures = signal<OutstandingFactureDto[]>([]);
  private _topSuppliers = signal<TopSupplierByFacturesDto[]>([]);
  private _suppliersByBranch = signal<SuppliersByBranchDto[]>([]);

  // Public readonly signals
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly stats = this._stats.asReadonly();
  readonly alerts = this._alerts.asReadonly();
  readonly recentSuppliers = this._recentSuppliers.asReadonly();
  readonly outstandingFactures = this._outstandingFactures.asReadonly();
  readonly topSuppliers = this._topSuppliers.asReadonly();
  readonly suppliersByBranch = this._suppliersByBranch.asReadonly();

  // Effect for reactive updates
  constructor() {
    effect(() => {
      // Trigger change detection when signals update
      const stats = this.stats();
      const alerts = this.alerts();
      const suppliers = this.recentSuppliers();
      
      console.log('📊 Dashboard data updated:', {
        stats: stats ? 'loaded' : 'empty',
        alerts: this.getTotalAlertsCount(),
        suppliers: suppliers.length
      });
      
      this.cdr.markForCheck();
    });
  }

  ngOnInit(): void {
    this.loadDashboardData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Load all dashboard data
  loadDashboardData(): void {
    this._loading.set(true);
    this._error.set(null);

    // Use the new analytics service for comprehensive dashboard data
    this.factureAnalyticsService.getDashboardSummary().subscribe({
      next: (summary) => {
        console.log('📊 Dashboard summary received:', summary);
        
        // Update signals with real data
        this._outstandingFactures.set(summary.outstandingFactures);
        this._topSuppliers.set(summary.topSuppliers);
        this._suppliersByBranch.set(summary.suppliersByBranch);
        this._alerts.set(summary.alerts);

        // Calculate and set stats from real data
        this.calculateStatsFromRealData(summary);
        
        this._loading.set(false);
      },
      error: (error) => {
        console.error('❌ Error loading dashboard data:', error);
        this._error.set('Failed to load dashboard data');
        this._loading.set(false);
        
        // Load fallback data
        this.loadFallbackData();
      }
    });

    // Also load recent suppliers from supplier service
    this.loadRecentSuppliers();
  }

  // Calculate stats from real analytics data
  private calculateStatsFromRealData(summary: any): void {
    const outstandingFactures: OutstandingFactureDto[] = summary.outstandingFactures || [];
    const topSuppliers: TopSupplierByFacturesDto[] = summary.topSuppliers || [];
    const suppliersByBranch: SuppliersByBranchDto[] = summary.suppliersByBranch || [];
    const alerts = summary.alerts || { summary: {} };

    // Calculate totals from real data
    const totalOutstanding = outstandingFactures.reduce((sum: number, f: OutstandingFactureDto) => sum + f.outstandingAmount, 0);
    const totalFactures = outstandingFactures.length;
    const uniqueSuppliers = new Set(outstandingFactures.map((f: OutstandingFactureDto) => f.supplierName));
    const totalSuppliers = uniqueSuppliers.size;
    const overdueCount = outstandingFactures.filter((f: OutstandingFactureDto) => f.isOverdue).length;
    const activeSuppliers = topSuppliers.length;

    // Calculate averages
    const averageFactureAmount = totalFactures > 0 ? totalOutstanding / totalFactures : 0;
    const averagePaymentTerms = suppliersByBranch.reduce((sum: number, b: SuppliersByBranchDto) => sum + (b.averageFactureAmount || 0), 0) / (suppliersByBranch.length || 1);

    // Set calculated stats
    this._stats.set({
      totalSuppliers: totalSuppliers,
      activeSuppliers: activeSuppliers,
      inactiveSuppliers: Math.max(0, totalSuppliers - activeSuppliers),
      averagePaymentTerms: Math.round(averagePaymentTerms / 1000000 * 30), // Convert to days estimate
      totalCreditLimit: totalOutstanding,
      suppliersWithOutstandingFactures: overdueCount,
      topSuppliersByFactureCount: topSuppliers.map(s => ({
        supplierId: s.supplierId,
        companyName: s.companyName,
        count: s.totalOutstandingFactures,
        totalAmount: s.totalOutstandingAmount
      })) || [],
      topSuppliersByAmount: topSuppliers.map(s => ({
        supplierId: s.supplierId,
        companyName: s.companyName,
        count: s.totalOutstandingFactures,
        totalAmount: s.totalOutstandingAmount
      })) || [],
      suppliersByBranch: suppliersByBranch.map(b => ({
        branchId: b.branchId,
        branchName: b.branchName,
        supplierCount: b.totalSuppliers,
        activeCount: b.activeSuppliers
      })) || []
    });

    console.log('📈 Stats calculated from real data:', {
      totalSuppliers,
      totalFactures,
      totalOutstanding,
      overdueCount,
      activeSuppliers
    });
  }

  // Load fallback data when analytics fail
  private loadFallbackData(): void {
    Promise.all([
      this.loadStats(),
      this.loadAlerts(),
      this.loadRecentSuppliers()
    ]).finally(() => {
      this._loading.set(false);
    });
  }

  // Load supplier statistics
  private async loadStats(): Promise<void> {
    try {
      this.supplierService.getSupplierStats().subscribe({
        next: (stats) => {
          this._stats.set(stats);
          console.log('📊 Supplier stats loaded:', stats);
        },
        error: (error) => {
          console.error('Error loading supplier stats:', error);
          // Set default/empty stats instead of error for stats
          this._stats.set({
            totalSuppliers: 0,
            activeSuppliers: 0,
            inactiveSuppliers: 0,
            averagePaymentTerms: 0,
            totalCreditLimit: 0,
            suppliersWithOutstandingFactures: 0,
            topSuppliersByFactureCount: [],
            topSuppliersByAmount: [],
            suppliersByBranch: []
          });
        }
      });
    } catch (error) {
      console.error('Error in loadStats:', error);
    }
  }

  // Load supplier alerts (fallback method)
  private async loadAlerts(): Promise<void> {
    try {
      this.factureAnalyticsService.getSupplierAlerts().subscribe({
        next: (alertsResponse) => {
          this._alerts.set(alertsResponse);
          console.log('🔔 Supplier alerts loaded:', {
            critical: alertsResponse?.criticalAlerts?.length || 0,
            warning: alertsResponse?.warningAlerts?.length || 0,
            info: alertsResponse?.infoAlerts?.length || 0
          });
        },
        error: (error) => {
          console.error('Error loading supplier alerts:', error);
          // Set empty alerts structure for fallback
          this._alerts.set({
            criticalAlerts: [],
            warningAlerts: [],
            infoAlerts: [],
            summary: {
              totalCriticalAlerts: 0,
              totalWarningAlerts: 0,
              totalInfoAlerts: 0,
              unreadAlerts: 0,
              totalAmountAtRisk: 0,
              suppliersWithAlerts: 0,
              lastUpdated: new Date().toISOString(),
              alertsByCategory: []
            }
          });
        }
      });
    } catch (error) {
      console.error('Error in loadAlerts:', error);
    }
  }

  // Load recent suppliers
  async loadRecentSuppliers(): Promise<void> {
    try {
      const query: SupplierQueryDto = {
        page: 1,
        pageSize: 10,
        sortBy: 'createdAt',
        sortOrder: 'desc'
      };

      this.supplierService.getSuppliers(query).subscribe({
        next: (response) => {
          this._recentSuppliers.set(response.suppliers || []);
          console.log('👥 Recent suppliers loaded:', response.suppliers?.length || 0);
        },
        error: (error) => {
          console.error('Error loading recent suppliers:', error);
          // Don't set main error for recent suppliers failure
        }
      });
    } catch (error) {
      console.error('Error in loadRecentSuppliers:', error);
    }
  }

  // Refresh all data
  refreshData(): void {
    this.loadDashboardData();
    this.toastService.showInfo('Info', 'Dashboard refreshed successfully');
  }

  // Navigation methods
  navigateToCreate(): void {
    this.router.navigate(['/dashboard/supplier/create']);
  }

  navigateToList(): void {
    this.router.navigate(['/dashboard/supplier/list']);
  }

  navigateToAnalytics(): void {
    // TODO: Implement supplier analytics page
    this.toastService.showInfo('Info', 'Supplier analytics coming soon');
  }

  navigateToSupplier(id: number): void {
    this.router.navigate(['/dashboard/supplier', id]);
  }

  // Alert methods
  viewAlerts(): void {
    // TODO: Implement alerts modal or page
    this.toastService.showInfo('Info', `You have ${this.getTotalAlertsCount()} active alerts`);
  }

  viewAllAlerts(): void {
    // TODO: Navigate to alerts page
    this.toastService.showInfo('Info', 'Viewing all supplier alerts');
  }

  getTotalAlertsCount(): number {
    const alertsResponse = this.alerts();
    if (!alertsResponse) return 0;
    
    return (alertsResponse.criticalAlerts?.length || 0) +
           (alertsResponse.warningAlerts?.length || 0) +
           (alertsResponse.infoAlerts?.length || 0);
  }

  getTopAlerts(): SupplierAlertDto[] {
    const alertsResponse = this.alerts();
    if (!alertsResponse) return [];

    // Combine all alerts and sort by priority (Critical > High > Medium > Low)
    const allAlerts = [
      ...(alertsResponse.criticalAlerts || []),
      ...(alertsResponse.warningAlerts || []),
      ...(alertsResponse.infoAlerts || [])
    ];

    // Sort by priority and take top 3
    const priorityOrder = { 'Critical': 4, 'High': 3, 'Medium': 2, 'Low': 1 };
    return allAlerts
      .sort((a, b) => (priorityOrder[b.priority as keyof typeof priorityOrder] || 0) - 
                      (priorityOrder[a.priority as keyof typeof priorityOrder] || 0))
      .slice(0, 3);
  }

  // Statistics calculations
  getActivePercentage(): number {
    const stats = this.stats();
    if (!stats || stats.totalSuppliers === 0) return 0;
    return Math.round((stats.activeSuppliers / stats.totalSuppliers) * 100);
  }

  getNewThisMonth(): number {
    // Mock calculation - in real app, this would come from backend
    const stats = this.stats();
    return stats ? Math.floor(stats.activeSuppliers * 0.1) : 0;
  }

  // Chart calculations
  getRankingPercentage(count: number, allRankings: any[]): number {
    if (!allRankings || allRankings.length === 0) return 0;
    const max = Math.max(...allRankings.map(r => r.count));
    return max === 0 ? 0 : (count / max) * 100;
  }

  getBranchActivePercentage(active: number, total: number): number {
    return total === 0 ? 0 : (active / total) * 100;
  }

  // Utility methods
  formatCurrency(amount: number | undefined): string {
    if (amount === null || amount === undefined || isNaN(amount)) {
      return 'N/A';
    }
    
    try {
      return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(amount);
    } catch (error) {
      console.error('Error formatting currency:', error, 'Amount:', amount);
      return 'Format Error';
    }
  }

  formatDate(date: string | undefined): string {
    if (!date) return 'N/A';
    
    try {
      const dateObj = new Date(date);
      if (isNaN(dateObj.getTime())) {
        return 'Invalid Date';
      }
      
      return new Intl.DateTimeFormat('id-ID', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      }).format(dateObj);
    } catch (error) {
      console.error('Error formatting date:', error, 'Date:', date);
      return 'Error';
    }
  }

  getSupplierInitials(companyName: string | undefined): string {
    if (!companyName) return '?';
    
    const words = companyName.split(' ').filter(word => word.length > 0);
    if (words.length === 1) {
      return words[0].substring(0, 2).toUpperCase();
    }
    return words.slice(0, 2).map(word => word[0]).join('').toUpperCase();
  }

  getAlertIcon(alertType: string): string {
    const iconMap: { [key: string]: string } = {
      'OVERDUE_PAYMENTS': '💸',
      'CREDIT_LIMIT_EXCEEDED': '⚠️',
      'INACTIVE_LONG_TIME': '⏰',
      'MISSING_CONTACT_INFO': '📞'
    };
    return iconMap[alertType] || '🔔';
  }

  // TrackBy functions for performance
  trackByAlert(index: number, alert: SupplierAlertDto): number {
    return alert.id;
  }

  trackBySupplier(index: number, supplier: SupplierDto): number {
    return supplier.id;
  }

  trackByBranch(index: number, branch: any): number {
    return branch.branchId;
  }
}