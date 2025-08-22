// ===== BATCH SELECTION MODAL COMPONENT =====
// src/app/modules/inventory/components/batch-selection-modal/batch-selection-modal.component.ts

import { Component, Inject, signal, computed, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatRadioModule } from '@angular/material/radio';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatBadgeModule } from '@angular/material/badge';
import { firstValueFrom } from 'rxjs';

import { InventoryService } from '../../services/inventory.service';
import { BatchForPOSDto } from '../../interfaces/inventory.interfaces';

export interface BatchSelectionModalData {
  productId: number;
  productName: string;
  requestedQuantity: number;
  sellPrice: number;
  unit?: string;
}

export interface BatchSelectionResult {
  success: boolean;
  selectedBatches: SelectedBatchInfo[];
  totalQuantity: number;
  totalCost: number;
  averageUnitCost: number;
  message?: string;
}

export interface SelectedBatchInfo {
  batch: BatchForPOSDto;
  quantitySelected: number;
  subtotalCost: number;
}

@Component({
  selector: 'app-batch-selection-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatRadioModule,
    MatCheckboxModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatCardModule,
    MatChipsModule,
    MatTooltipModule,
    MatBadgeModule
  ],
  template: `
    <div class="batch-selection-modal">
      <!-- Modal Header -->
      <div mat-dialog-title class="modal-header">
        <div class="header-content">
          <mat-icon class="header-icon">inventory</mat-icon>
          <div class="header-text">
            <h2 class="modal-title">Select Batch</h2>
            <p class="modal-subtitle">{{ data.productName }}</p>
          </div>
        </div>
        <button 
          mat-icon-button 
          mat-dialog-close
          class="close-btn"
          [disabled]="loading()"
          matTooltip="Close">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <!-- Request Summary -->
      <div class="request-summary">
        <div class="summary-item">
          <mat-icon>shopping_cart</mat-icon>
          <div class="summary-details">
            <span class="summary-label">Requested Quantity</span>
            <span class="summary-value">{{ data.requestedQuantity }} {{ getUnitDisplay() }}</span>
          </div>
        </div>
        <div class="summary-item">
          <mat-icon>attach_money</mat-icon>
          <div class="summary-details">
            <span class="summary-label">Sell Price</span>
            <span class="summary-value">{{ formatCurrency(data.sellPrice) }} / {{ getUnitDisplay() }}</span>
          </div>
        </div>
        <div class="summary-item" *ngIf="totalSelectedQuantity() > 0">
          <mat-icon [style.color]="getAvailabilityColor()">
            {{ getAvailabilityIcon() }}
          </mat-icon>
          <div class="summary-details">
            <span class="summary-label">Selected</span>
            <span class="summary-value" [style.color]="getAvailabilityColor()">
              {{ totalSelectedQuantity() }} / {{ data.requestedQuantity }} {{ getUnitDisplay() }}
            </span>
          </div>
        </div>
      </div>

      <!-- Loading State -->
      <div class="loading-container" *ngIf="loading()">
        <mat-spinner diameter="40"></mat-spinner>
        <p class="loading-text">Loading available batches...</p>
      </div>

      <!-- Error State -->
      <div class="error-container" *ngIf="errorMessage()">
        <mat-icon class="error-icon">error</mat-icon>
        <p class="error-text">{{ errorMessage() }}</p>
        <button mat-button color="primary" (click)="loadBatches()">
          <mat-icon>refresh</mat-icon>
          Try Again
        </button>
      </div>

      <!-- Batch Selection Content -->
      <mat-dialog-content class="batch-content" *ngIf="!loading() && !errorMessage()">
        
        <!-- FIFO Recommendation Banner -->
        <div class="fifo-banner" *ngIf="availableBatches().length > 0">
          <div class="banner-content">
            <mat-icon class="banner-icon">auto_awesome</mat-icon>
            <div class="banner-text">
              <h4 class="banner-title">FIFO Recommendation</h4>
              <p class="banner-message">
                Batches are sorted by expiry date. Select from top for optimal rotation.
              </p>
            </div>
          </div>
          <button 
            mat-button 
            color="primary" 
            (click)="autoSelectFIFO()"
            [disabled]="totalSelectedQuantity() >= data.requestedQuantity">
            <mat-icon>auto_fix_high</mat-icon>
            Auto Select
          </button>
        </div>

        <!-- No Batches Available -->
        <div class="no-batches" *ngIf="availableBatches().length === 0">
          <mat-icon class="no-batches-icon">inventory_2</mat-icon>
          <h3 class="no-batches-title">No Batches Available</h3>
          <p class="no-batches-message">
            There are no active batches available for this product.
          </p>
        </div>

        <!-- Batch List -->
        <div class="batch-list" *ngIf="availableBatches().length > 0">
          <div 
            class="batch-item"
            *ngFor="let batch of availableBatches(); trackBy: trackByBatch"
            [class.selected]="isBatchSelected(batch)"
            [class.recommended]="batch.isFifoRecommended"
            [class.disabled]="batch.availableQuantity === 0">
            
            <!-- FIFO Priority Indicator -->
            <div class="priority-indicator" *ngIf="batch.isFifoRecommended">
              <mat-icon 
                class="priority-icon"
                matTooltip="FIFO Recommended - Sell this batch first">
                star
              </mat-icon>
              <span class="priority-text">{{ batch.priority }}</span>
            </div>

            <!-- Batch Header -->
            <div class="batch-header">
              <div class="batch-main-info">
                <h4 class="batch-number">{{ batch.batchNumber }}</h4>
                <div class="batch-meta">
                  <span class="batch-stock">
                    <mat-icon>inventory</mat-icon>
                    {{ batch.availableQuantity }} {{ getUnitDisplay() }} available
                  </span>
                  <span 
                    class="batch-status" 
                    [class]="getBatchStatusClass(batch.status)">
                    {{ formatBatchStatus(batch.status) }}
                  </span>
                </div>
              </div>

              <!-- Expiry Information -->
              <div class="batch-expiry" *ngIf="batch.expiryDate">
                <mat-icon 
                  class="expiry-icon"
                  [style.color]="getExpiryStatusColor(batch.status)">
                  {{ getExpiryIcon(batch.status) }}
                </mat-icon>
                <div class="expiry-details">
                  <span class="expiry-date">{{ formatExpiryDate(batch.expiryDate) }}</span>
                  <span 
                    class="days-left" 
                    [class]="getExpiryStatusClass(batch.status)">
                    {{ formatDaysToExpiry(batch.daysToExpiry) }}
                  </span>
                </div>
              </div>
            </div>

            <!-- Batch Selection Controls -->
            <div class="batch-selection" *ngIf="batch.availableQuantity > 0">
              <div class="selection-controls">
                <!-- Quantity Input -->
                <mat-form-field appearance="outline" class="quantity-field">
                  <mat-label>Quantity</mat-label>
                  <input 
                    matInput
                    type="number"
                    min="0"
                    [max]="Math.min(batch.availableQuantity, remainingNeeded())"
                    step="1"
                    [value]="getSelectedQuantity(batch)"
                    (input)="onBatchQuantityChange(batch, $event)"
                    placeholder="0">
                  <span matSuffix>{{ getUnitDisplay() }}</span>
                  <mat-hint>Max: {{ Math.min(batch.availableQuantity, remainingNeeded()) }}</mat-hint>
                </mat-form-field>

                <!-- Quick Select Buttons -->
                <div class="quick-select">
                  <button 
                    mat-button 
                    size="small"
                    (click)="selectMaxFromBatch(batch)"
                    [disabled]="remainingNeeded() === 0"
                    class="quick-btn">
                    Max
                  </button>
                  <button 
                    mat-button 
                    size="small"
                    (click)="clearBatchSelection(batch)"
                    [disabled]="getSelectedQuantity(batch) === 0"
                    class="quick-btn clear-btn">
                    Clear
                  </button>
                </div>
              </div>

              <!-- Cost Information -->
              <div class="cost-info">
                <div class="cost-item">
                  <span class="cost-label">Unit Cost:</span>
                  <span class="cost-value">{{ formatCurrency(batch.unitCost) }}</span>
                </div>
                <div class="cost-item" *ngIf="getBatchSubtotal(batch) > 0">
                  <span class="cost-label">Subtotal:</span>
                  <span class="cost-value subtotal">{{ formatCurrency(getBatchSubtotal(batch)) }}</span>
                </div>
                <div class="cost-item">
                  <span class="cost-label">Profit/Unit:</span>
                  <span 
                    class="cost-value profit" 
                    [class.positive]="getUnitProfit(batch) > 0"
                    [class.negative]="getUnitProfit(batch) < 0">
                    {{ formatCurrency(getUnitProfit(batch)) }}
                  </span>
                </div>
              </div>
            </div>

            <!-- Unavailable Batch -->
            <div class="batch-unavailable" *ngIf="batch.availableQuantity === 0">
              <mat-icon>block</mat-icon>
              <span>No stock available</span>
            </div>
          </div>
        </div>

        <!-- Selection Summary -->
        <div class="selection-summary" *ngIf="totalSelectedQuantity() > 0">
          <div class="summary-header">
            <mat-icon>summarize</mat-icon>
            <h4 class="summary-title">Selection Summary</h4>
          </div>
          
          <div class="summary-content">
            <div class="summary-row">
              <span class="summary-label">Total Selected:</span>
              <span class="summary-value">{{ totalSelectedQuantity() }} {{ getUnitDisplay() }}</span>
            </div>
            <div class="summary-row">
              <span class="summary-label">Total Cost:</span>
              <span class="summary-value">{{ formatCurrency(totalSelectedCost()) }}</span>
            </div>
            <div class="summary-row">
              <span class="summary-label">Average Unit Cost:</span>
              <span class="summary-value">{{ formatCurrency(averageUnitCost()) }}</span>
            </div>
            <div class="summary-row">
              <span class="summary-label">Total Profit:</span>
              <span 
                class="summary-value profit"
                [class.positive]="totalProfit() > 0"
                [class.negative]="totalProfit() < 0">
                {{ formatCurrency(totalProfit()) }}
              </span>
            </div>
            
            <!-- Fulfillment Status -->
            <div class="fulfillment-status" [class]="getFulfillmentStatusClass()">
              <mat-icon>{{ getFulfillmentIcon() }}</mat-icon>
              <span>{{ getFulfillmentMessage() }}</span>
            </div>
          </div>
        </div>

      </mat-dialog-content>

      <!-- Modal Actions -->
      <mat-dialog-actions class="modal-actions">
        <div class="actions-content">
          <div class="action-info" *ngIf="totalSelectedQuantity() > 0">
            <span class="selected-info">
              {{ totalSelectedQuantity() }} / {{ data.requestedQuantity }} {{ getUnitDisplay() }} selected
            </span>
          </div>
          
          <div class="action-buttons">
            <button 
              mat-button 
              type="button"
              mat-dialog-close
              [disabled]="loading()"
              class="cancel-btn">
              Cancel
            </button>
            
            <button 
              mat-raised-button 
              color="primary"
              type="button"
              [disabled]="totalSelectedQuantity() === 0 || loading()"
              (click)="confirmSelection()"
              class="confirm-btn">
              <mat-icon>check</mat-icon>
              Confirm Selection
            </button>
          </div>
        </div>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .batch-selection-modal {
      width: 100%;
      max-width: 800px;
      min-height: 500px;
    }

    /* Header Styles */
    .modal-header {
      display: flex;
      justify-content: between;
      align-items: center;
      padding: var(--s6);
      border-bottom: 2px solid var(--border);
      margin: calc(-1 * var(--s6));
      margin-bottom: var(--s6);
      background: var(--bg-primary);
    }

    .header-content {
      display: flex;
      align-items: center;
      gap: var(--s4);
      flex: 1;
    }

    .header-icon {
      color: var(--primary);
      font-size: 28px;
      width: 28px;
      height: 28px;
    }

    .header-text {
      flex: 1;
    }

    .modal-title {
      margin: 0;
      font-size: var(--text-xl);
      font-weight: var(--font-semibold);
      color: var(--text);
    }

    .modal-subtitle {
      margin: var(--s1) 0 0 0;
      font-size: var(--text-sm);
      color: var(--text-secondary);
      font-weight: var(--font-medium);
    }

    .close-btn {
      width: 40px;
      height: 40px;
      color: var(--text-secondary);
    }

    /* Request Summary */
    .request-summary {
      display: flex;
      gap: var(--s6);
      padding: var(--s5);
      background: var(--bg-secondary);
      border: 2px solid var(--border);
      border-radius: var(--radius-lg);
      margin-bottom: var(--s6);
    }

    .summary-item {
      display: flex;
      align-items: center;
      gap: var(--s3);
      flex: 1;
    }

    .summary-item mat-icon {
      color: var(--primary);
      font-size: 20px;
      width: 20px;
      height: 20px;
    }

    .summary-details {
      display: flex;
      flex-direction: column;
    }

    .summary-label {
      font-size: var(--text-xs);
      color: var(--text-muted);
      font-weight: var(--font-medium);
    }

    .summary-value {
      font-size: var(--text-sm);
      color: var(--text);
      font-weight: var(--font-semibold);
    }

    /* Loading & Error States */
    .loading-container,
    .error-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: var(--s10);
      text-align: center;
    }

    .loading-text {
      margin: var(--s4) 0 0 0;
      color: var(--text-secondary);
    }

    .error-icon {
      color: var(--error);
      font-size: 48px;
      width: 48px;
      height: 48px;
      margin-bottom: var(--s4);
    }

    .error-text {
      color: var(--error);
      margin-bottom: var(--s4);
    }

    /* FIFO Banner */
    .fifo-banner {
      display: flex;
      align-items: center;
      gap: var(--s4);
      padding: var(--s4);
      background: rgba(75, 191, 123, 0.1);
      border: 2px solid var(--success);
      border-radius: var(--radius-lg);
      margin-bottom: var(--s6);
    }

    .banner-content {
      display: flex;
      align-items: center;
      gap: var(--s3);
      flex: 1;
    }

    .banner-icon {
      color: var(--success);
      font-size: 24px;
      width: 24px;
      height: 24px;
    }

    .banner-text {
      flex: 1;
    }

    .banner-title {
      margin: 0 0 var(--s1) 0;
      font-size: var(--text-base);
      font-weight: var(--font-semibold);
      color: var(--success);
    }

    .banner-message {
      margin: 0;
      font-size: var(--text-sm);
      color: var(--text-secondary);
    }

    /* No Batches State */
    .no-batches {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: var(--s10);
      text-align: center;
    }

    .no-batches-icon {
      font-size: 64px;
      width: 64px;
      height: 64px;
      color: var(--text-muted);
      margin-bottom: var(--s4);
    }

    .no-batches-title {
      margin: 0 0 var(--s2) 0;
      color: var(--text);
      font-weight: var(--font-semibold);
    }

    .no-batches-message {
      margin: 0;
      color: var(--text-secondary);
    }

    /* Batch List */
    .batch-list {
      display: flex;
      flex-direction: column;
      gap: var(--s4);
    }

    .batch-item {
      position: relative;
      border: 2px solid var(--border);
      border-radius: var(--radius-lg);
      padding: var(--s5);
      background: var(--surface);
      transition: var(--transition);
      
      &.selected {
        border-color: var(--primary);
        background: rgba(255, 145, 77, 0.05);
      }
      
      &.recommended {
        border-color: var(--success);
        box-shadow: 0 0 0 1px var(--success);
      }
      
      &.disabled {
        opacity: 0.6;
        background: var(--bg-secondary);
      }
    }

    /* Priority Indicator */
    .priority-indicator {
      position: absolute;
      top: -1px;
      right: -1px;
      display: flex;
      align-items: center;
      gap: var(--s1);
      background: var(--success);
      color: white;
      padding: var(--s1) var(--s2);
      border-radius: 0 var(--radius-lg) 0 var(--radius);
      font-size: var(--text-xs);
      font-weight: var(--font-semibold);
    }

    .priority-icon {
      font-size: 14px;
      width: 14px;
      height: 14px;
    }

    /* Batch Header */
    .batch-header {
      display: flex;
      justify-content: between;
      align-items: flex-start;
      gap: var(--s4);
      margin-bottom: var(--s4);
    }

    .batch-main-info {
      flex: 1;
    }

    .batch-number {
      margin: 0 0 var(--s2) 0;
      font-size: var(--text-lg);
      font-weight: var(--font-semibold);
      color: var(--text);
    }

    .batch-meta {
      display: flex;
      flex-direction: column;
      gap: var(--s2);
    }

    .batch-stock {
      display: flex;
      align-items: center;
      gap: var(--s2);
      font-size: var(--text-sm);
      color: var(--text-secondary);
    }

    .batch-stock mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }

    .batch-status {
      padding: var(--s1) var(--s2);
      border-radius: var(--radius);
      font-size: var(--text-xs);
      font-weight: var(--font-medium);
      
      &.status-good {
        background: rgba(75, 191, 123, 0.1);
        color: var(--success);
      }
      
      &.status-warning {
        background: rgba(255, 184, 77, 0.1);
        color: var(--warning);
      }
      
      &.status-critical {
        background: rgba(255, 145, 77, 0.1);
        color: var(--primary);
      }
      
      &.status-expired {
        background: rgba(225, 90, 79, 0.1);
        color: var(--error);
      }
    }

    /* Batch Expiry */
    .batch-expiry {
      display: flex;
      align-items: flex-start;
      gap: var(--s2);
      min-width: 160px;
    }

    .expiry-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
    }

    .expiry-details {
      display: flex;
      flex-direction: column;
    }

    .expiry-date {
      font-size: var(--text-sm);
      color: var(--text);
      font-weight: var(--font-medium);
    }

    .days-left {
      font-size: var(--text-xs);
      font-weight: var(--font-medium);
      
      &.expiry-good { color: var(--success); }
      &.expiry-warning { color: var(--warning); }
      &.expiry-critical { color: var(--primary); }
      &.expiry-expired { color: var(--error); }
    }

    /* Batch Selection Controls */
    .batch-selection {
      display: flex;
      justify-content: between;
      align-items: flex-start;
      gap: var(--s6);
    }

    .selection-controls {
      display: flex;
      align-items: flex-start;
      gap: var(--s4);
    }

    .quantity-field {
      width: 120px;
    }

    .quick-select {
      display: flex;
      flex-direction: column;
      gap: var(--s2);
    }

    .quick-btn {
      min-width: 60px;
      height: 32px;
      font-size: var(--text-xs);
      
      &.clear-btn {
        color: var(--text-secondary);
      }
    }

    /* Cost Information */
    .cost-info {
      display: flex;
      flex-direction: column;
      gap: var(--s2);
      min-width: 120px;
    }

    .cost-item {
      display: flex;
      justify-content: between;
      gap: var(--s2);
    }

    .cost-label {
      font-size: var(--text-xs);
      color: var(--text-muted);
    }

    .cost-value {
      font-size: var(--text-xs);
      font-weight: var(--font-medium);
      color: var(--text);
      
      &.subtotal {
        color: var(--primary);
        font-weight: var(--font-semibold);
      }
      
      &.profit {
        &.positive { color: var(--success); }
        &.negative { color: var(--error); }
      }
    }

    /* Unavailable Batch */
    .batch-unavailable {
      display: flex;
      align-items: center;
      gap: var(--s2);
      color: var(--text-muted);
      font-style: italic;
    }

    /* Selection Summary */
    .selection-summary {
      background: var(--bg-primary);
      border: 2px solid var(--primary);
      border-radius: var(--radius-lg);
      padding: var(--s5);
      margin-top: var(--s6);
    }

    .summary-header {
      display: flex;
      align-items: center;
      gap: var(--s2);
      margin-bottom: var(--s4);
    }

    .summary-header mat-icon {
      color: var(--primary);
      font-size: 20px;
      width: 20px;
      height: 20px;
    }

    .summary-title {
      margin: 0;
      font-size: var(--text-base);
      font-weight: var(--font-semibold);
      color: var(--primary);
    }

    .summary-content {
      display: flex;
      flex-direction: column;
      gap: var(--s3);
    }

    .summary-row {
      display: flex;
      justify-content: between;
      align-items: center;
    }

    .summary-label {
      font-size: var(--text-sm);
      color: var(--text-secondary);
    }

    .summary-value {
      font-size: var(--text-sm);
      font-weight: var(--font-semibold);
      color: var(--text);
      
      &.profit {
        &.positive { color: var(--success); }
        &.negative { color: var(--error); }
      }
    }

    /* Fulfillment Status */
    .fulfillment-status {
      display: flex;
      align-items: center;
      gap: var(--s2);
      padding: var(--s3);
      border-radius: var(--radius);
      margin-top: var(--s3);
      font-size: var(--text-sm);
      font-weight: var(--font-medium);
      
      &.complete {
        background: rgba(75, 191, 123, 0.1);
        color: var(--success);
      }
      
      &.partial {
        background: rgba(255, 184, 77, 0.1);
        color: var(--warning);
      }
      
      &.over {
        background: rgba(255, 145, 77, 0.1);
        color: var(--primary);
      }
    }

    /* Modal Actions */
    .modal-actions {
      padding: var(--s6);
      margin: 0 calc(-1 * var(--s6)) calc(-1 * var(--s6));
      border-top: 2px solid var(--border);
      background: var(--bg-primary);
    }

    .actions-content {
      display: flex;
      justify-content: between;
      align-items: center;
      gap: var(--s4);
    }

    .action-info {
      flex: 1;
    }

    .selected-info {
      font-size: var(--text-sm);
      color: var(--text-secondary);
      font-weight: var(--font-medium);
    }

    .action-buttons {
      display: flex;
      gap: var(--s3);
      align-items: center;
    }

    .cancel-btn {
      min-width: 100px;
      height: 44px;
      color: var(--text-secondary);
    }

    .confirm-btn {
      min-width: 160px;
      height: 44px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: var(--s2);
    }

    /* Mobile Responsive */
    @media (max-width: 768px) {
      .batch-selection-modal {
        max-width: 100%;
        margin: 0;
      }

      .request-summary {
        flex-direction: column;
        gap: var(--s4);
      }

      .batch-header {
        flex-direction: column;
        align-items: stretch;
      }

      .batch-selection {
        flex-direction: column;
        gap: var(--s4);
      }

      .selection-controls {
        justify-content: between;
        width: 100%;
      }

      .actions-content {
        flex-direction: column;
        align-items: stretch;
        gap: var(--s4);
      }

      .action-info {
        text-align: center;
      }

      .action-buttons {
        flex-direction: column-reverse;
        width: 100%;
      }

      .cancel-btn,
      .confirm-btn {
        width: 100%;
      }
    }
  `]
})
export class BatchSelectionModalComponent {
  private inventoryService = inject(InventoryService);
  
