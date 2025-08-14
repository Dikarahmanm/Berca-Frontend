// ✅ REDESIGNED: Member Points Management - Clean Simple Design
// Enhanced Desktop UI with Angular Signals Architecture

import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { Subscription, Observable } from 'rxjs';

// Angular Material imports
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, MatPaginator, PageEvent } from '@angular/material/paginator';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatStepperModule } from '@angular/material/stepper';

// Services and interfaces
import { MembershipService } from '../../services/membership.service';
import {
  MemberDto,
  MemberPointHistoryDto,
  AddPointsRequest,
  RedeemPointsRequest,
  MemberStatsDto,
  MemberPointsFilter
} from '../../interfaces/membership.interfaces';

@Component({
  selector: 'app-member-points',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    // Material modules
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTabsModule,
    MatFormFieldModule,
    MatInputModule,
    MatTableModule,
    MatPaginatorModule,
    MatChipsModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatExpansionModule,
    MatStepperModule
  ],
  templateUrl: './member-points.component.html',
  styleUrls: ['./member-points.component.scss']
})
export class MemberPointsComponent implements OnInit, OnDestroy {
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  // Member data
  memberId: number | null = null;
  member: MemberDto | null = null;
  memberStats: MemberStatsDto | null = null;
  pointsBalance = 0;

  // Forms
  addPointsForm: FormGroup;
  redeemPointsForm: FormGroup;

  // Points history
  historyDataSource: MemberPointHistoryDto[] = [];
  historyColumns = ['date', 'type', 'description', 'points', 'referenceNumber'];
  currentPage = 1;
  pageSize = 20;
  totalItems = 0;

  // State
  loading$: Observable<boolean>;
  error$: Observable<string | null>;
  isAddingPoints = false;
  isRedeemingPoints = false;
  selectedTab = 0;

  // Debug method for tab changes
  onTabChange(index: number): void {
    console.log(`🔄 Tab changed to index: ${index}`);
    this.selectedTab = index;
  }

  // Subscription management
  private subscriptions = new Subscription();

  constructor(
    private membershipService: MembershipService,
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private snackBar: MatSnackBar
  ) {
    this.loading$ = this.membershipService.loading$;
    this.error$ = this.membershipService.error$;
    this.addPointsForm = this.initializeAddPointsForm();
    this.redeemPointsForm = this.initializeRedeemPointsForm();
  }

  ngOnInit(): void {
    this.getMemberIdFromRoute();
    
    if (this.memberId) {
      this.loadMemberData();
      this.loadPointsHistory();
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  // ===== INITIALIZATION =====

  private initializeAddPointsForm(): FormGroup {
    return this.fb.group({
      points: ['', [Validators.required, Validators.min(1), Validators.max(100000)]],
      description: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(200)]],
      referenceNumber: ['', [Validators.required, Validators.minLength(3)]]
    });
  }

