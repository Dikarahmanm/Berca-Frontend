// src/app/modules/membership/services/membership.service.ts
// ✅ Membership Service - Complete Backend Integration

import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError } from 'rxjs';
import { map, catchError, tap, finalize } from 'rxjs/operators';
import { environment } from '../../../../environment/environment';

// Interfaces
import {
  MemberDto,
  CreateMemberRequest,
  UpdateMemberRequest,
  MemberSearchResponse,
  MemberFilter,
  MemberPointHistoryDto,
  AddPointsRequest,
  RedeemPointsRequest,
  MemberStatsDto,
  TopMemberDto,
  TopMembersFilter,
  MemberPointsFilter
} from '../interfaces/membership.interfaces';

// API Response interfaces
interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  timestamp: Date;
  errors?: string[];
}

@Injectable({
  providedIn: 'root'
})
export class MembershipService {
  // ✅ Use relative URL for proxy routing
  private readonly baseUrl = '/api/Member';
  
  // State management
  private loadingSubject = new BehaviorSubject<boolean>(false);
  private errorSubject = new BehaviorSubject<string | null>(null);
  private membersSubject = new BehaviorSubject<MemberDto[]>([]);
  
  // Public observables
  public loading$ = this.loadingSubject.asObservable();
  public error$ = this.errorSubject.asObservable();
  public members$ = this.membersSubject.asObservable();

  constructor(private http: HttpClient) {}

  // ===== MEMBER CRUD OPERATIONS =====

  /**
   * Search members with pagination and filters
   * API: GET /api/Member
   */
  searchMembers(filter: MemberFilter): Observable<MemberSearchResponse> {
    this.setLoading(true);
    this.clearError();

    let params = new HttpParams()
      .set('page', filter.page?.toString() || '1')
      .set('pageSize', filter.pageSize?.toString() || '20');

    if (filter.search) {
      params = params.set('search', filter.search);
    }

    if (filter.isActive !== undefined) {
      params = params.set('isActive', filter.isActive.toString());
    }

    return this.http.get<ApiResponse<MemberSearchResponse>>(`${this.baseUrl}`, { params })
      .pipe(
        map(response => {
          if (response.success) {
            this.membersSubject.next(response.data.members);
            return response.data;
          } else {
            throw new Error(response.message || 'Failed to fetch members');
          }
        }),
        catchError(error => this.handleError('Error fetching members', error)),
        finalize(() => this.setLoading(false))
      );
  }

  /**
   * Get member by ID
   * API: GET /api/Member/{id}
   */
  getMemberById(id: number): Observable<MemberDto> {
    this.setLoading(true);
    this.clearError();

    return this.http.get<ApiResponse<MemberDto>>(`${this.baseUrl}/${id}`)
      .pipe(
        map(response => {
          if (response.success) {
            return response.data;
          } else {
            throw new Error(response.message || 'Failed to fetch member');
          }
        }),
        catchError(error => this.handleError('Error fetching member', error)),
        finalize(() => this.setLoading(false))
      );
  }

  /**
   * Get member by phone number
   * API: GET /api/Member/phone/{phone}
   */
  getMemberByPhone(phone: string): Observable<MemberDto> {
    this.setLoading(true);
    this.clearError();

    return this.http.get<ApiResponse<MemberDto>>(`${this.baseUrl}/phone/${encodeURIComponent(phone)}`)
      .pipe(
        map(response => {
          if (response.success) {
            return response.data;
          } else {
            throw new Error(response.message || 'Member not found');
          }
        }),
        catchError(error => this.handleError('Error fetching member by phone', error)),
        finalize(() => this.setLoading(false))
      );
  }

  /**
   * Get member by member number
   * API: GET /api/Member/number/{memberNumber}
   */
  getMemberByNumber(memberNumber: string): Observable<MemberDto> {
    this.setLoading(true);
    this.clearError();

    return this.http.get<ApiResponse<MemberDto>>(`${this.baseUrl}/number/${encodeURIComponent(memberNumber)}`)
      .pipe(
        map(response => {
          if (response.success) {
            return response.data;
          } else {
            throw new Error(response.message || 'Member not found');
          }
        }),
        catchError(error => this.handleError('Error fetching member by number', error)),
        finalize(() => this.setLoading(false))
      );
  }

  /**
   * Create new member
   * API: POST /api/Member
   */
  createMember(memberData: CreateMemberRequest): Observable<MemberDto> {
    this.setLoading(true);
    this.clearError();

    return this.http.post<ApiResponse<MemberDto>>(`${this.baseUrl}`, memberData)
      .pipe(
        map(response => {
          if (response.success) {
            // Update local members list
            const currentMembers = this.membersSubject.value;
            this.membersSubject.next([response.data, ...currentMembers]);
            return response.data;
          } else {
            throw new Error(response.message || 'Failed to create member');
          }
        }),
        catchError(error => this.handleError('Error creating member', error)),
        finalize(() => this.setLoading(false))
      );
  }

