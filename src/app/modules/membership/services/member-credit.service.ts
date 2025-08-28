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
      good: members.filter(m => m.creditStatus === 'Good').length,
      warning: members.filter(m => m.creditStatus === 'Warning').length,
      bad: members.filter(m => m.creditStatus === 'Bad').length,
      blocked: members.filter(m => m.creditStatus === 'Blocked').length
    };
  });

  // ===== CORE CREDIT MANAGEMENT APIS (5 endpoints) =====

  /**
   * API 1: Get Member Credit Summary
   * GET /api/Member/{memberId}/credit/summary
   */
  getCreditSummary(memberId: number): Observable<MemberCreditSummaryDto> {
    this._loading.set(true);
    this._error.set(null);

    return this.http.get<CreditApiResponse<MemberCreditSummaryDto>>(
      `${this.baseUrl}/Member/${memberId}/credit/summary`
    ).pipe(
      map(response => {
        if (response.success) {
          this._currentMemberCredit.set(response.data);
          return response.data;
        }
        throw new Error(response.message || 'Failed to get credit summary');
      }),
      tap(() => this._loading.set(false)),
      catchError(error => {
        this._error.set(error.message || 'Network error occurred');
        this._loading.set(false);
        return throwError(() => error);
      }),
      retry(2)
    );
  }

  /**
   * API 2: Get Credit Eligibility
   * GET /api/Member/{memberId}/credit/eligibility
   */
  getCreditEligibility(memberId: number): Observable<CreditEligibilityDto> {
    return this.http.get<CreditApiResponse<CreditEligibilityDto>>(
      `${this.baseUrl}/Member/${memberId}/credit/eligibility`
    ).pipe(
      map(response => {
        if (response.success) return response.data;
        throw new Error(response.message || 'Failed to check eligibility');
      }),
      catchError(this.handleError)
    );
  }

  /**
   * API 3: Grant Credit to Member
   * POST /api/Member/credit/grant
   */
  grantCredit(request: GrantCreditRequestDto): Observable<boolean> {
    this._loading.set(true);
    
    return this.http.post<CreditApiResponse<boolean>>(
      `${this.baseUrl}/Member/credit/grant`,
      request
    ).pipe(
      map(response => {
        if (response.success) {
          // Refresh member credit data
          this.refreshCreditMembers();
          return response.data;
        }
        throw new Error(response.message || 'Failed to grant credit');
      }),
      tap(() => this._loading.set(false)),
      catchError(this.handleError)
    );
  }

  /**
   * API 4: Record Credit Payment
   * POST /api/Member/credit/payment
   */
  recordPayment(request: CreditPaymentRequestDto): Observable<CreditTransactionDto> {
    this._loading.set(true);
    
    return this.http.post<CreditTransactionResponse>(
      `${this.baseUrl}/Member/credit/payment`,
      request
    ).pipe(
      map(response => {
        if (response.success) {
          // Update local credit data
          this.updateLocalCreditData(request.memberId, -request.amount);
          
          // Add to transactions history
          this._creditTransactions.update(transactions => 
            [response.data, ...transactions]
          );
          
          return response.data;
        }
        throw new Error(response.message || 'Failed to record payment');
      }),
      tap(() => this._loading.set(false)),
      catchError(this.handleError)
    );
  }

  /**
   * API 5: Update Credit Status
   * PUT /api/Member/credit/status
   */
  updateCreditStatus(request: UpdateCreditStatusRequestDto): Observable<boolean> {
    this._loading.set(true);
    
    return this.http.put<CreditApiResponse<boolean>>(
      `${this.baseUrl}/Member/credit/status`,
      request
    ).pipe(
      map(response => {
        if (response.success) {
          // Update local member credit status
          this._creditMembers.update(members => 
            members.map(member => 
              member.memberId === request.memberId 
                ? { ...member, creditStatus: request.newStatus }
                : member
            )
          );
          return response.data;
        }
        throw new Error(response.message || 'Failed to update status');
      }),
      tap(() => this._loading.set(false)),
      catchError(this.handleError)
    );
  }

  // ===== POS INTEGRATION APIS (6 endpoints) =====

  /**
   * API 6: Get Member for POS
   * GET /api/POS/member/{memberId}/credit
   */
  getPOSMemberCredit(memberId: number): Observable<POSMemberCreditDto> {
    return this.http.get<CreditApiResponse<POSMemberCreditDto>>(
      `${this.baseUrl}/POS/member/${memberId}/credit`
    ).pipe(
      map(response => {
        if (response.success) return response.data;
        throw new Error(response.message || 'Member not found for POS');
      }),
      catchError(this.handleError)
    );
  }

  /**
   * API 7: Search Member by Phone for POS
   * GET /api/POS/member/search?phone={phone}
   */
  searchPOSMemberByPhone(phone: string): Observable<POSMemberCreditDto[]> {
    const params = new HttpParams().set('phone', phone);
    
    return this.http.get<CreditApiResponse<POSMemberCreditDto[]>>(
      `${this.baseUrl}/POS/member/search`,
      { params }
    ).pipe(
      map(response => {
        if (response.success) return response.data;
        throw new Error(response.message || 'No members found');
      }),
      catchError(this.handleError)
    );
  }

  /**
   * API 8: Validate Credit Transaction
   * POST /api/POS/credit/validate
   */
  validateCreditTransaction(request: CreditValidationRequestDto): Observable<CreditValidationResultDto> {
    return this.http.post<CreditValidationResponse>(
      `${this.baseUrl}/POS/credit/validate`,
      request
    ).pipe(
      map(response => {
        if (response.success) return response.data;
        throw new Error(response.message || 'Validation failed');
      }),
      catchError(this.handleError)
    );
  }

  /**
   * API 9: Create Sale with Credit
   * POST /api/POS/sale/credit
   */
  createSaleWithCredit(request: CreateSaleWithCreditDto): Observable<POSCreditInfoDto> {
    this._loading.set(true);
    
    return this.http.post<CreditApiResponse<POSCreditInfoDto>>(
      `${this.baseUrl}/POS/sale/credit`,
      request
    ).pipe(
      map(response => {
        if (response.success) {
          // Update local member credit after sale
          this.updateLocalCreditData(request.memberId, request.creditAmount);
          return response.data;
        }
        throw new Error(response.message || 'Failed to process credit sale');
      }),
      tap(() => this._loading.set(false)),
      catchError(this.handleError)
    );
  }

  /**
   * API 10: Get Sale Credit Info
   * GET /api/POS/sale/{saleId}/credit
   */
  getSaleCreditInfo(saleId: number): Observable<POSCreditInfoDto> {
    return this.http.get<CreditApiResponse<POSCreditInfoDto>>(
      `${this.baseUrl}/POS/sale/${saleId}/credit`
    ).pipe(
      map(response => {
        if (response.success) return response.data;
        throw new Error(response.message || 'Sale credit info not found');
      }),
      catchError(this.handleError)
    );
  }

  /**
   * API 11: Cancel Credit Sale
   * POST /api/POS/sale/{saleId}/credit/cancel
   */
  cancelCreditSale(saleId: number, reason: string): Observable<boolean> {
    this._loading.set(true);
    
    return this.http.post<CreditApiResponse<boolean>>(
      `${this.baseUrl}/POS/sale/${saleId}/credit/cancel`,
      { reason }
    ).pipe(
      map(response => {
        if (response.success) return response.data;
        throw new Error(response.message || 'Failed to cancel credit sale');
      }),
      tap(() => this._loading.set(false)),
      catchError(this.handleError)
    );
  }

  // ===== MEMBER INTEGRATION APIS (5 endpoints) =====

  /**
   * API 12: Search Credit Members
   * GET /api/Member/credit/search
   */
  searchCreditMembers(filters: MemberCreditSearchFiltersDto): Observable<MemberCreditPagedResponseDto> {
    this._loading.set(true);
    
    let params = new HttpParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, value.toString());
      }
    });

    return this.http.get<CreditApiResponse<MemberCreditPagedResponseDto>>(
      `${this.baseUrl}/Member/credit/search`,
      { params }
    ).pipe(
      map(response => {
        if (response.success) {
          this._creditMembers.set(response.data.members);
          return response.data;
        }
        throw new Error(response.message || 'Failed to search credit members');
      }),
      tap(() => this._loading.set(false)),
      catchError(this.handleError)
    );
  }

  /**
   * API 13: Get Credit Transaction History
   * GET /api/Member/{memberId}/credit/transactions
   */
  getCreditTransactionHistory(
    memberId: number,
    page?: number,
    pageSize?: number,
    startDate?: string,
    endDate?: string
  ): Observable<CreditTransactionDto[]> {
    let params = new HttpParams();
    if (page) params = params.set('page', page.toString());
    if (pageSize) params = params.set('pageSize', pageSize.toString());
    if (startDate) params = params.set('startDate', startDate);
    if (endDate) params = params.set('endDate', endDate);

    return this.http.get<CreditApiResponse<CreditTransactionDto[]>>(
      `${this.baseUrl}/Member/${memberId}/credit/transactions`,
      { params }
    ).pipe(
      map(response => {
        if (response.success) {
          this._creditTransactions.set(response.data);
          return response.data;
        }
        throw new Error(response.message || 'Failed to get transaction history');
      }),
      catchError(this.handleError)
    );
  }

  /**
   * API 14: Update Credit Limit
   * PUT /api/Member/credit/limit
   */
  updateCreditLimit(request: UpdateCreditLimitRequestDto): Observable<boolean> {
    this._loading.set(true);
    
    return this.http.put<CreditApiResponse<boolean>>(
      `${this.baseUrl}/Member/credit/limit`,
      request
    ).pipe(
      map(response => {
        if (response.success) {
          // Update local member credit limit
          this._creditMembers.update(members => 
            members.map(member => 
              member.memberId === request.memberId 
                ? { ...member, creditLimit: request.newLimit }
                : member
            )
          );
          return response.data;
        }
        throw new Error(response.message || 'Failed to update credit limit');
      }),
      tap(() => this._loading.set(false)),
      catchError(this.handleError)
    );
  }

  /**
   * API 15: Get Overdue Members
   * GET /api/Member/credit/overdue
   */
  getOverdueMembers(branchId?: number): Observable<OverdueMemberDto[]> {
    let params = new HttpParams();
    if (branchId) params = params.set('branchId', branchId.toString());

    return this.http.get<CreditApiResponse<OverdueMemberDto[]>>(
      `${this.baseUrl}/Member/credit/overdue`,
      { params }
    ).pipe(
      map(response => {
        if (response.success) return response.data;
        throw new Error(response.message || 'Failed to get overdue members');
      }),
      catchError(this.handleError)
    );
  }

  /**
   * API 16: Send Payment Reminder
   * POST /api/Member/credit/reminder
   */
  sendPaymentReminder(request: SendReminderRequestDto): Observable<boolean> {
    return this.http.post<CreditApiResponse<boolean>>(
      `${this.baseUrl}/Member/credit/reminder`,
      request
    ).pipe(
      map(response => {
        if (response.success) return response.data;
        throw new Error(response.message || 'Failed to send reminder');
      }),
      catchError(this.handleError)
    );
  }

  // ===== ANALYTICS & REPORTING APIS (9 endpoints) =====

  /**
   * API 17: Get Credit Analytics Dashboard
   * GET /api/Analytics/credit/dashboard
   */
  getCreditAnalytics(branchId?: number, startDate?: string, endDate?: string): Observable<CreditAnalyticsDto> {
    this._loading.set(true);
    
    let params = new HttpParams();
    if (branchId) params = params.set('branchId', branchId.toString());
    if (startDate) params = params.set('startDate', startDate);
    if (endDate) params = params.set('endDate', endDate);

    return this.http.get<CreditApiResponse<CreditAnalyticsDto>>(
      `${this.baseUrl}/Analytics/credit/dashboard`,
      { params }
    ).pipe(
      map(response => {
        if (response.success) {
          this._creditAnalytics.set(response.data);
          return response.data;
        }
        throw new Error(response.message || 'Failed to get credit analytics');
      }),
      tap(() => this._loading.set(false)),
      catchError(this.handleError)
    );
  }

  /**
   * API 18: Get Members Approaching Credit Limit
   * GET /api/Analytics/credit/approaching-limit
   */
  getApproachingLimitMembers(threshold?: number, branchId?: number): Observable<ApproachingLimitMemberDto[]> {
    let params = new HttpParams();
    if (threshold) params = params.set('threshold', threshold.toString());
    if (branchId) params = params.set('branchId', branchId.toString());

    return this.http.get<CreditApiResponse<ApproachingLimitMemberDto[]>>(
      `${this.baseUrl}/Analytics/credit/approaching-limit`,
      { params }
    ).pipe(
      map(response => {
        if (response.success) return response.data;
        throw new Error(response.message || 'Failed to get approaching limit members');
      }),
      catchError(this.handleError)
    );
  }

  /**
   * API 19: Get Branch Credit Comparison
   * GET /api/Analytics/credit/branch-comparison
   */
  getBranchCreditComparison(startDate?: string, endDate?: string): Observable<BranchCreditComparisonDto[]> {
    let params = new HttpParams();
    if (startDate) params = params.set('startDate', startDate);
    if (endDate) params = params.set('endDate', endDate);

    return this.http.get<CreditApiResponse<BranchCreditComparisonDto[]>>(
      `${this.baseUrl}/Analytics/credit/branch-comparison`,
      { params }
    ).pipe(
      map(response => {
        if (response.success) return response.data;
        throw new Error(response.message || 'Failed to get branch comparison');
      }),
      catchError(this.handleError)
    );
  }

  /**
   * API 20: Export Credit Report
   * GET /api/Analytics/credit/export
   */
  exportCreditReport(
    format: 'csv' | 'excel' | 'pdf',
    filters?: MemberCreditSearchFiltersDto
  ): Observable<Blob> {
    let params = new HttpParams().set('format', format);
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params = params.set(key, value.toString());
        }
      });
    }

    return this.http.get(`${this.baseUrl}/Analytics/credit/export`, {
      params,
      responseType: 'blob'
    }).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * API 21: Get Credit Risk Assessment
   * GET /api/Analytics/credit/risk-assessment/{memberId}
   */
  getCreditRiskAssessment(memberId: number): Observable<CreditCalculationResult> {
    return this.http.get<CreditApiResponse<CreditCalculationResult>>(
      `${this.baseUrl}/Analytics/credit/risk-assessment/${memberId}`
    ).pipe(
      map(response => {
        if (response.success) return response.data;
        throw new Error(response.message || 'Failed to get risk assessment');
      }),
      catchError(this.handleError)
    );
  }

  /**
   * API 22: Bulk Update Credit Status
   * POST /api/Member/credit/bulk-update
   */
  bulkUpdateCreditStatus(action: BulkCreditAction): Observable<boolean> {
    this._loading.set(true);
    
    return this.http.post<CreditApiResponse<boolean>>(
      `${this.baseUrl}/Member/credit/bulk-update`,
      action
    ).pipe(
      map(response => {
        if (response.success) {
          // Refresh credit members data after bulk update
          this.refreshCreditMembers();
          return response.data;
        }
        throw new Error(response.message || 'Failed to perform bulk update');
      }),
      tap(() => this._loading.set(false)),
      catchError(this.handleError)
    );
  }

  /**
   * API 23: Get Credit Statistics
   * GET /api/Analytics/credit/statistics
   */
  getCreditStatistics(branchId?: number): Observable<any> {
    let params = new HttpParams();
    if (branchId) params = params.set('branchId', branchId.toString());

    return this.http.get<CreditApiResponse<any>>(
      `${this.baseUrl}/Analytics/credit/statistics`,
      { params }
    ).pipe(
      map(response => {
        if (response.success) return response.data;
        throw new Error(response.message || 'Failed to get credit statistics');
      }),
      catchError(this.handleError)
    );
  }

  /**
   * API 24: Calculate Credit Score
   * POST /api/Analytics/credit/calculate-score
   */
  calculateCreditScore(memberId: number, additionalData?: any): Observable<number> {
    return this.http.post<CreditApiResponse<number>>(
      `${this.baseUrl}/Analytics/credit/calculate-score`,
      { memberId, ...additionalData }
    ).pipe(
      map(response => {
        if (response.success) return response.data;
        throw new Error(response.message || 'Failed to calculate credit score');
      }),
      catchError(this.handleError)
    );
  }

  /**
   * API 25: Get Payment Due Notifications
   * GET /api/Member/credit/payment-due-notifications
   */
  getPaymentDueNotifications(branchId?: number, days?: number): Observable<any[]> {
    let params = new HttpParams();
    if (branchId) params = params.set('branchId', branchId.toString());
    if (days) params = params.set('days', days.toString());

    return this.http.get<CreditApiResponse<any[]>>(
      `${this.baseUrl}/Member/credit/payment-due-notifications`,
      { params }
    ).pipe(
      map(response => {
        if (response.success) return response.data;
        throw new Error(response.message || 'Failed to get payment due notifications');
      }),
      catchError(this.handleError)
    );
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
    this.searchCreditMembers({ page: 1, pageSize: 50 }).subscribe();
  }

  /**
   * Centralized error handler
   */
  private handleError = (error: any) => {
    this._loading.set(false);
    
    let errorMessage = 'An unexpected error occurred';
    
    if (error.error?.message) {
      errorMessage = error.error.message;
    } else if (error.message) {
      errorMessage = error.message;
    } else if (error.status === 0) {
      errorMessage = 'Unable to connect to server';
    } else if (error.status >= 400 && error.status < 500) {
      errorMessage = 'Invalid request or authorization failed';
    } else if (error.status >= 500) {
      errorMessage = 'Server error occurred';
    }
    
    this._error.set(errorMessage);
    console.error('MemberCreditService Error:', error);
    
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
    
    if (member.creditStatus === 'Blocked') {
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