import { Component, signal, computed, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NgxChartsModule } from '@swimlane/ngx-charts';
import { MemberCreditService } from '../../services/member-credit.service';
import { 
  MemberCreditSummaryDto as MemberCreditDto, 
  CreditTransactionDto 
} from '../../interfaces/member-credit.interfaces';

export interface CollectionAccount {
  id: number;
  memberId: number;
  memberName: string;
  memberCode: string;
  currentDebt: number;
  overdueDays: number;
  lastPaymentDate: string;
  lastContactDate?: string;
  collectionStatus: 'New' | 'In Progress' | 'Contacted' | 'Promise to Pay' | 'Dispute' | 'Legal' | 'Write Off';
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  assignedCollector?: string;
  notes: CollectionNote[];
  contactAttempts: number;
  nextFollowUpDate?: string;
}

export interface CollectionNote {
  id: number;
  note: string;
  createdBy: string;
  createdAt: string;
  noteType: 'Contact' | 'Promise' | 'Dispute' | 'Payment' | 'General';
}

export interface CollectionAction {
  id: number;
  accountId: number;
  actionType: 'Phone Call' | 'Email' | 'SMS' | 'Letter' | 'Visit' | 'Legal Notice';
  actionDate: string;
  performedBy: string;
  outcome: 'Connected' | 'No Answer' | 'Busy' | 'Promise to Pay' | 'Dispute' | 'Refused' | 'Invalid Contact';
  notes: string;
  nextActionDate?: string;
  amount?: number;
}

export interface CollectionStrategy {
  id: number;
  name: string;
  description: string;
  overdueThresholds: {
    days: number;
    actions: string[];
    priority: 'Low' | 'Medium' | 'High' | 'Critical';
  }[];
  isActive: boolean;
}

export interface CollectionReport {
  totalOverdueAccounts: number;
  totalOverdueAmount: number;
  averageOverdueDays: number;
  collectionRate: number;
  newAccountsToday: number;
  contactedToday: number;
  promisesToPay: number;
  collectionsThisMonth: number;
  byStatus: Record<string, number>;
  byPriority: Record<string, number>;
  collectorPerformance: CollectorPerformance[];
}

export interface CollectorPerformance {
  collectorName: string;
  assignedAccounts: number;
  contactedToday: number;
  collections: number;
  totalCollected: number;
  successRate: number;
}

