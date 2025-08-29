// Member Credit Management Modal Component
// POS Toko Eniwan - Phase 2 Implementation
// Comprehensive credit operations in a unified modal interface

import { 
  Component, 
  input, 
  output, 
  signal, 
  computed, 
  inject, 
  ChangeDetectionStrategy,
  OnInit,
  OnDestroy 
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject, takeUntil, catchError, of } from 'rxjs';

// Services & Interfaces
import { MemberCreditService } from '../../services/member-credit.service';
import { StateService } from '../../../../core/services/state.service';
import { 
  MemberCreditSummaryDto as MemberDto, // Alias for compatibility
  MemberCreditSummaryDto,
  CreditTransactionDto,
  GrantCreditRequestDto,
  CreditPaymentRequestDto,
  UpdateCreditLimitRequestDto,
  CreditEligibilityDto,
  PaymentMethod 
} from '../../interfaces/member-credit.interfaces';

// Utilities
import {
  formatCurrency,
  formatPercentage,
  formatCreditStatus,
  formatRiskLevel,
  formatDaysOverdue,
  validateCreditTransaction,
  validatePaymentRequest,
  validateCreditLimitUpdate,
  calculateOptimalPaymentAmount
} from '../../utils/credit-utils';

export type ModalTab = 'overview' | 'grant-credit' | 'record-payment' | 'update-limit' | 'transactions' | 'eligibility';

