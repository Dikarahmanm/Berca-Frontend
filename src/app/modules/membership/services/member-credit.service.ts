// Member Credit Management Service - Complete API Integration
// POS Toko Eniwan - Phase 1 Implementation
// 25 Backend API Integrations for Credit Management System

import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError } from 'rxjs';
import { map, tap, catchError, retry } from 'rxjs/operators';
import { environment } from '../../../../environment/environment';

// Import all credit interfaces
import {
  // Core Credit Interfaces
  MemberCreditSummaryDto,
  CreditTransactionDto,
  CreditEligibilityDto,
  
  // POS Integration Interfaces
  POSMemberCreditDto,
  CreditValidationRequestDto,
  CreditValidationResultDto,
  CreateSaleWithCreditDto,
  POSCreditInfoDto,
  
  // Request/Response DTOs
  GrantCreditRequestDto,
  CreditPaymentRequestDto,
  UpdateCreditStatusRequestDto,
  UpdateCreditLimitRequestDto,
  SendReminderRequestDto,
  
  // Analytics & Reporting
  CreditAnalyticsDto,
  OverdueMemberDto,
  ApproachingLimitMemberDto,
  BranchCreditComparisonDto,
  
  // Search & Filter
  MemberCreditSearchFiltersDto,
  MemberCreditPagedResponseDto,
  
  // Utility Types
  CreditCalculationResult,
  BulkCreditAction,
  
  // API Response Wrappers
  CreditApiResponse,
  CreditValidationResponse,
  CreditTransactionResponse,
  
  // Enums
  CreditTransactionType,
  CreditStatus,
  PaymentMethod,
  ReminderType,
  RiskLevel
} from '../interfaces/member-credit.interfaces';