  // Signals for reactive state
  loading = signal(false);
  errorMessage = signal<string | null>(null);
  availableBatches = signal<BatchForPOSDto[]>([]);
  selectedQuantities = signal<Map<number, number>>(new Map());

  // Computed properties
  totalSelectedQuantity = computed(() => {
    let total = 0;
    this.selectedQuantities().forEach(quantity => total += quantity);
    return total;
  });

  totalSelectedCost = computed(() => {
    let total = 0;
    this.availableBatches().forEach(batch => {
      const quantity = this.selectedQuantities().get(batch.id) || 0;
      total += quantity * batch.unitCost;
    });
    return total;
  });

  averageUnitCost = computed(() => {
    const totalQuantity = this.totalSelectedQuantity();
    if (totalQuantity === 0) return 0;
    return this.totalSelectedCost() / totalQuantity;
  });

  totalProfit = computed(() => {
    const totalQuantity = this.totalSelectedQuantity();
    const totalCost = this.totalSelectedCost();
    const totalRevenue = totalQuantity * this.data.sellPrice;
    return totalRevenue - totalCost;
  });

  remainingNeeded = computed(() => {
    return Math.max(0, this.data.requestedQuantity - this.totalSelectedQuantity());
  });

  constructor(
    public dialogRef: MatDialogRef<BatchSelectionModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: BatchSelectionModalData
  ) {}