  /**
   * Update existing member
   * API: PUT /api/Member/{id}
   */
  updateMember(id: number, memberData: UpdateMemberRequest): Observable<MemberDto> {
    this.setLoading(true);
    this.clearError();

    return this.http.put<ApiResponse<MemberDto>>(`${this.baseUrl}/${id}`, memberData)
      .pipe(
        map(response => {
          if (response.success) {
            // Update local members list
            const currentMembers = this.membersSubject.value;
            const updatedMembers = currentMembers.map(member => 
              member.id === id ? response.data : member
            );
            this.membersSubject.next(updatedMembers);
            return response.data;
          } else {
            throw new Error(response.message || 'Failed to update member');
          }
        }),
        catchError(error => this.handleError('Error updating member', error)),
        finalize(() => this.setLoading(false))
      );
  }

  /**
   * Delete member
   * API: DELETE /api/Member/{id}
   */
  deleteMember(id: number): Observable<boolean> {
    this.setLoading(true);
    this.clearError();

    return this.http.delete<ApiResponse<boolean>>(`${this.baseUrl}/${id}`)
      .pipe(
        map(response => {
          if (response.success) {
            // Remove from local members list
            const currentMembers = this.membersSubject.value;
            const filteredMembers = currentMembers.filter(member => member.id !== id);
            this.membersSubject.next(filteredMembers);
            return response.data;
          } else {
            throw new Error(response.message || 'Failed to delete member');
          }
        }),
        catchError(error => this.handleError('Error deleting member', error)),
        finalize(() => this.setLoading(false))
      );
  }

  // ===== POINTS MANAGEMENT =====

  /**
   * Add points to member
   * API: POST /api/Member/{id}/points/add
   */
  addPoints(id: number, request: AddPointsRequest): Observable<boolean> {
    this.setLoading(true);
    this.clearError();

    return this.http.post<ApiResponse<boolean>>(`${this.baseUrl}/${id}/points/add`, request)
      .pipe(
        map(response => {
          if (response.success) {
            return response.data;
          } else {
            throw new Error(response.message || 'Failed to add points');
          }
        }),
        catchError(error => this.handleError('Error adding points', error)),
        finalize(() => this.setLoading(false))
      );
  }

  /**
   * Redeem points from member
   * API: POST /api/Member/{id}/points/redeem
   */
  redeemPoints(id: number, request: RedeemPointsRequest): Observable<boolean> {
    this.setLoading(true);
    this.clearError();

    return this.http.post<ApiResponse<boolean>>(`${this.baseUrl}/${id}/points/redeem`, request)
      .pipe(
        map(response => {
          if (response.success) {
            return response.data;
          } else {
            throw new Error(response.message || 'Failed to redeem points');
          }
        }),
        catchError(error => this.handleError('Error redeeming points', error)),
        finalize(() => this.setLoading(false))
      );
  }

  /**
   * Get points history for member
   * API: GET /api/Member/{id}/points/history
   */
  getPointsHistory(id: number, filter: MemberPointsFilter): Observable<MemberPointHistoryDto[]> {
    this.setLoading(true);
    this.clearError();

    let params = new HttpParams()
      .set('page', filter.page?.toString() || '1')
      .set('pageSize', filter.pageSize?.toString() || '20');

    return this.http.get<ApiResponse<MemberPointHistoryDto[]>>(`${this.baseUrl}/${id}/points/history`, { params })
      .pipe(
        map(response => {
          if (response.success) {
            return response.data;
          } else {
            throw new Error(response.message || 'Failed to fetch points history');
          }
        }),
        catchError(error => this.handleError('Error fetching points history', error)),
        finalize(() => this.setLoading(false))
      );
  }

  /**
   * Get points balance for member
   * API: GET /api/Member/{id}/points/balance
   */
  getPointsBalance(id: number): Observable<number> {
    this.setLoading(true);
    this.clearError();

    return this.http.get<ApiResponse<number>>(`${this.baseUrl}/${id}/points/balance`)
      .pipe(
        map(response => {
          if (response.success) {
            return response.data;
          } else {
            throw new Error(response.message || 'Failed to fetch points balance');
          }
        }),
        catchError(error => this.handleError('Error fetching points balance', error)),
        finalize(() => this.setLoading(false))
      );
  }

  // ===== MEMBER STATISTICS =====

  /**
   * Get member statistics
   * API: GET /api/Member/{id}/stats
   */
  getMemberStats(id: number): Observable<MemberStatsDto> {
    this.setLoading(true);
    this.clearError();

    return this.http.get<ApiResponse<MemberStatsDto>>(`${this.baseUrl}/${id}/stats`)
      .pipe(
        map(response => {
          if (response.success) {
            return response.data;
          } else {
            throw new Error(response.message || 'Failed to fetch member stats');
          }
        }),
        catchError(error => this.handleError('Error fetching member stats', error)),
        finalize(() => this.setLoading(false))
      );
  }