@Component({
  selector: 'app-collections-management',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, NgxChartsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="collections-container">
      <!-- Header -->
      <div class="collections-header">
        <div class="header-title">
          <h2>Collections Management</h2>
          <p class="subtitle">Manage overdue accounts and collection activities</p>
        </div>
        
        <div class="header-actions">
          <button class="btn btn-outline" (click)="refreshData()">
            <i class="lucide-refresh-cw" [class.spinning]="loading()"></i>
            Refresh
          </button>
          <button class="btn btn-primary" (click)="showBulkActionsModal()">
            <i class="lucide-zap"></i>
            Bulk Actions
          </button>
          <button class="btn btn-primary" (click)="generateReport()">
            <i class="lucide-bar-chart-3"></i>
            Generate Report
          </button>
        </div>
      </div>

      <!-- KPI Dashboard -->
      <div class="kpi-grid">
        <div class="kpi-card critical">
          <div class="kpi-icon">
            <i class="lucide-alert-circle"></i>
          </div>
          <div class="kpi-content">
            <div class="kpi-value">{{ report().totalOverdueAccounts }}</div>
            <div class="kpi-label">Overdue Accounts</div>
            <div class="kpi-trend negative">
              +{{ report().newAccountsToday }} today
            </div>
          </div>
        </div>

        <div class="kpi-card warning">
          <div class="kpi-icon">
            <i class="lucide-dollar-sign"></i>
          </div>
          <div class="kpi-content">
            <div class="kpi-value">{{ formatCurrency(report().totalOverdueAmount) }}</div>
            <div class="kpi-label">Total Overdue</div>
            <div class="kpi-trend neutral">
              {{ report().averageOverdueDays }} avg days
            </div>
          </div>
        </div>

        <div class="kpi-card success">
          <div class="kpi-icon">
            <i class="lucide-target"></i>
          </div>
          <div class="kpi-content">
            <div class="kpi-value">{{ report().collectionRate }}%</div>
            <div class="kpi-label">Collection Rate</div>
            <div class="kpi-trend positive">
              {{ report().contactedToday }} contacted today
            </div>
          </div>
        </div>

        <div class="kpi-card info">
          <div class="kpi-icon">
            <i class="lucide-handshake"></i>
          </div>
          <div class="kpi-content">
            <div class="kpi-value">{{ report().promisesToPay }}</div>
            <div class="kpi-label">Promises to Pay</div>
            <div class="kpi-trend positive">
              {{ formatCurrency(report().collectionsThisMonth) }} collected
            </div>
          </div>
        </div>
      </div>

      <!-- Filters and Search -->
      <div class="filters-section">
        <div class="search-box">
          <i class="lucide-search"></i>
          <input 
            type="text" 
            placeholder="Search by member name or code..."
            [(ngModel)]="searchQuery"
            (input)="onSearchChange($event)"
            class="search-input"
          />
        </div>

        <div class="filter-controls">
          <select [(ngModel)]="statusFilter" class="filter-select">
            <option value="">All Status</option>
            <option value="New">New</option>
            <option value="In Progress">In Progress</option>
            <option value="Contacted">Contacted</option>
            <option value="Promise to Pay">Promise to Pay</option>
            <option value="Dispute">Dispute</option>
            <option value="Legal">Legal</option>
          </select>

          <select [(ngModel)]="priorityFilter" class="filter-select">
            <option value="">All Priority</option>
            <option value="Critical">Critical</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>

          <select [(ngModel)]="collectorFilter" class="filter-select">
            <option value="">All Collectors</option>
            <option *ngFor="let collector of availableCollectors()" [value]="collector">
              {{ collector }}
            </option>
          </select>

          <input 
            type="number" 
            placeholder="Min overdue days"
            [(ngModel)]="overdueFilter"
            class="filter-input"
          />
        </div>
      </div>

      <!-- Collections Analytics Charts -->
      <div class="charts-section">
        <div class="chart-row">
          <div class="chart-container">
            <h3>Collection Status Distribution</h3>
            <ngx-charts-pie-chart
              [results]="statusChartData()"
              [view]="[400, 200]"
              [labels]="true"
              [doughnut]="true"
              [arcWidth]="0.25">
            </ngx-charts-pie-chart>
          </div>

          <div class="chart-container">
            <h3>Priority Distribution</h3>
            <ngx-charts-bar-vertical
              [results]="priorityChartData()"
              [view]="[400, 200]"
              [xAxis]="true"
              [yAxis]="true"
              [showDataLabel]="true">
            </ngx-charts-bar-vertical>
          </div>
        </div>

        <div class="chart-row">
          <div class="chart-container full-width">
            <h3>Collector Performance</h3>
            <ngx-charts-bar-horizontal
              [results]="collectorPerformanceData()"
              [view]="[800, 300]"
              [xAxis]="true"
              [yAxis]="true"
              [showDataLabel]="true">
            </ngx-charts-bar-horizontal>
          </div>
        </div>
      </div>

      <!-- Collections Table -->
      <div class="table-section">
        <div class="table-header">
          <h3>Collection Accounts ({{ filteredAccounts().length }})</h3>
          <div class="table-actions">
            <button class="btn btn-sm btn-outline" (click)="selectAll()">
              Select All
            </button>
            <button class="btn btn-sm btn-outline" [disabled]="selectedAccounts().length === 0" (click)="bulkAssign()">
              Bulk Assign ({{ selectedAccounts().length }})
            </button>
            <button class="btn btn-sm btn-outline" [disabled]="selectedAccounts().length === 0" (click)="bulkContact()">
              Bulk Contact ({{ selectedAccounts().length }})
            </button>
          </div>
        </div>

        <div class="table-responsive">
          <table class="collections-table">
            <thead>
              <tr>
                <th>
                  <input type="checkbox" (change)="toggleSelectAll($event)" [checked]="allSelected()">
                </th>
                <th>Priority</th>
                <th>Member</th>
                <th>Debt Amount</th>
                <th>Overdue Days</th>
                <th>Status</th>
                <th>Collector</th>
                <th>Last Contact</th>
                <th>Next Follow-up</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let account of paginatedAccounts(); trackBy: trackByAccount" 
                  [class]="'priority-' + account.priority.toLowerCase()">
                <td>
                  <input type="checkbox" 
                         [checked]="selectedAccounts().includes(account.id)"
                         (change)="toggleAccountSelection(account.id, $event)">
                </td>
                <td>
                  <span class="priority-badge" [class]="'priority-' + account.priority.toLowerCase()">
                    {{ account.priority }}
                  </span>
                </td>
                <td>
                  <div class="member-info">
                    <div class="member-name">{{ account.memberName }}</div>
                    <div class="member-code">{{ account.memberCode }}</div>
                  </div>
                </td>
                <td class="amount-cell">
                  {{ formatCurrency(account.currentDebt) }}
                </td>
                <td class="overdue-cell">
                  <span class="overdue-days" [class.critical]="account.overdueDays > 90">
                    {{ account.overdueDays }} days
                  </span>
                </td>
                <td>
                  <span class="status-badge" [class]="'status-' + account.collectionStatus.toLowerCase().replace(' ', '-')">
                    {{ account.collectionStatus }}
                  </span>
                </td>
                <td>
                  <span class="collector-name">{{ account.assignedCollector || 'Unassigned' }}</span>
                </td>
                <td class="date-cell">
                  {{ formatDate(account.lastContactDate) || 'Never' }}
                </td>
                <td class="date-cell">
                  {{ formatDate(account.nextFollowUpDate) || 'Not set' }}
                </td>
                <td>
                  <div class="action-buttons">
                    <button class="btn btn-xs btn-outline" (click)="viewAccount(account)">
                      <i class="lucide-eye"></i>
                    </button>
                    <button class="btn btn-xs btn-outline" (click)="contactMember(account)">
                      <i class="lucide-phone"></i>
                    </button>
                    <button class="btn btn-xs btn-outline" (click)="addNote(account)">
                      <i class="lucide-sticky-note"></i>
                    </button>
                    <button class="btn btn-xs btn-outline" (click)="scheduleAction(account)">
                      <i class="lucide-calendar-plus"></i>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        <div class="pagination" *ngIf="totalPages() > 1">
          <button class="btn btn-outline" [disabled]="currentPage() === 1" (click)="previousPage()">
            Previous
          </button>
          <span class="page-info">Page {{ currentPage() }} of {{ totalPages() }}</span>
          <button class="btn btn-outline" [disabled]="currentPage() === totalPages()" (click)="nextPage()">
            Next
          </button>
        </div>
      </div>

      <!-- Loading State -->
      <div *ngIf="loading()" class="loading-overlay">
        <div class="loading-spinner"></div>
        <p>Loading collections data...</p>
      </div>
    </div>

    <!-- Contact Member Modal -->
    <div *ngIf="showContactModal()" class="modal-overlay" (click)="closeContactModal()">
      <div class="modal-content" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h3>Contact Member</h3>
          <button class="close-btn" (click)="closeContactModal()">
            <i class="lucide-x"></i>
          </button>
        </div>
        <form [formGroup]="contactForm" (ngSubmit)="submitContact()">
          <div class="modal-body">
            <div class="form-group">
              <label>Contact Type *</label>
              <select formControlName="contactType" class="form-control">
                <option value="Phone Call">Phone Call</option>
                <option value="Email">Email</option>
                <option value="SMS">SMS</option>
                <option value="Letter">Letter</option>
                <option value="Visit">Visit</option>
              </select>
            </div>

            <div class="form-group">
              <label>Outcome *</label>
              <select formControlName="outcome" class="form-control">
                <option value="Connected">Connected</option>
                <option value="No Answer">No Answer</option>
                <option value="Busy">Busy</option>
                <option value="Promise to Pay">Promise to Pay</option>
                <option value="Dispute">Dispute</option>
                <option value="Refused">Refused</option>
                <option value="Invalid Contact">Invalid Contact</option>
              </select>
            </div>

            <div class="form-group" *ngIf="contactForm.get('outcome')?.value === 'Promise to Pay'">
              <label>Promise Amount</label>
              <input type="number" formControlName="promiseAmount" class="form-control" placeholder="0">
            </div>

            <div class="form-group" *ngIf="contactForm.get('outcome')?.value === 'Promise to Pay'">
              <label>Promise Date</label>
              <input type="date" formControlName="promiseDate" class="form-control">
            </div>

            <div class="form-group">
              <label>Notes *</label>
              <textarea formControlName="notes" class="form-control" rows="4" placeholder="Contact details and member response..."></textarea>
            </div>

            <div class="form-group">
              <label>Next Follow-up Date</label>
              <input type="date" formControlName="nextFollowUp" class="form-control">
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-outline" (click)="closeContactModal()">Cancel</button>
            <button type="submit" class="btn btn-primary" [disabled]="!contactForm.valid || submitting()">
              {{ submitting() ? 'Recording...' : 'Record Contact' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .collections-container {
      padding: var(--s6);
      max-width: 1400px;
      margin: 0 auto;
    }

    .collections-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: var(--s6);
    }

    .header-title h2 {
      font-size: var(--text-3xl);
      font-weight: var(--font-bold);
      color: var(--text);
      margin: 0 0 var(--s2) 0;
    }

    .subtitle {
      color: var(--text-secondary);
      font-size: var(--text-sm);
      margin: 0;
    }

    .header-actions {
      display: flex;
      gap: var(--s3);
    }

    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: var(--s4);
      margin-bottom: var(--s6);
    }

    .kpi-card {
      background: var(--surface);
      border: 2px solid var(--border);
      border-radius: var(--radius-lg);
      padding: var(--s5);
      display: flex;
      align-items: center;
      gap: var(--s4);
      transition: var(--transition);
    }

    .kpi-card:hover {
      border-color: var(--primary);
      transform: translateY(-2px);
    }

    .kpi-card.critical { border-left: 4px solid var(--error); }
    .kpi-card.warning { border-left: 4px solid var(--warning); }
    .kpi-card.success { border-left: 4px solid var(--success); }
    .kpi-card.info { border-left: 4px solid var(--info); }

    .kpi-icon {
      width: 48px;
      height: 48px;
      border-radius: var(--radius-lg);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
    }

    .kpi-card.critical .kpi-icon { background: var(--error); color: white; }
    .kpi-card.warning .kpi-icon { background: var(--warning); color: white; }
    .kpi-card.success .kpi-icon { background: var(--success); color: white; }
    .kpi-card.info .kpi-icon { background: var(--info); color: white; }

    .kpi-content {
      flex: 1;
    }

    .kpi-value {
      font-size: var(--text-2xl);
      font-weight: var(--font-bold);
      color: var(--text);
      line-height: 1.2;
    }

    .kpi-label {
      font-size: var(--text-sm);
      color: var(--text-secondary);
      margin: var(--s1) 0;
    }

    .kpi-trend {
      font-size: var(--text-xs);
      font-weight: var(--font-medium);
    }

    .kpi-trend.positive { color: var(--success); }
    .kpi-trend.negative { color: var(--error); }
    .kpi-trend.neutral { color: var(--text-secondary); }

    .filters-section {
      background: var(--surface);
      border: 2px solid var(--border);
      border-radius: var(--radius-lg);
      padding: var(--s4);
      margin-bottom: var(--s6);
    }

    .search-box {
      position: relative;
      margin-bottom: var(--s4);
    }

    .search-box i {
      position: absolute;
      left: var(--s3);
      top: 50%;
      transform: translateY(-50%);
      color: var(--text-secondary);
    }

    .search-input {
      width: 100%;
      padding: var(--s3) var(--s3) var(--s3) var(--s10);
      border: 2px solid var(--border);
      border-radius: var(--radius);
      font-size: var(--text-base);
    }

    .filter-controls {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: var(--s4);
    }

    .filter-select,
    .filter-input {
      padding: var(--s3);
      border: 2px solid var(--border);
      border-radius: var(--radius);
      background: var(--surface);
    }

    .charts-section {
      margin-bottom: var(--s6);
    }

    .chart-row {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
      gap: var(--s4);
      margin-bottom: var(--s4);
    }

    .chart-container {
      background: var(--surface);
      border: 2px solid var(--border);
      border-radius: var(--radius-lg);
      padding: var(--s4);
    }

    .chart-container.full-width {
      grid-column: 1 / -1;
    }

    .chart-container h3 {
      margin: 0 0 var(--s4) 0;
      font-size: var(--text-lg);
      font-weight: var(--font-semibold);
    }

    .table-section {
      background: var(--surface);
      border: 2px solid var(--border);
      border-radius: var(--radius-lg);
      overflow: hidden;
    }

    .table-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: var(--s4);
      border-bottom: 2px solid var(--border);
    }

    .table-actions {
      display: flex;
      gap: var(--s2);
    }

    .collections-table {
      width: 100%;
      border-collapse: collapse;
    }

    .collections-table th,
    .collections-table td {
      padding: var(--s3);
      text-align: left;
      border-bottom: 1px solid var(--border);
    }

    .collections-table th {
      background: var(--bg-secondary);
      font-weight: var(--font-semibold);
      font-size: var(--text-sm);
    }

    .priority-badge {
      padding: var(--s1) var(--s2);
      border-radius: var(--radius);
      font-size: var(--text-xs);
      font-weight: var(--font-medium);
    }

    .priority-critical { background: var(--error); color: white; }
    .priority-high { background: var(--warning); color: white; }
    .priority-medium { background: var(--info); color: white; }
    .priority-low { background: var(--bg-secondary); color: var(--text); }

    .status-badge {
      padding: var(--s1) var(--s2);
      border-radius: var(--radius);
      font-size: var(--text-xs);
      font-weight: var(--font-medium);
    }

    .status-new { background: var(--info); color: white; }
    .status-in-progress { background: var(--warning); color: white; }
    .status-contacted { background: var(--success); color: white; }
    .status-promise-to-pay { background: var(--primary); color: white; }
    .status-dispute { background: var(--error); color: white; }
    .status-legal { background: var(--text); color: white; }

    .member-info {
      display: flex;
      flex-direction: column;
      gap: var(--s1);
    }

    .member-name {
      font-weight: var(--font-medium);
      color: var(--text);
    }

    .member-code {
      font-size: var(--text-xs);
      color: var(--text-secondary);
    }

    .amount-cell {
      font-weight: var(--font-semibold);
      color: var(--error);
    }

    .overdue-days.critical {
      color: var(--error);
      font-weight: var(--font-semibold);
    }

    .action-buttons {
      display: flex;
      gap: var(--s1);
    }

    .btn-xs {
      padding: var(--s1) var(--s2);
      font-size: var(--text-xs);
    }

    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }

    .modal-content {
      background: var(--surface);
      border-radius: var(--radius-lg);
      max-width: 500px;
      width: 90%;
      max-height: 80vh;
      overflow-y: auto;
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: var(--s4);
      border-bottom: 2px solid var(--border);
    }

    .close-btn {
      background: none;
      border: none;
      padding: var(--s2);
      cursor: pointer;
      border-radius: var(--radius);
    }

    .modal-body {
      padding: var(--s4);
    }

    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: var(--s3);
      padding: var(--s4);
      border-top: 2px solid var(--border);
    }

    .form-group {
      margin-bottom: var(--s4);
    }

    .form-group label {
      display: block;
      font-weight: var(--font-medium);
      margin-bottom: var(--s2);
      color: var(--text);
    }

    .form-control {
      width: 100%;
      padding: var(--s3);
      border: 2px solid var(--border);
      border-radius: var(--radius);
      font-size: var(--text-base);
    }

    .form-control:focus {
      border-color: var(--primary);
      outline: none;
    }

    .loading-overlay {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(255, 255, 255, 0.9);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      z-index: 100;
    }

    .loading-spinner {
      width: 40px;
      height: 40px;
      border: 3px solid var(--border);
      border-top: 3px solid var(--primary);
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    .spinning {
      animation: spin 1s linear infinite;
    }

    .pagination {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: var(--s4);
      border-top: 2px solid var(--border);
    }

    /* Mobile Responsiveness */
    @media (max-width: 768px) {
      .collections-container {
        padding: var(--s4);
      }

      .collections-header {
        flex-direction: column;
        gap: var(--s4);
      }

      .header-actions {
        width: 100%;
        justify-content: space-between;
      }

      .kpi-grid {
        grid-template-columns: 1fr;
      }

      .chart-row {
        grid-template-columns: 1fr;
      }

      .table-responsive {
        overflow-x: auto;
      }

      .collections-table {
        min-width: 800px;
      }

      .filter-controls {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class CollectionsManagementComponent implements OnInit {
  private memberCreditService = inject(MemberCreditService);
  private fb = inject(FormBuilder);

  // State signals
  accounts = signal<CollectionAccount[]>([]);
  selectedAccounts = signal<number[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);

  // Filter signals
  searchQuery = signal('');
  statusFilter = signal('');
  priorityFilter = signal('');
  collectorFilter = signal('');
  overdueFilter = signal<number | null>(null);

  // Pagination
  currentPage = signal(1);
  pageSize = signal(20);

  // Modal states
  showContactModal = signal(false);
  submitting = signal(false);
  selectedAccount = signal<CollectionAccount | null>(null);

  // Report data
  report = signal<CollectionReport>({
    totalOverdueAccounts: 0,
    totalOverdueAmount: 0,
    averageOverdueDays: 0,
    collectionRate: 0,
    newAccountsToday: 0,
    contactedToday: 0,
    promisesToPay: 0,
    collectionsThisMonth: 0,
    byStatus: {},
    byPriority: {},
    collectorPerformance: []
  });

  // Contact form
  contactForm: FormGroup;

  // Computed properties
  filteredAccounts = computed(() => {
    let filtered = this.accounts();

    const search = this.searchQuery().toLowerCase();
    if (search) {
      filtered = filtered.filter(account => 
        account.memberName.toLowerCase().includes(search) ||
        account.memberCode.toLowerCase().includes(search)
      );
    }

    const status = this.statusFilter();
    if (status) {
      filtered = filtered.filter(account => account.collectionStatus === status);
    }

    const priority = this.priorityFilter();
    if (priority) {
      filtered = filtered.filter(account => account.priority === priority);
    }

    const collector = this.collectorFilter();
    if (collector) {
      filtered = filtered.filter(account => account.assignedCollector === collector);
    }

    const overdue = this.overdueFilter();
    if (overdue) {
      filtered = filtered.filter(account => account.overdueDays >= overdue);
    }

    return filtered.sort((a, b) => {
      // Sort by priority first, then by overdue days
      const priorityOrder = { 'Critical': 4, 'High': 3, 'Medium': 2, 'Low': 1 };
      const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder];
      const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder];
      
      if (aPriority !== bPriority) {
        return bPriority - aPriority;
      }
      
      return b.overdueDays - a.overdueDays;
    });
  });

  paginatedAccounts = computed(() => {
    const filtered = this.filteredAccounts();
    const start = (this.currentPage() - 1) * this.pageSize();
    return filtered.slice(start, start + this.pageSize());
  });

  totalPages = computed(() => Math.ceil(this.filteredAccounts().length / this.pageSize()));

  allSelected = computed(() => {
    const paginated = this.paginatedAccounts();
    const selected = this.selectedAccounts();
    return paginated.length > 0 && paginated.every(account => selected.includes(account.id));
  });

  availableCollectors = computed(() => {
    const collectors = new Set(
      this.accounts()
        .map(account => account.assignedCollector)
        .filter(collector => collector !== undefined)
    );
    return Array.from(collectors) as string[];
  });

  // Chart data
  statusChartData = computed(() => {
    const statusCounts = this.report().byStatus;
    return Object.entries(statusCounts).map(([name, value]) => ({
      name,
      value
    }));
  });

  priorityChartData = computed(() => {
    const priorityCounts = this.report().byPriority;
    return Object.entries(priorityCounts).map(([name, value]) => ({
      name,
      value
    }));
  });

  collectorPerformanceData = computed(() => {
    return this.report().collectorPerformance.map(perf => ({
      name: perf.collectorName,
      value: perf.totalCollected
    }));
  });

  constructor() {
    this.contactForm = this.fb.group({
      contactType: ['Phone Call', Validators.required],
      outcome: ['', Validators.required],
      promiseAmount: [null],
      promiseDate: [null],
      notes: ['', Validators.required],
      nextFollowUp: [null]
    });
  }

  ngOnInit(): void {
    this.loadData();
    this.generateMockData(); // Remove this in production
  }

  async loadData(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);

    try {
      // Load collection accounts data
      // const response = await this.memberCreditService.getCollectionAccounts();
      // this.accounts.set(response.data);
      
      // Load collection report
      // const reportResponse = await this.memberCreditService.getCollectionReport();
      // this.report.set(reportResponse.data);
      
    } catch (error: any) {
      this.error.set('Failed to load collections data');
      console.error('Error loading collections:', error);
    } finally {
      this.loading.set(false);
    }
  }

  // Mock data for demonstration
  private generateMockData(): void {
    const mockAccounts: CollectionAccount[] = [
      {
        id: 1,
        memberId: 101,
        memberName: 'John Doe',
        memberCode: 'M001',
        currentDebt: 2500000,
        overdueDays: 45,
        lastPaymentDate: '2024-07-15',
        lastContactDate: '2024-08-20',
        collectionStatus: 'Contacted',
        priority: 'High',
        assignedCollector: 'Sarah Collins',
        notes: [],
        contactAttempts: 3,
        nextFollowUpDate: '2024-09-01'
      },
      {
        id: 2,
        memberId: 102,
        memberName: 'Jane Smith',
        memberCode: 'M002',
        currentDebt: 5000000,
        overdueDays: 120,
        lastPaymentDate: '2024-05-10',
        collectionStatus: 'Legal',
        priority: 'Critical',
        assignedCollector: 'Mike Johnson',
        notes: [],
        contactAttempts: 8
      }
    ];

    this.accounts.set(mockAccounts);

    const mockReport: CollectionReport = {
      totalOverdueAccounts: 156,
      totalOverdueAmount: 285000000,
      averageOverdueDays: 67,
      collectionRate: 73.5,
      newAccountsToday: 12,
      contactedToday: 45,
      promisesToPay: 23,
      collectionsThisMonth: 125000000,
      byStatus: {
        'New': 25,
        'In Progress': 45,
        'Contacted': 38,
        'Promise to Pay': 23,
        'Dispute': 15,
        'Legal': 10
      },
      byPriority: {
        'Critical': 18,
        'High': 52,
        'Medium': 61,
        'Low': 25
      },
      collectorPerformance: [
        {
          collectorName: 'Sarah Collins',
          assignedAccounts: 45,
          contactedToday: 15,
          collections: 8,
          totalCollected: 25000000,
          successRate: 78.5
        },
        {
          collectorName: 'Mike Johnson',
          assignedAccounts: 38,
          contactedToday: 12,
          collections: 6,
          totalCollected: 18000000,
          successRate: 67.2
        }
      ]
    };

    this.report.set(mockReport);
  }

  // Event handlers
  onSearchChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.searchQuery.set(target.value);
    this.currentPage.set(1);
  }

  toggleAccountSelection(accountId: number, event: Event): void {
    const target = event.target as HTMLInputElement;
    const selected = this.selectedAccounts();
    
    if (target.checked) {
      this.selectedAccounts.set([...selected, accountId]);
    } else {
      this.selectedAccounts.set(selected.filter(id => id !== accountId));
    }
  }

  toggleSelectAll(event: Event): void {
    const target = event.target as HTMLInputElement;
    const paginated = this.paginatedAccounts();
    
    if (target.checked) {
      const allIds = paginated.map(account => account.id);
      const current = this.selectedAccounts();
      const combined = [...new Set([...current, ...allIds])];
      this.selectedAccounts.set(combined);
    } else {
      const paginatedIds = paginated.map(account => account.id);
      const filtered = this.selectedAccounts().filter(id => !paginatedIds.includes(id));
      this.selectedAccounts.set(filtered);
    }
  }

  selectAll(): void {
    const allIds = this.filteredAccounts().map(account => account.id);
    this.selectedAccounts.set(allIds);
  }

  contactMember(account: CollectionAccount): void {
    this.selectedAccount.set(account);
    this.showContactModal.set(true);
    this.contactForm.reset({
      contactType: 'Phone Call',
      outcome: '',
      notes: ''
    });
  }

  closeContactModal(): void {
    this.showContactModal.set(false);
    this.selectedAccount.set(null);
  }

  async submitContact(): Promise<void> {
    if (!this.contactForm.valid || !this.selectedAccount()) return;

    this.submitting.set(true);
    
    try {
      const formValue = this.contactForm.value;
      const account = this.selectedAccount()!;

      // Record contact action
      const action: CollectionAction = {
        id: Date.now(),
        accountId: account.id,
        actionType: formValue.contactType,
        actionDate: new Date().toISOString(),
        performedBy: 'Current User', // Get from auth service
        outcome: formValue.outcome,
        notes: formValue.notes,
        nextActionDate: formValue.nextFollowUp,
        amount: formValue.promiseAmount
      };

      // await this.memberCreditService.recordCollectionAction(action);
      
      // Update local state
      this.accounts.update(accounts => 
        accounts.map(acc => 
          acc.id === account.id 
            ? { 
                ...acc, 
                lastContactDate: new Date().toISOString(),
                contactAttempts: acc.contactAttempts + 1,
                nextFollowUpDate: formValue.nextFollowUp,
                collectionStatus: formValue.outcome === 'Promise to Pay' ? 'Promise to Pay' : 'Contacted'
              }
            : acc
        )
      );

      this.closeContactModal();
      
    } catch (error) {
      console.error('Error recording contact:', error);
    } finally {
      this.submitting.set(false);
    }
  }

  // Utility methods
  trackByAccount = (index: number, account: CollectionAccount): number => account.id;

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  }

  formatDate(date: string | undefined): string {
    if (!date) return '';
    return new Intl.DateTimeFormat('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }).format(new Date(date));
  }

  refreshData(): void {
    this.loadData();
  }

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

  // Additional action handlers
  viewAccount(account: CollectionAccount): void {
    console.log('View account:', account);
    // Navigate to account detail page
  }

  addNote(account: CollectionAccount): void {
    console.log('Add note for:', account);
    // Open add note modal
  }

  scheduleAction(account: CollectionAccount): void {
    console.log('Schedule action for:', account);
    // Open schedule action modal
  }

  showBulkActionsModal(): void {
    console.log('Show bulk actions modal');
    // Open bulk actions modal
  }

  generateReport(): void {
    console.log('Generate collections report');
    // Generate and download report
  }

  bulkAssign(): void {
    console.log('Bulk assign:', this.selectedAccounts());
    // Open bulk assign modal
  }

  bulkContact(): void {
    console.log('Bulk contact:', this.selectedAccounts());
    // Open bulk contact modal
  }
}