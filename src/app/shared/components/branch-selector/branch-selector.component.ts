// Dynamic Branch Selector Component
// Menggantikan mockup dengan data dari API

import { Component, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StateService } from '../../../core/services/state.service';
import { BranchService } from '../../../core/services/branch.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-branch-selector',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="branch-selector">
      <!-- Current Branch Display -->
      <div class="current-branch" [class.loading]="loading()">
        @if (loading()) {
        <div class="loading-indicator">
          <div class="spinner"></div>
          <span>Loading branches...</span>
        </div>
        } @else {
        <div class="branch-info">
          <div class="branch-icon">
            @if (activeBranch()?.isHeadOffice) {
            🏢
            } @else {
            🏪
            }
          </div>
          <div class="branch-details">
            <div class="branch-name">{{ activeBranch()?.branchName || 'No Branch Selected' }}</div>
            @if (activeBranch()) {
            <div class="branch-meta">
              <span class="branch-code">{{ activeBranch()!.branchCode }}</span>
              <span class="branch-type">{{ getBranchTypeLabel(activeBranch()!.branchType) }}</span>
              @if (activeBranch()!.isHeadOffice) {
              <span class="head-office-badge">Head Office</span>
              }
            </div>
            }
          </div>
        </div>
        }
      </div>

      <!-- Branch Dropdown -->
      @if (!loading() && accessibleBranches().length > 1) {
      <div class="branch-dropdown">
        <select 
          class="branch-select"
          [value]="selectedBranchId()"
          (change)="onBranchChange($event)"
          [disabled]="switchingBranch()"
        >
          <option value="" disabled>Select Branch</option>
          @for (branch of groupedBranches(); track branch.branchId) {
          <option [value]="branch.branchId">
            {{ branch.branchName }} ({{ branch.branchCode }})
          </option>
          }
        </select>
        
        @if (switchingBranch()) {
        <div class="switching-indicator">
          <div class="spinner small"></div>
        </div>
        }
      </div>
      }

      <!-- Branch Quick Actions -->
      @if (activeBranch() && canManageBranches()) {
      <div class="branch-actions">
        <button 
          class="btn btn-sm btn-outline"
          (click)="onRefreshBranches()"
          [disabled]="loading()"
          title="Refresh branch data"
        >
          🔄
        </button>
        <button 
          class="btn btn-sm btn-outline"
          (click)="onViewBranchDetails()"
          title="View branch details"
        >
          ℹ️
        </button>
      </div>
      }

      <!-- Multi-Branch Mode Toggle (Admin only) -->
      @if (canManageBranches() && accessibleBranches().length > 1) {
      <div class="multi-branch-toggle">
        <label class="toggle-label">
          <input
            type="checkbox"
            [checked]="isMultiSelectMode()"
            (change)="onToggleMultiSelect($event)"
            [disabled]="loading()"
          >
          <span class="toggle-text">Multi-Branch</span>
        </label>
      </div>
      }

      <!-- Multi-Branch Selection -->
      @if (isMultiSelectMode()) {
      <div class="multi-branch-selection">
        <div class="selection-header">
          <span>Select Branches ({{ selectedBranchIds().length }})</span>
          <button 
            class="btn btn-xs btn-outline"
            (click)="onSelectAllBranches()"
            [disabled]="loading()"
          >
            Select All
          </button>
          <button 
            class="btn btn-xs btn-outline"
            (click)="onClearSelection()"
            [disabled]="loading()"
          >
            Clear
          </button>
        </div>
        
        <div class="branch-checkboxes">
          @for (branch of groupedBranches(); track branch.branchId) {
          <label class="branch-checkbox">
            <input
              type="checkbox"
              [checked]="selectedBranchIds().includes(branch.branchId)"
              (change)="onToggleBranchSelection(branch.branchId)"
              [disabled]="loading()"
            >
            <div class="checkbox-content">
              <div class="branch-icon-small">
                @if (branch.isHeadOffice) {
                🏢
                } @else {
                🏪
                }
              </div>
              <div class="checkbox-details">
                <div class="checkbox-name">{{ branch.branchName }}</div>
                <div class="checkbox-meta">{{ branch.branchCode }} • {{ getBranchTypeLabel(branch.branchType) }}</div>
              </div>
            </div>
          </label>
          }
        </div>
      </div>
      }

      <!-- Branch Status Summary -->
      @if (activeBranch() && !isMultiSelectMode()) {
      <div class="branch-summary">
        <div class="summary-item">
          <span class="label">Status:</span>
          <span class="value" [class.active]="activeBranch()!.isActive" [class.inactive]="!activeBranch()!.isActive">
            {{ activeBranch()!.isActive ? 'Active' : 'Inactive' }}
          </span>
        </div>
        <div class="summary-item">
          <span class="label">Type:</span>
          <span class="value">{{ activeBranch()!.branchType }}</span>
        </div>
        <div class="summary-item">
          <span class="label">Access:</span>
          <span class="value">{{ activeBranch()!.accessLevel }}</span>
        </div>
      </div>
      }

      <!-- Error Display -->
      @if (error()) {
      <div class="error-message">
        <span class="error-icon">⚠️</span>
        <span class="error-text">{{ error() }}</span>
        <button class="btn btn-xs btn-primary" (click)="onRetryLoad()">Retry</button>
      </div>
      }
    </div>
  `,
  styles: [`
    .branch-selector {
      display: flex;
      flex-direction: column;
      gap: var(--s3);
      padding: var(--s4);
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      transition: var(--transition);
    }

    .current-branch {
      display: flex;
      align-items: center;
      gap: var(--s3);
      padding: var(--s3);
      background: var(--bg-primary);
      border-radius: var(--radius);
      transition: var(--transition);

      &.loading {
        opacity: 0.7;
      }
    }

    .loading-indicator {
      display: flex;
      align-items: center;
      gap: var(--s2);
      color: var(--text-secondary);
    }

    .spinner {
      width: 16px;
      height: 16px;
      border: 2px solid var(--border);
      border-top: 2px solid var(--primary);
      border-radius: 50%;
      animation: spin 1s linear infinite;

      &.small {
        width: 12px;
        height: 12px;
        border-width: 1px;
      }
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    .branch-info {
      display: flex;
      align-items: center;
      gap: var(--s3);
      flex: 1;
    }

    .branch-icon {
      font-size: 24px;
      opacity: 0.8;
    }

    .branch-details {
      flex: 1;
    }

    .branch-name {
      font-weight: var(--font-semibold);
      color: var(--text);
      font-size: var(--text-base);
    }

    .branch-meta {
      display: flex;
      align-items: center;
      gap: var(--s2);
      margin-top: var(--s1);
    }

    .branch-code {
      font-size: var(--text-xs);
      color: var(--text-secondary);
      background: var(--bg-secondary);
      padding: 2px var(--s1);
      border-radius: var(--radius-sm);
    }

    .branch-type {
      font-size: var(--text-xs);
      color: var(--text-muted);
    }

    .head-office-badge {
      font-size: var(--text-xs);
      background: var(--primary);
      color: white;
      padding: 2px var(--s1);
      border-radius: var(--radius-sm);
      font-weight: var(--font-medium);
    }

    .branch-dropdown {
      position: relative;
      display: flex;
      align-items: center;
      gap: var(--s2);
    }

    .branch-select {
      flex: 1;
      padding: var(--s2) var(--s3);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      background: var(--surface);
      color: var(--text);
      font-size: var(--text-sm);
      transition: var(--transition);

      &:focus {
        outline: none;
        border-color: var(--primary);
      }

      &:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
    }

    .switching-indicator {
      position: absolute;
      right: var(--s2);
      top: 50%;
      transform: translateY(-50%);
    }

    .branch-actions {
      display: flex;
      gap: var(--s2);
    }

    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: var(--s2) var(--s3);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      background: var(--surface);
      color: var(--text);
      text-decoration: none;
      cursor: pointer;
      transition: var(--transition);
      font-size: var(--text-sm);

      &:hover:not(:disabled) {
        border-color: var(--primary);
        background: var(--primary-light);
      }

      &:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }

      &.btn-sm {
        padding: var(--s1) var(--s2);
        font-size: var(--text-xs);
      }

      &.btn-xs {
        padding: 2px var(--s1);
        font-size: var(--text-xs);
      }

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
        background: transparent;

        &:hover:not(:disabled) {
          background: var(--primary);
          color: white;
        }
      }
    }

    .multi-branch-toggle {
      display: flex;
      align-items: center;
      gap: var(--s2);
      padding: var(--s2) 0;
      border-top: 1px solid var(--border);
      margin-top: var(--s2);
    }

    .toggle-label {
      display: flex;
      align-items: center;
      gap: var(--s2);
      cursor: pointer;
      font-size: var(--text-sm);
    }

    .toggle-text {
      color: var(--text-secondary);
    }

    .multi-branch-selection {
      border-top: 1px solid var(--border);
      padding-top: var(--s3);
    }

    .selection-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--s2);
      margin-bottom: var(--s3);
      font-size: var(--text-sm);
      color: var(--text-secondary);
    }

    .branch-checkboxes {
      display: flex;
      flex-direction: column;
      gap: var(--s2);
      max-height: 200px;
      overflow-y: auto;
    }

    .branch-checkbox {
      display: flex;
      align-items: center;
      gap: var(--s2);
      padding: var(--s2);
      border-radius: var(--radius);
      cursor: pointer;
      transition: var(--transition);

      &:hover {
        background: var(--bg-secondary);
      }
    }

    .checkbox-content {
      display: flex;
      align-items: center;
      gap: var(--s2);
      flex: 1;
    }

    .branch-icon-small {
      font-size: 16px;
      opacity: 0.7;
    }

    .checkbox-details {
      flex: 1;
    }

    .checkbox-name {
      font-size: var(--text-sm);
      color: var(--text);
    }

    .checkbox-meta {
      font-size: var(--text-xs);
      color: var(--text-muted);
      margin-top: 2px;
    }

    .branch-summary {
      display: flex;
      flex-direction: column;
      gap: var(--s1);
      padding: var(--s2) 0;
      border-top: 1px solid var(--border);
    }

    .summary-item {
      display: flex;
      align-items: center;
      gap: var(--s2);
      font-size: var(--text-xs);
    }

    .label {
      color: var(--text-muted);
      min-width: 60px;
    }

    .value {
      color: var(--text-secondary);

      &.active {
        color: var(--success);
        font-weight: var(--font-medium);
      }

      &.inactive {
        color: var(--error);
        font-weight: var(--font-medium);
      }
    }

    .error-message {
      display: flex;
      align-items: center;
      gap: var(--s2);
      padding: var(--s2);
      background: rgba(225, 90, 79, 0.1);
      border: 1px solid var(--error);
      border-radius: var(--radius);
      font-size: var(--text-xs);
    }

    .error-icon {
      font-size: 14px;
    }

    .error-text {
      flex: 1;
      color: var(--error);
    }

    // Mobile responsive
    @media (max-width: 640px) {
      .branch-selector {
        padding: var(--s3);
      }

      .branch-meta {
        flex-direction: column;
        align-items: flex-start;
        gap: var(--s1);
      }

      .selection-header {
        flex-direction: column;
        align-items: stretch;
        gap: var(--s2);
      }
    }
  `]
})
export class BranchSelectorComponent {
  // Inject services
  private stateService = inject(StateService);
  private branchService = inject(BranchService);
  private toastService = inject(ToastService);

  // Local state
  switchingBranch = signal(false);
  error = signal<string | null>(null);

  // State from StateService
  readonly accessibleBranches = this.stateService.accessibleBranches;
  readonly activeBranch = this.stateService.activeBranch;
  readonly selectedBranchId = this.stateService.selectedBranchId;
  readonly selectedBranchIds = this.stateService.selectedBranchIds;
  readonly isMultiSelectMode = this.stateService.isMultiSelectMode;
  readonly loading = this.stateService.loading;
  readonly canManageBranches = computed(() => {
    const activeBranch = this.activeBranch();
    if (!activeBranch) return false;
    return this.stateService.canManageBranch(activeBranch.branchId);
  });

  // Computed properties
  readonly groupedBranches = computed(() => {
    const branches = this.accessibleBranches();
    // Group by head office first, then regular branches
    return branches.sort((a, b) => {
      if (a.isHeadOffice && !b.isHeadOffice) return -1;
      if (!a.isHeadOffice && b.isHeadOffice) return 1;
      return a.branchName.localeCompare(b.branchName);
    });
  });

  // Event handlers
  onBranchChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    const branchId = parseInt(target.value);
    
    if (branchId && branchId !== this.selectedBranchId()) {
      this.switchingBranch.set(true);
      this.error.set(null);
      
      try {
        this.stateService.selectBranch(branchId);
        this.toastService.showSuccess('Branch Switched', `Switched to ${this.activeBranch()?.branchName}`);
      } catch (error) {
        console.error('Error switching branch:', error);
        this.error.set('Failed to switch branch');
        this.toastService.showError('Switch Failed', 'Failed to switch branch');
      } finally {
        this.switchingBranch.set(false);
      }
    }
  }

  onToggleMultiSelect(event: Event): void {
    const target = event.target as HTMLInputElement;
    if (target.checked) {
      this.stateService.setMultiSelectBranches([]);
    } else {
      // Switch back to single branch mode
      const currentBranch = this.activeBranch();
      if (currentBranch) {
        this.stateService.selectBranch(currentBranch.branchId);
      }
    }
  }

  onToggleBranchSelection(branchId: number): void {
    this.stateService.toggleBranchSelection(branchId);
  }

  onSelectAllBranches(): void {
    const allBranchIds = this.accessibleBranches().map(b => b.branchId);
    this.stateService.setMultiSelectBranches(allBranchIds);
  }

  onClearSelection(): void {
    this.stateService.setMultiSelectBranches([]);
  }

  async onRefreshBranches(): Promise<void> {
    try {
      this.error.set(null);
      await this.stateService.refreshBranchData();
      this.toastService.showSuccess('Data Refreshed', 'Branch data refreshed');
    } catch (error) {
      console.error('Error refreshing branches:', error);
      this.error.set('Failed to refresh branch data');
      this.toastService.showError('Refresh Failed', 'Failed to refresh branch data');
    }
  }

  onViewBranchDetails(): void {
    const branch = this.activeBranch();
    if (branch) {
      // Navigate to branch details or open modal
      // For now, show toast with branch info
      this.toastService.showInfo('Branch Info', `${branch.branchName} (${branch.branchCode})`);
    }
  }

  async onRetryLoad(): Promise<void> {
    this.error.set(null);
    await this.onRefreshBranches();
  }

  // Utility methods
  getBranchTypeLabel(branchType: string): string {
    const typeLabels: { [key: string]: string } = {
      'Head': 'Head Office',
      'Branch': 'Branch',
      'SubBranch': 'Sub Branch'
    };
    return typeLabels[branchType] || branchType;
  }
}