  /**
   * Get top members report
   * API: GET /api/Member/reports/top-members
   */
  getTopMembers(filter: TopMembersFilter): Observable<TopMemberDto[]> {
    this.setLoading(true);
    this.clearError();

    let params = new HttpParams()
      .set('count', filter.count?.toString() || '10');

    if (filter.startDate) {
      params = params.set('startDate', filter.startDate.toISOString());
    }

    if (filter.endDate) {
      params = params.set('endDate', filter.endDate.toISOString());
    }

    return this.http.get<ApiResponse<TopMemberDto[]>>(`${this.baseUrl}/reports/top-members`, { params })
      .pipe(
        map(response => {
          if (response.success) {
            return response.data;
          } else {
            throw new Error(response.message || 'Failed to fetch top members');
          }
        }),
        catchError(error => this.handleError('Error fetching top members', error)),
        finalize(() => this.setLoading(false))
      );
  }

  /**
   * Update member tier
   * API: POST /api/Member/{id}/update-tier
   */
  updateMemberTier(id: number): Observable<boolean> {
    this.setLoading(true);
    this.clearError();

    return this.http.post<ApiResponse<boolean>>(`${this.baseUrl}/${id}/update-tier`, {})
      .pipe(
        map(response => {
          if (response.success) {
            return response.data;
          } else {
            throw new Error(response.message || 'Failed to update member tier');
          }
        }),
        catchError(error => this.handleError('Error updating member tier', error)),
        finalize(() => this.setLoading(false))
      );
  }

  // ===== VALIDATION =====

  /**
   * Validate phone number
   * API: GET /api/Member/validate/phone/{phone}
   */
  validatePhone(phone: string, excludeId?: number): Observable<boolean> {
    let params = new HttpParams();
    if (excludeId) {
      params = params.set('excludeId', excludeId.toString());
    }

    return this.http.get<ApiResponse<boolean>>(`${this.baseUrl}/validate/phone/${encodeURIComponent(phone)}`, { params })
      .pipe(
        map(response => {
          if (response.success) {
            return response.data; // true means phone is available
          } else {
            return false; // phone is not available
          }
        }),
        catchError(error => {
          console.error('Phone validation error:', error);
          return throwError(() => error);
        })
      );
  }

  // ===== UTILITY METHODS =====

  private setLoading(loading: boolean): void {
    this.loadingSubject.next(loading);
  }

  private setError(error: string): void {
    this.errorSubject.next(error);
  }

  private clearError(): void {
    this.errorSubject.next(null);
  }

  private handleError(message: string, error: any): Observable<never> {
    console.error(message, error);
    let errorMessage = message;
    
    if (error?.error?.message) {
      errorMessage = error.error.message;
    } else if (error?.message) {
      errorMessage = error.message;
    }
    
    this.setError(errorMessage);
    return throwError(() => new Error(errorMessage));
  }

  // ===== POS INTEGRATION METHODS =====

  /**
   * Search members for POS integration
   * Quick search for member lookup during transactions
   */
  quickSearchMembers(searchTerm: string): Observable<MemberDto[]> {
    if (!searchTerm || searchTerm.length < 2) {
      return new Observable(observer => observer.next([]));
    }

    const filter: MemberFilter = {
      search: searchTerm,
      isActive: true,
      page: 1,
      pageSize: 10
    };

    return this.searchMembers(filter).pipe(
      map(response => response.members)
    );
  }

  /**
   * Get member for POS transaction
   * Used when scanning member card or entering member info in POS
   */
  getMemberForPOS(identifier: string): Observable<MemberDto | null> {
    // Try to determine if identifier is phone, member number, or ID
    if (!identifier) {
      return new Observable(observer => observer.next(null));
    }

    // If identifier is numeric and short, treat as member ID
    if (/^\d+$/.test(identifier) && identifier.length <= 10) {
      const id = parseInt(identifier, 10);
      return this.getMemberById(id).pipe(
        catchError(() => new Observable<MemberDto | null>(observer => {
          observer.next(null);
          observer.complete();
        }))
      );
    }

    // If identifier looks like phone number
    if (/^[\+]?[0-9\-\s\(\)]+$/.test(identifier)) {
      return this.getMemberByPhone(identifier).pipe(
        catchError(() => new Observable<MemberDto | null>(observer => {
          observer.next(null);
          observer.complete();
        }))
      );
    }

    // Otherwise treat as member number
    return this.getMemberByNumber(identifier).pipe(
      catchError(() => new Observable<MemberDto | null>(observer => {
        observer.next(null);
        observer.complete();
      }))
    );
  }