  ngOnInit(): void {
    console.log('🆕 BatchSelectionModal initialized with data:', this.data);
    this.loadBatches();
  }

  /**
   * Load available batches for POS
   */
  async loadBatches(): Promise<void> {
    this.loading.set(true);
    this.errorMessage.set(null);

    try {
      const batches = await firstValueFrom(
        this.inventoryService.getBatchesForPOS(this.data.productId)
      );

      console.log('📦 Batches loaded for POS:', batches);
      this.availableBatches.set(batches);

    } catch (error: any) {
      console.error('❌ Failed to load batches:', error);
      this.errorMessage.set(error.message || 'Failed to load available batches');
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Handle batch quantity change
   */
  onBatchQuantityChange(batch: BatchForPOSDto, event: Event): void {
    const target = event.target as HTMLInputElement;
    const quantity = parseInt(target.value) || 0;
    const maxAllowed = Math.min(batch.availableQuantity, this.remainingNeeded() + (this.selectedQuantities().get(batch.id) || 0));
    
    // Ensure quantity doesn't exceed limits
    const finalQuantity = Math.min(Math.max(0, quantity), maxAllowed);
    
    this.selectedQuantities.update(quantities => {
      const newQuantities = new Map(quantities);
      if (finalQuantity > 0) {
        newQuantities.set(batch.id, finalQuantity);
      } else {
        newQuantities.delete(batch.id);
      }
      return newQuantities;
    });

    // Update input value to reflect the actual set value
    if (finalQuantity !== quantity) {
      target.value = finalQuantity.toString();
    }
  }

  /**
   * Select maximum quantity from a batch
   */
  selectMaxFromBatch(batch: BatchForPOSDto): void {
    const maxQuantity = Math.min(batch.availableQuantity, this.remainingNeeded() + (this.selectedQuantities().get(batch.id) || 0));
    
    this.selectedQuantities.update(quantities => {
      const newQuantities = new Map(quantities);
      if (maxQuantity > 0) {
        newQuantities.set(batch.id, maxQuantity);
      } else {
        newQuantities.delete(batch.id);
      }
      return newQuantities;
    });
  }

  /**
   * Clear selection from a batch
   */
  clearBatchSelection(batch: BatchForPOSDto): void {
    this.selectedQuantities.update(quantities => {
      const newQuantities = new Map(quantities);
      newQuantities.delete(batch.id);
      return newQuantities;
    });
  }

  /**
   * Auto-select batches using FIFO logic
   */
  autoSelectFIFO(): void {
    const batches = [...this.availableBatches()].sort((a, b) => a.priority - b.priority);
    let remaining = this.data.requestedQuantity;
    
    this.selectedQuantities.update(quantities => {
      const newQuantities = new Map();
      
      for (const batch of batches) {
        if (remaining <= 0) break;
        
        const takeFromBatch = Math.min(batch.availableQuantity, remaining);
        if (takeFromBatch > 0) {
          newQuantities.set(batch.id, takeFromBatch);
          remaining -= takeFromBatch;
        }
      }
      
      return newQuantities;
    });
  }

  /**
   * Confirm batch selection
   */
  confirmSelection(): void {
    const selectedBatches: SelectedBatchInfo[] = [];
    
    this.availableBatches().forEach(batch => {
      const quantity = this.selectedQuantities().get(batch.id);
      if (quantity && quantity > 0) {
        selectedBatches.push({
          batch,
          quantitySelected: quantity,
          subtotalCost: quantity * batch.unitCost
        });
      }
    });

    const result: BatchSelectionResult = {
      success: true,
      selectedBatches,
      totalQuantity: this.totalSelectedQuantity(),
      totalCost: this.totalSelectedCost(),
      averageUnitCost: this.averageUnitCost(),
      message: `Selected ${this.totalSelectedQuantity()} units from ${selectedBatches.length} batches`
    };

    console.log('✅ Batch selection confirmed:', result);
    this.dialogRef.close(result);
  }

  /**
   * Track by function for batch list
   */
  trackByBatch = (index: number, batch: BatchForPOSDto): number => batch.id;

  /**
   * Check if batch is selected
   */
  isBatchSelected(batch: BatchForPOSDto): boolean {
    return (this.selectedQuantities().get(batch.id) || 0) > 0;
  }

  /**
   * Get selected quantity for a batch
   */
  getSelectedQuantity(batch: BatchForPOSDto): number {
    return this.selectedQuantities().get(batch.id) || 0;
  }

  /**
   * Get batch subtotal cost
   */
  getBatchSubtotal(batch: BatchForPOSDto): number {
    const quantity = this.getSelectedQuantity(batch);
    return quantity * batch.unitCost;
  }

  /**
   * Get unit profit for a batch
   */
  getUnitProfit(batch: BatchForPOSDto): number {
    return this.data.sellPrice - batch.unitCost;
  }

  /**
   * Get unit display text
   */
  getUnitDisplay(): string {
    return this.data.unit || 'units';
  }

  /**
   * Get availability status color
   */
  getAvailabilityColor(): string {
    const selected = this.totalSelectedQuantity();
    const requested = this.data.requestedQuantity;
    
    if (selected === requested) return '#4BBF7B'; // Green - Complete
    if (selected > requested) return '#FF914D';   // Orange - Over
    return '#FFB84D'; // Yellow - Partial
  }

  /**
   * Get availability icon
   */
  getAvailabilityIcon(): string {
    const selected = this.totalSelectedQuantity();
    const requested = this.data.requestedQuantity;
    
    if (selected === requested) return 'check_circle';
    if (selected > requested) return 'warning';
    return 'partial_fulfillment';
  }

  /**
   * Get fulfillment status class
   */
  getFulfillmentStatusClass(): string {
    const selected = this.totalSelectedQuantity();
    const requested = this.data.requestedQuantity;
    
    if (selected === requested) return 'complete';
    if (selected > requested) return 'over';
    return 'partial';
  }

  /**
   * Get fulfillment icon
   */
  getFulfillmentIcon(): string {
    const selected = this.totalSelectedQuantity();
    const requested = this.data.requestedQuantity;
    
    if (selected === requested) return 'task_alt';
    if (selected > requested) return 'warning';
    return 'hourglass_empty';
  }

  /**
   * Get fulfillment message
   */
  getFulfillmentMessage(): string {
    const selected = this.totalSelectedQuantity();
    const requested = this.data.requestedQuantity;
    
    if (selected === requested) return 'Request fully fulfilled';
    if (selected > requested) return `${selected - requested} units over requested amount`;
    return `${requested - selected} units still needed`;
  }

  /**
   * Format currency
   */
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  }

  /**
   * Format expiry date
   */
  formatExpiryDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  }