@Component({
  selector: 'app-member-credit-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="modal-overlay" *ngIf="isOpen()" (click)="onOverlayClick($event)">
      <div class="modal-container" (click)="$event.stopPropagation()">
        <!-- Modal Header -->
        <div class="modal-header">
          <div class="header-content">
            <div class="member-info">
              <h2 class="modal-title">{{ member()?.memberName || 'Member Credit Management' }}</h2>
              <div class="member-details" *ngIf="member()">
                <span class="member-number">{{ member()?.memberNumber }}</span>
                <span class="member-tier">{{ member()?.riskLevel }}</span>
                <span class="member-phone">{{ member()?.memberNumber }}</span>
              </div>
            </div>
            
            <!-- Credit Status Badge -->
            <div class="credit-status" *ngIf="creditSummary()">
              <div class="status-badge" [style.background-color]="getCreditStatusColor(creditSummary()?.statusDescription)">
                {{ creditSummary()?.statusDescription }}
              </div>
              <div class="risk-badge" [style.background-color]="getRiskLevelColor(creditSummary()?.riskLevel)">
                {{ creditSummary()?.riskLevel }} Risk
              </div>
            </div>
          </div>
          
          <button class="close-button" (click)="closeModal()" aria-label="Close modal">
            <span class="close-icon">×</span>
          </button>
        </div>

        <!-- Tab Navigation -->
        <div class="tab-navigation">
          <button 
            *ngFor="let tab of availableTabs()" 
            class="tab-button"
            [class.active]="activeTab() === tab.id"
            (click)="setActiveTab(tab.id)"
            [disabled]="tab.disabled">
            <span class="tab-icon">{{ tab.icon }}</span>
            <span class="tab-label">{{ tab.label }}</span>
            <span class="tab-badge" *ngIf="tab.badge">{{ tab.badge }}</span>
          </button>
        </div>

        <!-- Loading State -->
        <div class="loading-section" *ngIf="creditService.loading()">
          <div class="loading-spinner"></div>
          <p class="loading-text">Loading credit information...</p>
        </div>

        <!-- Error State -->
        <div class="error-section" *ngIf="creditService.error() && !creditService.loading()">
          <div class="error-content">
            <span class="error-icon">⚠️</span>
            <div class="error-details">
              <h4>Error Loading Credit Data</h4>
              <p>{{ creditService.error() }}</p>
              <button class="btn btn-outline btn-sm" (click)="reloadCreditData()">Try Again</button>
            </div>
          </div>
        </div>

        <!-- Modal Content -->
        <div class="modal-content" *ngIf="!creditService.loading() && !creditService.error()">
          
          <!-- Overview Tab -->
          <div class="tab-content" *ngIf="activeTab() === 'overview'">
            <div class="credit-overview" *ngIf="creditSummary()">
              <div class="overview-grid">
                <!-- Credit Limits Card -->
                <div class="overview-card">
                  <div class="card-header">
                    <h4>Credit Limits</h4>
                    <span class="card-icon">💳</span>
                  </div>
                  <div class="card-content">
                    <div class="metric">
                      <span class="metric-label">Credit Limit</span>
                      <span class="metric-value">{{ formatCurrency(creditSummary()?.creditLimit || 0) }}</span>
                    </div>
                    <div class="metric">
                      <span class="metric-label">Current Debt</span>
                      <span class="metric-value debt">{{ formatCurrency(creditSummary()?.currentDebt || 0) }}</span>
                    </div>
                    <div class="metric">
                      <span class="metric-label">Available Credit</span>
                      <span class="metric-value available">{{ formatCurrency(creditSummary()?.availableCredit || 0) }}</span>
                    </div>
                    <div class="utilization-bar">
                      <div class="utilization-progress" 
                           [style.width.%]="creditSummary()?.creditUtilization || 0"
                           [class.high-utilization]="(creditSummary()?.creditUtilization || 0) > 80">
                      </div>
                      <span class="utilization-text">{{ formatPercentage(creditSummary()?.creditUtilization || 0) }} used</span>
                    </div>
                  </div>
                </div>

                <!-- Payment Status Card -->
                <div class="overview-card">
                  <div class="card-header">
                    <h4>Payment Status</h4>
                    <span class="card-icon">💰</span>
                  </div>
                  <div class="card-content">
                    <div class="metric">
                      <span class="metric-label">Payment Terms</span>
                      <span class="metric-value">{{ creditSummary()?.paymentTerms || 0 }} days</span>
                    </div>
                    <div class="metric">
                      <span class="metric-label">Success Rate</span>
                      <span class="metric-value">{{ formatPercentage(creditSummary()?.paymentSuccessRate || 0) }}</span>
                    </div>
                    <div class="metric" *ngIf="(creditSummary()?.daysOverdue || 0) > 0">
                      <span class="metric-label">Days Overdue</span>
                      <span class="metric-value overdue">{{ creditSummary()?.daysOverdue }} days</span>
                    </div>
                    <div class="metric" *ngIf="(creditSummary()?.overdueAmount || 0) > 0">
                      <span class="metric-label">Overdue Amount</span>
                      <span class="metric-value overdue">{{ formatCurrency(creditSummary()?.overdueAmount || 0) }}</span>
                    </div>
                    <div class="metric" *ngIf="creditSummary()?.nextPaymentDueDate">
                      <span class="metric-label">Next Payment Due</span>
                      <span class="metric-value">{{ formatDate(creditSummary()?.nextPaymentDueDate) }}</span>
                    </div>
                  </div>
                </div>

                <!-- Credit Score Card -->
                <div class="overview-card">
                  <div class="card-header">
                    <h4>Credit Score</h4>
                    <span class="card-icon">📊</span>
                  </div>
                  <div class="card-content">
                    <div class="score-display">
                      <div class="score-number">{{ creditSummary()?.creditScore || 0 }}</div>
                      <div class="score-range">/1000</div>
                    </div>
                    <div class="score-bar">
                      <div class="score-progress" 
                           [style.width.%]="((creditSummary()?.creditScore || 0) / 1000) * 100"
                           [class]="getScoreColorClass(creditSummary()?.creditScore || 0)">
                      </div>
                    </div>
                    <div class="score-description">{{ getScoreDescription(creditSummary()?.creditScore || 0) }}</div>
                  </div>
                </div>

                <!-- Quick Actions Card -->
                <div class="overview-card">
                  <div class="card-header">
                    <h4>Quick Actions</h4>
                    <span class="card-icon">⚡</span>
                  </div>
                  <div class="card-content">
                    <div class="quick-actions">
                      <button class="btn btn-primary btn-sm" (click)="setActiveTab('grant-credit')" 
                              [disabled]="!canGrantCredit()">
                        Grant Credit
                      </button>
                      <button class="btn btn-secondary btn-sm" (click)="setActiveTab('record-payment')" 
                              [disabled]="!canRecordPayment()">
                        Record Payment
                      </button>
                      <button class="btn btn-outline btn-sm" (click)="setActiveTab('update-limit')" 
                              [disabled]="!canUpdateLimit()">
                        Update Limit
                      </button>
                      <button class="btn btn-outline btn-sm" (click)="setActiveTab('transactions')">
                        View History
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Grant Credit Tab -->
          <div class="tab-content" *ngIf="activeTab() === 'grant-credit'">
            <div class="form-container">
              <form [formGroup]="grantCreditForm" (ngSubmit)="onGrantCredit()">
                <div class="form-header">
                  <h3>Grant Credit to Member</h3>
                  <p class="form-description">Increase member's available credit or credit limit</p>
                </div>

                <div class="form-row">
                  <div class="form-field">
                    <label class="field-label required">Credit Type</label>
                    <select formControlName="creditType" class="form-control">
                      <option value="">Select credit type</option>
                      <option value="Initial_Limit">Initial Credit Limit</option>
                      <option value="Limit_Increase">Credit Limit Increase</option>
                      <option value="Bonus_Credit">Bonus Credit</option>
                      <option value="Adjustment">Credit Adjustment</option>
                    </select>
                    <div class="field-error" *ngIf="grantCreditForm.get('creditType')?.invalid && grantCreditForm.get('creditType')?.touched">
                      Please select a credit type
                    </div>
                  </div>

                  <div class="form-field">
                    <label class="field-label required">Amount</label>
                    <div class="input-group">
                      <span class="input-prefix">Rp</span>
                      <input 
                        type="number" 
                        formControlName="amount" 
                        class="form-control currency-input"
                        placeholder="0"
                        [min]="0"
                        [max]="50000000">
                    </div>
                    <div class="field-error" *ngIf="grantCreditForm.get('amount')?.invalid && grantCreditForm.get('amount')?.touched">
                      <span *ngIf="grantCreditForm.get('amount')?.errors?.['required']">Amount is required</span>
                      <span *ngIf="grantCreditForm.get('amount')?.errors?.['min']">Amount must be greater than 0</span>
                      <span *ngIf="grantCreditForm.get('amount')?.errors?.['max']">Amount cannot exceed 50,000,000</span>
                    </div>
                  </div>
                </div>

                <div class="form-field full-width">
                  <label class="field-label required">Description</label>
                  <textarea 
                    formControlName="description" 
                    class="form-control textarea"
                    placeholder="Reason for granting credit..."
                    rows="3">
                  </textarea>
                  <div class="field-error" *ngIf="grantCreditForm.get('description')?.invalid && grantCreditForm.get('description')?.touched">
                    Description is required
                  </div>
                </div>

                <div class="form-row">
                  <div class="form-field">
                    <label class="field-label">Expiry Date (Optional)</label>
                    <input 
                      type="date" 
                      formControlName="expiryDate" 
                      class="form-control"
                      [min]="getTomorrowDate()">
                  </div>

                  <div class="form-field">
                    <div class="checkbox-field">
                      <input 
                        type="checkbox" 
                        id="requiresApproval" 
                        formControlName="requiresApproval">
                      <label for="requiresApproval" class="checkbox-label">Requires Manager Approval</label>
                    </div>
                  </div>
                </div>

                <div class="form-field full-width">
                  <label class="field-label">Additional Notes</label>
                  <textarea 
                    formControlName="notes" 
                    class="form-control textarea"
                    placeholder="Any additional notes..."
                    rows="2">
                  </textarea>
                </div>

                <div class="form-actions">
                  <button type="button" class="btn btn-secondary" (click)="resetGrantCreditForm()">
                    Reset Form
                  </button>
                  <button type="submit" class="btn btn-primary" [disabled]="grantCreditForm.invalid || processing()">
                    <span class="btn-spinner" *ngIf="processing()"></span>
                    {{ processing() ? 'Processing...' : 'Grant Credit' }}
                  </button>
                </div>
              </form>
            </div>
          </div>

          <!-- Record Payment Tab -->
          <div class="tab-content" *ngIf="activeTab() === 'record-payment'">
            <div class="form-container">
              <form [formGroup]="recordPaymentForm" (ngSubmit)="onRecordPayment()">
                <div class="form-header">
                  <h3>Record Credit Payment</h3>
                  <p class="form-description">Record a payment made by the member</p>
                  
                  <!-- Current Debt Display -->
                  <div class="debt-summary" *ngIf="creditSummary()">
                    <div class="debt-item">
                      <span class="debt-label">Current Debt:</span>
                      <span class="debt-amount">{{ formatCurrency(creditSummary()?.currentDebt || 0) }}</span>
                    </div>
                    <div class="debt-item" *ngIf="(creditSummary()?.overdueAmount || 0) > 0">
                      <span class="debt-label">Overdue Amount:</span>
                      <span class="debt-amount overdue">{{ formatCurrency(creditSummary()?.overdueAmount || 0) }}</span>
                    </div>
                  </div>
                </div>

                <div class="form-row">
                  <div class="form-field">
                    <label class="field-label required">Payment Amount</label>
                    <div class="input-group">
                      <span class="input-prefix">Rp</span>
                      <input 
                        type="number" 
                        formControlName="amount" 
                        class="form-control currency-input"
                        placeholder="0"
                        [min]="1"
                        [max]="creditSummary()?.currentDebt || 0">
                    </div>
                    <div class="field-error" *ngIf="recordPaymentForm.get('amount')?.invalid && recordPaymentForm.get('amount')?.touched">
                      <span *ngIf="recordPaymentForm.get('amount')?.errors?.['required']">Payment amount is required</span>
                      <span *ngIf="recordPaymentForm.get('amount')?.errors?.['min']">Amount must be greater than 0</span>
                      <span *ngIf="recordPaymentForm.get('amount')?.errors?.['max']">Amount cannot exceed current debt</span>
                    </div>
                    
                    <!-- Optimal Payment Suggestion -->
                    <div class="field-hint" *ngIf="optimalPayment()">
                      💡 Suggested payment: {{ formatCurrency(optimalPayment()?.recommendedAmount || 0) }} 
                      ({{ optimalPayment()?.strategy }})
                    </div>
                  </div>

                  <div class="form-field">
                    <label class="field-label required">Payment Method</label>
                    <select formControlName="paymentMethod" class="form-control">
                      <option value="">Select payment method</option>
                      <option value="Cash">Cash</option>
                      <option value="Transfer">Bank Transfer</option>
                      <option value="Credit_Card">Credit Card</option>
                      <option value="E_Wallet">E-Wallet</option>
                      <option value="Other">Other</option>
                    </select>
                    <div class="field-error" *ngIf="recordPaymentForm.get('paymentMethod')?.invalid && recordPaymentForm.get('paymentMethod')?.touched">
                      Please select a payment method
                    </div>
                  </div>
                </div>

                <div class="form-field">
                  <label class="field-label required">Reference Number</label>
                  <input 
                    type="text" 
                    formControlName="referenceNumber" 
                    class="form-control"
                    placeholder="Enter reference/transaction number">
                  <div class="field-error" *ngIf="recordPaymentForm.get('referenceNumber')?.invalid && recordPaymentForm.get('referenceNumber')?.touched">
                    Reference number is required
                  </div>
                </div>

                <div class="form-row">
                  <div class="form-field">
                    <div class="checkbox-field">
                      <input 
                        type="checkbox" 
                        id="partialPayment" 
                        formControlName="partialPayment">
                      <label for="partialPayment" class="checkbox-label">Partial Payment</label>
                    </div>
                  </div>

                  <div class="form-field">
                    <div class="checkbox-field">
                      <input 
                        type="checkbox" 
                        id="allocateToOldest" 
                        formControlName="allocateToOldest">
                      <label for="allocateToOldest" class="checkbox-label">Allocate to Oldest Debt First</label>
                    </div>
                  </div>
                </div>

                <div class="form-field full-width">
                  <label class="field-label">Payment Notes</label>
                  <textarea 
                    formControlName="notes" 
                    class="form-control textarea"
                    placeholder="Any additional notes about the payment..."
                    rows="3">
                  </textarea>
                </div>

                <div class="form-actions">
                  <button type="button" class="btn btn-secondary" (click)="resetRecordPaymentForm()">
                    Reset Form
                  </button>
                  <button type="submit" class="btn btn-primary" [disabled]="recordPaymentForm.invalid || processing()">
                    <span class="btn-spinner" *ngIf="processing()"></span>
                    {{ processing() ? 'Processing...' : 'Record Payment' }}
                  </button>
                </div>
              </form>
            </div>
          </div>

          <!-- Update Credit Limit Tab -->
          <div class="tab-content" *ngIf="activeTab() === 'update-limit'">
            <div class="form-container">
              <form [formGroup]="updateLimitForm" (ngSubmit)="onUpdateLimit()">
                <div class="form-header">
                  <h3>Update Credit Limit</h3>
                  <p class="form-description">Modify the member's credit limit</p>
                  
                  <div class="current-limit" *ngIf="creditSummary()">
                    <span class="current-label">Current Limit:</span>
                    <span class="current-value">{{ formatCurrency(creditSummary()?.creditLimit || 0) }}</span>
                  </div>
                </div>

                <div class="form-row">
                  <div class="form-field">
                    <label class="field-label required">New Credit Limit</label>
                    <div class="input-group">
                      <span class="input-prefix">Rp</span>
                      <input 
                        type="number" 
                        formControlName="newLimit" 
                        class="form-control currency-input"
                        placeholder="0"
                        [min]="creditSummary()?.currentDebt || 0"
                        [max]="50000000">
                    </div>
                    <div class="field-error" *ngIf="updateLimitForm.get('newLimit')?.invalid && updateLimitForm.get('newLimit')?.touched">
                      <span *ngIf="updateLimitForm.get('newLimit')?.errors?.['required']">New limit is required</span>
                      <span *ngIf="updateLimitForm.get('newLimit')?.errors?.['min']">New limit cannot be less than current debt</span>
                      <span *ngIf="updateLimitForm.get('newLimit')?.errors?.['max']">New limit cannot exceed 50,000,000</span>
                    </div>
                    
                    <!-- Limit Change Display -->
                    <div class="field-hint" *ngIf="limitChange()">
                      <span [class.positive]="limitChange()?.isIncrease" [class.negative]="!limitChange()?.isIncrease">
                        {{ limitChange()?.isIncrease ? '↗️' : '↘️' }} 
                        {{ limitChange()?.isIncrease ? 'Increase' : 'Decrease' }} of 
                        {{ formatCurrency(limitChange()?.changeAmount || 0) }}
                        ({{ formatPercentage(limitChange()?.changePercentage || 0) }})
                      </span>
                    </div>
                  </div>

                  <div class="form-field">
                    <div class="checkbox-field">
                      <input 
                        type="checkbox" 
                        id="requiresReview" 
                        formControlName="requiresReview">
                      <label for="requiresReview" class="checkbox-label">Requires Management Review</label>
                    </div>
                  </div>
                </div>

                <div class="form-field full-width">
                  <label class="field-label required">Reason for Change</label>
                  <textarea 
                    formControlName="reason" 
                    class="form-control textarea"
                    placeholder="Explain the reason for credit limit change..."
                    rows="3">
                  </textarea>
                  <div class="field-error" *ngIf="updateLimitForm.get('reason')?.invalid && updateLimitForm.get('reason')?.touched">
                    Reason is required for credit limit changes
                  </div>
                </div>

                <div class="form-row">
                  <div class="form-field">
                    <label class="field-label">Effective Date</label>
                    <input 
                      type="date" 
                      formControlName="effectiveDate" 
                      class="form-control"
                      [min]="getTodayDate()">
                  </div>

                  <div class="form-field">
                    <label class="field-label">Approved By</label>
                    <input 
                      type="text" 
                      formControlName="approvedBy" 
                      class="form-control"
                      placeholder="Manager/Approver name">
                  </div>
                </div>

                <div class="form-field full-width">
                  <label class="field-label">Additional Notes</label>
                  <textarea 
                    formControlName="notes" 
                    class="form-control textarea"
                    placeholder="Any additional notes..."
                    rows="2">
                  </textarea>
                </div>

                <div class="form-actions">
                  <button type="button" class="btn btn-secondary" (click)="resetUpdateLimitForm()">
                    Reset Form
                  </button>
                  <button type="submit" class="btn btn-primary" [disabled]="updateLimitForm.invalid || processing()">
                    <span class="btn-spinner" *ngIf="processing()"></span>
                    {{ processing() ? 'Processing...' : 'Update Limit' }}
                  </button>
                </div>
              </form>
            </div>
          </div>

          <!-- Transactions Tab -->
          <div class="tab-content" *ngIf="activeTab() === 'transactions'">
            <div class="transactions-container">
              <div class="transactions-header">
                <h3>Credit Transaction History</h3>
                <div class="transactions-filters">
                  <select class="filter-select" [(ngModel)]="transactionTypeFilter" (change)="filterTransactions()">
                    <option value="">All Types</option>
                    <option value="Sale">Sales</option>
                    <option value="Payment">Payments</option>
                    <option value="Credit_Grant">Credit Grants</option>
                    <option value="Credit_Adjustment">Adjustments</option>
                  </select>
                  
                  <input 
                    type="date" 
                    class="filter-input" 
                    [(ngModel)]="dateFromFilter" 
                    (change)="filterTransactions()"
                    placeholder="From date">
                  
                  <input 
                    type="date" 
                    class="filter-input" 
                    [(ngModel)]="dateToFilter" 
                    (change)="filterTransactions()"
                    placeholder="To date">
                </div>
              </div>

              <div class="transactions-list" *ngIf="filteredTransactions().length > 0">
                <div 
                  class="transaction-item" 
                  *ngFor="let transaction of filteredTransactions(); trackBy: trackByTransaction">
                  <div class="transaction-header">
                    <div class="transaction-type" [class]="getTransactionTypeClass(transaction.transactionType)">
                      {{ transaction.transactionType }}
                    </div>
                    <div class="transaction-date">{{ formatDateTime(transaction.createdAt) }}</div>
                  </div>
                  
                  <div class="transaction-content">
                    <div class="transaction-description">{{ transaction.description }}</div>
                    <div class="transaction-details">
                      <span class="transaction-ref" *ngIf="transaction.referenceNumber">
                        Ref: {{ transaction.referenceNumber }}
                      </span>
                      <span class="transaction-method" *ngIf="transaction.paymentMethod">
                        {{ transaction.paymentMethod }}
                      </span>
                      <span class="transaction-branch">{{ transaction.branchName }}</span>
                    </div>
                  </div>
                  
                  <div class="transaction-amounts">
                    <div class="transaction-amount" [class]="getAmountClass(transaction.transactionType)">
                      {{ transaction.transactionType === 'Payment' ? '-' : '+' }}{{ formatCurrency(transaction.amount) }}
                    </div>
                    <div class="balance-info">
                      <small>Balance: {{ formatCurrency(transaction.balanceAfter) }}</small>
                    </div>
                  </div>
                </div>
              </div>

              <div class="empty-transactions" *ngIf="filteredTransactions().length === 0">
                <div class="empty-icon">📋</div>
                <h4>No transactions found</h4>
                <p>No credit transactions match the selected criteria.</p>
              </div>
            </div>
          </div>

          <!-- Credit Eligibility Tab -->
          <div class="tab-content" *ngIf="activeTab() === 'eligibility'">
            <div class="eligibility-container" *ngIf="eligibilityData()">
              <div class="eligibility-header">
                <h3>Credit Eligibility Assessment</h3>
                <div class="eligibility-status" [class.eligible]="eligibilityData()?.isEligible" [class.not-eligible]="!eligibilityData()?.isEligible">
                  {{ eligibilityData()?.isEligible ? '✅ Eligible' : '❌ Not Eligible' }}
                </div>
              </div>

              <div class="eligibility-grid">
                <div class="eligibility-card">
                  <h4>Eligibility Score</h4>
                  <div class="score-display">
                    <div class="score-number">{{ eligibilityData()?.eligibilityScore || 0 }}</div>
                    <div class="score-description">{{ getEligibilityDescription(eligibilityData()?.eligibilityScore || 0) }}</div>
                  </div>
                </div>

                <div class="eligibility-card">
                  <h4>Credit Recommendations</h4>
                  <div class="recommendation-item">
                    <span class="rec-label">Maximum Limit:</span>
                    <span class="rec-value">{{ formatCurrency(eligibilityData()?.maxCreditLimit || 0) }}</span>
                  </div>
                  <div class="recommendation-item">
                    <span class="rec-label">Recommended:</span>
                    <span class="rec-value">{{ formatCurrency(eligibilityData()?.recommendedLimit || 0) }}</span>
                  </div>
                  <div class="recommendation-item" *ngIf="eligibilityData()?.nextReviewDate">
                    <span class="rec-label">Next Review:</span>
                    <span class="rec-value">{{ formatDate(eligibilityData()?.nextReviewDate) }}</span>
                  </div>
                </div>

                <div class="eligibility-card" *ngIf="eligibilityData()?.reasons && (eligibilityData()?.reasons?.length || 0) > 0">
                  <h4>Eligibility Reasons</h4>
                  <ul class="reasons-list">
                    <li *ngFor="let reason of eligibilityData()?.reasons" class="reason-item positive">
                      ✓ {{ reason }}
                    </li>
                  </ul>
                </div>

                <div class="eligibility-card" *ngIf="eligibilityData()?.requirements && (eligibilityData()?.requirements?.length || 0) > 0">
                  <h4>Requirements</h4>
                  <ul class="requirements-list">
                    <li *ngFor="let requirement of eligibilityData()?.requirements" class="requirement-item">
                      • {{ requirement }}
                    </li>
                  </ul>
                </div>

                <div class="eligibility-card" *ngIf="eligibilityData()?.riskFactors && (eligibilityData()?.riskFactors?.length || 0) > 0">
                  <h4>Risk Factors</h4>
                  <ul class="risk-list">
                    <li *ngFor="let risk of eligibilityData()?.riskFactors" class="risk-item negative">
                      ⚠ {{ risk }}
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  `,
  styles: [`
    // Modal Overlay & Container
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
      padding: var(--s4);
    }

    .modal-container {
      background: var(--surface);
      border-radius: var(--radius-xl);
      box-shadow: var(--shadow-2xl);
      width: 100%;
      max-width: 1000px;
      max-height: 90vh;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }

    // Modal Header
    .modal-header {
      padding: var(--s6);
      border-bottom: 2px solid var(--border);
      background: linear-gradient(135deg, var(--bg) 0%, var(--bg-secondary) 100%);
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }

    .header-content {
      flex: 1;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }

    .member-info {
      .modal-title {
        font-size: var(--text-2xl) !important;
        font-weight: var(--font-bold) !important;
        color: var(--text) !important;
        margin: 0 0 var(--s2) 0 !important;
      }

      .member-details {
        display: flex;
        gap: var(--s4);
        font-size: var(--text-sm);
        color: var(--text-secondary);

        .member-number {
          background: var(--primary-light);
          color: var(--primary);
          padding: var(--s1) var(--s2);
          border-radius: var(--radius);
          font-weight: var(--font-medium);
        }

        .member-tier {
          background: var(--bg-secondary);
          padding: var(--s1) var(--s2);
          border-radius: var(--radius);
        }
      }
    }

    .credit-status {
      display: flex;
      gap: var(--s2);

      .status-badge,
      .risk-badge {
        color: white;
        font-size: var(--text-xs);
        font-weight: var(--font-semibold);
        padding: var(--s2) var(--s3);
        border-radius: var(--radius);
      }
    }

    .close-button {
      background: var(--bg-secondary);
      border: 2px solid var(--border);
      border-radius: var(--radius);
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: var(--transition);

      &:hover {
        background: var(--error);
        border-color: var(--error);
        color: white;
      }

      .close-icon {
        font-size: var(--text-2xl);
        line-height: 1;
      }
    }

    // Tab Navigation
    .tab-navigation {
      display: flex;
      background: var(--bg);
      border-bottom: 2px solid var(--border);
      overflow-x: auto;
    }

    .tab-button {
      display: flex;
      align-items: center;
      gap: var(--s2);
      padding: var(--s4) var(--s6);
      border: none;
      background: none;
      cursor: pointer;
      transition: var(--transition);
      white-space: nowrap;
      position: relative;
      font-size: var(--text-sm);
      color: var(--text-secondary);

      &:hover:not(:disabled) {
        background: var(--primary-light);
        color: var(--primary);
      }

      &.active {
        background: var(--surface);
        color: var(--primary);
        font-weight: var(--font-medium);

        &::after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 2px;
          background: var(--primary);
        }
      }

      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      .tab-badge {
        background: var(--primary);
        color: white;
        font-size: var(--text-xs);
        padding: var(--s1) var(--s2);
        border-radius: var(--radius-sm);
        min-width: 20px;
        text-align: center;
      }
    }

    // Modal Content
    .modal-content {
      flex: 1;
      overflow-y: auto;
      padding: var(--s6);
    }

    .tab-content {
      display: block;
    }

    // Loading & Error States
    .loading-section {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: var(--s16);

      .loading-spinner {
        width: 40px;
        height: 40px;
        border: 4px solid var(--border);
        border-top: 4px solid var(--primary);
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin-bottom: var(--s4);
      }

      .loading-text {
        color: var(--text-secondary);
        text-align: center;
      }
    }

    .error-section {
      padding: var(--s6);

      .error-content {
        display: flex;
        align-items: flex-start;
        gap: var(--s4);
        padding: var(--s6);
        background: var(--surface);
        border: 2px solid var(--error);
        border-radius: var(--radius-xl);

        .error-icon {
          font-size: var(--text-3xl);
          flex-shrink: 0;
        }

        .error-details {
          flex: 1;

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

    // Credit Overview
    .credit-overview {
      .overview-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
        gap: var(--s6);
      }

      .overview-card {
        background: var(--surface);
        border: 2px solid var(--border);
        border-radius: var(--radius-lg);
        overflow: hidden;

        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: var(--s4);
          background: var(--bg);
          border-bottom: 2px solid var(--border);

          h4 {
            font-size: var(--text-lg) !important;
            font-weight: var(--font-semibold) !important;
            color: var(--text) !important;
            margin: 0 !important;
          }

          .card-icon {
            font-size: var(--text-2xl);
          }
        }

        .card-content {
          padding: var(--s4);
        }
      }

      .metric {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: var(--s2) 0;
        border-bottom: 1px solid var(--bg);

        &:last-child {
          border-bottom: none;
        }

        .metric-label {
          font-size: var(--text-sm);
          color: var(--text-secondary);
        }

        .metric-value {
          font-size: var(--text-base);
          font-weight: var(--font-medium);
          color: var(--text);

          &.debt {
            color: var(--error);
          }

          &.available {
            color: var(--success);
          }

          &.overdue {
            color: var(--error);
            font-weight: var(--font-bold);
          }
        }
      }

      .utilization-bar {
        margin-top: var(--s4);
        position: relative;
        background: var(--bg);
        border-radius: var(--radius);
        height: 24px;
        overflow: hidden;

        .utilization-progress {
          height: 100%;
          background: var(--success);
          transition: var(--transition);

          &.high-utilization {
            background: var(--error);
          }
        }

        .utilization-text {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          font-size: var(--text-xs);
          font-weight: var(--font-medium);
          color: var(--text);
        }
      }

      .score-display {
        display: flex;
        align-items: baseline;
        gap: var(--s2);
        margin-bottom: var(--s3);

        .score-number {
          font-size: var(--text-4xl);
          font-weight: var(--font-bold);
          color: var(--primary);
        }

        .score-range {
          font-size: var(--text-lg);
          color: var(--text-secondary);
        }
      }

      .score-bar {
        background: var(--bg);
        border-radius: var(--radius);
        height: 8px;
        overflow: hidden;
        margin-bottom: var(--s2);

        .score-progress {
          height: 100%;
          transition: var(--transition);

          &.excellent {
            background: var(--success);
          }

          &.good {
            background: var(--primary);
          }

          &.fair {
            background: var(--warning);
          }

          &.poor {
            background: var(--error);
          }
        }
      }

      .score-description {
        font-size: var(--text-sm);
        color: var(--text-secondary);
      }

      .quick-actions {
        display: flex;
        flex-wrap: wrap;
        gap: var(--s3);

        .btn {
          flex: 1;
          min-width: 120px;
        }
      }
    }

    // Form Styles
    .form-container {
      max-width: 600px;

      .form-header {
        margin-bottom: var(--s6);

        h3 {
          font-size: var(--text-2xl) !important;
          font-weight: var(--font-bold) !important;
          color: var(--text) !important;
          margin: 0 0 var(--s2) 0 !important;
        }

        .form-description {
          font-size: var(--text-base);
          color: var(--text-secondary);
          margin: 0 0 var(--s4) 0;
        }

        .debt-summary {
          background: var(--primary-light);
          padding: var(--s4);
          border-radius: var(--radius);
          border: 2px solid var(--primary);

          .debt-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: var(--s2);

            &:last-child {
              margin-bottom: 0;
            }

            .debt-label {
              font-size: var(--text-sm);
              font-weight: var(--font-medium);
              color: var(--text);
            }

            .debt-amount {
              font-size: var(--text-base);
              font-weight: var(--font-bold);
              color: var(--text);

              &.overdue {
                color: var(--error);
              }
            }
          }
        }

        .current-limit {
          background: var(--bg);
          padding: var(--s3);
          border-radius: var(--radius);
          display: flex;
          justify-content: space-between;
          align-items: center;

          .current-label {
            font-size: var(--text-sm);
            color: var(--text-secondary);
          }

          .current-value {
            font-size: var(--text-lg);
            font-weight: var(--font-bold);
            color: var(--primary);
          }
        }
      }

      .form-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: var(--s4);
        margin-bottom: var(--s4);

        @media (max-width: 640px) {
          grid-template-columns: 1fr;
        }
      }

      .form-field {
        margin-bottom: var(--s4);

        &.full-width {
          grid-column: 1 / -1;
        }

        .field-label {
          display: block;
          font-size: var(--text-sm) !important;
          font-weight: var(--font-medium) !important;
          color: var(--text) !important;
          margin: 0 0 var(--s2) 0 !important;

          &.required::after {
            content: '*';
            color: var(--error);
            margin-left: var(--s1);
          }
        }

        .form-control {
          width: 100% !important;
          padding: var(--s3) var(--s4) !important;
          border: 2px solid var(--border) !important;
          border-radius: var(--radius) !important;
          font-size: var(--text-base) !important;
          background: var(--surface) !important;
          color: var(--text) !important;
          transition: var(--transition) !important;
          min-height: 48px !important;

          &:focus {
            outline: none !important;
            border-color: var(--primary) !important;
            box-shadow: 0 0 0 3px rgba(255, 145, 77, 0.1) !important;
          }

          &.textarea {
            resize: vertical !important;
            min-height: 80px !important;
            line-height: 1.5 !important;
          }
        }

        .input-group {
          position: relative;
          display: flex;
          align-items: center;

          .input-prefix {
            position: absolute;
            left: var(--s4);
            font-size: var(--text-base);
            font-weight: var(--font-medium);
            color: var(--text-secondary);
            z-index: 1;
            pointer-events: none;
          }

          .currency-input {
            padding-left: 40px !important;
          }
        }

        .checkbox-field {
          display: flex;
          align-items: center;
          gap: var(--s2);

          input[type="checkbox"] {
            width: 18px;
            height: 18px;
            accent-color: var(--primary);
          }

          .checkbox-label {
            font-size: var(--text-sm);
            color: var(--text);
            cursor: pointer;
          }
        }

        .field-error {
          font-size: var(--text-xs);
          color: var(--error);
          background: rgba(225, 90, 79, 0.1);
          padding: var(--s2);
          border-radius: var(--radius);
          margin-top: var(--s2);
        }

        .field-hint {
          font-size: var(--text-xs);
          color: var(--text-muted);
          background: var(--bg);
          padding: var(--s2);
          border-radius: var(--radius);
          margin-top: var(--s2);

          .positive {
            color: var(--success);
          }

          .negative {
            color: var(--error);
          }
        }
      }

      .form-actions {
        display: flex;
        justify-content: flex-end;
        gap: var(--s4);
        margin-top: var(--s6);
        padding-top: var(--s6);
        border-top: 2px solid var(--border);

        @media (max-width: 640px) {
          flex-direction: column-reverse;
        }
      }
    }

    // Button Styles
    .btn {
      display: inline-flex !important;
      align-items: center !important;
      justify-content: center !important;
      gap: var(--s2) !important;
      padding: var(--s3) var(--s6) !important;
      border-radius: var(--radius) !important;
      font-size: var(--text-sm) !important;
      font-weight: var(--font-medium) !important;
      text-decoration: none !important;
      cursor: pointer !important;
      transition: var(--transition) !important;
      border: 2px solid transparent !important;
      min-height: 44px !important;

      &:disabled {
        opacity: 0.6 !important;
        cursor: not-allowed !important;
      }

      &.btn-primary {
        background: var(--primary) !important;
        color: white !important;
        border-color: var(--primary) !important;

        &:hover:not(:disabled) {
          background: var(--primary-hover) !important;
          border-color: var(--primary-hover) !important;
        }
      }

      &.btn-secondary {
        background: var(--bg-secondary) !important;
        color: var(--text) !important;
        border-color: var(--border) !important;

        &:hover:not(:disabled) {
          background: var(--primary-light) !important;
          color: var(--primary) !important;
          border-color: var(--primary) !important;
        }
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

      &.btn-sm {
        padding: var(--s2) var(--s4) !important;
        font-size: var(--text-xs) !important;
        min-height: 36px !important;
      }

      .btn-spinner {
        width: 16px;
        height: 16px;
        border: 2px solid transparent;
        border-top: 2px solid currentColor;
        border-radius: 50%;
        animation: spin 1s linear infinite;
      }
    }

    // Transactions List
    .transactions-container {
      .transactions-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: var(--s6);

        h3 {
          font-size: var(--text-xl) !important;
          font-weight: var(--font-semibold) !important;
          color: var(--text) !important;
          margin: 0 !important;
        }

        .transactions-filters {
          display: flex;
          gap: var(--s3);

          .filter-select,
          .filter-input {
            padding: var(--s2) var(--s3);
            border: 2px solid var(--border);
            border-radius: var(--radius);
            font-size: var(--text-sm);
            background: var(--surface);
            color: var(--text);
          }
        }
      }

      .transactions-list {
        max-height: 400px;
        overflow-y: auto;
      }

      .transaction-item {
        background: var(--surface);
        border: 2px solid var(--border);
        border-radius: var(--radius);
        padding: var(--s4);
        margin-bottom: var(--s3);
        transition: var(--transition);

        &:hover {
          border-color: var(--primary-light);
          box-shadow: var(--shadow-sm);
        }

        .transaction-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: var(--s2);

          .transaction-type {
            font-size: var(--text-sm);
            font-weight: var(--font-medium);
            padding: var(--s1) var(--s2);
            border-radius: var(--radius-sm);

            &.sale {
              background: var(--warning);
              color: white;
            }

            &.payment {
              background: var(--success);
              color: white;
            }

            &.credit_grant {
              background: var(--primary);
              color: white;
            }

            &.adjustment {
              background: var(--info);
              color: white;
            }
          }

          .transaction-date {
            font-size: var(--text-xs);
            color: var(--text-secondary);
          }
        }

        .transaction-content {
          .transaction-description {
            font-size: var(--text-base);
            font-weight: var(--font-medium);
            color: var(--text);
            margin-bottom: var(--s2);
          }

          .transaction-details {
            display: flex;
            gap: var(--s3);
            font-size: var(--text-xs);
            color: var(--text-secondary);

            .transaction-ref,
            .transaction-method,
            .transaction-branch {
              background: var(--bg);
              padding: var(--s1) var(--s2);
              border-radius: var(--radius-sm);
            }
          }
        }

        .transaction-amounts {
          text-align: right;

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

          .balance-info {
            font-size: var(--text-xs);
            color: var(--text-secondary);
            margin-top: var(--s1);
          }
        }
      }

      .empty-transactions {
        text-align: center;
        padding: var(--s16);

        .empty-icon {
          font-size: 4rem;
          margin-bottom: var(--s4);
        }

        h4 {
          font-size: var(--text-lg) !important;
          color: var(--text) !important;
          margin: 0 0 var(--s2) 0 !important;
        }

        p {
          color: var(--text-secondary);
          margin: 0;
        }
      }
    }

    // Eligibility Assessment
    .eligibility-container {
      .eligibility-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: var(--s6);

        h3 {
          font-size: var(--text-xl) !important;
          font-weight: var(--font-semibold) !important;
          color: var(--text) !important;
          margin: 0 !important;
        }

        .eligibility-status {
          font-size: var(--text-sm);
          font-weight: var(--font-bold);
          padding: var(--s2) var(--s4);
          border-radius: var(--radius);

          &.eligible {
            background: var(--success);
            color: white;
          }

          &.not-eligible {
            background: var(--error);
            color: white;
          }
        }
      }

      .eligibility-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
        gap: var(--s6);
      }

      .eligibility-card {
        background: var(--surface);
        border: 2px solid var(--border);
        border-radius: var(--radius);
        padding: var(--s4);

        h4 {
          font-size: var(--text-lg) !important;
          font-weight: var(--font-semibold) !important;
          color: var(--text) !important;
          margin: 0 0 var(--s4) 0 !important;
        }

        .recommendation-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: var(--s2) 0;
          border-bottom: 1px solid var(--bg);

          &:last-child {
            border-bottom: none;
          }

          .rec-label {
            font-size: var(--text-sm);
            color: var(--text-secondary);
          }

          .rec-value {
            font-size: var(--text-base);
            font-weight: var(--font-medium);
            color: var(--text);
          }
        }

        .reasons-list,
        .requirements-list,
        .risk-list {
          list-style: none;
          padding: 0;
          margin: 0;

          .reason-item,
          .requirement-item,
          .risk-item {
            font-size: var(--text-sm);
            padding: var(--s2) 0;
            border-bottom: 1px solid var(--bg);

            &:last-child {
              border-bottom: none;
            }

            &.positive {
              color: var(--success);
            }

            &.negative {
              color: var(--error);
            }
          }
        }
      }
    }

    // Animations
    @keyframes spin {
      0% {
        transform: rotate(0deg);
      }
      100% {
        transform: rotate(360deg);
      }
    }

    // Responsive Design
    @media (max-width: 640px) {
      .modal-overlay {
        padding: var(--s2);
      }

      .modal-container {
        max-height: 95vh;
      }

      .modal-header {
        padding: var(--s4);

        .header-content {
          flex-direction: column;
          gap: var(--s3);
        }

        .member-details {
          flex-direction: column;
          gap: var(--s2);
        }

        .credit-status {
          flex-direction: column;
        }
      }

      .tab-navigation {
        .tab-button {
          padding: var(--s3) var(--s4);
          font-size: var(--text-xs);
        }
      }

      .modal-content {
        padding: var(--s4);
      }

      .overview-grid {
        grid-template-columns: 1fr !important;
      }

      .transactions-filters {
        flex-direction: column;
        gap: var(--s2) !important;

        .filter-select,
        .filter-input {
          width: 100%;
        }
      }

      .eligibility-grid {
        grid-template-columns: 1fr !important;
      }
    }
  `]
})
export class MemberCreditModalComponent implements OnInit, OnDestroy {
  // Input/Output signals
  readonly isOpen = input<boolean>(false);
  readonly member = input<MemberDto | null>(null);
  readonly modalClosed = output<void>();
  readonly creditUpdated = output<MemberCreditSummaryDto>();

  // Injected services
  private readonly fb = inject(FormBuilder);
  readonly creditService = inject(MemberCreditService);
  private readonly stateService = inject(StateService);

  // Component state signals
  readonly activeTab = signal<ModalTab>('overview');
  readonly creditSummary = signal<MemberCreditSummaryDto | null>(null);
  readonly eligibilityData = signal<CreditEligibilityDto | null>(null);
  readonly processing = signal<boolean>(false);

  // Transaction filters
  readonly transactionTypeFilter = signal<string>('');
  readonly dateFromFilter = signal<string>('');
  readonly dateToFilter = signal<string>('');

  // Form instances
  public grantCreditForm!: FormGroup;
  public recordPaymentForm!: FormGroup;
  public updateLimitForm!: FormGroup;

  // Computed properties
  readonly availableTabs = computed(() => {
    const baseAccess = this.stateService.hasPermission('member-debt.write');
    const canViewTransactions = this.stateService.hasPermission('member-debt.read');
    
    return [
      { id: 'overview' as ModalTab, label: 'Overview', icon: '📊', disabled: false, badge: undefined },
      { id: 'grant-credit' as ModalTab, label: 'Grant Credit', icon: '💳', disabled: !baseAccess, badge: undefined },
      { id: 'record-payment' as ModalTab, label: 'Payment', icon: '💰', disabled: !baseAccess, badge: undefined },
      { id: 'update-limit' as ModalTab, label: 'Update Limit', icon: '📈', disabled: !baseAccess, badge: undefined },
      { id: 'transactions' as ModalTab, label: 'History', icon: '📋', disabled: !canViewTransactions, badge: undefined },
      { id: 'eligibility' as ModalTab, label: 'Eligibility', icon: '✅', disabled: !baseAccess, badge: undefined }
    ];
  });

  readonly filteredTransactions = computed(() => {
    const transactions = this.creditService.creditTransactions();
    const typeFilter = this.transactionTypeFilter();
    const fromDate = this.dateFromFilter();
    const toDate = this.dateToFilter();

    return transactions.filter(transaction => {
      if (typeFilter && transaction.transactionType !== typeFilter) return false;
      if (fromDate && transaction.createdAt < fromDate) return false;
      if (toDate && transaction.createdAt > toDate) return false;
      return true;
    });
  });

  readonly canGrantCredit = computed(() => {
    const summary = this.creditSummary();
    return summary?.isEligibleForCredit && summary?.statusDescription !== 'Blocked';
  });

  readonly canRecordPayment = computed(() => {
    const summary = this.creditSummary();
    return summary && summary.currentDebt > 0;
  });

  readonly canUpdateLimit = computed(() => {
    const summary = this.creditSummary();
    return summary && summary.statusDescription !== 'Blocked';
  });

  readonly optimalPayment = computed(() => {
    const summary = this.creditSummary();
    const paymentForm = this.recordPaymentForm;
    
    if (!summary || !paymentForm) return null;
    
    const availableAmount = paymentForm.get('amount')?.value || 0;
    if (availableAmount <= 0) return null;

    return calculateOptimalPaymentAmount(
      summary.currentDebt,
      availableAmount,
      true
    );
  });

  readonly limitChange = computed(() => {
    const summary = this.creditSummary();
    const limitForm = this.updateLimitForm;
    
    if (!summary || !limitForm) return null;
    
    const newLimit = limitForm.get('newLimit')?.value || 0;
    const currentLimit = summary.creditLimit;
    
    if (newLimit === currentLimit) return null;
    
    const changeAmount = Math.abs(newLimit - currentLimit);
    const changePercentage = (changeAmount / currentLimit) * 100;
    
    return {
      isIncrease: newLimit > currentLimit,
      changeAmount,
      changePercentage
    };
  });

  // Lifecycle management
  private readonly destroy$ = new Subject<void>();

  ngOnInit(): void {
    this.initializeForms();
    this.setupModalWatchers();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Initialization methods
  private initializeForms(): void {
    // Grant Credit Form
    this.grantCreditForm = this.fb.group({
      creditType: ['', [Validators.required]],
      amount: ['', [Validators.required, Validators.min(1), Validators.max(50000000)]],
      description: ['', [Validators.required, Validators.minLength(10)]],
      expiryDate: [''],
      requiresApproval: [false],
      notes: ['']
    });

    // Record Payment Form
    this.recordPaymentForm = this.fb.group({
      amount: ['', [Validators.required, Validators.min(1)]],
      paymentMethod: ['', [Validators.required]],
      referenceNumber: ['', [Validators.required]],
      partialPayment: [true],
      allocateToOldest: [true],
      notes: ['']
    });

    // Update Limit Form  
    this.updateLimitForm = this.fb.group({
      newLimit: ['', [Validators.required, Validators.min(0), Validators.max(50000000)]],
      reason: ['', [Validators.required, Validators.minLength(10)]],
      effectiveDate: [''],
      approvedBy: [''],
      requiresReview: [false],
      notes: ['']
    });
  }

  private setupModalWatchers(): void {
    // Watch for modal opening to load credit data
    if (this.isOpen() && this.member()) {
      this.loadCreditData();
    }
  }

  // Data loading methods
  private async loadCreditData(): Promise<void> {
    const member = this.member();
    if (!member) return;

    try {
      // Load credit summary
      const summary = await this.creditService.getCreditSummary(member.memberId).toPromise();
      if (summary) {
        this.creditSummary.set(summary);
        this.updateFormValidators(summary);
      }

      // Load transaction history
      this.creditService.getCreditHistory(member.memberId).subscribe();

      // Load eligibility data
      const eligibility = await this.creditService.getCreditEligibility(member.memberId).toPromise();
      if (eligibility) {
        this.eligibilityData.set(eligibility);
      }

    } catch (error) {
      console.error('Error loading credit data:', error);
    }
  }

  private updateFormValidators(summary: MemberCreditSummaryDto): void {
    // Update payment form max amount
    this.recordPaymentForm.get('amount')?.setValidators([
      Validators.required,
      Validators.min(1),
      Validators.max(summary.currentDebt)
    ]);

    // Update limit form min amount
    this.updateLimitForm.get('newLimit')?.setValidators([
      Validators.required,
      Validators.min(summary.currentDebt),
      Validators.max(50000000)
    ]);
  }

  // Modal control methods
  setActiveTab(tab: ModalTab): void {
    const tabConfig = this.availableTabs().find(t => t.id === tab);
    if (tabConfig && !tabConfig.disabled) {
      this.activeTab.set(tab);
    }
  }

  closeModal(): void {
    this.modalClosed.emit();
  }

  onOverlayClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.closeModal();
    }
  }

  reloadCreditData(): void {
    this.creditService.clearError();
    this.loadCreditData();
  }

  // Form submission methods
  async onGrantCredit(): Promise<void> {
    if (this.grantCreditForm.invalid || this.processing()) return;

    const member = this.member();
    if (!member) return;

    this.processing.set(true);

    try {
      const formValue = this.grantCreditForm.value;
      const request: GrantCreditRequestDto = {
        amount: formValue.amount,
        description: formValue.description,
        saleId: 0,
        branchId: 1, // Default branch ID
        notes: formValue.notes || formValue.description
      };

      const success = await this.creditService.grantCredit(member.memberId, request).toPromise();
      
      if (success) {
        this.resetGrantCreditForm();
        this.loadCreditData(); // Refresh data
        this.setActiveTab('overview');
      }

    } catch (error) {
      console.error('Error granting credit:', error);
    } finally {
      this.processing.set(false);
    }
  }

  async onRecordPayment(): Promise<void> {
    if (this.recordPaymentForm.invalid || this.processing()) return;

    const member = this.member();
    if (!member) return;

    this.processing.set(true);

    try {
      const formValue = this.recordPaymentForm.value;
      const request: CreditPaymentRequestDto = {
        memberId: member.memberId,
        amount: formValue.amount,
        paymentMethod: formValue.paymentMethod,
        referenceNumber: formValue.referenceNumber,
        branchId: 1, // Default branch ID
        notes: formValue.notes || undefined,
        partialPayment: formValue.partialPayment,
        allocateToOldest: formValue.allocateToOldest
      };

      const transaction = await this.creditService.recordPayment(member.memberId, request).toPromise();
      
      if (transaction) {
        this.resetRecordPaymentForm();
        this.loadCreditData(); // Refresh data
        this.setActiveTab('overview');
      }

    } catch (error) {
      console.error('Error recording payment:', error);
    } finally {
      this.processing.set(false);
    }
  }

  async onUpdateLimit(): Promise<void> {
    if (this.updateLimitForm.invalid || this.processing()) return;

    const member = this.member();
    const currentUser = this.stateService.user();
    if (!member || !currentUser) return;

    this.processing.set(true);

    try {
      const formValue = this.updateLimitForm.value;
      const request: UpdateCreditLimitRequestDto = {
        memberId: member.memberId,
        newLimit: formValue.newLimit,
        reason: formValue.reason,
        branchId: 1, // Default branch ID since currentBranch is not available
        approvedBy: formValue.approvedBy || currentUser.username,
        effectiveDate: formValue.effectiveDate || undefined,
        requiresReview: formValue.requiresReview,
        notes: formValue.notes || undefined
      };

      const success = await this.creditService.updateCreditLimit(member.memberId, request).toPromise();
      
      if (success) {
        this.resetUpdateLimitForm();
        this.loadCreditData(); // Refresh data
        this.setActiveTab('overview');
      }

    } catch (error) {
      console.error('Error updating credit limit:', error);
    } finally {
      this.processing.set(false);
    }
  }

  // Form reset methods
  resetGrantCreditForm(): void {
    this.grantCreditForm.reset();
  }

  resetRecordPaymentForm(): void {
    this.recordPaymentForm.reset();
  }

  resetUpdateLimitForm(): void {
    this.updateLimitForm.reset();
  }

  // Transaction filtering
  filterTransactions(): void {
    // Triggers computed property recalculation
  }

  // Utility methods
  formatCurrency = formatCurrency;
  formatPercentage = formatPercentage;

  formatDate(dateString: string | undefined): string {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('id-ID');
  }

  formatDateTime(dateString: string): string {
    return new Date(dateString).toLocaleString('id-ID');
  }

  getCreditStatusColor(status: string | undefined): string {
    return formatCreditStatus(status as any).bgColor;
  }

  getRiskLevelColor(riskLevel: string | undefined): string {
    return formatRiskLevel(riskLevel as any).bgColor;
  }

  getScoreColorClass(score: number): string {
    if (score >= 800) return 'excellent';
    if (score >= 700) return 'good';
    if (score >= 600) return 'fair';
    return 'poor';
  }

  getScoreDescription(score: number): string {
    if (score >= 800) return 'Excellent Credit';
    if (score >= 700) return 'Good Credit';
    if (score >= 600) return 'Fair Credit';
    return 'Poor Credit';
  }

  getEligibilityDescription(score: number): string {
    if (score >= 80) return 'Highly Eligible';
    if (score >= 60) return 'Eligible';
    if (score >= 40) return 'Conditionally Eligible';
    return 'Not Eligible';
  }

  getTransactionTypeClass(type: string): string {
    return type.toLowerCase().replace('_', '');
  }

  getAmountClass(type: string): string {
    return type === 'Payment' ? 'negative' : 'positive';
  }

  getTodayDate(): string {
    return new Date().toISOString().split('T')[0];
  }

  getTomorrowDate(): string {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  }

  trackByTransaction = (index: number, transaction: CreditTransactionDto): number => transaction.id;
}