  private initializeRedeemPointsForm(): FormGroup {
    return this.fb.group({
      points: ['', [Validators.required, Validators.min(1)]],
      description: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(200)]],
      referenceNumber: ['', [Validators.required, Validators.minLength(3)]]
    });
  }

  private getMemberIdFromRoute(): void {
    const id = this.route.snapshot.paramMap.get('id');
    this.memberId = id ? parseInt(id) : null;
  }

  // ===== DATA LOADING =====

  private loadMemberData(): void {
    if (!this.memberId) return;

    console.log(`🔍 Loading member data for ID: ${this.memberId}`);

    // Load member details
    this.subscriptions.add(
      this.membershipService.getMemberById(this.memberId).subscribe({
        next: (member) => {
          this.member = member;
          console.log(`✅ Member loaded:`, {
            name: member.name,
            totalSpent: member.totalSpent,
            availablePoints: member.availablePoints,
            tier: member.tier
          });
          this.updatePointsValidation();
        },
        error: (error) => {
          console.error('❌ Failed to load member data:', error);
          this.showError('Failed to load member data');
          this.navigateBack();
        }
      })
    );

    // Load member statistics
    this.subscriptions.add(
      this.membershipService.getMemberStats(this.memberId).subscribe({
        next: (stats) => {
          this.memberStats = stats;
        },
        error: (error) => {
          console.error('Failed to load member stats:', error);
        }
      })
    );

    // Load current points balance
    this.subscriptions.add(
      this.membershipService.getPointsBalance(this.memberId).subscribe({
        next: (balance) => {
          this.pointsBalance = balance;
          this.updatePointsValidation();
        },
        error: (error) => {
          console.error('Failed to load points balance:', error);
        }
      })
    );
  }

  private loadPointsHistory(): void {
    if (!this.memberId) {
      console.warn('⚠️ No member ID available for loading points history');
      return;
    }

    console.log(`🔍 Loading points history for member ID: ${this.memberId}`);

    const filter: MemberPointsFilter = {
      page: this.currentPage,
      pageSize: this.pageSize
    };

    this.subscriptions.add(
      this.membershipService.getPointsHistory(this.memberId, filter).subscribe({
        next: (history) => {
          console.log('✅ Points history loaded:', history);
          this.historyDataSource = history;
          // Note: Backend should return pagination info
        },
        error: (error) => {
          console.error('❌ Failed to load points history:', error);
          // Temporary mock data for testing
          this.loadMockHistoryData();
        }
      })
    );
  }

  // Temporary method for testing
  private loadMockHistoryData(): void {
    console.log('🧪 Loading mock history data for testing');
    this.historyDataSource = [
      {
        id: 1,
        memberId: this.memberId!,
        pointsDelta: 100,
        transactionType: 'Earned',
        description: 'Purchase at store',
        referenceNumber: 'REF-001',
        createdAt: new Date().toISOString(),
        createdBy: 'system'
      },
      {
        id: 2,
        memberId: this.memberId!,
        pointsDelta: -50,
        transactionType: 'Redeemed',
        description: 'Discount redemption',
        referenceNumber: 'REF-002',
        createdAt: new Date(Date.now() - 86400000).toISOString(), // Yesterday
        createdBy: 'system'
      }
    ];
  }

  private updatePointsValidation(): void {
    // Update redeem form validation based on available points
    const redeemPointsControl = this.redeemPointsForm.get('points');
    if (redeemPointsControl && this.member?.availablePoints && this.member.availablePoints > 0) {
      redeemPointsControl.setValidators([
        Validators.required,
        Validators.min(1),
        Validators.max(this.member.availablePoints)
      ]);
      redeemPointsControl.updateValueAndValidity();
    }

    // Enable/disable form controls based on points availability
    this.updateFormControlsState();
  }

  private updateFormControlsState(): void {
    const canRedeem = this.canRedeemPoints();
    
    // Update redeem form controls state
    Object.keys(this.redeemPointsForm.controls).forEach(key => {
      const control = this.redeemPointsForm.get(key);
      if (control) {
        if (canRedeem) {
          control.enable();
        } else {
          control.disable();
        }
      }
    });
  }

  // ===== POINTS OPERATIONS =====

  onAddPoints(): void {
    if (this.addPointsForm.invalid || this.isAddingPoints || !this.memberId) {
      this.markFormGroupTouched(this.addPointsForm);
      return;
    }

    this.isAddingPoints = true;
    const formValue = this.addPointsForm.value;
    
    const request: AddPointsRequest = {
      points: formValue.points,
      description: formValue.description.trim(),
      referenceNumber: formValue.referenceNumber.trim()
    };

    this.subscriptions.add(
      this.membershipService.addPoints(this.memberId, request).subscribe({
        next: () => {
          this.showSuccess('Points added successfully');
          this.addPointsForm.reset();
          this.refreshData();
        },
        error: (error) => {
          this.showError('Failed to add points');
        },
        complete: () => {
          this.isAddingPoints = false;
        }
      })
    );
  }

  onRedeemPoints(): void {
    if (this.redeemPointsForm.invalid || this.isRedeemingPoints || !this.memberId) {
      this.markFormGroupTouched(this.redeemPointsForm);
      return;
    }

    this.isRedeemingPoints = true;
    const formValue = this.redeemPointsForm.value;
    
    const request: RedeemPointsRequest = {
      points: formValue.points,
      description: formValue.description.trim(),
      referenceNumber: formValue.referenceNumber.trim()
    };

    this.subscriptions.add(
      this.membershipService.redeemPoints(this.memberId, request).subscribe({
        next: () => {
          this.showSuccess('Points redeemed successfully');
          this.redeemPointsForm.reset();
          this.refreshData();
        },
        error: (error) => {
          this.showError('Failed to redeem points');
        },
        complete: () => {
          this.isRedeemingPoints = false;
        }
      })
    );
  }

  private refreshData(): void {
    this.loadMemberData();
    this.loadPointsHistory();
  }

  // ===== PAGINATION =====

  onPageChange(event: PageEvent): void {
    this.pageSize = event.pageSize;
    this.currentPage = event.pageIndex + 1;
    this.loadPointsHistory();
  }

  // ===== FORM HELPERS =====

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      formGroup.get(key)?.markAsTouched();
    });
  }

  getFieldError(formGroup: FormGroup, fieldName: string): string | null {
    const field = formGroup.get(fieldName);
    
    if (field?.errors && field.touched) {
      if (field.errors['required']) return `${fieldName} is required`;
      if (field.errors['min']) return `Minimum value is ${field.errors['min'].min}`;
      if (field.errors['max']) return `Maximum value is ${field.errors['max'].max}`;
      if (field.errors['minlength']) return `${fieldName} is too short`;
      if (field.errors['maxlength']) return `${fieldName} is too long`;
    }
    
    return null;
  }

  isFieldInvalid(formGroup: FormGroup, fieldName: string): boolean {
    const field = formGroup.get(fieldName);
    return !!(field?.invalid && field.touched);
  }

  // ===== UTILITY METHODS =====

  getTierInfo(tier: string | undefined): { name: string; color: string; icon: string } {
    if (!tier) {
      return { name: 'Unknown', color: '#gray', icon: 'help_outline' };
    }
    return this.membershipService.getMemberTierInfo(tier);
  }

  // TrackBy function for performance
  trackByTransaction = (index: number, transaction: MemberPointHistoryDto): number => transaction.id;

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(value);
  }

  formatNumber(value: number): string {
    return new Intl.NumberFormat('id-ID').format(value);
  }

  formatDate(dateString: string): string {
    return new Intl.DateTimeFormat('id-ID', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(dateString));
  }

  getPointsTypeColor(type: string): string {
    return type.toLowerCase().includes('earn') || type.toLowerCase().includes('add') ? 'success' : 'warn';
  }

  getPointsTypeIcon(transactionType: string): string {
    const type = transactionType.toLowerCase();
    if (type === 'earned' || type === 'manual') {
      return 'add_circle';
    } else if (type === 'redeemed') {
      return 'remove_circle';
    } else if (type === 'expired') {
      return 'schedule';
    }
    return 'help_outline';
  }

  // Helper method to determine if transaction is earning points
  isEarningTransaction(transactionType: string): boolean {
    return transactionType === 'Earned' || transactionType === 'Manual';
  }

  getPointsDisplayValue(pointsDelta: number, isEarning: boolean): string {
    // pointsDelta should already be positive/negative from backend
    // but we'll ensure correct sign display
    const absPoints = Math.abs(pointsDelta);
    return `${isEarning ? '+' : '-'}${this.formatNumber(absPoints)}`;
  }

  // Enhanced utility methods for clean design
  getCurrencySymbol(): string {
    return 'Rp';
  }

  getFormattedCurrency(amount: number): string {
    return `${this.getCurrencySymbol()} ${this.formatNumber(amount)}`;
  }

  canRedeemPoints(): boolean {
    return !!(this.member?.availablePoints && this.member.availablePoints > 0);
  }

  generateReferenceNumber(): string {
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `REF-${timestamp.slice(-6)}-${random}`;
  }

  // ===== QUICK ACTIONS =====

  fillQuickAddPoints(points: number, description: string): void {
    this.addPointsForm.patchValue({
      points: points,
      description: description,
      referenceNumber: this.generateReferenceNumber()
    });
    this.selectedTab = 0; // Switch to add points tab
  }

  fillQuickRedeemPoints(points: number, description: string): void {
    this.redeemPointsForm.patchValue({
      points: Math.min(points, this.member?.availablePoints || 0),
      description: description,
      referenceNumber: this.generateReferenceNumber()
    });
    this.selectedTab = 1; // Switch to redeem points tab
  }

  // ===== NAVIGATION =====

  navigateBack(): void {
    this.router.navigate(['/dashboard/membership']);
  }

  editMember(): void {
    if (this.memberId) {
      this.router.navigate(['/dashboard/membership/edit', this.memberId]);
    }
  }

  viewMember(): void {
    if (this.memberId) {
      this.router.navigate(['/dashboard/membership/view', this.memberId]);
    }
  }

  // ===== UI HELPERS =====

  private showSuccess(message: string): void {
    this.snackBar.open(message, 'Tutup', {
      duration: 3000,
      panelClass: ['success-snackbar']
    });
  }

  private showError(message: string): void {
    this.snackBar.open(message, 'Tutup', {
      duration: 5000,
      panelClass: ['error-snackbar']
    });
  }

  // ===== MEMBER TIER PROGRESS =====

  getTierProgress(): { progress: number; nextTier: string; required: number } {
    if (!this.member) return { progress: 0, nextTier: '', required: 0 };
    
    const tierProgress = this.membershipService.calculateTierProgress(
      this.member.totalSpent,
      this.member.tier
    );
    
    return {
      progress: tierProgress.percentage,
      nextTier: tierProgress.nextTier,
      required: tierProgress.pointsNeeded
    };
  }
}