  /**
   * Add transaction points to member (called from POS)
   */
  addTransactionPoints(memberId: number, saleId: number, points: number): Observable<boolean> {
    const request: AddPointsRequest = {
      points: points,
      description: `Points earned from transaction`,
      saleId: saleId,
      referenceNumber: `TXN-${saleId}-${Date.now()}`
    };

    return this.addPoints(memberId, request);
  }

  /**
   * Process complete transaction for member (points + spending update)
   * API: POST /api/Member/{id}/transaction
   */
  processTransaction(memberId: number, transactionData: {
    saleId: number;
    amount: number;
    points: number;
    description?: string;
  }): Observable<boolean> {
    this.setLoading(true);
    this.clearError();

    const request = {
      saleId: transactionData.saleId,
      amount: transactionData.amount,
      pointsEarned: transactionData.points,
      description: transactionData.description || `Transaction ${transactionData.saleId}`,
      referenceNumber: `TXN-${transactionData.saleId}-${Date.now()}`
    };

    return this.http.post<ApiResponse<boolean>>(`${this.baseUrl}/${memberId}/transaction`, request)
      .pipe(
        map(response => {
          if (response.success) {
            return response.data;
          } else {
            throw new Error(response.message || 'Failed to process transaction');
          }
        }),
        catchError(error => {
          // Fallback: try to add points and log warning about total spent
          console.warn('Transaction endpoint failed, falling back to points-only:', error);
          return this.addTransactionPoints(memberId, transactionData.saleId, transactionData.points);
        }),
        finalize(() => this.setLoading(false))
      );
  }

  /**
   * Manual transaction processing (fallback when backend doesn't have transaction endpoint)
   * This method simulates transaction processing by adding points and updating member data
   */
  processTransactionManually(memberId: number, transactionData: {
    saleId: number;
    amount: number;
    points: number;
    description?: string;
  }): Observable<boolean> {
    this.setLoading(true);
    this.clearError();

    // First, add the points
    const pointsRequest: AddPointsRequest = {
      points: transactionData.points,
      description: transactionData.description || `Transaction ${transactionData.saleId}`,
      saleId: transactionData.saleId,
      referenceNumber: `TXN-${transactionData.saleId}-${Date.now()}`
    };

    return this.addPoints(memberId, pointsRequest).pipe(
      tap(() => {
        // Log the transaction details for debugging
        console.log(`📊 Manual transaction processed for member ${memberId}:`);
        console.log(`  - Sale ID: ${transactionData.saleId}`);
        console.log(`  - Amount: ${transactionData.amount}`);
        console.log(`  - Points: ${transactionData.points}`);
        console.log('⚠️ Note: Total spent may not be updated on backend without proper transaction endpoint');
      }),
      finalize(() => this.setLoading(false))
    );
  }

  // ===== UTILITY METHODS =====

  /**
   * Get member tier information with colors and icons
   */
  getMemberTierInfo(tier: string): { color: string; icon: string; name: string } {
    const tierMap: Record<string, { color: string; icon: string; name: string }> = {
      'Bronze': { color: '#CD7F32', icon: 'emoji_events', name: 'Bronze' },
      'Silver': { color: '#C0C0C0', icon: 'workspace_premium', name: 'Silver' },
      'Gold': { color: '#FFD700', icon: 'star', name: 'Gold' },
      'Platinum': { color: '#E5E4E2', icon: 'diamond', name: 'Platinum' },
      'Diamond': { color: '#B9F2FF', icon: 'auto_awesome', name: 'Diamond' }
    };
    
    return tierMap[tier] || { color: '#9E9E9E', icon: 'person', name: 'Standard' };
  }

  /**
   * Calculate tier progress for a member
   */
  calculateTierProgress(totalSpent: number, currentTier: string): { percentage: number; nextTier: string; pointsNeeded: number } {
    const tierThresholds = {
      'Bronze': 0,
      'Silver': 500000,
      'Gold': 1500000,
      'Platinum': 5000000,
      'Diamond': 10000000
    };

    const tiers = Object.keys(tierThresholds);
    const currentIndex = tiers.indexOf(currentTier);
    
    if (currentIndex === -1 || currentIndex === tiers.length - 1) {
      return { percentage: 100, nextTier: 'Max Tier', pointsNeeded: 0 };
    }

    const nextTier = tiers[currentIndex + 1];
    const currentThreshold = tierThresholds[currentTier as keyof typeof tierThresholds];
    const nextThreshold = tierThresholds[nextTier as keyof typeof tierThresholds];
    
    const progress = totalSpent - currentThreshold;
    const required = nextThreshold - currentThreshold;
    const percentage = Math.min((progress / required) * 100, 100);
    const pointsNeeded = Math.max(nextThreshold - totalSpent, 0);

    return { percentage, nextTier, pointsNeeded };
  }
}
