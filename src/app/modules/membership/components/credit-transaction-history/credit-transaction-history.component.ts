// Enhanced Credit Transaction History Component
// POS Toko Eniwan - Phase 4 Implementation
// Comprehensive transaction history with advanced filtering, analytics, and export capabilities

import { 
  Component, 
  input, 
  output, 
  signal, 
  computed, 
  inject,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy 
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { Subject, takeUntil, debounceTime, distinctUntilChanged } from 'rxjs';

// Services
import { MemberCreditService } from '../../services/member-credit.service';

// Interfaces
import { 
  CreditTransactionDto,
  CreditTransactionType,
  PaymentMethod 
} from '../../interfaces/member-credit.interfaces';

// Utilities
import { formatCurrency } from '../../utils/credit-utils';

export type ViewMode = 'list' | 'timeline' | 'summary';
export type TransactionFilter = 'all' | 'sales' | 'payments' | 'grants' | 'adjustments';

interface TransactionGroup {
  date: string;
  transactions: CreditTransactionDto[];
  totalAmount: number;
  netChange: number;
}

interface TransactionSummary {
  totalTransactions: number;
  totalSales: number;
  totalPayments: number;
  totalGrants: number;
  totalAdjustments: number;
  netChange: number;
  periodStart: string;
  periodEnd: string;
}

@Component({
  selector: 'app-credit-transaction-history',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="transaction-history-container">
      <!-- Header with Controls -->
      <div class="history-header">
        <div class="header-content">
          <h3 class="history-title">Credit Transaction History</h3>
          <div class="member-info" *ngIf="memberName()">
            <span class="member-name">{{ memberName() }}</span>
            <span class="member-number">{{ memberNumber() }}</span>
          </div>
        </div>
        
        <div class="header-actions">
          <!-- View Mode Toggle -->
          <div class="view-mode-toggle">
            <button 
              class="view-btn"
              [class.active]="viewMode() === 'list'"
              (click)="setViewMode('list')"
              title="List View">
              <span class="view-icon">📋</span>
            </button>
            <button 
              class="view-btn"
              [class.active]="viewMode() === 'timeline'"
              (click)="setViewMode('timeline')"
              title="Timeline View">
              <span class="view-icon">📅</span>
            </button>
            <button 
              class="view-btn"
              [class.active]="viewMode() === 'summary'"
              (click)="setViewMode('summary')"
              title="Summary View">
              <span class="view-icon">📊</span>
            </button>
          </div>

          <!-- Export Button -->
          <button class="btn btn-outline" (click)="onExportTransactions()" 
                  [disabled]="filteredTransactions().length === 0">
            <span class="btn-icon">📤</span>
            <span class="btn-text">Export</span>
          </button>
        </div>
      </div>

      <!-- Filters and Search -->
      <div class="filters-section">
        <form [formGroup]="filterForm" class="filters-form">
          <div class="filter-row">
            <!-- Search Input -->
            <div class="filter-field">
              <input 
                type="text"
                formControlName="search"
                class="filter-input"
                placeholder="Search transactions..."
                (input)="onSearchChange($event)">
            </div>

            <!-- Transaction Type Filter -->
            <div class="filter-field">
              <select formControlName="transactionType" class="filter-select">
                <option value="">All Types</option>
                <option value="Sale">Sales</option>
                <option value="Payment">Payments</option>
                <option value="Credit_Grant">Credit Grants</option>
                <option value="Credit_Adjustment">Adjustments</option>
                <option value="Fee">Fees</option>
                <option value="Interest">Interest</option>
              </select>
            </div>

            <!-- Payment Method Filter -->
            <div class="filter-field">
              <select formControlName="paymentMethod" class="filter-select">
                <option value="">All Methods</option>
                <option value="Cash">Cash</option>
                <option value="Transfer">Transfer</option>
                <option value="Credit_Card">Credit Card</option>
                <option value="E_Wallet">E-Wallet</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div class="filter-row">
            <!-- Date Range -->
            <div class="filter-field">
              <input 
                type="date"
                formControlName="dateFrom"
                class="filter-input"
                placeholder="From date">
            </div>

            <div class="filter-field">
              <input 
                type="date"
                formControlName="dateTo"
                class="filter-input"
                placeholder="To date">
            </div>

            <!-- Amount Range -->
            <div class="filter-field">
              <input 
                type="number"
                formControlName="minAmount"
                class="filter-input"
                placeholder="Min amount">
            </div>

            <div class="filter-field">
              <input 
                type="number"
                formControlName="maxAmount"
                class="filter-input"
                placeholder="Max amount">
            </div>
          </div>
        </form>

        <!-- Active Filters Display -->
        <div class="active-filters" *ngIf="hasActiveFilters()">
          <div class="filter-tags">
            <span class="filter-tag" *ngFor="let filter of getActiveFilterTags()" (click)="removeFilter(filter.key)">
              {{ filter.label }}
              <span class="remove-tag">×</span>
            </span>
          </div>
          <button class="clear-filters-btn" (click)="clearAllFilters()">
            Clear All
          </button>
        </div>
      </div>

      <!-- Transaction Summary Stats -->
      <div class="summary-stats" *ngIf="transactionSummary()">
        <div class="stat-card">
          <div class="stat-icon">📊</div>
          <div class="stat-content">
            <div class="stat-value">{{ transactionSummary().totalTransactions || 0 }}</div>
            <div class="stat-label">Total Transactions</div>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon">💰</div>
          <div class="stat-content">
            <div class="stat-value">{{ formatCurrency(transactionSummary().totalPayments || 0) }}</div>
            <div class="stat-label">Total Payments</div>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon">🛒</div>
          <div class="stat-content">
            <div class="stat-value">{{ formatCurrency(transactionSummary().totalSales || 0) }}</div>
            <div class="stat-label">Total Sales</div>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon">📈</div>
          <div class="stat-content">
            <div class="stat-value" [class.positive]="(transactionSummary().netChange || 0) >= 0" 
                                   [class.negative]="(transactionSummary().netChange || 0) < 0">
              {{ formatCurrency(transactionSummary().netChange || 0) }}
            </div>
            <div class="stat-label">Net Change</div>
          </div>
        </div>
      </div>

      <!-- Loading State -->
      <div class="loading-section" *ngIf="loading()">
        <div class="loading-spinner"></div>
        <p class="loading-text">Loading transaction history...</p>
      </div>

      <!-- Error State -->
      <div class="error-section" *ngIf="error()">
        <div class="error-content">
          <span class="error-icon">⚠️</span>
          <div class="error-details">
            <h4>Error Loading Transactions</h4>
            <p>{{ error() }}</p>
            <button class="btn btn-outline" (click)="onRetryLoad()">Try Again</button>
          </div>
        </div>
      </div>

      <!-- Transaction Content -->
      <div class="transaction-content" *ngIf="!loading() && !error()">
        
        <!-- List View -->
        <div class="list-view" *ngIf="viewMode() === 'list'">
          <div class="transaction-list">
            <div 
              class="transaction-item" 
              *ngFor="let transaction of paginatedTransactions(); trackBy: trackByTransaction"
              [class]="getTransactionItemClass(transaction)">
              
              <div class="transaction-main">
                <div class="transaction-header">
                  <div class="transaction-type-badge" [class]="getTransactionTypeClass(transaction.transactionType)">
                    <span class="type-icon">{{ getTransactionTypeIcon(transaction.transactionType) }}</span>
                    <span class="type-text">{{ transaction.transactionType.replace('_', ' ') }}</span>
                  </div>
                  
                  <div class="transaction-date">
                    {{ formatDateTime(transaction.createdAt) }}
                  </div>
                </div>

                <div class="transaction-body">
                  <div class="transaction-description">
                    {{ transaction.description }}
                  </div>
                  
                  <div class="transaction-details">
                    <span class="transaction-ref" *ngIf="transaction.referenceNumber">
                      Ref: {{ transaction.referenceNumber }}
                    </span>
                    <span class="transaction-method" *ngIf="transaction.paymentMethod">
                      {{ transaction.paymentMethod.replace('_', ' ') }}
                    </span>
                    <span class="transaction-branch">{{ transaction.branchName }}</span>
                    <span class="transaction-by" *ngIf="transaction.createdBy">
                      by {{ transaction.createdBy }}
                    </span>
                  </div>
                </div>
              </div>

              <div class="transaction-amounts">
                <div class="amount-main" [class]="getAmountClass(transaction)">
                  {{ getAmountPrefix(transaction) }}{{ formatCurrency(Math.abs(transaction.amount)) }}
                </div>
                
                <div class="balance-info">
                  <div class="balance-change">
                    Balance: {{ formatCurrency(transaction.balanceBefore) }} → {{ formatCurrency(transaction.balanceAfter) }}
                  </div>
                </div>

                <!-- Transaction Actions -->
                <div class="transaction-actions" *ngIf="showActions()">
                  <button class="action-btn" (click)="onViewTransactionDetail(transaction)" title="View Details">
                    <span class="action-icon">👁️</span>
                  </button>
                  <button class="action-btn" *ngIf="transaction.saleId" (click)="onViewSale(transaction.saleId!)" title="View Sale">
                    <span class="action-icon">🛒</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Timeline View -->
        <div class="timeline-view" *ngIf="viewMode() === 'timeline'">
          <div class="timeline-container">
            <div 
              class="timeline-group" 
              *ngFor="let group of transactionGroups(); trackBy: trackByGroup">
              
              <div class="timeline-date-header">
                <div class="date-badge">{{ formatDate(group.date) }}</div>
                <div class="group-summary">
                  <span class="transaction-count">{{ group.transactions.length }} transaction(s)</span>
                  <span class="group-total" [class.positive]="group.netChange >= 0" [class.negative]="group.netChange < 0">
                    {{ formatCurrency(group.netChange) }}
                  </span>
                </div>
              </div>

              <div class="timeline-transactions">
                <div 
                  class="timeline-item" 
                  *ngFor="let transaction of group.transactions; trackBy: trackByTransaction">
                  
                  <div class="timeline-marker" [class]="getTransactionTypeClass(transaction.transactionType)">
                    <span class="marker-icon">{{ getTransactionTypeIcon(transaction.transactionType) }}</span>
                  </div>
                  
                  <div class="timeline-content">
                    <div class="timeline-header">
                      <div class="transaction-time">{{ formatTime(transaction.createdAt) }}</div>
                      <div class="transaction-amount" [class]="getAmountClass(transaction)">
                        {{ getAmountPrefix(transaction) }}{{ formatCurrency(Math.abs(transaction.amount)) }}
                      </div>
                    </div>
                    
                    <div class="timeline-description">{{ transaction.description }}</div>
                    
                    <div class="timeline-meta">
                      <span *ngIf="transaction.paymentMethod">{{ transaction.paymentMethod.replace('_', ' ') }}</span>
                      <span *ngIf="transaction.referenceNumber">Ref: {{ transaction.referenceNumber }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Summary View -->
        <div class="summary-view" *ngIf="viewMode() === 'summary'">
          <div class="summary-grid">
            <!-- Transaction Type Breakdown -->
            <div class="summary-card">
              <h4 class="summary-title">Transaction Types</h4>
              <div class="summary-chart">
                <div 
                  class="chart-bar" 
                  *ngFor="let type of getTransactionTypeBreakdown()"
                  [style.height.%]="type.percentage">
                  <div class="bar-fill" [class]="getTransactionTypeClass(type.type)"></div>
                  <div class="bar-label">{{ type.type.replace('_', ' ') }}</div>
                  <div class="bar-value">{{ type.count }}</div>
                </div>
              </div>
            </div>

            <!-- Monthly Trend -->
            <div class="summary-card">
              <h4 class="summary-title">Monthly Activity</h4>
              <div class="trend-chart">
                <div 
                  class="trend-bar" 
                  *ngFor="let month of getMonthlyTrend()"
                  [style.height.%]="month.percentage">
                  <div class="trend-fill"></div>
                  <div class="trend-label">{{ month.month }}</div>
                  <div class="trend-value">{{ month.count }}</div>
                </div>
              </div>
            </div>

            <!-- Payment Methods -->
            <div class="summary-card">
              <h4 class="summary-title">Payment Methods</h4>
              <div class="method-list">
                <div 
                  class="method-item" 
                  *ngFor="let method of getPaymentMethodBreakdown()">
                  <div class="method-info">
                    <span class="method-name">{{ method.method || 'N/A' }}</span>
                    <span class="method-count">{{ method.count }} transaction(s)</span>
                  </div>
                  <div class="method-amount">{{ formatCurrency(method.amount) }}</div>
                </div>
              </div>
            </div>

            <!-- Balance Timeline -->
            <div class="summary-card">
              <h4 class="summary-title">Balance History</h4>
              <div class="balance-chart">
                <div 
                  class="balance-point" 
                  *ngFor="let point of getBalanceHistory(); let i = index"
                  [style.left.%]="point.position"
                  [style.bottom.%]="point.height"
                  [title]="'Balance: ' + formatCurrency(point.balance) + ' on ' + formatDate(point.date)">
                  <div class="point-marker" [class.positive]="point.balance >= 0" [class.negative]="point.balance < 0"></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Empty State -->
        <div class="empty-state" *ngIf="filteredTransactions().length === 0 && !loading()">
          <div class="empty-icon">📋</div>
          <h4 class="empty-title">No transactions found</h4>
          <p class="empty-message">
            {{ hasActiveFilters() ? 'Try adjusting your filters to see more results.' : 'No credit transactions available for this member.' }}
          </p>
          <button class="btn btn-outline" (click)="clearAllFilters()" *ngIf="hasActiveFilters()">
            Clear Filters
          </button>
        </div>

        <!-- Pagination -->
        <div class="pagination" *ngIf="filteredTransactions().length > pageSize() && viewMode() === 'list'">
          <div class="pagination-info">
            Showing {{ getStartIndex() + 1 }} - {{ getEndIndex() }} of {{ filteredTransactions().length }} transactions
          </div>
          
          <div class="pagination-controls">
            <button class="page-btn" [disabled]="currentPage() === 1" (click)="previousPage()">
              <span class="page-icon">‹</span>
              Previous
            </button>
            
            <div class="page-numbers">
              <button 
                class="page-number" 
                *ngFor="let page of getVisiblePages()" 
                [class.active]="page === currentPage()"
                [disabled]="page === '...'"
                (click)="goToPage(page)">
                {{ page }}
              </button>
            </div>
            
            <button class="page-btn" [disabled]="currentPage() === totalPages()" (click)="nextPage()">
              Next
              <span class="page-icon">›</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    // Container
    .transaction-history-container {
      background: var(--surface);
      border: 2px solid var(--border);
      border-radius: var(--radius-xl);
      overflow: hidden;
      box-shadow: var(--shadow-sm);
    }

    // Header
    .history-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: var(--s6);
      background: linear-gradient(135deg, var(--bg) 0%, var(--bg-secondary) 100%);
      border-bottom: 2px solid var(--border);

      .header-content {
        .history-title {
          font-size: var(--text-2xl) !important;
          font-weight: var(--font-bold) !important;
          color: var(--text) !important;
          margin: 0 0 var(--s2) 0 !important;
        }

        .member-info {
          display: flex;
          gap: var(--s3);
          align-items: center;

          .member-name {
            font-size: var(--text-base);
            font-weight: var(--font-medium);
            color: var(--text);
          }

          .member-number {
            font-size: var(--text-sm);
            background: var(--primary-light);
            color: var(--primary);
            padding: var(--s1) var(--s2);
            border-radius: var(--radius-sm);
            font-weight: var(--font-medium);
          }
        }
      }

      .header-actions {
        display: flex;
        gap: var(--s4);
        align-items: center;

        .view-mode-toggle {
          display: flex;
          border: 2px solid var(--border);
          border-radius: var(--radius);
          overflow: hidden;

          .view-btn {
            padding: var(--s2) var(--s3);
            border: none;
            background: var(--surface);
            cursor: pointer;
            transition: var(--transition);
            display: flex;
            align-items: center;
            justify-content: center;

            &:hover {
              background: var(--primary-light);
            }

            &.active {
              background: var(--primary);
              color: white;
            }

            .view-icon {
              font-size: var(--text-base);
            }
          }
        }
      }
    }

    // Filters
    .filters-section {
      padding: var(--s6);
      background: var(--bg);
      border-bottom: 1px solid var(--border);

      .filters-form {
        .filter-row {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: var(--s4);
          margin-bottom: var(--s4);

          &:last-child {
            margin-bottom: 0;
          }
        }

        .filter-field {
          display: flex;
          flex-direction: column;
        }

        .filter-input,
        .filter-select {
          padding: var(--s3);
          border: 2px solid var(--border);
          border-radius: var(--radius);
          font-size: var(--text-sm);
          background: var(--surface);
          color: var(--text);
          transition: var(--transition);

          &:focus {
            outline: none;
            border-color: var(--primary);
          }
        }
      }

      .active-filters {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-top: var(--s4);
        padding-top: var(--s4);
        border-top: 1px solid var(--border);

        .filter-tags {
          display: flex;
          gap: var(--s2);
          flex-wrap: wrap;

          .filter-tag {
            background: var(--primary-light);
            color: var(--primary);
            font-size: var(--text-xs);
            padding: var(--s1) var(--s2);
            border-radius: var(--radius-sm);
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: var(--s1);

            .remove-tag {
              font-weight: var(--font-bold);
              margin-left: var(--s1);
            }

            &:hover {
              background: var(--primary);
              color: white;
            }
          }
        }

        .clear-filters-btn {
          padding: var(--s2) var(--s4);
          background: transparent;
          color: var(--text-secondary);
          border: 2px solid var(--border);
          border-radius: var(--radius);
          font-size: var(--text-sm);
          cursor: pointer;
          transition: var(--transition);

          &:hover {
            background: var(--error);
            color: white;
            border-color: var(--error);
          }
        }
      }
    }

    // Summary Stats
    .summary-stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: var(--s4);
      padding: var(--s6);
      background: var(--bg);
      border-bottom: 1px solid var(--border);

      .stat-card {
        display: flex;
        align-items: center;
        gap: var(--s4);
        padding: var(--s4);
        background: var(--surface);
        border: 2px solid var(--border);
        border-radius: var(--radius);

        .stat-icon {
          font-size: var(--text-2xl);
          opacity: 0.7;
        }

        .stat-content {
          .stat-value {
            font-size: var(--text-xl);
            font-weight: var(--font-bold);
            color: var(--text);
            line-height: 1.2;

            &.positive {
              color: var(--success);
            }

            &.negative {
              color: var(--error);
            }
          }

          .stat-label {
            font-size: var(--text-xs);
            color: var(--text-secondary);
            margin-top: var(--s1);
          }
        }
      }
    }

    // Loading & Error States
    .loading-section,
    .error-section {
      padding: var(--s16);
      text-align: center;

      .loading-spinner {
        width: 40px;
        height: 40px;
        border: 4px solid var(--border);
        border-top: 4px solid var(--primary);
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin: 0 auto var(--s4) auto;
      }

      .error-content {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: var(--s4);

        .error-icon {
          font-size: var(--text-3xl);
        }

        .error-details {
          text-align: left;

          h4 {
            color: var(--error);
            margin: 0 0 var(--s2) 0;
          }

          p {
            color: var(--text-secondary);
            margin: 0 0 var(--s4) 0;
          }
        }
      }
    }

    // List View
    .list-view {
      .transaction-list {
        .transaction-item {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          padding: var(--s6);
          border-bottom: 1px solid var(--border);
          transition: var(--transition);

          &:hover {
            background: var(--bg);
          }

          &:last-child {
            border-bottom: none;
          }

          .transaction-main {
            flex: 1;

            .transaction-header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-bottom: var(--s3);

              .transaction-type-badge {
                display: flex;
                align-items: center;
                gap: var(--s2);
                padding: var(--s2) var(--s3);
                border-radius: var(--radius);
                font-size: var(--text-sm);
                font-weight: var(--font-medium);

                &.sale {
                  background: rgba(255, 193, 7, 0.1);
                  color: var(--warning);
                }

                &.payment {
                  background: rgba(82, 165, 115, 0.1);
                  color: var(--success);
                }

                &.credit_grant {
                  background: rgba(255, 145, 77, 0.1);
                  color: var(--primary);
                }

                &.credit_adjustment,
                &.fee,
                &.interest {
                  background: rgba(75, 130, 246, 0.1);
                  color: var(--info);
                }
              }

              .transaction-date {
                font-size: var(--text-sm);
                color: var(--text-secondary);
              }
            }

            .transaction-body {
              .transaction-description {
                font-size: var(--text-base);
                font-weight: var(--font-medium);
                color: var(--text);
                margin-bottom: var(--s2);
              }

              .transaction-details {
                display: flex;
                gap: var(--s3);
                flex-wrap: wrap;
                font-size: var(--text-xs);
                color: var(--text-secondary);

                span {
                  background: var(--bg);
                  padding: var(--s1) var(--s2);
                  border-radius: var(--radius-sm);
                }
              }
            }
          }

          .transaction-amounts {
            text-align: right;
            display: flex;
            flex-direction: column;
            align-items: flex-end;
            gap: var(--s2);

            .amount-main {
              font-size: var(--text-xl);
              font-weight: var(--font-bold);

              &.positive {
                color: var(--success);
              }

              &.negative {
                color: var(--error);
              }
            }

            .balance-info {
              font-size: var(--text-xs);
              color: var(--text-secondary);
            }

            .transaction-actions {
              display: flex;
              gap: var(--s2);

              .action-btn {
                width: 32px;
                height: 32px;
                border: 2px solid var(--border);
                border-radius: var(--radius);
                background: var(--surface);
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                transition: var(--transition);

                &:hover {
                  background: var(--primary);
                  border-color: var(--primary);
                  color: white;
                }
              }
            }
          }
        }
      }
    }

    // Timeline View
    .timeline-view {
      .timeline-container {
        padding: var(--s6);

        .timeline-group {
          margin-bottom: var(--s8);

          &:last-child {
            margin-bottom: 0;
          }

          .timeline-date-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: var(--s6);
            padding: var(--s4);
            background: var(--bg);
            border-radius: var(--radius);

            .date-badge {
              font-size: var(--text-lg);
              font-weight: var(--font-bold);
              color: var(--primary);
            }

            .group-summary {
              display: flex;
              gap: var(--s4);
              align-items: center;

              .transaction-count {
                font-size: var(--text-sm);
                color: var(--text-secondary);
              }

              .group-total {
                font-size: var(--text-base);
                font-weight: var(--font-bold);

                &.positive {
                  color: var(--success);
                }

                &.negative {
                  color: var(--error);
                }
              }
            }
          }

          .timeline-transactions {
            position: relative;

            &::before {
              content: '';
              position: absolute;
              left: 24px;
              top: 0;
              bottom: 0;
              width: 2px;
              background: var(--border);
            }

            .timeline-item {
              display: flex;
              gap: var(--s4);
              margin-bottom: var(--s4);
              position: relative;

              &:last-child {
                margin-bottom: 0;
              }

              .timeline-marker {
                width: 48px;
                height: 48px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                border: 3px solid var(--border);
                background: var(--surface);
                z-index: 1;

                &.sale {
                  border-color: var(--warning);
                  background: var(--warning);
                  color: white;
                }

                &.payment {
                  border-color: var(--success);
                  background: var(--success);
                  color: white;
                }

                &.credit_grant {
                  border-color: var(--primary);
                  background: var(--primary);
                  color: white;
                }

                .marker-icon {
                  font-size: var(--text-base);
                }
              }

              .timeline-content {
                flex: 1;
                padding: var(--s4);
                background: var(--surface);
                border: 2px solid var(--border);
                border-radius: var(--radius);

                .timeline-header {
                  display: flex;
                  justify-content: space-between;
                  align-items: center;
                  margin-bottom: var(--s2);

                  .transaction-time {
                    font-size: var(--text-sm);
                    color: var(--text-secondary);
                    font-weight: var(--font-medium);
                  }

                  .transaction-amount {
                    font-size: var(--text-lg);
                    font-weight: var(--font-bold);

                    &.positive {
                      color: var(--success);
                    }

                    &.negative {
                      color: var(--error);
                    }
                  }
                }

                .timeline-description {
                  font-size: var(--text-base);
                  color: var(--text);
                  margin-bottom: var(--s2);
                }

                .timeline-meta {
                  display: flex;
                  gap: var(--s3);
                  font-size: var(--text-xs);
                  color: var(--text-secondary);

                  span {
                    background: var(--bg);
                    padding: var(--s1) var(--s2);
                    border-radius: var(--radius-sm);
                  }
                }
              }
            }
          }
        }
      }
    }

    // Summary View
    .summary-view {
      padding: var(--s6);

      .summary-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
        gap: var(--s6);

        .summary-card {
          background: var(--surface);
          border: 2px solid var(--border);
          border-radius: var(--radius);
          padding: var(--s6);

          .summary-title {
            font-size: var(--text-lg) !important;
            font-weight: var(--font-semibold) !important;
            color: var(--text) !important;
            margin: 0 0 var(--s4) 0 !important;
          }

          .summary-chart,
          .trend-chart {
            display: flex;
            gap: var(--s2);
            align-items: flex-end;
            height: 150px;

            .chart-bar,
            .trend-bar {
              flex: 1;
              display: flex;
              flex-direction: column;
              align-items: center;
              position: relative;

              .bar-fill,
              .trend-fill {
                width: 100%;
                border-radius: var(--radius-sm) var(--radius-sm) 0 0;
                transition: var(--transition);

                &.sale {
                  background: var(--warning);
                }

                &.payment {
                  background: var(--success);
                }

                &.credit_grant {
                  background: var(--primary);
                }
              }

              .trend-fill {
                background: var(--primary);
              }

              .bar-label,
              .trend-label {
                font-size: var(--text-xs);
                color: var(--text-secondary);
                margin-top: var(--s2);
                transform: rotate(-45deg);
                white-space: nowrap;
              }

              .bar-value,
              .trend-value {
                position: absolute;
                top: -20px;
                font-size: var(--text-xs);
                font-weight: var(--font-bold);
                color: var(--text);
              }
            }
          }

          .method-list {
            .method-item {
              display: flex;
              justify-content: space-between;
              align-items: center;
              padding: var(--s3) 0;
              border-bottom: 1px solid var(--border);

              &:last-child {
                border-bottom: none;
              }

              .method-info {
                display: flex;
                flex-direction: column;
                gap: var(--s1);

                .method-name {
                  font-size: var(--text-sm);
                  font-weight: var(--font-medium);
                  color: var(--text);
                }

                .method-count {
                  font-size: var(--text-xs);
                  color: var(--text-secondary);
                }
              }

              .method-amount {
                font-size: var(--text-base);
                font-weight: var(--font-bold);
                color: var(--primary);
              }
            }
          }

          .balance-chart {
            position: relative;
            height: 100px;
            background: var(--bg);
            border-radius: var(--radius);
            overflow: hidden;

            .balance-point {
              position: absolute;
              width: 6px;
              height: 6px;

              .point-marker {
                width: 100%;
                height: 100%;
                border-radius: 50%;
                border: 2px solid white;

                &.positive {
                  background: var(--success);
                }

                &.negative {
                  background: var(--error);
                }
              }
            }
          }
        }
      }
    }

    // Empty State
    .empty-state {
      padding: var(--s16);
      text-align: center;

      .empty-icon {
        font-size: 4rem;
        margin-bottom: var(--s4);
        opacity: 0.5;
      }

      .empty-title {
        font-size: var(--text-lg) !important;
        font-weight: var(--font-semibold) !important;
        color: var(--text) !important;
        margin: 0 0 var(--s2) 0 !important;
      }

      .empty-message {
        font-size: var(--text-base);
        color: var(--text-secondary);
        margin: 0 0 var(--s6) 0;
      }
    }

    // Pagination
    .pagination {
      padding: var(--s6);
      border-top: 1px solid var(--border);
      background: var(--bg);
      display: flex;
      justify-content: space-between;
      align-items: center;

      .pagination-info {
        font-size: var(--text-sm);
        color: var(--text-secondary);
      }

      .pagination-controls {
        display: flex;
        gap: var(--s4);
        align-items: center;

        .page-btn {
          display: flex;
          align-items: center;
          gap: var(--s2);
          padding: var(--s2) var(--s4);
          border: 2px solid var(--border);
          border-radius: var(--radius);
          background: var(--surface);
          color: var(--text);
          cursor: pointer;
          transition: var(--transition);

          &:hover:not(:disabled) {
            background: var(--primary);
            border-color: var(--primary);
            color: white;
          }

          &:disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }
        }

        .page-numbers {
          display: flex;
          gap: var(--s2);

          .page-number {
            width: 36px;
            height: 36px;
            border: 2px solid var(--border);
            border-radius: var(--radius);
            background: var(--surface);
            color: var(--text);
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: var(--transition);
            font-size: var(--text-sm);

            &:hover:not(:disabled) {
              background: var(--primary-light);
              border-color: var(--primary);
            }

            &.active {
              background: var(--primary);
              border-color: var(--primary);
              color: white;
            }

            &:disabled {
              opacity: 0.5;
              cursor: default;
            }
          }
        }
      }
    }

    // Button Styles
    .btn {
      display: inline-flex !important;
      align-items: center !important;
      justify-content: center !important;
      gap: var(--s2) !important;
      padding: var(--s3) var(--s4) !important;
      border-radius: var(--radius) !important;
      font-size: var(--text-sm) !important;
      font-weight: var(--font-medium) !important;
      text-decoration: none !important;
      cursor: pointer !important;
      transition: var(--transition) !important;
      border: 2px solid transparent !important;

      &:disabled {
        opacity: 0.6 !important;
        cursor: not-allowed !important;
      }

      &.btn-outline {
        background: transparent !important;
        color: var(--text-secondary) !important;
        border-color: var(--border) !important;

        &:hover:not(:disabled) {
          background: var(--bg-secondary) !important;
          color: var(--text) !important;
          border-color: var(--text-secondary) !important;
        }
      }
    }

    // Animations
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    // Responsive Design
    @media (max-width: 768px) {
      .history-header {
        flex-direction: column;
        gap: var(--s4);
        align-items: stretch;

        .header-actions {
          justify-content: space-between;
        }
      }

      .filters-form .filter-row {
        grid-template-columns: 1fr !important;
      }

      .summary-stats {
        grid-template-columns: repeat(2, 1fr) !important;
      }

      .summary-grid {
        grid-template-columns: 1fr !important;
      }

      .transaction-item {
        flex-direction: column !important;
        gap: var(--s4) !important;

        .transaction-amounts {
          text-align: left !important;
          align-items: flex-start !important;
        }
      }

      .timeline-item {
        .timeline-content {
          .timeline-header {
            flex-direction: column !important;
            align-items: flex-start !important;
            gap: var(--s2) !important;
          }
        }
      }

      .pagination {
        flex-direction: column;
        gap: var(--s4);

        .pagination-controls {
          flex-wrap: wrap;
        }
      }
    }
  `]
})
export class CreditTransactionHistoryComponent implements OnInit, OnDestroy {
  // Input signals
  readonly memberId = input<number | null>(null);
  readonly memberName = input<string>('');
  readonly memberNumber = input<string>('');
  readonly showActions = input<boolean>(true);
  readonly initialTransactions = input<CreditTransactionDto[]>([]);

  // Output events
  readonly viewTransactionDetail = output<CreditTransactionDto>();
  readonly viewSale = output<number>();
  readonly exportRequested = output<CreditTransactionDto[]>();
  readonly retryLoad = output<void>();

  // Injected services
  private readonly fb = inject(FormBuilder);
  private readonly creditService = inject(MemberCreditService);

  // Component signals
  private readonly transactions = signal<CreditTransactionDto[]>([]);
  readonly viewMode = signal<ViewMode>('list');
  readonly loading = signal<boolean>(false);
  readonly error = signal<string | null>(null);

  // Pagination
  readonly currentPage = signal<number>(1);
  readonly pageSize = signal<number>(10);
  
  // Math utility for templates
  Math = Math;

  // Filter form
  filterForm: FormGroup;

  // Lifecycle
  private readonly destroy$ = new Subject<void>();

  // Computed properties
  readonly filteredTransactions = computed(() => {
    let filtered = this.transactions();
    const formValue = this.filterForm?.value;

    if (!formValue) return filtered;

    // Search filter
    if (formValue.search) {
      const search = formValue.search.toLowerCase();
      filtered = filtered.filter(t => 
        t.description.toLowerCase().includes(search) ||
        t.referenceNumber?.toLowerCase().includes(search) ||
        t.createdBy.toLowerCase().includes(search)
      );
    }

    // Transaction type filter
    if (formValue.transactionType) {
      filtered = filtered.filter(t => t.transactionType === formValue.transactionType);
    }

    // Payment method filter
    if (formValue.paymentMethod) {
      filtered = filtered.filter(t => t.paymentMethod === formValue.paymentMethod);
    }

    // Date range filter
    if (formValue.dateFrom) {
      filtered = filtered.filter(t => t.createdAt >= formValue.dateFrom);
    }

    if (formValue.dateTo) {
      filtered = filtered.filter(t => t.createdAt <= formValue.dateTo);
    }

    // Amount range filter
    if (formValue.minAmount) {
      filtered = filtered.filter(t => Math.abs(t.amount) >= formValue.minAmount);
    }

    if (formValue.maxAmount) {
      filtered = filtered.filter(t => Math.abs(t.amount) <= formValue.maxAmount);
    }

    return filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  });

  readonly paginatedTransactions = computed(() => {
    const filtered = this.filteredTransactions();
    const start = (this.currentPage() - 1) * this.pageSize();
    return filtered.slice(start, start + this.pageSize());
  });

  readonly totalPages = computed(() => 
    Math.ceil(this.filteredTransactions().length / this.pageSize())
  );

  readonly transactionGroups = computed(() => {
    const transactions = this.filteredTransactions();
    const groups = new Map<string, TransactionGroup>();

    transactions.forEach(transaction => {
      const date = transaction.createdAt.split('T')[0];
      if (!groups.has(date)) {
        groups.set(date, {
          date,
          transactions: [],
          totalAmount: 0,
          netChange: 0
        });
      }

      const group = groups.get(date)!;
      group.transactions.push(transaction);
      group.totalAmount += Math.abs(transaction.amount);
      group.netChange += this.getTransactionSign(transaction) * transaction.amount;
    });

    return Array.from(groups.values()).sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  });

  readonly transactionSummary = computed((): TransactionSummary => {
    const transactions = this.filteredTransactions();
    
    const summary: TransactionSummary = {
      totalTransactions: transactions.length,
      totalSales: 0,
      totalPayments: 0,
      totalGrants: 0,
      totalAdjustments: 0,
      netChange: 0,
      periodStart: '',
      periodEnd: ''
    };

    if (transactions.length === 0) return summary;

    transactions.forEach(t => {
      const amount = Math.abs(t.amount);
      switch (t.transactionType) {
        case 'Sale':
          summary.totalSales += amount;
          summary.netChange += amount;
          break;
        case 'Payment':
          summary.totalPayments += amount;
          summary.netChange -= amount;
          break;
        case 'Credit_Grant':
          summary.totalGrants += amount;
          summary.netChange += amount;
          break;
        case 'Credit_Adjustment':
        case 'Fee':
        case 'Interest':
          summary.totalAdjustments += amount;
          summary.netChange += this.getTransactionSign(t) * amount;
          break;
      }
    });

    const dates = transactions.map(t => t.createdAt).sort();
    summary.periodStart = dates[0];
    summary.periodEnd = dates[dates.length - 1];

    return summary;
  });

  constructor() {
    this.filterForm = this.fb.group({
      search: [''],
      transactionType: [''],
      paymentMethod: [''],
      dateFrom: [''],
      dateTo: [''],
      minAmount: [''],
      maxAmount: ['']
    });
  }

  ngOnInit(): void {
    // Initialize with provided transactions or load from service
    const initial = this.initialTransactions();
    if (initial && initial.length > 0) {
      this.transactions.set(initial);
    } else {
      this.loadTransactions();
    }

    this.setupFilterListeners();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Setup methods
  private setupFilterListeners(): void {
    this.filterForm.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        this.currentPage.set(1); // Reset to first page on filter change
      });
  }

  // Data loading
  private async loadTransactions(): Promise<void> {
    const memberId = this.memberId();
    if (!memberId) return;

    this.loading.set(true);
    this.error.set(null);

    try {
      const transactions = await this.creditService.getCreditHistory(
        memberId
      ).toPromise();

      if (transactions) {
        this.transactions.set(transactions);
      }
    } catch (error: any) {
      this.error.set(error.message || 'Failed to load transaction history');
      console.error('Error loading transactions:', error);
    } finally {
      this.loading.set(false);
    }
  }

  // View mode management
  setViewMode(mode: ViewMode): void {
    this.viewMode.set(mode);
  }

  // Event handlers
  onSearchChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.filterForm.patchValue({ search: target.value });
  }

  onViewTransactionDetail(transaction: CreditTransactionDto): void {
    this.viewTransactionDetail.emit(transaction);
  }

  onViewSale(saleId: number): void {
    this.viewSale.emit(saleId);
  }

  onExportTransactions(): void {
    this.exportRequested.emit(this.filteredTransactions());
  }

  onRetryLoad(): void {
    this.retryLoad.emit();
    this.loadTransactions();
  }

  // Filter management
  hasActiveFilters(): boolean {
    const formValue = this.filterForm.value;
    return Object.values(formValue).some(value => 
      value !== null && value !== undefined && value !== ''
    );
  }

  getActiveFilterTags(): Array<{key: string, label: string}> {
    const tags: Array<{key: string, label: string}> = [];
    const formValue = this.filterForm.value;

    Object.entries(formValue).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        let label = `${key}: ${value}`;
        
        // Format specific labels
        if (key === 'transactionType') {
          label = `Type: ${(value as string).replace('_', ' ')}`;
        } else if (key === 'paymentMethod') {
          label = `Method: ${(value as string).replace('_', ' ')}`;
        } else if (key === 'minAmount' || key === 'maxAmount') {
          label = `${key === 'minAmount' ? 'Min' : 'Max'}: ${this.formatCurrency(value as number)}`;
        } else if (key === 'dateFrom' || key === 'dateTo') {
          label = `${key === 'dateFrom' ? 'From' : 'To'}: ${this.formatDate(value as string)}`;
        }

        tags.push({ key, label });
      }
    });

    return tags;
  }

  removeFilter(key: string): void {
    this.filterForm.patchValue({ [key]: '' });
  }

  clearAllFilters(): void {
    this.filterForm.reset();
  }

  // Pagination methods
  previousPage(): void {
    if (this.currentPage() > 1) {
      this.currentPage.update(page => page - 1);
    }
  }

  nextPage(): void {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.update(page => page + 1);
    }
  }

  goToPage(page: number | string): void {
    if (typeof page === 'number' && page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
    }
  }

  getStartIndex(): number {
    return (this.currentPage() - 1) * this.pageSize();
  }

  getEndIndex(): number {
    return Math.min(this.getStartIndex() + this.pageSize(), this.filteredTransactions().length);
  }

  getVisiblePages(): (number | string)[] {
    const current = this.currentPage();
    const total = this.totalPages();
    const pages: (number | string)[] = [];

    if (total <= 7) {
      for (let i = 1; i <= total; i++) {
        pages.push(i);
      }
    } else {
      if (current <= 4) {
        for (let i = 1; i <= 5; i++) pages.push(i);
        pages.push('...');
        pages.push(total);
      } else if (current >= total - 3) {
        pages.push(1);
        pages.push('...');
        for (let i = total - 4; i <= total; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push('...');
        for (let i = current - 1; i <= current + 1; i++) pages.push(i);
        pages.push('...');
        pages.push(total);
      }
    }

    return pages;
  }

  // Summary calculations
  getTransactionTypeBreakdown(): Array<{type: string, count: number, percentage: number}> {
    const transactions = this.filteredTransactions();
    const breakdown = new Map<string, number>();

    transactions.forEach(t => {
      breakdown.set(t.transactionType, (breakdown.get(t.transactionType) || 0) + 1);
    });

    const maxCount = Math.max(...Array.from(breakdown.values()));
    
    return Array.from(breakdown.entries()).map(([type, count]) => ({
      type,
      count,
      percentage: maxCount > 0 ? (count / maxCount) * 100 : 0
    }));
  }

  getMonthlyTrend(): Array<{month: string, count: number, percentage: number}> {
    const transactions = this.filteredTransactions();
    const monthly = new Map<string, number>();

    transactions.forEach(t => {
      const month = new Date(t.createdAt).toLocaleDateString('id-ID', { month: 'short', year: '2-digit' });
      monthly.set(month, (monthly.get(month) || 0) + 1);
    });

    const maxCount = Math.max(...Array.from(monthly.values()));

    return Array.from(monthly.entries()).map(([month, count]) => ({
      month,
      count,
      percentage: maxCount > 0 ? (count / maxCount) * 100 : 0
    }));
  }

  getPaymentMethodBreakdown(): Array<{method: string, count: number, amount: number}> {
    const transactions = this.filteredTransactions().filter(t => t.paymentMethod);
    const breakdown = new Map<string, {count: number, amount: number}>();

    transactions.forEach(t => {
      const method = t.paymentMethod || 'Unknown';
      const current = breakdown.get(method) || {count: 0, amount: 0};
      breakdown.set(method, {
        count: current.count + 1,
        amount: current.amount + Math.abs(t.amount)
      });
    });

    return Array.from(breakdown.entries()).map(([method, data]) => ({
      method,
      ...data
    }));
  }

  getBalanceHistory(): Array<{date: string, balance: number, position: number, height: number}> {
    const transactions = this.filteredTransactions().slice(-20); // Last 20 transactions
    const history = transactions.map((t, index) => ({
      date: t.createdAt,
      balance: t.balanceAfter,
      position: (index / (transactions.length - 1)) * 100,
      height: 50 // Simplified for demo
    }));

    return history;
  }

  // Utility methods
  getTransactionItemClass(transaction: CreditTransactionDto): string {
    const classes = ['transaction-item'];
    
    if (transaction.isPaid === false && transaction.transactionType === 'Sale') {
      classes.push('unpaid');
    }

    return classes.join(' ');
  }

  getTransactionTypeClass(type: string): string {
    return type.toLowerCase().replace('_', '');
  }

  getTransactionTypeIcon(type: string): string {
    const icons = {
      'Sale': '🛒',
      'Payment': '💰',
      'Credit_Grant': '💳',
      'Credit_Adjustment': '⚙️',
      'Fee': '💳',
      'Interest': '📈'
    };
    return icons[type as keyof typeof icons] || '📋';
  }

  getAmountClass(transaction: CreditTransactionDto): string {
    return this.getTransactionSign(transaction) > 0 ? 'positive' : 'negative';
  }

  getAmountPrefix(transaction: CreditTransactionDto): string {
    return this.getTransactionSign(transaction) > 0 ? '+' : '-';
  }

  private getTransactionSign(transaction: CreditTransactionDto): number {
    // Sales, grants, adjustments increase debt (positive)
    // Payments reduce debt (negative)
    switch (transaction.transactionType) {
      case 'Payment':
        return -1;
      default:
        return 1;
    }
  }

  // Formatting methods
  formatCurrency = formatCurrency;

  formatDate(dateString: string): string {
    try {
      return new Date(dateString).toLocaleDateString('id-ID', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return 'Invalid Date';
    }
  }

  formatDateTime(dateString: string): string {
    try {
      return new Date(dateString).toLocaleString('id-ID');
    } catch {
      return 'Invalid Date';
    }
  }

  formatTime(dateString: string): string {
    try {
      return new Date(dateString).toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Invalid Time';
    }
  }

  // TrackBy functions
  trackByTransaction = (index: number, transaction: CreditTransactionDto): number => transaction.id;
  trackByGroup = (index: number, group: TransactionGroup): string => group.date;
}