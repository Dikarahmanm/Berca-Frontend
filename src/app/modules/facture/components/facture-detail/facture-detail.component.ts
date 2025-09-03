import { Component, OnInit, OnDestroy, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { FactureService } from '../../services/facture.service';
import { ToastService } from '../../../../shared/services/toast.service';
import {
  FactureDto,
  FactureItemDetailDto,
  FacturePaymentDto,
  FactureStatus,
  FacturePriority,
  VerifyFactureDto,
  DisputeFactureDto,
  SchedulePaymentDto,
  ProcessPaymentDto,
  ConfirmPaymentDto
} from '../../interfaces/facture.interfaces';
import { FactureWorkflowModalComponent, WorkflowType, VerifyFormData, ApprovalFormData, DisputeFormData, CancelFormData } from '../facture-workflow-modal/facture-workflow-modal.component';
import { PaymentScheduleModalComponent } from '../payment-schedule-modal/payment-schedule-modal.component';
import { ReceivePaymentModalComponent } from '../receive-payment-modal/receive-payment-modal.component';
import { PaymentConfirmationModalComponent, PaymentConfirmationData } from '../payment-confirmation-modal/payment-confirmation-modal.component';
import { environment } from '../../../../../environment/environment';

@Component({
  selector: 'app-facture-detail',
  standalone: true,
  imports: [CommonModule, FactureWorkflowModalComponent, PaymentScheduleModalComponent, ReceivePaymentModalComponent, PaymentConfirmationModalComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="facture-detail-container">
      <!-- Loading State -->
      <div *ngIf="loading()" class="loading-container">
        <div class="loading-spinner"></div>
        <p class="text-secondary mt-2">Loading facture details...</p>
      </div>

      <!-- Error State -->
      <div *ngIf="error() && !loading()" class="error-container">
        <div class="error-message">
          <h4>Error Loading Facture</h4>
          <p>{{ error() }}</p>
          <button class="btn btn-primary" (click)="loadFacture()">Try Again</button>
        </div>
      </div>

      <!-- Facture Detail -->
      <div *ngIf="facture() && !loading()" class="facture-detail">
        
        
        <!-- Header -->
        <div class="detail-header">
          <div class="header-left">
            <button class="btn btn-outline btn-sm" (click)="goBack()">
              ← Back to List
            </button>
            <div class="header-info">
              <h1 class="facture-title">{{ facture()!.supplierInvoiceNumber }}</h1>
              <p class="facture-subtitle">
                Internal Ref: {{ facture()!.internalReferenceNumber }}
              </p>
            </div>
          </div>
          
          <div class="header-right">
            <div class="status-badges">
              <span class="status-badge" [class]="getStatusClass(facture()!.status)">
                {{ facture()!.statusDisplay }}
              </span>
              <span class="priority-badge" [class]="getPriorityClass(facture()!.paymentPriority)">
                {{ facture()!.priorityDisplay }}
              </span>
              <span *ngIf="facture()!.isOverdue" class="overdue-badge">
                {{ facture()!.daysOverdue }} days overdue
              </span>
            </div>
            
            <!-- Action Buttons -->
            <div class="action-buttons">
              <button *ngIf="facture()!.canVerify" 
                      class="btn btn-secondary btn-sm" 
                      (click)="onVerifyFacture()">
                Verify Items
              </button>
              
              <button *ngIf="facture()!.canApprove" 
                      class="btn btn-primary btn-sm" 
                      (click)="onApproveFacture()">
                Approve Payment
              </button>

              <!-- Payment Processing Buttons with Enhanced Logic -->
              <button *ngIf="canSchedulePayment()" 
                      class="btn btn-success btn-sm" 
                      (click)="onSchedulePayment()">
                <span *ngIf="outstandingInfo()?.isPartiallyPaid; else scheduleText">
                  Pay Remaining {{ outstandingInfo()?.amountDisplay }}
                </span>
                <ng-template #scheduleText>Schedule Payment</ng-template>
              </button>

              <button *ngIf="canReceivePayment()" 
                      class="btn btn-primary btn-sm" 
                      (click)="onReceivePayment()">
                Receive Payment
              </button>
              
              <!-- Outstanding Amount Info for Partial Payments -->
              <div *ngIf="outstandingInfo()?.isPartiallyPaid" class="outstanding-info mt-3 p-3 bg-warning-light border-l-4 border-warning">
                <div class="flex items-center justify-between">
                  <div>
                    <div class="font-medium text-warning-dark">Partial Payment Status</div>
                    <div class="text-sm text-gray-600">
                      Paid {{ outstandingInfo()?.paidPercentage }}% of total amount
                    </div>
                  </div>
                  <div class="text-right">
                    <div class="font-semibold text-warning-dark">{{ outstandingInfo()?.amountDisplay }}</div>
                    <div class="text-xs text-gray-500">remaining</div>
                  </div>
                </div>
              </div>
              
              <button *ngIf="facture()!.canDispute" 
                      class="btn btn-error btn-sm" 
                      (click)="onDisputeFacture()">
                Dispute
              </button>
            </div>
          </div>
        </div>

        <!-- Main Content -->
        <div class="detail-content">
          
          <!-- Supplier & Basic Info -->
          <div class="info-section">
            <h3 class="section-title">Supplier Information</h3>
            <div class="info-grid">
              <div class="info-item">
                <label>Supplier</label>
                <div class="value">
                  {{ facture()!.supplierName }} ({{ facture()!.supplierCode }})
                </div>
              </div>
              
              <div class="info-item">
                <label>Branch</label>
                <div class="value">{{ facture()!.branchDisplay }}</div>
              </div>
              
              <div class="info-item">
                <label>Invoice Date</label>
                <div class="value">{{ formatDate(facture()!.invoiceDate) }}</div>
              </div>
              
              <div class="info-item">
                <label>Due Date</label>
                <div class="value" [class.text-error]="facture()!.isOverdue">
                  {{ formatDate(facture()!.dueDate) }}
                  <span *ngIf="facture()!.daysUntilDue > 0" class="text-secondary">
                    ({{ facture()!.daysUntilDue }} days remaining)
                  </span>
                </div>
              </div>
              
              <div class="info-item" *ngIf="facture()!.supplierPONumber">
                <label>Supplier PO Number</label>
                <div class="value">{{ facture()!.supplierPONumber }}</div>
              </div>
              
              <div class="info-item" *ngIf="facture()!.deliveryDate">
                <label>Delivery Date</label>
                <div class="value">{{ formatDate(facture()!.deliveryDate!) }}</div>
              </div>
            </div>
          </div>

          <!-- Financial Summary -->
          <div class="info-section">
            <h3 class="section-title">Financial Summary</h3>
            <div class="financial-grid">
              <div class="financial-item">
                <label>Total Amount</label>
                <div class="amount-value total">{{ facture()!.totalAmountDisplay }}</div>
              </div>
              
              <div class="financial-item">
                <label>Paid Amount</label>
                <div class="amount-value paid">{{ facture()!.paidAmountDisplay }}</div>
              </div>
              
              <div class="financial-item">
                <label>Outstanding</label>
                <div class="amount-value outstanding" [class.text-error]="facture()!.outstandingAmount > 0">
                  {{ facture()!.outstandingAmountDisplay }}
                </div>
              </div>
              
              <div class="financial-item">
                <label>Payment Progress</label>
                <div class="progress-container">
                  <div class="progress-bar">
                    <div class="progress-fill" [style.width.%]="facture()!.paymentProgress"></div>
                  </div>
                  <span class="progress-text">{{ facture()!.paymentProgress }}%</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Workflow Timeline -->
          <div class="info-section">
            <h3 class="section-title">Workflow Timeline</h3>
            <div class="timeline">
              
              <div class="timeline-item completed">
                <div class="timeline-icon">📥</div>
                <div class="timeline-content">
                  <div class="timeline-title">Invoice Received</div>
                  <div class="timeline-meta">
                    {{ formatDateTime(facture()!.receivedAt) }} by {{ facture()!.receivedByName }}
                  </div>
                </div>
              </div>
              
              <div class="timeline-item" 
                   [class.completed]="isVerificationCompleted()"
                   [class.current]="isVerificationCurrent()">
                <div class="timeline-icon">🔍</div>
                <div class="timeline-content">
                  <div class="timeline-title">Items Verification</div>
                  <div class="timeline-meta" *ngIf="facture()!.verifiedAt">
                    {{ formatDateTime(facture()!.verifiedAt!) }} by {{ facture()!.verifiedByName }}
                  </div>
                  <div class="timeline-meta" *ngIf="!facture()!.verifiedAt && isVerificationCurrent()">
                    {{ facture()!.verificationStatus || 'Pending verification' }}
                  </div>
                  <div class="timeline-meta" *ngIf="isVerificationCompleted() && !facture()!.verifiedAt">
                    Verified (details not available)
                  </div>
                </div>
              </div>
              
              <div class="timeline-item" 
                   [class.completed]="isApprovalCompleted()"
                   [class.current]="isApprovalCurrent()">
                <div class="timeline-icon">✅</div>
                <div class="timeline-content">
                  <div class="timeline-title">Payment Approval</div>
                  <div class="timeline-meta" *ngIf="facture()!.approvedAt">
                    {{ formatDateTime(facture()!.approvedAt!) }} by {{ facture()!.approvedByName }}
                  </div>
                  <div class="timeline-meta" *ngIf="isApprovalCurrent() && !facture()!.approvedAt">
                    Pending approval
                  </div>
                  <div class="timeline-meta" *ngIf="isApprovalCompleted() && !facture()!.approvedAt">
                    Approved (details not available)
                  </div>
                </div>
              </div>
              
              <div class="timeline-item" 
                   [class.completed]="isPaymentCompleted()"
                   [class.current]="isPaymentCurrent()">
                <div class="timeline-icon">💰</div>
                <div class="timeline-content">
                  <div class="timeline-title">Payment Processing</div>
                  <div class="timeline-meta">
                    <span *ngIf="facture()!.paidAmount === 0 && paymentsCount() === 0">No payments scheduled yet</span>
                    <span *ngIf="facture()!.paidAmount === 0 && paymentsCount() > 0">
                      {{ paymentsCount() }} payment(s) scheduled
                    </span>
                    <span *ngIf="facture()!.paidAmount > 0 && facture()!.outstandingAmount > 0">
                      Partially paid: {{ facture()!.paidAmountDisplay }} of {{ facture()!.totalAmountDisplay }}
                    </span>
                    <span *ngIf="isPaymentCompleted()">
                      Fully paid: {{ facture()!.paidAmountDisplay }}
                    </span>
                  </div>
                  
                  <!-- Payment Status Summary -->
                  <div class="payment-timeline-summary" *ngIf="paymentsCount() > 0">
                    <div class="summary-stats">
                      <div class="stat-item" *ngIf="getPaymentStatusSummary().scheduled > 0">
                        <span class="stat-count">{{ getPaymentStatusSummary().scheduled }}</span>
                        <span class="stat-label">Scheduled</span>
                      </div>
                      <div class="stat-item" *ngIf="getPaymentStatusSummary().processing > 0">
                        <span class="stat-count">{{ getPaymentStatusSummary().processing }}</span>
                        <span class="stat-label">Processing</span>
                      </div>
                      <div class="stat-item" *ngIf="getPaymentStatusSummary().completed > 0">
                        <span class="stat-count">{{ getPaymentStatusSummary().completed }}</span>
                        <span class="stat-label">Completed</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Invoice Items -->
          <div class="info-section">
            <h3 class="section-title">Invoice Items ({{ itemsCount() }})</h3>
            <!-- DEBUG: Items Debug Info -->
            <div style="background: #f0f8ff; padding: 10px; margin: 10px 0; border: 2px solid #0066cc; border-radius: 8px;">
              <p><strong>🔍 COMPREHENSIVE DEBUG INFO:</strong></p>
              <p>✓ Facture Signal Exists: {{ !!facture() }}</p>
              <p>✓ Facture ID: {{ facture()?.id || 'NULL' }}</p>
              <p>✓ Supplier Name: {{ facture()?.supplierName || 'NULL' }}</p>
              <p>✓ Items Property Exists: {{ !!facture()?.items }}</p>
              <p>✓ Items Is Array: {{ facture()?.items ? 'Array.isArray: ' + (facture()!.items | json).startsWith('[') : 'NO_ITEMS' }}</p>
              <p>✓ Items Array Length: {{ facture()?.items?.length || 'NULL' }}</p>
              <p>✓ Items Count Computed: {{ itemsCount() }}</p>
              <p>✓ Facture Status: {{ facture()?.status || 'NULL' }}</p>
              <p>✓ Can Verify: {{ facture()?.canVerify || 'NULL' }}</p>
              
              <div style="background: #fff; padding: 8px; margin-top: 8px; border: 1px solid #ccc;">
                <strong>First Item Details:</strong>
                <pre style="max-height: 200px; overflow: auto; font-size: 12px;">{{ facture()?.items?.[0] | json }}</pre>
              </div>
              
              <div style="background: #fff; padding: 8px; margin-top: 8px; border: 1px solid #ccc;">
                <strong>Full Items Array:</strong>
                <pre style="max-height: 300px; overflow: auto; font-size: 11px;">{{ facture()?.items | json }}</pre>
              </div>
            </div>
            
            <!-- Desktop Table View -->
            <div class="desktop-view">
              <div class="items-table">
                <table class="w-full">
                  <thead>
                    <tr class="table-header">
                      <th class="text-left">Item Description</th>
                      <th class="text-center">Quantity</th>
                      <th class="text-right">Unit Price</th>
                      <th class="text-right">Tax</th>
                      <th class="text-right">Line Total</th>
                      <th class="text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr *ngFor="let item of facture()!.items; trackBy: trackByItem" 
                        class="table-row"
                        [class.has-variance]="item.hasQuantityVariance || item.hasAcceptanceVariance">
                      <td class="item-description">
                        <div class="item-name">{{ item.supplierItemDescription }}</div>
                        <div *ngIf="item.supplierItemCode" class="item-code">
                          Code: {{ item.supplierItemCode }}
                        </div>
                        <div *ngIf="item.notes" class="item-notes">{{ item.notes }}</div>
                      </td>
                      
                      <td class="text-center">
                        <div class="quantity-info">
                          <div class="quantity-value">{{ item.quantity }}</div>
                          <div *ngIf="item.hasQuantityVariance" class="variance-info">
                            <span class="text-warning">Received: {{ item.receivedQuantity }}</span>
                            <span class="text-info">Accepted: {{ item.acceptedQuantity }}</span>
                          </div>
                        </div>
                      </td>
                      
                      <td class="text-right">{{ item.unitPriceDisplay }}</td>
                      
                      <td class="text-right">
                        <span *ngIf="item.taxRate > 0">{{ item.taxRate }}%</span>
                        <span *ngIf="item.taxRate === 0" class="text-muted">-</span>
                      </td>
                      
                      <td class="text-right font-semibold">{{ item.lineTotalWithTaxDisplay }}</td>
                      
                      <td class="text-center">
                        <span class="verification-badge" [class]="getVerificationClass(item)">
                          {{ item.verificationStatus }}
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <!-- Mobile Card View -->
            <div class="mobile-view">
              <div *ngFor="let item of facture()!.items; trackBy: trackByItem" 
                   class="item-card"
                   [class.has-variance]="item.hasQuantityVariance || item.hasAcceptanceVariance">
                
                <div class="item-header">
                  <div class="item-title">{{ item.supplierItemDescription }}</div>
                  <span class="verification-badge" [class]="getVerificationClass(item)">
                    {{ item.verificationStatus }}
                  </span>
                </div>
                
                <div class="item-details">
                  <div class="detail-row">
                    <span>Quantity:</span>
                    <span>{{ item.quantity }}</span>
                  </div>
                  
                  <div class="detail-row">
                    <span>Unit Price:</span>
                    <span>{{ item.unitPriceDisplay }}</span>
                  </div>
                  
                  <div class="detail-row">
                    <span>Line Total:</span>
                    <span class="font-semibold">{{ item.lineTotalWithTaxDisplay }}</span>
                  </div>
                  
                  <div *ngIf="item.hasQuantityVariance" class="variance-alert">
                    <div class="alert alert-warning">
                      <strong>Quantity Variance:</strong> 
                      Ordered {{ item.quantity }}, Received {{ item.receivedQuantity }}, Accepted {{ item.acceptedQuantity }}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Payment History -->
          <div class="info-section" *ngIf="paymentsCount() > 0">
            <h3 class="section-title">Payment History ({{ paymentsCount() }})</h3>
            
            <div class="payments-list">
              <div *ngFor="let payment of facture()!.payments; trackBy: trackByPayment" 
                   class="payment-card">
                
                <div class="payment-header">
                  <div class="payment-info">
                    <div class="payment-amount">{{ payment.amountDisplay }}</div>
                    <div class="payment-method">{{ payment.paymentMethodDisplay }}</div>
                  </div>
                  
                  <span class="payment-status" [class]="getPaymentStatusClass(payment.status)">
                    {{ payment.statusDisplay }}
                  </span>
                </div>
                
                <div class="payment-details">
                  <div class="detail-row">
                    <span>Payment Date:</span>
                    <span>{{ formatDate(payment.paymentDate) }}</span>
                  </div>
                  
                  <div class="detail-row" *ngIf="payment.scheduledDate">
                    <span>Scheduled Date:</span>
                    <span>{{ formatDate(payment.scheduledDate) }}</span>
                  </div>
                  
                  <div class="detail-row" *ngIf="payment.ourPaymentReference">
                    <span>Reference:</span>
                    <span>{{ payment.ourPaymentReference }}</span>
                  </div>
                  
                  <div class="detail-row" *ngIf="payment.processedByName">
                    <span>Processed By:</span>
                    <span>{{ payment.processedByName }}</span>
                  </div>
                  
                  <div class="detail-row" *ngIf="payment.confirmedAt">
                    <span>Confirmed:</span>
                    <span>{{ formatDateTime(payment.confirmedAt) }} by {{ payment.confirmedByName }}</span>
                  </div>
                  
                  <div class="detail-row" *ngIf="payment.notes">
                    <span>Notes:</span>
                    <span>{{ payment.notes }}</span>
                  </div>
                </div>

                <!-- Payment Action Buttons -->
                <div class="payment-actions" *ngIf="hasPaymentActions(payment)">
                  <div class="actions-row">
                    <!-- Process Payment Button -->
                    <button 
                      *ngIf="canProcessPayment(payment)" 
                      class="btn btn-sm btn-primary" 
                      (click)="onProcessPayment(payment)"
                      [disabled]="workflowLoading()">
                      <span *ngIf="workflowLoading(); else processText">Processing...</span>
                      <ng-template #processText>Process Payment</ng-template>
                    </button>

                    <!-- Confirm Payment Button -->
                    <button 
                      *ngIf="canConfirmPayment(payment)" 
                      class="btn btn-sm btn-success" 
                      (click)="onConfirmPayment(payment)"
                      [disabled]="confirmationLoading()">
                      <span *ngIf="confirmationLoading(); else confirmText">Confirming...</span>
                      <ng-template #confirmText>Confirm Payment</ng-template>
                    </button>

                    <!-- Edit Payment Button -->
                    <button 
                      *ngIf="canEditPayment(payment)" 
                      class="btn btn-sm btn-outline" 
                      (click)="onEditPayment(payment)">
                      Edit
                    </button>

                    <!-- Cancel Payment Button -->
                    <button 
                      *ngIf="canCancelPayment(payment)" 
                      class="btn btn-sm btn-error" 
                      (click)="onCancelPayment(payment)"
                      [disabled]="workflowLoading()">
                      Cancel
                    </button>
                  </div>
                  
                  <!-- Payment Status Indicator -->
                  <div class="payment-status-info" *ngIf="payment.processingStatus">
                    <div class="status-indicator" [class]="getProcessingStatusClass(payment.processingStatus)">
                      {{ payment.processingStatus }}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Additional Information -->
          <div class="info-section" *ngIf="facture()!.description || facture()!.notes || facture()!.disputeReason">
            <h3 class="section-title">Additional Information</h3>
            
            <div class="additional-info">
              <div *ngIf="facture()!.description" class="info-block">
                <label>Description</label>
                <div class="value">{{ facture()!.description }}</div>
              </div>
              
              <div *ngIf="facture()!.notes" class="info-block">
                <label>Notes</label>
                <div class="value">{{ facture()!.notes }}</div>
              </div>
              
              <div *ngIf="facture()!.disputeReason" class="info-block dispute">
                <label>Dispute Reason</label>
                <div class="value text-error">{{ facture()!.disputeReason }}</div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>

    <!-- Workflow Modal -->
    <app-facture-workflow-modal
      *ngIf="showWorkflowModal() && facture()"
      [facture]="facture()!"
      [workflowType]="workflowType()"
      [loading]="workflowLoading()"
      (close)="onCloseWorkflowModal()"
      (verify)="onVerifyFactureSubmit($event)"
      (approve)="onApproveFactureSubmit($event)"
      (dispute)="onDisputeFactureSubmit($event)"
      (cancel)="onCancelFactureSubmit($event)">
    </app-facture-workflow-modal>

    <!-- Payment Schedule Modal -->
    <app-payment-schedule-modal
      *ngIf="showPaymentModal() && facture()"
      [facture]="facture()!"
      [isVisible]="showPaymentModal()"
      [isLoading]="paymentLoading()"
      (close)="onClosePaymentModal()"
      (schedulePayment)="onSchedulePaymentSubmit($event)">
    </app-payment-schedule-modal>

    <!-- Receive Payment Modal -->
    <app-receive-payment-modal
      *ngIf="showReceivePaymentModal() && facture()"
      [facture]="facture()!"
      [isVisible]="showReceivePaymentModal()"
      [isLoading]="receivePaymentLoading()"
      (close)="onCloseReceivePaymentModal()"
      (processPayment)="onProcessPaymentSubmit($event)"
      (confirmPayment)="onRequestPaymentConfirmation($event)">
    </app-receive-payment-modal>

    <!-- Payment Confirmation Modal -->
    <app-payment-confirmation-modal
      *ngIf="showPaymentConfirmationModal() && facture() && paymentToConfirm()"
      [facture]="facture()!"
      [payment]="paymentToConfirm()!"
      [isVisible]="showPaymentConfirmationModal()"
      [isLoading]="confirmationLoading()"
      (close)="onClosePaymentConfirmationModal()"
      (confirmPayment)="onConfirmPaymentFinal($event)">
    </app-payment-confirmation-modal>
  `,
  styles: [`
    .facture-detail-container {
      padding: var(--s6);
      max-width: 1400px;
      margin: 0 auto;
    }

    /* Loading and Error States */
    .loading-container, .error-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 400px;
    }

    .loading-spinner {
      width: 32px;
      height: 32px;
      border: 3px solid var(--border);
      border-top: 3px solid var(--primary);
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    .error-card {
      background: var(--surface);
      border: 1px solid var(--error);
      border-radius: var(--radius-lg);
      padding: var(--s6);
      text-align: center;
      max-width: 500px;
    }

    .debug-info {
      background: var(--bg-secondary);
      padding: var(--s4);
      border-radius: var(--radius);
      margin: var(--s4) 0;
      text-align: left;
    }

    .debug-info h4 {
      margin-bottom: var(--s2);
      font-size: var(--text-sm);
      font-weight: var(--font-semibold);
    }

    .debug-info p {
      margin: var(--s2) 0;
      font-size: var(--text-sm);
      font-family: var(--font-mono);
    }

    .text-success {
      color: var(--success, #4BBF7B);
    }

    .text-error {
      color: var(--error, #E15A4F);
    }

    .error-actions {
      display: flex;
      gap: var(--s3);
      justify-content: center;
      margin-top: var(--s4);
      flex-wrap: wrap;
    }

    /* Header */
    .detail-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: var(--s8);
      padding: var(--s6);
      background: var(--surface);
      border-radius: var(--radius-lg);
      border: 1px solid var(--border);
    }

    .header-left {
      display: flex;
      align-items: flex-start;
      gap: var(--s4);
    }

    .header-info h1 {
      font-size: var(--text-3xl);
      font-weight: var(--font-bold);
      color: var(--text);
      margin: 0 0 var(--s1) 0;
    }

    .header-info p {
      color: var(--text-secondary);
      margin: 0;
    }

    .header-right {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: var(--s3);
    }

    .status-badges {
      display: flex;
      gap: var(--s2);
      align-items: center;
    }

    .status-badge, .priority-badge, .overdue-badge {
      padding: var(--s1) var(--s3);
      border-radius: var(--radius);
      font-size: var(--text-xs);
      font-weight: var(--font-medium);
    }

    .status-badge.status-received { background: var(--info); color: white; }
    .status-badge.status-verification { background: var(--warning); color: white; }
    .status-badge.status-verified { background: var(--success); color: white; }
    .status-badge.status-approved { background: var(--primary); color: white; }
    .status-badge.status-paid { background: var(--success); color: white; }
    .status-badge.status-disputed { background: var(--error); color: white; }
    .status-badge.status-cancelled { background: var(--text-secondary); color: white; }

    .priority-badge.priority-low { background: var(--bg-secondary); color: var(--text); }
    .priority-badge.priority-normal { background: var(--info); color: white; }
    .priority-badge.priority-high { background: var(--warning); color: white; }
    .priority-badge.priority-urgent { background: var(--error); color: white; }

    .overdue-badge {
      background: var(--error);
      color: white;
    }

    .action-buttons {
      display: flex;
      gap: var(--s2);
    }

    /* Main Content */
    .detail-content {
      display: flex;
      flex-direction: column;
      gap: var(--s6);
    }

    .info-section {
      background: var(--surface);
      border-radius: var(--radius-lg);
      border: 1px solid var(--border);
      overflow: hidden;
    }

    .section-title {
      font-size: var(--text-xl);
      font-weight: var(--font-semibold);
      padding: var(--s4) var(--s6);
      margin: 0;
      background: var(--bg-secondary);
      border-bottom: 1px solid var(--border);
    }

    /* Info Grid */
    .info-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: var(--s4);
      padding: var(--s6);
    }

    .info-item label {
      display: block;
      font-size: var(--text-sm);
      font-weight: var(--font-medium);
      color: var(--text-secondary);
      margin-bottom: var(--s1);
    }

    .info-item .value {
      font-size: var(--text-base);
      color: var(--text);
    }

    /* Financial Grid */
    .financial-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: var(--s4);
      padding: var(--s6);
    }

    .financial-item {
      text-align: center;
      padding: var(--s4);
      background: var(--bg);
      border-radius: var(--radius);
    }

    .financial-item label {
      display: block;
      font-size: var(--text-sm);
      color: var(--text-secondary);
      margin-bottom: var(--s2);
    }

    .amount-value {
      font-size: var(--text-2xl);
      font-weight: var(--font-bold);
    }

    .amount-value.total { color: var(--text); }
    .amount-value.paid { color: var(--success); }
    .amount-value.outstanding { color: var(--warning); }

    .progress-container {
      display: flex;
      align-items: center;
      gap: var(--s2);
    }

    .progress-bar {
      flex: 1;
      height: 8px;
      background: var(--bg-secondary);
      border-radius: var(--radius);
      overflow: hidden;
    }

    .progress-fill {
      height: 100%;
      background: var(--success);
      transition: width var(--transition);
    }

    .progress-text {
      font-size: var(--text-sm);
      font-weight: var(--font-medium);
      color: var(--text-secondary);
    }

    /* Timeline */
    .timeline {
      padding: var(--s6);
    }

    .timeline-item {
      display: flex;
      align-items: flex-start;
      gap: var(--s4);
      padding: var(--s4) 0;
      position: relative;
    }

    .timeline-item:not(:last-child)::after {
      content: '';
      position: absolute;
      left: 20px;
      top: 60px;
      width: 2px;
      height: calc(100% - 20px);
      background: var(--border);
    }

    .timeline-item.completed::after {
      background: var(--success);
    }

    .timeline-icon {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: var(--bg-secondary);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: var(--text-lg);
      border: 2px solid var(--border);
    }

    .timeline-item.completed .timeline-icon {
      background: var(--success);
      border-color: var(--success);
    }

    .timeline-item.current .timeline-icon {
      background: var(--primary);
      border-color: var(--primary);
      animation: pulse 2s infinite;
    }

    @keyframes pulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.1); }
    }

    .timeline-title {
      font-weight: var(--font-medium);
      color: var(--text);
      margin-bottom: var(--s1);
    }

    .timeline-meta {
      font-size: var(--text-sm);
      color: var(--text-secondary);
    }

    /* Tables */
    .items-table {
      overflow-x: auto;
    }

    .items-table table {
      border-collapse: collapse;
    }

    .table-header th {
      padding: var(--s4);
      background: var(--bg-secondary);
      border-bottom: 1px solid var(--border);
      font-weight: var(--font-semibold);
      font-size: var(--text-sm);
      color: var(--text);
    }

    .table-row td {
      padding: var(--s4);
      border-bottom: 1px solid var(--border);
      vertical-align: top;
    }

    .table-row.has-variance {
      background: rgba(255, 193, 7, 0.1);
    }

    .item-description .item-name {
      font-weight: var(--font-medium);
      color: var(--text);
      margin-bottom: var(--s1);
    }

    .item-description .item-code {
      font-size: var(--text-xs);
      color: var(--text-secondary);
      margin-bottom: var(--s1);
    }

    .item-description .item-notes {
      font-size: var(--text-xs);
      color: var(--text-secondary);
      font-style: italic;
    }

    .quantity-info .quantity-value {
      font-weight: var(--font-medium);
    }

    .variance-info {
      font-size: var(--text-xs);
      margin-top: var(--s1);
    }

    .variance-info span {
      display: block;
    }

    .verification-badge {
      padding: var(--s1) var(--s2);
      border-radius: var(--radius);
      font-size: var(--text-xs);
      font-weight: var(--font-medium);
    }

    .verification-badge.verified { background: var(--success); color: white; }
    .verification-badge.pending { background: var(--warning); color: white; }
    .verification-badge.disputed { background: var(--error); color: white; }

    /* Mobile Cards */
    .item-card, .payment-card {
      background: var(--bg);
      border-radius: var(--radius);
      padding: var(--s4);
      margin-bottom: var(--s3);
    }

    .item-card.has-variance {
      border: 1px solid var(--warning);
      background: rgba(255, 193, 7, 0.1);
    }

    .item-header, .payment-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: var(--s3);
    }

    .item-title {
      font-weight: var(--font-medium);
      color: var(--text);
    }

    .item-details, .payment-details {
      display: flex;
      flex-direction: column;
      gap: var(--s2);
    }

    .detail-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .detail-row span:first-child {
      color: var(--text-secondary);
      font-size: var(--text-sm);
    }

    /* Payment Cards */
    .payments-list {
      padding: var(--s6);
    }

    .payment-info .payment-amount {
      font-size: var(--text-lg);
      font-weight: var(--font-bold);
      color: var(--text);
    }

    .payment-info .payment-method {
      font-size: var(--text-sm);
      color: var(--text-secondary);
    }

    .payment-status {
      padding: var(--s1) var(--s2);
      border-radius: var(--radius);
      font-size: var(--text-xs);
      font-weight: var(--font-medium);
    }

    .payment-status.status-completed { background: var(--success); color: white; }
    .payment-status.status-pending { background: var(--warning); color: white; }
    .payment-status.status-failed { background: var(--error); color: white; }

    /* Payment Actions */
    .payment-actions {
      margin-top: var(--s4);
      padding-top: var(--s3);
      border-top: 1px solid var(--border);
    }

    .actions-row {
      display: flex;
      gap: var(--s2);
      flex-wrap: wrap;
      margin-bottom: var(--s3);
    }

    .payment-status-info {
      display: flex;
      justify-content: flex-end;
    }

    .status-indicator {
      padding: var(--s1) var(--s2);
      border-radius: var(--radius);
      font-size: var(--text-xs);
      font-weight: var(--font-medium);
      
      &.status-scheduled {
        background: var(--bg-secondary);
        color: var(--text-secondary);
      }
      
      &.status-processing {
        background: var(--primary-light);
        color: var(--primary);
      }
      
      &.status-pending {
        background: #fef3cd;
        color: #856404;
      }
      
      &.status-confirmed {
        background: var(--success);
        color: white;
      }
      
      &.status-failed {
        background: var(--error);
        color: white;
      }
      
      &.status-cancelled {
        background: var(--text-muted);
        color: white;
      }
      
      &.status-unknown {
        background: var(--bg-secondary);
        color: var(--text-secondary);
      }
    }

    /* Payment Timeline Summary */
    .payment-timeline-summary {
      margin-top: var(--s3);
    }

    .summary-stats {
      display: flex;
      gap: var(--s3);
      flex-wrap: wrap;
    }

    .stat-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: var(--s2) var(--s3);
      background: var(--bg-secondary);
      border-radius: var(--radius);
      min-width: 60px;
    }

    .stat-count {
      font-size: var(--text-lg);
      font-weight: var(--font-bold);
      color: var(--primary);
    }

    .stat-label {
      font-size: var(--text-xs);
      color: var(--text-secondary);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    /* Additional Info */
    .additional-info {
      padding: var(--s6);
      display: flex;
      flex-direction: column;
      gap: var(--s4);
    }

    .info-block label {
      display: block;
      font-size: var(--text-sm);
      font-weight: var(--font-medium);
      color: var(--text-secondary);
      margin-bottom: var(--s2);
    }

    .info-block .value {
      color: var(--text);
      line-height: var(--leading-relaxed);
    }

    .info-block.dispute .value {
      color: var(--error);
      font-weight: var(--font-medium);
    }

    /* Alerts */
    .variance-alert {
      margin-top: var(--s2);
    }

    .alert {
      padding: var(--s3);
      border-radius: var(--radius);
      font-size: var(--text-sm);
    }

    .alert-warning {
      background: rgba(255, 193, 7, 0.1);
      border: 1px solid var(--warning);
      color: var(--warning);
    }

    /* Responsive Design */
    .desktop-view { display: block; }
    .mobile-view { display: none; }

    @media (max-width: 1024px) {
      .desktop-view { display: none; }
      .mobile-view { display: block; }
      
      .detail-header {
        flex-direction: column;
        gap: var(--s4);
      }
      
      .header-right {
        align-items: flex-start;
        width: 100%;
      }
      
      .status-badges, .action-buttons {
        flex-wrap: wrap;
      }
    }

    @media (max-width: 640px) {
      .facture-detail-container {
        padding: var(--s4);
      }
      
      .info-grid {
        grid-template-columns: 1fr;
      }
      
      .financial-grid {
        grid-template-columns: 1fr 1fr;
      }
      
      .action-buttons {
        width: 100%;
      }
      
      .action-buttons .btn {
        flex: 1;
      }
    }

    /* Outstanding Payment Info */
    .outstanding-info {
      background: rgba(255, 193, 7, 0.05) !important;
      border-left: 4px solid var(--warning) !important;
      border-radius: var(--radius) !important;
      margin-top: var(--s4) !important;
      padding: var(--s4) !important;
    }

    .outstanding-info .font-medium {
      font-weight: var(--font-medium) !important;
      color: #b45309 !important;
    }

    .outstanding-info .font-semibold {
      font-weight: var(--font-semibold) !important;
      color: #b45309 !important;
    }

    .outstanding-info .text-sm {
      font-size: var(--text-sm) !important;
      color: var(--text-secondary) !important;
    }

    .outstanding-info .text-xs {
      font-size: var(--text-xs) !important;
      color: var(--text-muted) !important;
    }

    .flex {
      display: flex !important;
    }

    .items-center {
      align-items: center !important;
    }

    .justify-between {
      justify-content: space-between !important;
    }

    .mt-3 {
      margin-top: var(--s3) !important;
    }

    /* Utility Classes */
    .text-error { color: var(--error) !important; }
    .text-warning { color: var(--warning) !important; }
    .text-success { color: var(--success) !important; }
    .text-info { color: var(--info) !important; }
    .text-secondary { color: var(--text-secondary) !important; }
    .text-muted { color: var(--text-muted) !important; }
    .font-semibold { font-weight: var(--font-semibold) !important; }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .text-left { text-align: left; }
    .w-full { width: 100%; }

    /* Button Styles */
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: var(--s2);
      padding: var(--s3) var(--s4);
      border: 1px solid transparent;
      border-radius: var(--radius);
      font-size: var(--text-sm);
      font-weight: var(--font-medium);
      cursor: pointer;
      transition: var(--transition);
      text-decoration: none;
      min-height: 44px;
    }

    .btn-sm {
      padding: var(--s2) var(--s3);
      font-size: var(--text-xs);
      min-height: 36px;
    }

    .btn-primary {
      background: var(--primary);
      color: white;
      border-color: var(--primary);
    }

    .btn-primary:hover:not(:disabled) {
      background: var(--primary-hover);
      border-color: var(--primary-hover);
    }

    .btn-secondary {
      background: var(--bg-secondary);
      color: var(--text);
      border-color: var(--border);
    }

    .btn-secondary:hover:not(:disabled) {
      background: var(--primary);
      color: white;
      border-color: var(--primary);
    }

    .btn-outline {
      background: var(--surface);
      color: var(--text);
      border-color: var(--border);
    }

    .btn-outline:hover:not(:disabled) {
      background: var(--bg-secondary);
      border-color: var(--primary);
    }

    .btn-error {
      background: var(--error);
      color: white;
      border-color: var(--error);
    }

    .btn-error:hover:not(:disabled) {
      background: #dc2626;
      border-color: #dc2626;
    }

    .btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
  `]
})
export class FactureDetailComponent implements OnInit, OnDestroy {
  // Injected services
  private readonly factureService = inject(FactureService);
  readonly route = inject(ActivatedRoute); // Made public for template access
  private readonly router = inject(Router);
  private readonly toastService = inject(ToastService);

  // Component state
  private readonly destroy$ = new Subject<void>();
  
  // Signals
  facture = signal<FactureDto | null>(null);
  loading = signal<boolean>(false);
  error = signal<string | null>(null);
  
  // Workflow modal state
  showWorkflowModal = signal<boolean>(false);
  workflowType = signal<WorkflowType>('verify');
  workflowLoading = signal<boolean>(false);

  // Payment modal state
  showPaymentModal = signal<boolean>(false);
  paymentLoading = signal<boolean>(false);

  // Receive payment modal state
  showReceivePaymentModal = signal<boolean>(false);
  receivePaymentLoading = signal<boolean>(false);
  
  // Payment confirmation modal
  showPaymentConfirmationModal = signal<boolean>(false);
  paymentToConfirm = signal<FacturePaymentDto | null>(null);
  confirmationLoading = signal<boolean>(false);

  // Computed properties
  itemsCount = computed(() => this.facture()?.items?.length || 0);
  paymentsCount = computed(() => this.facture()?.payments?.length || 0);

  // Timeline status computed properties
  isVerificationCompleted = computed(() => {
    const facture = this.facture();
    if (!facture) return false;
    
    // Check if verified by timestamp, status, or status display
    const statusNum = Number(facture.status);
    return !!(facture.verifiedAt || 
             facture.status >= FactureStatus.VERIFIED || 
             statusNum === 2 || // Raw backend value for VERIFIED
             facture.statusDisplay?.toLowerCase().includes('verified') ||
             facture.statusDisplay?.toLowerCase().includes('diverifikasi'));
  });

  isVerificationCurrent = computed(() => {
    const facture = this.facture();
    if (!facture) return false;
    
    // Current if status is exactly VERIFICATION
    const statusNum = Number(facture.status);
    return facture.status === FactureStatus.VERIFICATION || 
           statusNum === 1 || // Raw backend value
           (facture.statusDisplay?.toLowerCase().includes('verification') && !this.isVerificationCompleted());
  });

  isApprovalCompleted = computed(() => {
    const facture = this.facture();
    if (!facture) return false;
    
    // Check if approved by timestamp, status, or status display
    const statusNum = Number(facture.status);
    return !!(facture.approvedAt || 
             facture.status >= FactureStatus.APPROVED || 
             statusNum === 3 || statusNum === 7 || // Raw backend values for APPROVED/PARTIAL_PAID
             facture.statusDisplay?.toLowerCase().includes('approved') ||
             facture.statusDisplay?.toLowerCase().includes('disetujui'));
  });

  isApprovalCurrent = computed(() => {
    const facture = this.facture();
    if (!facture) return false;
    
    // Current if verification is completed but approval is not
    return this.isVerificationCompleted() && 
           !this.isApprovalCompleted() &&
           facture.status !== FactureStatus.DISPUTED &&
           facture.status !== FactureStatus.CANCELLED;
  });

  isPaymentCompleted = computed(() => {
    const facture = this.facture();
    if (!facture) return false;
    
    // Payment completed if facture is fully paid
    return facture.status === FactureStatus.PAID || 
           facture.outstandingAmount === 0 ||
           (facture.paidAmount > 0 && facture.paidAmount >= facture.totalAmount);
  });

  isPaymentCurrent = computed(() => {
    const facture = this.facture();
    if (!facture) return false;
    
    // Payment current if approved but not fully paid
    return this.isApprovalCompleted() && 
           !this.isPaymentCompleted() &&
           (facture.outstandingAmount > 0 || this.paymentsCount() > 0);
  });

  getPaymentStatusSummary = computed(() => {
    const facture = this.facture();
    if (!facture?.payments) {
      return { scheduled: 0, processing: 0, completed: 0 };
    }
    
    const summary = { scheduled: 0, processing: 0, completed: 0 };
    
    facture.payments.forEach(payment => {
      const statusNum = Number(payment.status);
      if (statusNum === 0) { // SCHEDULED
        summary.scheduled++;
      } else if (statusNum === 1 || statusNum === 2) { // PENDING or PROCESSING
        summary.processing++;
      } else if (statusNum === 3) { // COMPLETED
        summary.completed++;
      }
    });
    
    return summary;
  });

  // Enhanced payment logic - handle partial payments
  canSchedulePayment = computed(() => {
    const facture = this.facture();
    if (!facture) {
      return false;
    }
    
    // Can schedule payment if:
    // 1. Facture is approved OR partially paid (check multiple conditions)
    // 2. AND has outstanding amount > 0
    
    // Check by numeric status (backend might use different values)
    const statusNum = Number(facture.status);
    const isApprovedByStatus = facture.status === FactureStatus.APPROVED || 
                              facture.status === FactureStatus.PARTIAL_PAID ||
                              statusNum === 3 || statusNum === 7; // Raw backend values
    
    // Check by status display text (flexible matching)
    const statusText = facture.statusDisplay?.toLowerCase() || '';
    const isApprovedByDisplay = statusText.includes('disetujui') || 
                               statusText.includes('approved') || 
                               statusText.includes('sebagian') || 
                               statusText.includes('partial');
    
    // Also check backend permission flags if available
    const hasBackendPermission = facture.canSchedulePayment === true;
    
    const isPayable = isApprovedByStatus || isApprovedByDisplay || hasBackendPermission;
    const hasOutstanding = facture.outstandingAmount > 0;
    
    console.log('📊 CAN SCHEDULE PAYMENT CHECK:', {
      id: facture.id,
      status: facture.status,
      statusDisplay: facture.statusDisplay,
      outstandingAmount: facture.outstandingAmount,
      totalAmount: facture.totalAmount,
      paidAmount: facture.paidAmount,
      canSchedulePayment: facture.canSchedulePayment,
      isApprovedByStatus,
      isApprovedByDisplay,
      hasBackendPermission,
      isPayable,
      hasOutstanding,
      FactureStatus_APPROVED: FactureStatus.APPROVED,
      FactureStatus_PARTIAL_PAID: FactureStatus.PARTIAL_PAID,
      result: isPayable && hasOutstanding
    });
    
    return isPayable && hasOutstanding;
  });

  canReceivePayment = computed(() => {
    const facture = this.facture();
    if (!facture) {
      return false;
    }
    
    // Can receive payment if:
    // 1. There are processable payments (scheduled payments exist)
    // 2. OR facture is approved/partial_paid and has outstanding (can create ad-hoc payments)
    const hasProcessablePayments = facture.payments?.some(payment => 
      payment.canProcess || payment.canConfirm
    );
    
    // Check by both status and statusDisplay for backend compatibility
    const isApprovedByStatus = facture.status === FactureStatus.APPROVED || facture.status === FactureStatus.PARTIAL_PAID;
    const isApprovedByDisplay = facture.statusDisplay === "Disetujui" || facture.statusDisplay === "Sebagian Dibayar";
    const isPayable = isApprovedByStatus || isApprovedByDisplay;
    const hasOutstanding = facture.outstandingAmount > 0;
    
    console.log('📊 CAN RECEIVE PAYMENT CHECK:', {
      id: facture.id,
      status: facture.status,
      statusDisplay: facture.statusDisplay,
      paymentsCount: facture.payments?.length || 0,
      hasProcessablePayments,
      isApprovedByStatus,
      isApprovedByDisplay,
      isPayable,
      hasOutstanding,
      outstandingAmount: facture.outstandingAmount,
      FactureStatus_APPROVED: FactureStatus.APPROVED,
      FactureStatus_PARTIAL_PAID: FactureStatus.PARTIAL_PAID,
      result: hasProcessablePayments || (isPayable && hasOutstanding)
    });
    
    return hasProcessablePayments || (isPayable && hasOutstanding);
  });

  // Outstanding amount for display
  outstandingInfo = computed(() => {
    const facture = this.facture();
    if (!facture) return null;
    
    const outstanding = facture.outstandingAmount;
    const paid = facture.paidAmount;
    const total = facture.totalAmount;
    const percentage = total > 0 ? Math.round((paid / total) * 100) : 0;
    
    return {
      amount: outstanding,
      amountDisplay: facture.outstandingAmountDisplay,
      paidPercentage: percentage,
      isPartiallyPaid: paid > 0 && outstanding > 0,
      isFullyPaid: outstanding <= 0
    };
  });

  // Expose enums for template
  readonly FactureStatus = FactureStatus;
  readonly FacturePriority = FacturePriority;

  ngOnInit(): void {
    this.route.params
      .pipe(takeUntil(this.destroy$))
      .subscribe(params => {
        const id = parseInt(params['id']);
        if (id) {
          this.loadFacture(id);
        } else {
          this.error.set('Invalid facture ID');
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadFacture(id?: number): void {
    const factureId = id || parseInt(this.route.snapshot.params['id']);
    
    console.log('🔧 LOAD FACTURE CALLED WITH:', { 
      providedId: id, 
      routeParamId: this.route.snapshot.params['id'], 
      finalFactureId: factureId 
    });
    
    if (!factureId || isNaN(factureId)) {
      this.error.set('Invalid facture ID provided');
      return;
    }

    this.loading.set(true);
    this.error.set(null);
    this.facture.set(null); // Clear previous data

    this.factureService.getFactureById(factureId).subscribe({
      next: (facture) => {
        console.log('📥 FACTURE LOADED SUCCESSFULLY:', {
          id: facture?.id,
          supplierName: facture?.supplierName,
          supplierInvoiceNumber: facture?.supplierInvoiceNumber,
          status: facture?.status,
          statusDisplay: facture?.statusDisplay,
          totalAmount: facture?.totalAmount,
          totalAmountDisplay: facture?.totalAmountDisplay,
          paidAmount: facture?.paidAmount,
          outstandingAmount: facture?.outstandingAmount,
          itemsCount: facture?.items?.length || 0,
          paymentsCount: facture?.payments?.length || 0,
          canVerify: facture?.canVerify,
          canApprove: facture?.canApprove,
          canSchedulePayment: facture?.canSchedulePayment,
          canReceivePayment: facture?.canReceivePayment
        });

        // DEBUG: Detailed payments logging
        console.log('💰 PAYMENTS DEBUG:', {
          paymentsExists: !!facture?.payments,
          paymentsIsArray: Array.isArray(facture?.payments),
          paymentsLength: facture?.payments?.length || 0,
          payments: facture?.payments
        });

        if (facture?.payments && facture.payments.length > 0) {
          facture.payments.forEach((payment, index) => {
            console.log(`💳 Payment ${index + 1}:`, {
              id: payment.id,
              status: payment.status,
              statusDisplay: payment.statusDisplay,
              amount: payment.amount,
              canProcess: payment.canProcess,
              canConfirm: payment.canConfirm,
              canEdit: payment.canEdit,
              canCancel: payment.canCancel
            });
          });
        }

        // DEBUG: Log the actual items array before setting
        console.log('🧩 COMPONENT ITEMS DEBUG BEFORE SET:', {
          itemsExists: !!facture?.items,
          itemsIsArray: Array.isArray(facture?.items),
          itemsLength: facture?.items?.length || 0,
          firstItem: facture?.items?.[0] || 'NO_ITEMS',
          rawItems: facture?.items
        });

        if (!facture || !facture.id) {
          this.error.set('Invalid facture data received from server');
          this.loading.set(false);
          return;
        }

        this.facture.set(facture);

        // DEBUG: Log the signal state after setting
        setTimeout(() => {
          const currentFacture = this.facture();
          console.log('🎯 FACTURE SIGNAL STATE AFTER SET:', {
            signalExists: !!currentFacture,
            signalItemsExists: !!currentFacture?.items,
            signalItemsLength: currentFacture?.items?.length || 0,
            signalItemsCount: this.itemsCount(),
            firstSignalItem: currentFacture?.items?.[0] || 'NO_ITEMS'
          });
        }, 100);
        this.loading.set(false);
        this.backendStatus.set('connected');
        
      },
      error: (error) => {
        console.log('❌ FACTURE LOAD ERROR:', {
          message: error.message,
          status: error.status,
          statusText: error.statusText,
          url: error.url,
          name: error.name
        });
        
        // Enhanced error message based on error type
        if (error.status === 401) {
          this.error.set('Authentication required. Please log in first to access facture details.');
          this.backendStatus.set('requires_auth');
        } else if (error.status === 404) {
          this.error.set(`Facture with ID ${factureId} not found.`);
          this.backendStatus.set('error');
        } else if (error.status === 0) {
          this.error.set('Cannot connect to backend server. Please ensure the backend is running on localhost:5171.');
          this.backendStatus.set('disconnected');
        } else {
          this.error.set(`Failed to load facture details: ${error.message || 'Unknown error occurred'}`);
          this.backendStatus.set('error');
        }
        
        this.loading.set(false);
      }
    });
  }

  // Navigation
  goBack(): void {
    this.router.navigate(['/dashboard/facture']);
  }

  goToLogin(): void {
    this.router.navigate(['/login']);
  }

  // Workflow Actions
  onVerifyFacture(): void {
    const facture = this.facture();
    
    if (!facture || !facture.canVerify) {
      return;
    }

    this.workflowType.set('verify');
    this.showWorkflowModal.set(true);
  }

  onApproveFacture(): void {
    const facture = this.facture();
    if (!facture || !facture.canApprove) return;

    this.workflowType.set('approve');
    this.showWorkflowModal.set(true);
  }

  onDisputeFacture(): void {
    const facture = this.facture();
    
    if (!facture || !facture.canDispute) {
      return;
    }

    this.workflowType.set('dispute');
    this.showWorkflowModal.set(true);
  }

  onCancelFacture(): void {
    const facture = this.facture();
    if (!facture || !facture.canCancel) return;

    this.workflowType.set('cancel');
    this.showWorkflowModal.set(true);
  }

  // Payment Processing Actions
  onSchedulePayment(): void {
    const facture = this.facture();
    const canSchedule = this.canSchedulePayment();
    

    if (!facture || !canSchedule) {
      this.toastService.showError('Error', 'Cannot schedule payment for this facture. Please ensure facture is approved and has outstanding amount.');
      return;
    }

    // Show payment scheduling modal
    this.showPaymentModal.set(true);
  }

  onReceivePayment(): void {
    const facture = this.facture();
    const canReceive = this.canReceivePayment();
    

    if (!facture || !canReceive) {
      this.toastService.showError('Error', 'Cannot receive payment for this facture. Please ensure facture is approved and has outstanding amount.');
      return;
    }

    // Show receive payment modal
    this.showReceivePaymentModal.set(true);
  }

  // Payment modal handlers
  onClosePaymentModal(): void {
    this.showPaymentModal.set(false);
  }

  onSchedulePaymentSubmit(scheduleData: SchedulePaymentDto): void {
    this.paymentLoading.set(true);

    this.factureService.schedulePayment(scheduleData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (paymentResult) => {
          console.log('✅ PAYMENT SCHEDULED SUCCESSFULLY:', paymentResult);
          this.paymentLoading.set(false);
          this.showPaymentModal.set(false);
          this.toastService.showSuccess('Success', 'Payment scheduled successfully!');
          
          // Add the scheduled payment to local state immediately for better UX
          if (paymentResult && paymentResult.id) {
            console.log('✅ Adding scheduled payment to local state:', paymentResult);
            this.facture.update(currentFacture => {
              if (currentFacture) {
                const updatedFacture = { 
                  ...currentFacture,
                  payments: [...(currentFacture.payments || []), paymentResult]
                };
                console.log('📝 Updated facture with new payment:', updatedFacture.payments);
                return updatedFacture;
              }
              return currentFacture;
            });
          } else if (scheduleData) {
            // Fallback: Create mock payment if backend doesn't return proper data
            console.log('🔧 Backend didn\'t return payment data, creating fallback payment');
            const mockPayment = this.createMockPayment(scheduleData);
            this.facture.update(currentFacture => {
              if (currentFacture) {
                const updatedFacture = { 
                  ...currentFacture,
                  payments: [...(currentFacture.payments || []), mockPayment]
                };
                console.log('📝 Updated facture with mock payment:', updatedFacture.payments);
                return updatedFacture;
              }
              return currentFacture;
            });
          }
          
          // Don't refresh immediately to preserve the payment we just added
          // Backend might not have the new payment yet, so we keep our local state
          console.log('✅ Keeping local payment state, skipping immediate refresh to prevent overwrite');
          
          // Optional: Refresh after a delay to get any backend updates
          setTimeout(() => {
            console.log('🔄 Delayed refresh to merge backend updates...');
            this.loadFactureWithMerge();
          }, 2000);
        },
        error: (error) => {
          this.paymentLoading.set(false);
          this.toastService.showError('Error', error.message || 'Failed to schedule payment');
        }
      });
  }

  // Receive payment modal handlers
  onCloseReceivePaymentModal(): void {
    this.showReceivePaymentModal.set(false);
  }

  // Payment confirmation modal handlers
  onClosePaymentConfirmationModal(): void {
    this.showPaymentConfirmationModal.set(false);
    this.paymentToConfirm.set(null);
  }

  onRequestPaymentConfirmation(confirmData: ConfirmPaymentDto): void {
    
    // Find the payment to confirm
    const facture = this.facture();
    const payment = facture?.payments?.find(p => p.id === confirmData.paymentId);
    
    if (!payment) {
      this.toastService.showError('Error', 'Payment not found');
      return;
    }

    
    // Close receive payment modal and show confirmation modal
    this.showReceivePaymentModal.set(false);
    this.paymentToConfirm.set(payment);
    this.showPaymentConfirmationModal.set(true);
  }

  onConfirmPaymentFinal(confirmationData: PaymentConfirmationData): void {
    this.confirmationLoading.set(true);
    
    const confirmData: ConfirmPaymentDto = {
      paymentId: confirmationData.paymentId,
      confirmedAmount: confirmationData.confirmedAmount,
      confirmationReference: undefined, // Optional field
      supplierAckReference: confirmationData.supplierAckReference,
      notes: confirmationData.notes,
      confirmationFile: undefined // Optional field
    };


    this.factureService.confirmPayment(confirmData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (paymentResult) => {
          
          this.confirmationLoading.set(false);
          this.showPaymentConfirmationModal.set(false);
          this.paymentToConfirm.set(null);
          
          this.toastService.showSuccess('Success', 'Payment confirmed successfully!');
          
          // Reload facture data to get updated payment status and amounts
          this.loadFacture();
        },
        error: (error) => {
          
          this.confirmationLoading.set(false);
          this.toastService.showError('Error', error.message || 'Failed to confirm payment');
        }
      });
  }

  onProcessPaymentSubmit(processData: ProcessPaymentDto): void {
    this.receivePaymentLoading.set(true);

    this.factureService.processPayment(processData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (paymentResult) => {
          this.receivePaymentLoading.set(false);
          this.toastService.showSuccess('Success', 'Payment processed successfully!');
          
          // Close receive payment modal immediately 
          this.showReceivePaymentModal.set(false);
          
          // Auto-show confirmation modal with the processed payment
          this.paymentToConfirm.set(paymentResult);
          this.showPaymentConfirmationModal.set(true);
          
        },
        error: (error) => {
          this.receivePaymentLoading.set(false);
          this.toastService.showError('Error', error.message || 'Failed to process payment');
        }
      });
  }

  onConfirmPaymentSubmit(confirmData: ConfirmPaymentDto): void {
    this.receivePaymentLoading.set(true);

    this.factureService.confirmPayment(confirmData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (paymentResult) => {
          
          // Check if payment reached completed status
          if (paymentResult?.status === 3) {
          } else {
          }
          
          this.receivePaymentLoading.set(false);
          this.showReceivePaymentModal.set(false);
          this.toastService.showSuccess('Success', `Payment confirmed! Status: ${paymentResult?.statusDisplay || 'Updated'}`);
          
          // Refresh facture data to get updated payment information
          this.loadFacture();
        },
        error: (error) => {
          this.receivePaymentLoading.set(false);
          this.toastService.showError('Error', error.message || 'Failed to confirm payment');
        }
      });
  }

  // Modal handlers
  onCloseWorkflowModal(): void {
    this.showWorkflowModal.set(false);
  }

  onVerifyFactureSubmit(formData: VerifyFormData): void {
    this.workflowLoading.set(true);
    
    const verifyDto: VerifyFactureDto = {
      factureId: formData.factureId,
      verificationNotes: formData.verificationNotes,
      items: formData.items
    };

    this.factureService.verifyFactureItems(formData.factureId, verifyDto)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updatedFacture) => {
          console.log('✅ FACTURE VERIFIED SUCCESSFULLY:', updatedFacture);
          this.workflowLoading.set(false);
          this.showWorkflowModal.set(false);
          this.toastService.showSuccess('Success', 'Facture verified successfully!');
          
          // Update local state with verified facture data immediately
          if (updatedFacture && updatedFacture.id) {
            console.log('📝 Updating local facture state after verification');
            this.facture.set(updatedFacture);
          } else {
            // Fallback: Update status locally if backend doesn't return updated data
            console.log('🔧 Backend didn\'t return updated data, updating status locally');
            this.facture.update(currentFacture => {
              if (currentFacture) {
                const updatedFacture = {
                  ...currentFacture,
                  status: FactureStatus.VERIFIED,
                  statusDisplay: 'Verified',
                  verifiedAt: new Date(),
                  verifiedByName: 'Current User'
                };
                console.log('📝 Updated facture status locally after verification:', updatedFacture);
                return updatedFacture;
              }
              return currentFacture;
            });
          }
          
          // Reload facture to ensure we have complete data including computed fields
          console.log('🔄 Refreshing facture data after verification...');
          this.loadFacture();
        },
        error: (error) => {
          this.workflowLoading.set(false);
          this.toastService.showError('Error', error.message || 'Failed to verify facture');
        }
      });
  }

  onApproveFactureSubmit(formData: ApprovalFormData): void {
    const facture = this.facture();
    if (!facture) return;

    this.workflowLoading.set(true);

    this.factureService.approveFacture(facture.id, formData.approvalNotes)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updatedFacture) => {
          console.log('✅ FACTURE APPROVED SUCCESSFULLY:', updatedFacture);
          this.workflowLoading.set(false);
          this.showWorkflowModal.set(false);
          this.toastService.showSuccess('Success', 'Facture approved successfully!');
          
          // Update local state with approved facture data immediately
          if (updatedFacture && updatedFacture.id) {
            console.log('📝 Updating local facture state after approval');
            this.facture.set(updatedFacture);
          } else {
            // Fallback: Update status locally if backend doesn't return updated data
            console.log('🔧 Backend didn\'t return updated data, updating approval status locally');
            this.facture.update(currentFacture => {
              if (currentFacture) {
                const updatedFacture = {
                  ...currentFacture,
                  status: FactureStatus.APPROVED,
                  statusDisplay: 'Approved',
                  approvedAt: new Date(),
                  approvedByName: 'Current User'
                };
                console.log('📝 Updated facture status locally after approval:', updatedFacture);
                return updatedFacture;
              }
              return currentFacture;
            });
          }
          
          // Reload facture to ensure we have complete data including computed fields
          console.log('🔄 Refreshing facture data after approval...');
          this.loadFacture();
        },
        error: (error) => {
          this.workflowLoading.set(false);
          this.toastService.showError('Error', error.message || 'Failed to approve facture');
        }
      });
  }

  onDisputeFactureSubmit(formData: DisputeFormData): void {
    this.workflowLoading.set(true);
    
    const disputeDto: DisputeFactureDto = {
      factureId: formData.factureId,
      disputeReason: formData.disputeReason,
      additionalNotes: formData.additionalNotes,
      supportingDocuments: formData.supportingDocuments
    };

    this.factureService.disputeFacture(formData.factureId, disputeDto)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updatedFacture) => {
          this.facture.set(updatedFacture);
          this.workflowLoading.set(false);
          this.showWorkflowModal.set(false);
          this.toastService.showSuccess('Success', 'Facture dispute submitted successfully!');
        },
        error: (error) => {
          this.workflowLoading.set(false);
          this.toastService.showError('Error', error.message || 'Failed to dispute facture');
        }
      });
  }

  onCancelFactureSubmit(formData: CancelFormData): void {
    const facture = this.facture();
    if (!facture) return;

    this.workflowLoading.set(true);

    this.factureService.cancelFacture(facture.id, formData.cancellationReason)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.workflowLoading.set(false);
          this.showWorkflowModal.set(false);
          this.toastService.showSuccess('Success', 'Facture cancelled successfully!');
          this.goBack(); // Navigate back to facture list
        },
        error: (error) => {
          this.workflowLoading.set(false);
          this.toastService.showError('Error', error.message || 'Failed to cancel facture');
        }
      });
  }

  // Helper Methods
  getStatusClass(status: FactureStatus): string {
    const statusClasses: Record<FactureStatus, string> = {
      [FactureStatus.RECEIVED]: 'status-received',
      [FactureStatus.VERIFICATION]: 'status-verification',
      [FactureStatus.VERIFIED]: 'status-verified',
      [FactureStatus.APPROVED]: 'status-approved',
      [FactureStatus.PAID]: 'status-paid',
      [FactureStatus.DISPUTED]: 'status-disputed',
      [FactureStatus.CANCELLED]: 'status-cancelled',
      [FactureStatus.PARTIAL_PAID]: 'status-partial-paid'
    };
    return statusClasses[status] || 'status-received';
  }

  getPriorityClass(priority: FacturePriority): string {
    const priorityClasses: Record<FacturePriority, string> = {
      [FacturePriority.LOW]: 'priority-low',
      [FacturePriority.NORMAL]: 'priority-normal',
      [FacturePriority.HIGH]: 'priority-high',
      [FacturePriority.URGENT]: 'priority-urgent'
    };
    return priorityClasses[priority] || 'priority-normal';
  }

  getVerificationClass(item: FactureItemDetailDto): string {
    if (item.isVerified) return 'verified';
    if (item.hasQuantityVariance || item.hasAcceptanceVariance) return 'disputed';
    return 'pending';
  }

  getPaymentStatusClass(status: number): string {
    // Payment status mapping - adjust based on your payment status enum
    const statusClasses: Record<number, string> = {
      0: 'status-pending',
      1: 'status-completed',
      2: 'status-failed',
      3: 'status-cancelled'
    };
    return statusClasses[status] || 'status-pending';
  }

  // TrackBy functions for performance
  // Payment Action Methods
  hasPaymentActions(payment: FacturePaymentDto): boolean {
    // Debug payment action flags
    console.log('🔍 PAYMENT ACTION FLAGS:', {
      paymentId: payment.id,
      status: payment.status,
      statusDisplay: payment.statusDisplay,
      canProcess: payment.canProcess,
      canConfirm: payment.canConfirm,
      canEdit: payment.canEdit,
      canCancel: payment.canCancel,
      hasAnyAction: payment.canProcess || payment.canConfirm || payment.canEdit || payment.canCancel
    });
    
    // If backend doesn't provide action flags, derive them from status
    const hasBackendFlags = payment.canProcess || payment.canConfirm || payment.canEdit || payment.canCancel;
    
    if (!hasBackendFlags) {
      // Fallback: determine actions based on payment status
      const statusNum = Number(payment.status);
      const canProcessFallback = statusNum === 0; // SCHEDULED can be processed
      const canConfirmFallback = statusNum === 2; // PROCESSING can be confirmed
      const canEditFallback = statusNum === 0 || statusNum === 1; // SCHEDULED or PENDING can be edited
      const canCancelFallback = statusNum === 0 || statusNum === 1; // SCHEDULED or PENDING can be cancelled
      
      console.log('🔧 USING FALLBACK ACTIONS:', {
        statusNum,
        canProcessFallback,
        canConfirmFallback,
        canEditFallback,
        canCancelFallback
      });
      
      return canProcessFallback || canConfirmFallback || canEditFallback || canCancelFallback;
    }
    
    return hasBackendFlags;
  }

  // Individual payment action checks with fallback logic
  canProcessPayment(payment: FacturePaymentDto): boolean {
    // Use backend flag if available, otherwise use fallback logic
    return payment.canProcess || (Number(payment.status) === 0); // SCHEDULED
  }

  canConfirmPayment(payment: FacturePaymentDto): boolean {
    // Use backend flag if available, otherwise use fallback logic  
    return payment.canConfirm || (Number(payment.status) === 2); // PROCESSING
  }

  canEditPayment(payment: FacturePaymentDto): boolean {
    // Use backend flag if available, otherwise use fallback logic
    const statusNum = Number(payment.status);
    return payment.canEdit || (statusNum === 0 || statusNum === 1); // SCHEDULED or PENDING
  }

  canCancelPayment(payment: FacturePaymentDto): boolean {
    // Use backend flag if available, otherwise use fallback logic
    const statusNum = Number(payment.status);
    return payment.canCancel || (statusNum === 0 || statusNum === 1); // SCHEDULED or PENDING
  }

  onProcessPayment(payment: FacturePaymentDto): void {
    console.log('🔄 PROCESS PAYMENT:', payment);
    
    if (!this.canProcessPayment(payment)) {
      this.toastService.showError('Error', 'Payment cannot be processed at this time');
      return;
    }

    this.workflowLoading.set(true);

    // Create process payment DTO
    const processDto = {
      paymentId: payment.id,
      bankAccount: payment.bankAccount,
      checkNumber: payment.checkNumber,
      transferReference: payment.transferReference,
      paymentReference: payment.paymentReference,
      notes: `Payment processed for facture ${this.facture()?.supplierInvoiceNumber}`
    };

    this.factureService.processPayment(processDto).subscribe({
      next: (processedPayment) => {
        this.workflowLoading.set(false);
        this.toastService.showSuccess('Success', 'Payment processed successfully!');
        
        // Reload facture to get updated payment status
        this.loadFacture();
      },
      error: (error) => {
        this.workflowLoading.set(false);
        this.toastService.showError('Error', error.message || 'Failed to process payment');
      }
    });
  }

  onConfirmPayment(payment: FacturePaymentDto): void {
    console.log('✅ CONFIRM PAYMENT:', payment);
    
    if (!this.canConfirmPayment(payment)) {
      this.toastService.showError('Error', 'Payment cannot be confirmed at this time');
      return;
    }

    // Set payment for confirmation modal
    this.paymentToConfirm.set(payment);
    this.showPaymentConfirmationModal.set(true);
  }

  onEditPayment(payment: FacturePaymentDto): void {
    console.log('✏️ EDIT PAYMENT:', payment);
    this.toastService.showInfo('Info', 'Edit payment functionality will be implemented in next version');
  }

  onCancelPayment(payment: FacturePaymentDto): void {
    console.log('❌ CANCEL PAYMENT:', payment);
    
    if (!this.canCancelPayment(payment)) {
      this.toastService.showError('Error', 'Payment cannot be cancelled at this time');
      return;
    }

    // Show confirmation dialog
    if (!confirm(`Are you sure you want to cancel this payment of ${payment.amountDisplay}?`)) {
      return;
    }

    this.workflowLoading.set(true);

    const cancelDto = {
      paymentId: payment.id,
      cancellationReason: 'Cancelled by user',
      notes: `Payment cancelled for facture ${this.facture()?.supplierInvoiceNumber}`
    };

    this.factureService.cancelPayment(cancelDto).subscribe({
      next: () => {
        this.workflowLoading.set(false);
        this.toastService.showSuccess('Success', 'Payment cancelled successfully!');
        
        // Reload facture to get updated payment status
        this.loadFacture();
      },
      error: (error) => {
        this.workflowLoading.set(false);
        this.toastService.showError('Error', error.message || 'Failed to cancel payment');
      }
    });
  }

  getProcessingStatusClass(status: string): string {
    const statusClasses: Record<string, string> = {
      'Scheduled': 'status-scheduled',
      'Processing': 'status-processing',
      'Pending Confirmation': 'status-pending',
      'Confirmed': 'status-confirmed',
      'Failed': 'status-failed',
      'Cancelled': 'status-cancelled'
    };
    
    return statusClasses[status] || 'status-unknown';
  }

  trackByItem = (index: number, item: FactureItemDetailDto): number => item.id;
  trackByPayment = (index: number, payment: FacturePaymentDto): number => payment.id;

  // Date formatting
  formatDate(date: Date | string | null | undefined): string {
    if (!date) return '-';
    
    try {
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      if (isNaN(dateObj.getTime())) return '-';
      
      return new Intl.DateTimeFormat('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      }).format(dateObj);
    } catch (error) {
      console.error('Date formatting error:', { date, error });
      return '-';
    }
  }

  formatDateTime(date: Date | string | null | undefined): string {
    if (!date) return '-';
    
    try {
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      if (isNaN(dateObj.getTime())) return '-';
      
      return new Intl.DateTimeFormat('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      }).format(dateObj);
    } catch (error) {
      console.error('DateTime formatting error:', { date, error });
      return '-';
    }
  }

  // Debug Methods
  backendStatus = signal<string>('unknown');

  getApiUrl(): string {
    const baseUrl = 'http://localhost:5171/api/Facture';
    const id = this.route.snapshot.params['id'];
    return `${baseUrl}/${id}`;
  }

  async testBackendConnection(): Promise<void> {
    
    try {
      this.backendStatus.set('testing');
      
      // Test basic connectivity first
      const response = await fetch('http://localhost:5171/api/Facture', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        }
      });
      
      console.log('🔌 TEST CONNECTION RESPONSE:', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries())
      });
      
      if (response.status === 401) {
        this.backendStatus.set('requires_auth');
        this.error.set('Backend is running but requires authentication. Please log in first.');
      } else if (response.status === 200) {
        this.backendStatus.set('connected');
        this.error.set('Backend is connected. Try loading the facture again.');
      } else {
        this.backendStatus.set('error');
        this.error.set(`Backend responded with status ${response.status}: ${response.statusText}`);
      }
      
    } catch (error: any) {
      this.backendStatus.set('disconnected');
      this.error.set(`Backend connection failed: ${error.message}`);
    }
  }

  // Helper method to create mock payment when backend doesn't return proper data
  private createMockPayment(scheduleData: SchedulePaymentDto): FacturePaymentDto {
    console.log('🔧 Creating mock payment for schedule data:', scheduleData);
    
    const mockPayment: FacturePaymentDto = {
      id: Math.floor(Math.random() * 1000000), // Generate random ID for testing
      factureId: scheduleData.factureId,
      paymentDate: scheduleData.paymentDate,
      amount: scheduleData.amount,
      paymentMethod: scheduleData.paymentMethod,
      paymentMethodDisplay: this.getPaymentMethodDisplay(scheduleData.paymentMethod),
      status: 0, // SCHEDULED
      statusDisplay: 'Scheduled',
      
      // Reference fields
      ourPaymentReference: scheduleData.ourPaymentReference || '',
      supplierAckReference: '',
      bankAccount: scheduleData.bankAccount || '',
      checkNumber: '',
      transferReference: '',
      paymentReference: '',
      
      // User and date fields
      processedBy: undefined,
      processedByName: '',
      approvedBy: undefined,
      approvedByName: '',
      approvedAt: undefined,
      confirmedAt: undefined,
      confirmedByName: '',
      
      // Notes and files
      notes: scheduleData.notes || '',
      failureReason: '',
      disputeReason: '',
      paymentReceiptFile: '',
      confirmationFile: '',
      
      // Scheduled payment fields
      scheduledDate: scheduleData.paymentDate,
      
      // Computed boolean fields
      requiresApproval: false,
      isOverdue: false,
      isDueToday: false,
      isDueSoon: false,
      hasConfirmation: false,
      
      // Computed numeric fields
      daysOverdue: 0,
      daysUntilPayment: Math.ceil((scheduleData.paymentDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)),
      
      // Status and processing
      processingStatus: 'Scheduled',
      
      // Display fields
      amountDisplay: this.formatCurrency(scheduleData.amount),
      
      // Action flags - SCHEDULED payment (status = 0) should allow processing
      canEdit: true,      // Can edit scheduled payments
      canProcess: true,   // Can process scheduled payments
      canConfirm: false,  // Cannot confirm until processing
      canCancel: true,    // Can cancel scheduled payments
      
      // Audit fields
      createdAt: new Date(),
      updatedAt: new Date()
    };

    console.log('✅ Created mock payment:', mockPayment);
    return mockPayment;
  }

  private getPaymentMethodDisplay(method: number): string {
    const methodLabels: Record<number, string> = {
      0: 'Bank Transfer',
      1: 'Check', 
      2: 'Cash',
      3: 'Credit Card',
      4: 'Digital Wallet'
    };
    return methodLabels[method] || 'Unknown';
  }

  private formatCurrency(amount: number): string {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  }
}