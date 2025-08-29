import { Component, input, output, signal, computed, inject, ViewChild, ElementRef, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MemberCreditService } from '../../services/member-credit.service';
import { 
  MemberCreditSummaryDto as MemberCreditDto,
  CreditTransactionDto,
  CreditPaymentRequestDto as CreatePaymentDto,
  // PaymentReconciliationDto, // Not implemented yet
  // BulkPaymentDto // Not implemented yet
} from '../../interfaces/member-credit.interfaces';

export interface PaymentMethod {
  id: string;
  name: string;
  icon: string;
  requiresReference: boolean;
  isActive: boolean;
}

export interface PendingPayment {
  id: string;
  memberId: number;
  memberName: string;
  memberCode: string;
  paymentAmount: number;
  paymentMethod: string;
  reference: string;
  notes: string;
  createdAt: string;
  status: 'Pending' | 'Processing' | 'Completed' | 'Failed';
}

export interface PaymentBatch {
  id: string;
  batchName: string;
  totalPayments: number;
  totalAmount: number;
  processedCount: number;
  failedCount: number;
  status: 'Preparing' | 'Processing' | 'Completed' | 'Failed';
  createdAt: string;
  payments: PendingPayment[];
}

export interface ReconciliationItem {
  id: string;
  transactionId: number;
  memberName: string;
  expectedAmount: number;
  actualAmount: number;
  difference: number;
  paymentMethod: string;
  reference: string;
  status: 'Matched' | 'Discrepancy' | 'Missing' | 'Extra';
  requiresAction: boolean;
}