@Injectable({ providedIn: 'root' })
export class MemberCreditService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}`;

  // Signal-based reactive state management
  private _loading = signal<boolean>(false);
  private _error = signal<string | null>(null);
  private _creditMembers = signal<MemberCreditSummaryDto[]>([]);
  private _currentMemberCredit = signal<MemberCreditSummaryDto | null>(null);
  private _creditTransactions = signal<CreditTransactionDto[]>([]);
  private _creditAnalytics = signal<CreditAnalyticsDto | null>(null);

  // Public readonly signals
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly creditMembers = this._creditMembers.asReadonly();
  readonly currentMemberCredit = this._currentMemberCredit.asReadonly();
  readonly creditTransactions = this._creditTransactions.asReadonly();
  readonly creditAnalytics = this._creditAnalytics.asReadonly();

  // Computed properties for business logic
  readonly totalOutstandingDebt = computed(() => 
    this._creditMembers().reduce((sum, member) => sum + member.currentDebt, 0)
  );

  readonly averageCreditUtilization = computed(() => {
    const members = this._creditMembers();
    if (members.length === 0) return 0;
    return members.reduce((sum, member) => sum + member.creditUtilization, 0) / members.length;
  });

  readonly overdueMembers = computed(() => 
    this._creditMembers().filter(member => member.daysOverdue > 0)
  );

  readonly criticalRiskMembers = computed(() => 
    this._creditMembers().filter(member => member.riskLevel === 'Critical')
  );

  readonly membersByStatus = computed(() => {
    const members = this._creditMembers();
    return {
      good: members.filter(m => m.statusDescription === 'Good').length,
      warning: members.filter(m => m.statusDescription === 'Warning').length,
      bad: members.filter(m => m.statusDescription === 'Bad').length,
      blocked: members.filter(m => m.statusDescription === 'Blocked').length
    };
  });

  // ===== CORE CREDIT MANAGEMENT APIS (14 endpoints from documentation) =====

  /**
   * Grant Credit to Member
   * POST /api/MemberCredit/{id}/credit/grant
   */
  grantCredit(memberId: number, request: GrantCreditRequestDto): Observable<any> {
    this._loading.set(true);
    return this.http.post<any>(`${this.baseUrl}/MemberCredit/${memberId}/credit/grant`, request)
      .pipe(
        tap(() => this._loading.set(false)),
        catchError(this.handleError)
      );
  }

  /**
   * Record Credit Payment
   * POST /api/MemberCredit/{id}/credit/payment
   */
  recordPayment(memberId: number, request: CreditPaymentRequestDto): Observable<any> {
    this._loading.set(true);
    return this.http.post<any>(`${this.baseUrl}/MemberCredit/${memberId}/credit/payment`, request)
      .pipe(
        tap(() => this._loading.set(false)),
        catchError(this.handleError)
      );
  }

  /**
   * Get Member Credit Summary
   * GET /api/MemberCredit/{id}/credit/summary
   */
  getCreditSummary(memberId: number): Observable<MemberCreditSummaryDto> {
    this._loading.set(true);
    return this.http.get<CreditApiResponse<MemberCreditSummaryDto>>(`${this.baseUrl}/MemberCredit/${memberId}/credit/summary`)
      .pipe(
        map(res => res.data),
        tap(summary => this._currentMemberCredit.set(summary)),
        tap(() => this._loading.set(false)),
        catchError(this.handleError)
      );
  }

  /**
   * Get Credit Transaction History
   * GET /api/MemberCredit/{id}/credit/history
   */
  getCreditHistory(memberId: number): Observable<CreditTransactionDto[]> {
    return this.http.get<CreditApiResponse<CreditTransactionDto[]>>(`${this.baseUrl}/MemberCredit/${memberId}/credit/history`)
      .pipe(map(res => res.data), catchError(this.handleError));
  }

  /**
   * Get Credit Eligibility
   * GET /api/MemberCredit/{id}/credit/eligibility
   */
  getCreditEligibility(memberId: number): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/MemberCredit/${memberId}/credit/eligibility`)
      .pipe(catchError(this.handleError));
  }

  /**
   * Get Credit Score
   * GET /api/MemberCredit/{id}/credit/score
   */
  getCreditScore(memberId: number): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/MemberCredit/${memberId}/credit/score`)
      .pipe(catchError(this.handleError));
  }

  /**
   * Get Overdue Members
   * GET /api/MemberCredit/collections/overdue
   */
  getOverdueMembers(branchId?: number): Observable<OverdueMemberDto[]> {
    const params = branchId ? new HttpParams().set('branchId', branchId.toString()) : undefined;
    return this.http.get<CreditApiResponse<OverdueMemberDto[]>>(`${this.baseUrl}/MemberCredit/collections/overdue`, { params })
      .pipe(map(res => res.data), catchError(this.handleError));
  }

  /**
   * Get Members Approaching Limit
   * GET /api/MemberCredit/collections/approaching-limit
   */
  getApproachingLimitMembers(branchId?: number): Observable<ApproachingLimitMemberDto[]> {
    const params = branchId ? new HttpParams().set('branchId', branchId.toString()) : undefined;
    return this.http.get<CreditApiResponse<ApproachingLimitMemberDto[]>>(`${this.baseUrl}/MemberCredit/collections/approaching-limit`, { params })
      .pipe(map(res => res.data), catchError(this.handleError));
  }

  /**
   * Get Credit Analytics
   * GET /api/MemberCredit/analytics
   */
  getCreditAnalytics(branchId?: number, startDate?: string, endDate?: string): Observable<CreditAnalyticsDto> {
    let params = new HttpParams();
    if (branchId) params = params.set('branchId', branchId.toString());
    if (startDate) params = params.set('startDate', startDate);
    if (endDate) params = params.set('endDate', endDate);

    this._loading.set(true);
    return this.http.get<CreditApiResponse<CreditAnalyticsDto>>(`${this.baseUrl}/MemberCredit/analytics`, { params })
      .pipe(
        map(res => res.data),
        tap(analytics => this._creditAnalytics.set(analytics)),
        tap(() => this._loading.set(false)),
        catchError(this.handleError)
      );
  }

  /**
   * Update Credit Status
   * PUT /api/MemberCredit/{id}/credit/status
   */
  updateCreditStatus(memberId: number, request: UpdateCreditStatusRequestDto): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/MemberCredit/${memberId}/credit/status`, request)
      .pipe(catchError(this.handleError));
  }

  /**
   * Update Credit Limit
   * PUT /api/MemberCredit/{id}/credit/limit
   */
  updateCreditLimit(memberId: number, request: UpdateCreditLimitRequestDto): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/MemberCredit/${memberId}/credit/limit`, request)
      .pipe(catchError(this.handleError));
  }

  /**
   * Send Payment Reminder
   * POST /api/MemberCredit/{id}/reminders/send
   */
  sendPaymentReminder(memberId: number, request: SendReminderRequestDto): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/MemberCredit/${memberId}/reminders/send`, request)
      .pipe(catchError(this.handleError));
  }

  /**
   * Send Bulk Reminders
   * POST /api/MemberCredit/reminders/bulk-send
   */
  sendBulkReminders(branchId?: number): Observable<any> {
    const params = branchId ? new HttpParams().set('branchId', branchId.toString()) : undefined;
    return this.http.post<any>(`${this.baseUrl}/MemberCredit/reminders/bulk-send`, {}, { params })
      .pipe(catchError(this.handleError));
  }

  /**
   * Maintenance: Update All Statuses
   * POST /api/MemberCredit/maintenance/update-all-status
   */
  updateAllMemberStatus(): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/MemberCredit/maintenance/update-all-status`, {})
      .pipe(catchError(this.handleError));
  }


  // ===== POS INTEGRATION APIS (6 endpoints from documentation) =====

  /**
   * Validate Member Credit for POS
   * POST /api/pos/validate-member-credit
   */
  validateMemberCreditForPOS(request: CreditValidationRequestDto): Observable<CreditValidationResultDto> {
    return this.http.post<CreditApiResponse<CreditValidationResultDto>>(`${this.baseUrl}/pos/validate-member-credit`, request)
      .pipe(map(res => res.data), catchError(this.handleError));
  }

  /**
   * Create Sale with Credit
   * POST /api/pos/create-sale-with-credit
   */
  createSaleWithCredit(request: CreateSaleWithCreditDto): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/pos/create-sale-with-credit`, request)
      .pipe(catchError(this.handleError));
  }

  /**
   * Apply Credit Payment (in POS context, might differ from core payment)
   * POST /api/pos/apply-credit-payment
   */
  applyCreditPayment(request: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/pos/apply-credit-payment`, request)
      .pipe(catchError(this.handleError));
  }

  /**
   * Member Credit Lookup for POS
   * GET /api/pos/member-credit-lookup/{id}
   */
  getMemberCreditForPOS(identifier: string): Observable<POSMemberCreditDto> {
    return this.http.get<CreditApiResponse<POSMemberCreditDto>>(`${this.baseUrl}/pos/member-credit-lookup/${identifier}`)
      .pipe(map(res => res.data), catchError(this.handleError));
  }

  /**
   * Check Member Credit Eligibility for POS
   * GET /api/pos/member/{id}/credit-eligibility
   */
  getMemberCreditEligibilityForPOS(memberId: number): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/pos/member/${memberId}/credit-eligibility`)
      .pipe(catchError(this.handleError));
  }

  /**
   * Get Sale Credit Info for Receipt
   * GET /api/pos/sales/{id}/credit-info
   */
  getSaleCreditInfo(saleId: number): Observable<POSCreditInfoDto> {
    return this.http.get<CreditApiResponse<POSCreditInfoDto>>(`${this.baseUrl}/pos/sales/${saleId}/credit-info`)
      .pipe(map(res => res.data), catchError(this.handleError));
  }


  // ===== MEMBER INTEGRATION APIS (5 endpoints from documentation) =====

  /**
   * Get Member with Credit Info
   * GET /api/member/{id}/with-credit
   */
  getMemberWithCredit(memberId: number): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/member/${memberId}/with-credit`)
      .pipe(catchError(this.handleError));
  }

  /**
   * Search Members with Credit
   * GET /api/member/search-with-credit
   */
  searchMembersWithCredit(filters: MemberCreditSearchFiltersDto): Observable<MemberCreditPagedResponseDto> {
    this._loading.set(true);
    let params = new HttpParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, value.toString());
      }
    });

    return this.http.get<CreditApiResponse<MemberCreditPagedResponseDto>>(`${this.baseUrl}/member/search-with-credit`, { params })
      .pipe(
        map(res => res.data),
        tap(pagedData => this._creditMembers.set(pagedData.members)),
        tap(() => this._loading.set(false)),
        catchError(this.handleError)
      );
  }

  /**
   * Get Member Credit Status
   * GET /api/member/{id}/credit-status
   */
  getMemberCreditStatus(memberId: number): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/member/${memberId}/credit-status`)
      .pipe(catchError(this.handleError));
  }

  /**
   * Member Lookup for POS (duplicate of /api/pos/member-credit-lookup/{id})
   * GET /api/member/credit-lookup/{id}
   */
  // This seems redundant, getMemberCreditForPOS should be used.
  // getMemberCreditLookup(identifier: string): Observable<any> {
  //   return this.http.get<any>(`${this.baseUrl}/member/credit-lookup/${identifier}`)
  //     .pipe(catchError(this.handleError));
  // }

  /**
   * Update Member Stats After Credit Transaction
   * POST /api/member/{id}/update-after-credit
   */
  updateMemberAfterCredit(memberId: number): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/member/${memberId}/update-after-credit`, {})
      .pipe(catchError(this.handleError));
  }

  // ===== UTILITY METHODS =====

  /**
   * Update local credit data after transactions
   */
  private updateLocalCreditData(memberId: number, amountChange: number): void {
    this._creditMembers.update(members =>
      members.map(member => {
        if (member.memberId === memberId) {
          const newDebt = member.currentDebt + amountChange;
          const newAvailableCredit = member.creditLimit - newDebt;
          const newUtilization = (newDebt / member.creditLimit) * 100;
          
          return {
            ...member,
            currentDebt: Math.max(0, newDebt),
            availableCredit: Math.max(0, newAvailableCredit),
            creditUtilization: Math.min(100, Math.max(0, newUtilization))
          };
        }
        return member;
      })
    );

    // Update current member credit if it's the same member
    const currentCredit = this._currentMemberCredit();
    if (currentCredit && currentCredit.memberId === memberId) {
      const newDebt = currentCredit.currentDebt + amountChange;
      const newAvailableCredit = currentCredit.creditLimit - newDebt;
      const newUtilization = (newDebt / currentCredit.creditLimit) * 100;
      
      this._currentMemberCredit.set({
        ...currentCredit,
        currentDebt: Math.max(0, newDebt),
        availableCredit: Math.max(0, newAvailableCredit),
        creditUtilization: Math.min(100, Math.max(0, newUtilization))
      });
    }
  }

  /**
   * Refresh credit members data
   */
  private refreshCreditMembers(): void {
    this.searchMembersWithCredit({ page: 1, pageSize: 50 }).subscribe();
  }

  /**
   * Centralized error handler
   */
  private handleError = (error: any) => {
    this._loading.set(false);
    
    let errorMessage = 'An unexpected error occurred';
    let detailedError = '';
    
    // Extract detailed error information
    if (error.error?.message) {
      errorMessage = error.error.message;
    } else if (error.error?.errors) {
      // Handle validation errors
      const errors = Array.isArray(error.error.errors) ? error.error.errors : [error.error.errors];
      errorMessage = errors.join(', ');
    } else if (error.message) {
      errorMessage = error.message;
    } else if (error.status === 0) {
      errorMessage = 'Unable to connect to server. Please check your internet connection.';
    } else if (error.status === 400) {
      errorMessage = 'Bad request. Please check your input data.';
      detailedError = error.error?.message || error.error?.errors || JSON.stringify(error.error);
    } else if (error.status === 401) {
      errorMessage = 'Authentication required. Please log in again.';
    } else if (error.status === 403) {
      errorMessage = 'You do not have permission to perform this action.';
    } else if (error.status === 404) {
      errorMessage = 'The requested resource was not found.';
    } else if (error.status >= 400 && error.status < 500) {
      errorMessage = 'Invalid request. Please check your input and try again.';
      detailedError = error.error?.message || error.statusText;
    } else if (error.status >= 500) {
      errorMessage = 'Server error occurred. Please try again later.';
      detailedError = error.error?.message || error.statusText;
    }
    
    this._error.set(errorMessage);
    
    console.group('MemberCreditService Error Details:');
    console.error('Status:', error.status);
    console.error('Status Text:', error.statusText);
    console.error('Error Message:', errorMessage);
    console.error('Detailed Error:', detailedError);
    console.error('Full Error Object:', error);
    console.error('Request URL:', error.url);
    console.groupEnd();
    
    return throwError(() => new Error(errorMessage));
  };

  /**
   * Clear error state
   */
  clearError(): void {
    this._error.set(null);
  }

  /**
   * Reset service state
   */
  resetState(): void {
    this._loading.set(false);
    this._error.set(null);
    this._creditMembers.set([]);
    this._currentMemberCredit.set(null);
    this._creditTransactions.set([]);
    this._creditAnalytics.set(null);
  }

  /**
   * Format currency for display
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
   * Format date for API calls
   */
  formatDateForAPI(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  /**
   * Get risk level color for UI
   */
  getRiskLevelColor(riskLevel: string): string {
    switch (riskLevel) {
      case 'Low': return '#52a573'; // Green
      case 'Medium': return '#e6a855'; // Yellow
      case 'High': return '#d66b2f'; // Orange  
      case 'Critical': return '#d44a3f'; // Red
      default: return '#6c757d'; // Gray
    }
  }

  /**
   * Get credit status color for UI
   */
  getCreditStatusColor(status: string): string {
    switch (status) {
      case 'Good': return '#52a573'; // Green
      case 'Warning': return '#e6a855'; // Yellow
      case 'Bad': return '#d66b2f'; // Orange
      case 'Blocked': return '#d44a3f'; // Red
      default: return '#6c757d'; // Gray
    }
  }

  /**
   * Calculate days until payment due
   */
  calculateDaysUntilDue(dueDate: string): number {
    const due = new Date(dueDate);
    const today = new Date();
    const diffTime = due.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Validate credit transaction amount
   */
  validateCreditAmount(amount: number, availableCredit: number): { isValid: boolean; message?: string } {
    if (amount <= 0) {
      return { isValid: false, message: 'Amount must be greater than 0' };
    }
    
    if (amount > availableCredit) {
      return { isValid: false, message: `Amount exceeds available credit (${this.formatCurrency(availableCredit)})` };
    }
    
    return { isValid: true };
  }

  /**
   * Check if member can use credit
   */
  canMemberUseCredit(member: MemberCreditSummaryDto): { canUse: boolean; reason?: string } {
    if (!member.isEligibleForCredit) {
      return { canUse: false, reason: 'Member is not eligible for credit' };
    }
    
    if (member.statusDescription === 'Blocked') {
      return { canUse: false, reason: 'Member credit is blocked' };
    }
    
    if (member.availableCredit <= 0) {
      return { canUse: false, reason: 'No available credit limit' };
    }
    
    if (member.daysOverdue > 30) {
      return { canUse: false, reason: 'Member has overdue payments' };
    }
    
    return { canUse: true };
  }
}