  /**
   * Format days to expiry
   */
  formatDaysToExpiry(days?: number): string {
    if (days === undefined) return 'Unknown';
    if (days < 0) return `${Math.abs(days)} days overdue`;
    if (days === 0) return 'Expires today';
    if (days === 1) return '1 day left';
    return `${days} days left`;
  }

  /**
   * Format batch status
   */
  formatBatchStatus(status: string): string {
    const statusMap: { [key: string]: string } = {
      'Good': 'Good',
      'Warning': 'Warning',
      'Critical': 'Critical',
      'Expired': 'Expired'
    };
    return statusMap[status] || status;
  }

  /**
   * Get batch status CSS class
   */
  getBatchStatusClass(status: string): string {
    const statusClasses: { [key: string]: string } = {
      'Good': 'status-good',
      'Warning': 'status-warning',
      'Critical': 'status-critical',
      'Expired': 'status-expired'
    };
    return statusClasses[status] || 'status-good';
  }

  /**
   * Get expiry status CSS class
   */
  getExpiryStatusClass(status: string): string {
    const statusClasses: { [key: string]: string } = {
      'Good': 'expiry-good',
      'Warning': 'expiry-warning',
      'Critical': 'expiry-critical',
      'Expired': 'expiry-expired'
    };
    return statusClasses[status] || 'expiry-good';
  }

  /**
   * Get expiry status color
   */
  getExpiryStatusColor(status: string): string {
    const statusColors: { [key: string]: string } = {
      'Good': '#4BBF7B',
      'Warning': '#FFB84D',
      'Critical': '#FF914D',
      'Expired': '#E15A4F'
    };
    return statusColors[status] || '#4BBF7B';
  }

  /**
   * Get expiry icon
   */
  getExpiryIcon(status: string): string {
    const statusIcons: { [key: string]: string } = {
      'Good': 'check_circle',
      'Warning': 'warning',
      'Critical': 'error',
      'Expired': 'dangerous'
    };
    return statusIcons[status] || 'schedule';
  }

  // Expose Math for template
  Math = Math;
}