@Component({
  selector: 'app-credit-payment-processor',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="payment-processor-container">
      <!-- Header with Mode Switcher -->
      <div class="processor-header">
        <div class="header-content">
          <h2 class="processor-title">Credit Payment Processor</h2>
          <p class="processor-subtitle">Process payments, reconcile transactions, and manage payment batches</p>
        </div>
        
        <div class="mode-switcher">
          <button 
            class="mode-btn"
            [class.active]="currentMode() === 'single'"
            (click)="setMode('single')">
            💳 Single Payment
          </button>
          <button 
            class="mode-btn"
            [class.active]="currentMode() === 'bulk'"
            (click)="setMode('bulk')">
            📊 Bulk Processing
          </button>
          <button 
            class="mode-btn"
            [class.active]="currentMode() === 'reconciliation'"
            (click)="setMode('reconciliation')">
            🔍 Reconciliation
          </button>
        </div>
      </div>

      <!-- Single Payment Mode -->
      @if (currentMode() === 'single') {
      <div class="single-payment-section">
        <div class="payment-form-container">
          <form [formGroup]="singlePaymentForm" (ngSubmit)="processSinglePayment()">
            <!-- Member Selection -->
            <div class="form-section">
              <h3 class="section-title">Member Information</h3>
              
              <div class="member-search">
                <div class="search-input-group">
                  <input 
                    type="text"
                    class="form-control"
                    placeholder="Search member by name or code..."
                    [(ngModel)]="memberSearchQuery"
                    (input)="searchMembers($event)"
                    [ngModelOptions]="{standalone: true}">
                  <button type="button" class="search-btn" (click)="searchMembers()">
                    🔍
                  </button>
                </div>
                
                <!-- Member Search Results -->
                @if (memberSearchResults().length > 0) {
                <div class="search-results">
                  @for (member of memberSearchResults(); track member.memberId) {
                  <div class="search-result-item" (click)="selectMember(member)">
                    <div class="member-info">
                      <div class="member-name">{{ member.memberName }}</div>
                      <div class="member-details">
                        <span class="member-code">{{ member.memberNumber }}</span>
                        <span class="member-debt">Debt: {{ formatCurrency(member.currentDebt) }}</span>
                      </div>
                    </div>
                    <div class="member-actions">
                      <button type="button" class="btn btn-sm btn-primary">Select</button>
                    </div>
                  </div>
                  }
                </div>
                }
              </div>

              <!-- Selected Member Display -->
              @if (selectedMember()) {
              <div class="selected-member-card">
                <div class="member-header">
                  <div class="member-avatar">
                    <span class="avatar-text">{{ getInitials(selectedMember()!.memberName) }}</span>
                  </div>
                  <div class="member-details">
                    <div class="member-name">{{ selectedMember()!.memberName }}</div>
                    <div class="member-code">{{ selectedMember()!.memberNumber }}</div>
                  </div>
                  <button type="button" class="btn btn-sm btn-outline" (click)="clearMemberSelection()">
                    ❌ Clear
                  </button>
                </div>
                
                <div class="member-credit-summary">
                  <div class="summary-row">
                    <span class="summary-label">Current Debt:</span>
                    <span class="summary-value debt">{{ formatCurrency(selectedMember()!.currentDebt) }}</span>
                  </div>
                  <div class="summary-row">
                    <span class="summary-label">Credit Limit:</span>
                    <span class="summary-value">{{ formatCurrency(selectedMember()!.creditLimit) }}</span>
                  </div>
                  <div class="summary-row">
                    <span class="summary-label">Available Credit:</span>
                    <span class="summary-value available">{{ formatCurrency(selectedMember()!.creditLimit - selectedMember()!.currentDebt) }}</span>
                  </div>
                </div>
              </div>
              }
            </div>

            <!-- Payment Details -->
            @if (selectedMember()) {
            <div class="form-section">
              <h3 class="section-title">Payment Details</h3>
              
              <div class="form-grid">
                <div class="form-field">
                  <label class="form-label">Payment Amount *</label>
                  <div class="amount-input-group">
                    <span class="currency-prefix">Rp</span>
                    <input 
                      type="number"
                      class="form-control"
                      formControlName="paymentAmount"
                      [max]="selectedMember()!.currentDebt"
                      placeholder="Enter payment amount">
                  </div>
                  @if (singlePaymentForm.get('paymentAmount')?.errors?.['required']) {
                  <div class="field-error">Payment amount is required</div>
                  }
                  @if (singlePaymentForm.get('paymentAmount')?.errors?.['max']) {
                  <div class="field-error">Amount cannot exceed current debt</div>
                  }
                </div>

                <div class="form-field">
                  <label class="form-label">Payment Method *</label>
                  <select class="form-control" formControlName="paymentMethod">
                    <option value="">Select payment method</option>
                    @for (method of availablePaymentMethods(); track method.id) {
                    <option [value]="method.id">{{ method.icon }} {{ method.name }}</option>
                    }
                  </select>
                  @if (singlePaymentForm.get('paymentMethod')?.errors?.['required']) {
                  <div class="field-error">Payment method is required</div>
                  }
                </div>

                @if (selectedPaymentMethod()?.requiresReference) {
                <div class="form-field">
                  <label class="form-label">Reference Number</label>
                  <input 
                    type="text"
                    class="form-control"
                    formControlName="reference"
                    placeholder="Enter reference number">
                </div>
                }

                <div class="form-field full-width">
                  <label class="form-label">Payment Notes</label>
                  <textarea 
                    class="form-control"
                    formControlName="notes"
                    rows="3"
                    placeholder="Add any additional notes about this payment..."></textarea>
                </div>
              </div>

              <!-- Payment Summary -->
              <div class="payment-summary">
                <div class="summary-card">
                  <div class="summary-header">Payment Summary</div>
                  <div class="summary-body">
                    <div class="summary-row">
                      <span>Payment Amount:</span>
                      <span class="amount">{{ formatCurrency(singlePaymentForm.value.paymentAmount || 0) }}</span>
                    </div>
                    <div class="summary-row">
                      <span>Remaining Debt:</span>
                      <span class="amount">{{ formatCurrency((selectedMember()!.currentDebt) - (singlePaymentForm.value.paymentAmount || 0)) }}</span>
                    </div>
                    @if (singlePaymentForm.value.paymentAmount && singlePaymentForm.value.paymentAmount >= selectedMember()!.currentDebt) {
                    <div class="summary-row highlight">
                      <span>Status:</span>
                      <span class="status paid-off">✅ Fully Paid</span>
                    </div>
                    }
                  </div>
                </div>
              </div>
            </div>
            }

            <!-- Action Buttons -->
            <div class="form-actions">
              <button 
                type="button" 
                class="btn btn-outline"
                (click)="resetSinglePaymentForm()">
                🔄 Reset
              </button>
              <button 
                type="submit" 
                class="btn btn-primary"
                [disabled]="!singlePaymentForm.valid || processing()"
                [class.loading]="processing()">
                @if (processing()) {
                <span class="loading-spinner"></span>
                <span>Processing...</span>
                } @else {
                <span>💳 Process Payment</span>
                }
              </button>
            </div>
          </form>
        </div>
      </div>
      }

      <!-- Bulk Processing Mode -->
      @if (currentMode() === 'bulk') {
      <div class="bulk-processing-section">
        <!-- Bulk Upload -->
        <div class="bulk-upload-container">
          <div class="upload-section">
            <h3 class="section-title">Bulk Payment Upload</h3>
            
            <div class="upload-area" 
                 [class.drag-over]="isDragOver()"
                 (dragover)="onDragOver($event)"
                 (dragleave)="onDragLeave($event)"
                 (drop)="onFileDrop($event)">
              <input 
                #fileInput 
                type="file" 
                accept=".csv,.xlsx,.xls"
                (change)="onFileSelect($event)"
                style="display: none;">
              
              <div class="upload-content">
                <div class="upload-icon">📁</div>
                <div class="upload-text">
                  <p class="upload-title">Drop payment file here or click to upload</p>
                  <p class="upload-subtitle">Supports CSV, Excel files (max 10MB)</p>
                </div>
                <button type="button" class="btn btn-outline" (click)="fileInput.click()">
                  Choose File
                </button>
              </div>
            </div>

            @if (selectedFile()) {
            <div class="file-info">
              <div class="file-details">
                <span class="file-name">{{ selectedFile()!.name }}</span>
                <span class="file-size">({{ formatFileSize(selectedFile()!.size) }})</span>
              </div>
              <div class="file-actions">
                <button type="button" class="btn btn-sm btn-primary" (click)="processUploadedFile()">
                  📊 Process File
                </button>
                <button type="button" class="btn btn-sm btn-outline" (click)="removeSelectedFile()">
                  🗑️ Remove
                </button>
              </div>
            </div>
            }

            <!-- Template Download -->
            <div class="template-section">
              <p class="template-text">Need a template?</p>
              <button type="button" class="btn btn-sm btn-outline" (click)="downloadTemplate()">
                📥 Download Template
              </button>
            </div>
          </div>

          <!-- File Processing Results -->
          @if (fileProcessingResults()) {
          <div class="processing-results">
            <h4 class="results-title">File Processing Results</h4>
            
            <div class="results-summary">
              <div class="result-stat">
                <span class="stat-label">Total Records:</span>
                <span class="stat-value">{{ fileProcessingResults()!.totalRecords }}</span>
              </div>
              <div class="result-stat">
                <span class="stat-label">Valid Records:</span>
                <span class="stat-value success">{{ fileProcessingResults()!.validRecords }}</span>
              </div>
              <div class="result-stat">
                <span class="stat-label">Invalid Records:</span>
                <span class="stat-value error">{{ fileProcessingResults()!.invalidRecords }}</span>
              </div>
            </div>

            @if (fileProcessingResults()!.errors.length > 0) {
            <div class="validation-errors">
              <h5 class="errors-title">Validation Errors:</h5>
              <div class="errors-list">
                @for (error of fileProcessingResults()!.errors; track $index) {
                <div class="error-item">
                  <span class="error-row">Row {{ error.row }}:</span>
                  <span class="error-message">{{ error.message }}</span>
                </div>
                }
              </div>
            </div>
            }

            @if (fileProcessingResults()!.validRecords > 0) {
            <div class="batch-actions">
              <button type="button" class="btn btn-primary" (click)="createPaymentBatch()">
                📦 Create Payment Batch ({{ fileProcessingResults()!.validRecords }} payments)
              </button>
            </div>
            }
          </div>
          }
        </div>

        <!-- Active Payment Batches -->
        @if (paymentBatches().length > 0) {
        <div class="batch-management">
          <h3 class="section-title">Payment Batches</h3>
          
          <div class="batches-list">
            @for (batch of paymentBatches(); track batch.id) {
            <div class="batch-card" [class]="batch.status.toLowerCase()">
              <div class="batch-header">
                <div class="batch-info">
                  <div class="batch-name">{{ batch.batchName }}</div>
                  <div class="batch-meta">
                    <span class="batch-count">{{ batch.totalPayments }} payments</span>
                    <span class="batch-amount">{{ formatCurrency(batch.totalAmount) }}</span>
                  </div>
                </div>
                
                <div class="batch-status">
                  <span class="status-badge" [class]="batch.status.toLowerCase()">
                    {{ batch.status }}
                  </span>
                </div>
              </div>

              <div class="batch-progress">
                <div class="progress-bar">
                  <div class="progress-fill" 
                       [style.width.%]="getBatchProgress(batch)">
                  </div>
                </div>
                <div class="progress-text">
                  {{ batch.processedCount }} / {{ batch.totalPayments }} processed
                  @if (batch.failedCount > 0) {
                  ({{ batch.failedCount }} failed)
                  }
                </div>
              </div>

              <div class="batch-actions">
                <button type="button" class="btn btn-sm btn-outline" (click)="viewBatchDetails(batch)">
                  👁️ View Details
                </button>
                @if (batch.status === 'Preparing') {
                <button type="button" class="btn btn-sm btn-primary" (click)="startBatchProcessing(batch)">
                  ▶️ Start Processing
                </button>
                }
                @if (batch.status === 'Processing') {
                <button type="button" class="btn btn-sm btn-warning" (click)="pauseBatchProcessing(batch)">
                  ⏸️ Pause
                </button>
                }
                @if (batch.status === 'Failed') {
                <button type="button" class="btn btn-sm btn-outline" (click)="retryBatchProcessing(batch)">
                  🔄 Retry
                </button>
                }
              </div>
            </div>
            }
          </div>
        </div>
        }
      </div>
      }

      <!-- Reconciliation Mode -->
      @if (currentMode() === 'reconciliation') {
      <div class="reconciliation-section">
        <div class="reconciliation-header">
          <h3 class="section-title">Payment Reconciliation</h3>
          <div class="reconciliation-filters">
            <select class="form-control" [(ngModel)]="reconciliationFilter">
              <option value="all">All Items</option>
              <option value="matched">Matched</option>
              <option value="discrepancy">Discrepancies</option>
              <option value="missing">Missing</option>
              <option value="extra">Extra</option>
            </select>
            
            <button type="button" class="btn btn-outline" (click)="loadReconciliationData()">
              🔄 Refresh
            </button>
            
            <button type="button" class="btn btn-primary" (click)="runAutoReconciliation()">
              🤖 Auto Reconcile
            </button>
          </div>
        </div>

        <!-- Reconciliation Summary -->
        @if (reconciliationSummary()) {
        <div class="reconciliation-summary">
          <div class="summary-cards">
            <div class="summary-card matched">
              <div class="card-header">
                <span class="card-icon">✅</span>
                <span class="card-title">Matched</span>
              </div>
              <div class="card-value">{{ reconciliationSummary()!.matched }}</div>
            </div>

            <div class="summary-card discrepancy">
              <div class="card-header">
                <span class="card-icon">⚠️</span>
                <span class="card-title">Discrepancies</span>
              </div>
              <div class="card-value">{{ reconciliationSummary()!.discrepancies }}</div>
            </div>

            <div class="summary-card missing">
              <div class="card-header">
                <span class="card-icon">❓</span>
                <span class="card-title">Missing</span>
              </div>
              <div class="card-value">{{ reconciliationSummary()!.missing }}</div>
            </div>

            <div class="summary-card extra">
              <div class="card-header">
                <span class="card-icon">➕</span>
                <span class="card-title">Extra</span>
              </div>
              <div class="card-value">{{ reconciliationSummary()!.extra }}</div>
            </div>
          </div>
        </div>
        }

        <!-- Reconciliation Items -->
        <div class="reconciliation-items">
          @for (item of filteredReconciliationItems(); track item.id) {
          <div class="reconciliation-item" [class]="item.status.toLowerCase()">
            <div class="item-info">
              <div class="item-header">
                <span class="member-name">{{ item.memberName }}</span>
                <span class="status-indicator" [class]="item.status.toLowerCase()">
                  {{ getReconciliationStatusIcon(item.status) }}
                </span>
              </div>
              
              <div class="item-details">
                <div class="amount-comparison">
                  <div class="amount-item">
                    <span class="amount-label">Expected:</span>
                    <span class="amount-value">{{ formatCurrency(item.expectedAmount) }}</span>
                  </div>
                  <div class="amount-item">
                    <span class="amount-label">Actual:</span>
                    <span class="amount-value">{{ formatCurrency(item.actualAmount) }}</span>
                  </div>
                  @if (item.difference !== 0) {
                  <div class="amount-item difference">
                    <span class="amount-label">Difference:</span>
                    <span class="amount-value" [class.positive]="item.difference > 0" [class.negative]="item.difference < 0">
                      {{ formatCurrency(item.difference) }}
                    </span>
                  </div>
                  }
                </div>
                
                <div class="item-meta">
                  <span class="meta-item">{{ item.paymentMethod }}</span>
                  @if (item.reference) {
                  <span class="meta-item">Ref: {{ item.reference }}</span>
                  }
                </div>
              </div>
            </div>

            @if (item.requiresAction) {
            <div class="item-actions">
              <button type="button" class="btn btn-sm btn-outline" (click)="viewReconciliationDetail(item)">
                👁️ Detail
              </button>
              @if (item.status === 'Discrepancy') {
              <button type="button" class="btn btn-sm btn-primary" (click)="resolveDiscrepancy(item)">
                ✅ Resolve
              </button>
              }
              @if (item.status === 'Missing') {
              <button type="button" class="btn btn-sm btn-warning" (click)="createMissingPayment(item)">
                ➕ Create Payment
              </button>
              }
              @if (item.status === 'Extra') {
              <button type="button" class="btn btn-sm btn-error" (click)="removeExtraPayment(item)">
                🗑️ Remove
              </button>
              }
            </div>
            }
          </div>
          }
        </div>

        @if (filteredReconciliationItems().length === 0) {
        <div class="empty-reconciliation">
          <div class="empty-icon">✅</div>
          <div class="empty-title">All Clear!</div>
          <div class="empty-message">No reconciliation items require attention at this time.</div>
        </div>
        }
      </div>
      }

      <!-- Success/Error Messages -->
      @if (successMessage()) {
      <div class="alert alert-success">
        <span class="alert-icon">✅</span>
        <span class="alert-text">{{ successMessage() }}</span>
        <button type="button" class="alert-close" (click)="clearSuccessMessage()">×</button>
      </div>
      }

      @if (errorMessage()) {
      <div class="alert alert-error">
        <span class="alert-icon">❌</span>
        <span class="alert-text">{{ errorMessage() }}</span>
        <button type="button" class="alert-close" (click)="clearErrorMessage()">×</button>
      </div>
      }
    </div>
  `,
  styles: [`
    .payment-processor-container {
      padding: var(--s4);
      max-width: 1200px;
      margin: 0 auto;
    }

    .processor-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: var(--s6);
      padding: var(--s6);
      background: var(--surface);
      border: 2px solid var(--border);
      border-radius: var(--radius-xl);
    }

    .processor-title {
      font-size: var(--text-2xl);
      font-weight: var(--font-bold);
      color: var(--text);
      margin: 0;
    }

    .processor-subtitle {
      font-size: var(--text-base);
      color: var(--text-secondary);
      margin: var(--s1) 0 0 0;
    }

    .mode-switcher {
      display: flex;
      border: 2px solid var(--border);
      border-radius: var(--radius);
      overflow: hidden;
    }

    .mode-btn {
      padding: var(--s3) var(--s4);
      border: none;
      background: var(--surface);
      color: var(--text);
      cursor: pointer;
      transition: var(--transition);

      &:hover {
        background: var(--bg-secondary);
      }

      &.active {
        background: var(--primary);
        color: white;
      }
    }

    .single-payment-section, .bulk-processing-section, .reconciliation-section {
      background: var(--surface);
      border: 2px solid var(--border);
      border-radius: var(--radius-xl);
      padding: var(--s6);
    }

    .form-section {
      margin-bottom: var(--s6);
      padding-bottom: var(--s4);
      border-bottom: 2px solid var(--border);

      &:last-child {
        border-bottom: none;
        margin-bottom: 0;
      }
    }

    .section-title {
      font-size: var(--text-xl);
      font-weight: var(--font-bold);
      color: var(--text);
      margin: 0 0 var(--s4) 0;
    }

    .member-search {
      margin-bottom: var(--s4);
    }

    .search-input-group {
      display: flex;
      border: 2px solid var(--border);
      border-radius: var(--radius);
      overflow: hidden;
    }

    .search-input-group .form-control {
      border: none;
      border-radius: 0;
    }

    .search-btn {
      padding: var(--s3);
      background: var(--primary);
      color: white;
      border: none;
      cursor: pointer;
      transition: var(--transition);

      &:hover {
        background: var(--primary-hover);
      }
    }

    .search-results {
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      max-height: 300px;
      overflow-y: auto;
      background: var(--surface);
      border: 2px solid var(--border);
      border-top: none;
      border-radius: 0 0 var(--radius) var(--radius);
      z-index: 10;
    }

    .search-result-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: var(--s3);
      border-bottom: 1px solid var(--border);
      cursor: pointer;
      transition: var(--transition);

      &:hover {
        background: var(--bg-secondary);
      }

      &:last-child {
        border-bottom: none;
      }
    }

    .member-details {
      font-size: var(--text-sm);
      color: var(--text-secondary);
      display: flex;
      gap: var(--s3);
    }

    .member-debt {
      color: var(--error);
      font-weight: var(--font-medium);
    }

    .selected-member-card {
      background: var(--bg-secondary);
      border: 2px solid var(--border);
      border-radius: var(--radius);
      padding: var(--s4);
    }

    .member-header {
      display: flex;
      align-items: center;
      gap: var(--s3);
      margin-bottom: var(--s4);
    }

    .member-avatar {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: var(--primary);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: var(--font-bold);
    }

    .member-credit-summary {
      display: flex;
      flex-direction: column;
      gap: var(--s2);
    }

    .summary-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .summary-label {
      font-size: var(--text-sm);
      color: var(--text-secondary);
    }

    .summary-value {
      font-size: var(--text-sm);
      font-weight: var(--font-medium);

      &.debt {
        color: var(--error);
      }

      &.available {
        color: var(--success);
      }
    }

    .form-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: var(--s4);
    }

    .form-field {
      display: flex;
      flex-direction: column;
      gap: var(--s2);

      &.full-width {
        grid-column: 1 / -1;
      }
    }

    .form-label {
      font-size: var(--text-sm);
      font-weight: var(--font-medium);
      color: var(--text);
    }

    .form-control {
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

      &:invalid {
        border-color: var(--error);
      }
    }

    .amount-input-group {
      display: flex;
      border: 2px solid var(--border);
      border-radius: var(--radius);
      overflow: hidden;
    }

    .currency-prefix {
      padding: var(--s3);
      background: var(--bg-secondary);
      color: var(--text-secondary);
      font-weight: var(--font-medium);
      display: flex;
      align-items: center;
    }

    .amount-input-group .form-control {
      border: none;
      border-radius: 0;
    }

    .field-error {
      font-size: var(--text-xs);
      color: var(--error);
    }

    .payment-summary {
      margin-top: var(--s4);
    }

    .summary-card {
      background: var(--bg);
      border: 2px solid var(--border);
      border-radius: var(--radius);
      overflow: hidden;
    }

    .summary-header {
      padding: var(--s3);
      background: var(--primary);
      color: white;
      font-weight: var(--font-semibold);
      text-align: center;
    }

    .summary-body {
      padding: var(--s4);
    }

    .summary-body .summary-row {
      padding: var(--s2) 0;
      border-bottom: 1px solid var(--border);

      &:last-child {
        border-bottom: none;
      }

      &.highlight {
        background: rgba(82, 165, 115, 0.1);
        margin: 0 calc(-1 * var(--s4));
        padding: var(--s3) var(--s4);
        border-radius: var(--radius);
      }
    }

    .amount {
      font-weight: var(--font-bold);
      color: var(--primary);
    }

    .status {
      font-weight: var(--font-medium);

      &.paid-off {
        color: var(--success);
      }
    }

    .form-actions {
      display: flex;
      gap: var(--s3);
      justify-content: flex-end;
      margin-top: var(--s6);
    }

    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: var(--s2);
      padding: var(--s3) var(--s4);
      border: 2px solid transparent;
      border-radius: var(--radius);
      font-size: var(--text-sm);
      font-weight: var(--font-medium);
      cursor: pointer;
      transition: var(--transition);
      text-decoration: none;

      &.btn-primary {
        background: var(--primary);
        color: white;
        border-color: var(--primary);

        &:hover:not(:disabled) {
          background: var(--primary-hover);
          border-color: var(--primary-hover);
        }
      }

      &.btn-outline {
        background: var(--surface);
        color: var(--text);
        border-color: var(--border);

        &:hover:not(:disabled) {
          background: var(--primary);
          color: white;
          border-color: var(--primary);
        }
      }

      &.btn-warning {
        background: var(--warning);
        color: white;
        border-color: var(--warning);
      }

      &.btn-error {
        background: var(--error);
        color: white;
        border-color: var(--error);
      }

      &.btn-sm {
        padding: var(--s2) var(--s3);
        font-size: var(--text-xs);
      }

      &:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }

      &.loading .loading-spinner {
        width: 16px;
        height: 16px;
        border: 2px solid rgba(255, 255, 255, 0.3);
        border-top: 2px solid white;
        border-radius: 50%;
        animation: spin 1s linear infinite;
      }
    }

    .upload-area {
      border: 3px dashed var(--border);
      border-radius: var(--radius-lg);
      padding: var(--s8);
      text-align: center;
      transition: var(--transition);
      cursor: pointer;

      &:hover, &.drag-over {
        border-color: var(--primary);
        background: var(--primary-light);
      }
    }

    .upload-content {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--s4);
    }

    .upload-icon {
      font-size: 48px;
      opacity: 0.6;
    }

    .upload-title {
      font-size: var(--text-lg);
      font-weight: var(--font-semibold);
      color: var(--text);
      margin: 0;
    }

    .upload-subtitle {
      font-size: var(--text-sm);
      color: var(--text-secondary);
      margin: 0;
    }

    .file-info {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: var(--s3);
      background: var(--bg-secondary);
      border-radius: var(--radius);
      margin-top: var(--s3);
    }

    .file-actions {
      display: flex;
      gap: var(--s2);
    }

    .template-section {
      text-align: center;
      margin-top: var(--s4);
      padding-top: var(--s4);
      border-top: 2px solid var(--border);
    }

    .template-text {
      font-size: var(--text-sm);
      color: var(--text-secondary);
      margin-bottom: var(--s2);
    }

    .alert {
      position: fixed;
      top: var(--s4);
      right: var(--s4);
      display: flex;
      align-items: center;
      gap: var(--s2);
      padding: var(--s3) var(--s4);
      border-radius: var(--radius);
      font-size: var(--text-sm);
      z-index: 1000;
      animation: slideIn 0.3s ease-out;

      &.alert-success {
        background: rgba(82, 165, 115, 0.1);
        color: var(--success);
        border: 2px solid var(--success);
      }

      &.alert-error {
        background: rgba(212, 74, 63, 0.1);
        color: var(--error);
        border: 2px solid var(--error);
      }
    }

    .alert-close {
      background: none;
      border: none;
      font-size: var(--text-lg);
      cursor: pointer;
      opacity: 0.7;

      &:hover {
        opacity: 1;
      }
    }

    @keyframes slideIn {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    // Responsive
    @media (max-width: 768px) {
      .payment-processor-container {
        padding: var(--s2);
      }

      .processor-header {
        flex-direction: column;
        gap: var(--s3);
      }

      .mode-switcher {
        width: 100%;
      }

      .mode-btn {
        flex: 1;
        padding: var(--s2);
        font-size: var(--text-sm);
      }

      .form-grid {
        grid-template-columns: 1fr;
      }

      .form-actions {
        flex-direction: column;
      }

      .btn {
        width: 100%;
      }
    }
  `]
})
export class CreditPaymentProcessorComponent {
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  private memberCreditService = inject(MemberCreditService);
  private formBuilder = inject(FormBuilder);

  // Input/Output
  paymentProcessed = output<any>();
  batchCompleted = output<any>();
  reconciliationUpdated = output<any>();

  // State signals
  currentMode = signal<'single' | 'bulk' | 'reconciliation'>('single');
  processing = signal<boolean>(false);
  memberSearchQuery = signal<string>('');
  memberSearchResults = signal<MemberCreditDto[]>([]);
  selectedMember = signal<MemberCreditDto | null>(null);
  selectedFile = signal<File | null>(null);
  isDragOver = signal<boolean>(false);
  fileProcessingResults = signal<any>(null);
  paymentBatches = signal<PaymentBatch[]>([]);
  reconciliationFilter = signal<string>('all');
  reconciliationItems = signal<ReconciliationItem[]>([]);
  reconciliationSummary = signal<any>(null);
  successMessage = signal<string>('');
  errorMessage = signal<string>('');

  // Forms
  singlePaymentForm: FormGroup;

  // Static data
  availablePaymentMethods = signal<PaymentMethod[]>([
    { id: 'cash', name: 'Cash', icon: '💵', requiresReference: false, isActive: true },
    { id: 'bank_transfer', name: 'Bank Transfer', icon: '🏦', requiresReference: true, isActive: true },
    { id: 'credit_card', name: 'Credit Card', icon: '💳', requiresReference: true, isActive: true },
    { id: 'e_wallet', name: 'E-Wallet', icon: '📱', requiresReference: true, isActive: true },
    { id: 'check', name: 'Check', icon: '📝', requiresReference: true, isActive: true }
  ]);

  // Computed properties
  selectedPaymentMethod = computed(() => {
    const methodId = this.singlePaymentForm?.value.paymentMethod;
    return this.availablePaymentMethods().find(m => m.id === methodId) || null;
  });

  filteredReconciliationItems = computed(() => {
    const items = this.reconciliationItems();
    const filter = this.reconciliationFilter();
    
    if (filter === 'all') return items;
    return items.filter(item => item.status.toLowerCase() === filter.toLowerCase());
  });

  constructor() {
    this.singlePaymentForm = this.formBuilder.group({
      paymentAmount: [0, [Validators.required, Validators.min(1)]],
      paymentMethod: ['', Validators.required],
      reference: [''],
      notes: ['']
    });
  }

  // Mode management
  setMode(mode: 'single' | 'bulk' | 'reconciliation'): void {
    this.currentMode.set(mode);
    
    if (mode === 'reconciliation') {
      this.loadReconciliationData();
    }
  }

  // Member search
  async searchMembers(event?: Event): Promise<void> {
    const query = this.memberSearchQuery();
    if (!query || query.length < 2) {
      this.memberSearchResults.set([]);
      return;
    }

    try {
      // Mock search - replace with actual service call
      const results: MemberCreditDto[] = [
        {
          memberId: 1,
          memberName: 'PT Sumber Rejeki Abadi',
          memberNumber: 'M001',
          phone: '08123456789',
          tier: 1,
          creditLimit: 50000000,
          currentDebt: 25000000,
          availableCredit: 25000000,
          creditUtilization: 50.0,
          status: 1,
          statusDescription: 'Good',
          paymentTerms: 30,
          daysOverdue: 0,
          overdueAmount: 0,
          creditScore: 750,
          creditGrade: 'A',
          paymentSuccessRate: 95.5,
          paymentDelays: 0,
          lifetimeDebt: 25000000,
          recentTransactions: [],
          remindersSent: 0,
          isEligible: true,
          isEligibleForCredit: true,
          riskLevel: 'Low',
          requiresAttention: false,
          formattedCreditLimit: 'Rp 50,000,000',
          formattedCurrentDebt: 'Rp 25,000,000',
          formattedAvailableCredit: 'Rp 25,000,000',
          paymentTermDays: 30,
          totalDelayedPayments: 0,
          totalTransactions: 150,
          totalCreditUsed: 25000000,
          avgTransactionAmount: 2500000
        },
        {
          memberId: 2,
          memberName: 'CV Maju Bersama',
          memberNumber: 'M002',
          phone: '08198765432',
          tier: 1,
          creditLimit: 30000000,
          currentDebt: 15000000,
          availableCredit: 15000000,
          creditUtilization: 50.0,
          status: 1,
          statusDescription: 'Good',
          paymentTerms: 30,
          daysOverdue: 0,
          overdueAmount: 0,
          creditScore: 680,
          creditGrade: 'B',
          paymentSuccessRate: 88.2,
          paymentDelays: 1,
          lifetimeDebt: 15000000,
          recentTransactions: [],
          remindersSent: 0,
          isEligible: true,
          isEligibleForCredit: true,
          riskLevel: 'Low',
          requiresAttention: false,
          formattedCreditLimit: 'Rp 30,000,000',
          formattedCurrentDebt: 'Rp 15,000,000',
          formattedAvailableCredit: 'Rp 15,000,000',
          paymentTermDays: 30,
          totalDelayedPayments: 1,
          totalTransactions: 98,
          totalCreditUsed: 15000000,
          avgTransactionAmount: 1800000
        }
      ] as MemberCreditDto[];

      this.memberSearchResults.set(
        results.filter(m => 
          m.memberName.toLowerCase().includes(query.toLowerCase()) ||
          m.memberNumber.toLowerCase().includes(query.toLowerCase())
        )
      );
    } catch (error) {
      console.error('Error searching members:', error);
    }
  }

  selectMember(member: MemberCreditDto): void {
    this.selectedMember.set(member);
    this.memberSearchResults.set([]);
    this.memberSearchQuery.set('');
    
    // Update form validators based on member's debt
    this.singlePaymentForm.get('paymentAmount')?.setValidators([
      Validators.required,
      Validators.min(1),
      Validators.max(member.currentDebt)
    ]);
  }

  clearMemberSelection(): void {
    this.selectedMember.set(null);
    this.resetSinglePaymentForm();
  }

  // Single payment processing
  async processSinglePayment(): Promise<void> {
    if (!this.singlePaymentForm.valid || !this.selectedMember()) return;

    this.processing.set(true);
    
    try {
      const formData = this.singlePaymentForm.value;
      const paymentData: CreatePaymentDto = {
        memberId: this.selectedMember()!.memberId,
        amount: formData.paymentAmount,
        paymentMethod: formData.paymentMethod,
        referenceNumber: formData.reference || '',
        branchId: 1, // Default branch ID
        notes: formData.notes,
        partialPayment: false,
        allocateToOldest: true
      };

      // Process payment via service
      const response = await this.memberCreditService.recordPayment(
        paymentData.memberId, 
        paymentData
      ).toPromise();
      
      if (response) {
        this.showSuccessMessage('Payment processed successfully');
        this.paymentProcessed.emit(response);
        this.resetSinglePaymentForm();
      } else {
        this.showErrorMessage('Payment processing failed');
      }
    } catch (error: any) {
      console.error('Payment processing error:', error);
      this.showErrorMessage('An error occurred during payment processing');
    } finally {
      this.processing.set(false);
    }
  }

  resetSinglePaymentForm(): void {
    this.singlePaymentForm.reset();
    this.selectedMember.set(null);
    this.memberSearchResults.set([]);
  }

  // File handling for bulk processing
  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver.set(true);
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver.set(false);
  }

  onFileDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver.set(false);
    
    const files = Array.from(event.dataTransfer?.files || []);
    if (files.length > 0) {
      this.handleSelectedFile(files[0]);
    }
  }

  onFileSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.handleSelectedFile(input.files[0]);
    }
  }

  private handleSelectedFile(file: File): void {
    // Validate file
    if (!this.isValidFile(file)) {
      this.showErrorMessage('Please select a valid CSV or Excel file (max 10MB)');
      return;
    }
    
    this.selectedFile.set(file);
    this.fileProcessingResults.set(null);
  }

  private isValidFile(file: File): boolean {
    const validTypes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];
    
    const maxSize = 10 * 1024 * 1024; // 10MB
    
    return validTypes.includes(file.type) && file.size <= maxSize;
  }

  removeSelectedFile(): void {
    this.selectedFile.set(null);
    this.fileProcessingResults.set(null);
  }

  async processUploadedFile(): Promise<void> {
    const file = this.selectedFile();
    if (!file) return;

    this.processing.set(true);
    
    try {
      // Mock file processing - replace with actual service
      const results = {
        totalRecords: 150,
        validRecords: 145,
        invalidRecords: 5,
        errors: [
          { row: 23, message: 'Invalid member ID' },
          { row: 47, message: 'Payment amount exceeds member debt' },
          { row: 89, message: 'Missing payment method' }
        ]
      };
      
      this.fileProcessingResults.set(results);
      this.showSuccessMessage('File processed successfully');
    } catch (error: any) {
      console.error('File processing error:', error);
      this.showErrorMessage('Failed to process file');
    } finally {
      this.processing.set(false);
    }
  }

  downloadTemplate(): void {
    // Create and download CSV template
    const csvContent = [
      'Member ID,Member Code,Payment Amount,Payment Method,Reference,Notes',
      '1,M001,1000000,bank_transfer,TXN123456,Payment for January',
      '2,M002,500000,cash,,Cash payment'
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'payment_template.csv';
    link.click();
    window.URL.revokeObjectURL(url);
  }

  // Batch management
  createPaymentBatch(): void {
    const results = this.fileProcessingResults();
    if (!results) return;

    const batch: PaymentBatch = {
      id: Date.now().toString(),
      batchName: `Batch ${new Date().toLocaleDateString()}`,
      totalPayments: results.validRecords,
      totalAmount: results.validRecords * 750000, // Mock total
      processedCount: 0,
      failedCount: 0,
      status: 'Preparing',
      createdAt: new Date().toISOString(),
      payments: [] // Mock payments would be populated here
    };

    this.paymentBatches.update(batches => [...batches, batch]);
    this.showSuccessMessage('Payment batch created successfully');
  }

  getBatchProgress(batch: PaymentBatch): number {
    return (batch.processedCount / batch.totalPayments) * 100;
  }

  startBatchProcessing(batch: PaymentBatch): void {
    // Start batch processing
    batch.status = 'Processing';
    this.showSuccessMessage(`Started processing batch: ${batch.batchName}`);
  }

  pauseBatchProcessing(batch: PaymentBatch): void {
    // Pause processing
    this.showSuccessMessage(`Paused batch processing: ${batch.batchName}`);
  }

  retryBatchProcessing(batch: PaymentBatch): void {
    // Retry failed batch
    batch.status = 'Processing';
    this.showSuccessMessage(`Retrying batch: ${batch.batchName}`);
  }

  viewBatchDetails(batch: PaymentBatch): void {
    // Open batch details modal
    console.log('Viewing batch details:', batch);
  }

  // Reconciliation methods
  async loadReconciliationData(): Promise<void> {
    this.processing.set(true);
    
    try {
      // Mock reconciliation data
      const items: ReconciliationItem[] = [
        {
          id: '1',
          transactionId: 123,
          memberName: 'PT Sumber Rejeki',
          expectedAmount: 1000000,
          actualAmount: 1000000,
          difference: 0,
          paymentMethod: 'Bank Transfer',
          reference: 'TXN123',
          status: 'Matched',
          requiresAction: false
        },
        {
          id: '2',
          transactionId: 124,
          memberName: 'CV Maju Bersama',
          expectedAmount: 500000,
          actualAmount: 485000,
          difference: -15000,
          paymentMethod: 'Cash',
          reference: '',
          status: 'Discrepancy',
          requiresAction: true
        }
      ];

      const summary = {
        matched: items.filter(i => i.status === 'Matched').length,
        discrepancies: items.filter(i => i.status === 'Discrepancy').length,
        missing: items.filter(i => i.status === 'Missing').length,
        extra: items.filter(i => i.status === 'Extra').length
      };

      this.reconciliationItems.set(items);
      this.reconciliationSummary.set(summary);
    } catch (error) {
      console.error('Error loading reconciliation data:', error);
      this.showErrorMessage('Failed to load reconciliation data');
    } finally {
      this.processing.set(false);
    }
  }

  async runAutoReconciliation(): Promise<void> {
    this.processing.set(true);
    
    try {
      // Mock auto reconciliation
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      this.showSuccessMessage('Auto reconciliation completed');
      this.loadReconciliationData();
    } catch (error) {
      console.error('Auto reconciliation error:', error);
      this.showErrorMessage('Auto reconciliation failed');
    } finally {
      this.processing.set(false);
    }
  }

  getReconciliationStatusIcon(status: string): string {
    const icons = {
      'Matched': '✅',
      'Discrepancy': '⚠️',
      'Missing': '❓',
      'Extra': '➕'
    };
    return icons[status as keyof typeof icons] || '❔';
  }

  viewReconciliationDetail(item: ReconciliationItem): void {
    // Open reconciliation detail modal
    console.log('Viewing reconciliation detail:', item);
  }

  resolveDiscrepancy(item: ReconciliationItem): void {
    // Open discrepancy resolution modal
    console.log('Resolving discrepancy:', item);
  }

  createMissingPayment(item: ReconciliationItem): void {
    // Create missing payment
    console.log('Creating missing payment:', item);
  }

  removeExtraPayment(item: ReconciliationItem): void {
    // Remove extra payment
    console.log('Removing extra payment:', item);
  }

  // Utility methods
  getInitials(name: string): string {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .substring(0, 2)
      .toUpperCase();
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Message handling
  showSuccessMessage(message: string): void {
    this.successMessage.set(message);
    setTimeout(() => this.clearSuccessMessage(), 5000);
  }

  showErrorMessage(message: string): void {
    this.errorMessage.set(message);
    setTimeout(() => this.clearErrorMessage(), 5000);
  }

  clearSuccessMessage(): void {
    this.successMessage.set('');
  }

  clearErrorMessage(): void {
    this.errorMessage.set('');
  }
}