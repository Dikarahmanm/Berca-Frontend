// src/app/modules/inventory-transfer/services/transfer.service.ts
// Service for Inter-Branch Inventory Transfer Operations

import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom, Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

import { 
  TransferRequestDto, 
  CreateTransferRequestDto, 
  UpdateTransferStatusDto,
  TransferSummaryDto,
  BranchStockComparisonDto,
  TransferFilterDto,
  TransferActivityDto,
  TransferRecommendationDto
} from '../interfaces/transfer.interfaces';

import { ApiResponse } from '../../../core/models/api-response.model';
import { StateService } from '../../../core/services/state.service';
import { NotificationService } from '../../../core/services/notification.service';

@Injectable({
  providedIn: 'root'
})
export class TransferService {
  private readonly http = inject(HttpClient);
  private readonly stateService = inject(StateService);
  private readonly notificationService = inject(NotificationService);
  private readonly baseUrl = `${environment.apiUrl}/Transfer`;

  // Signal-based state management
  private _transfers = signal<TransferRequestDto[]>([]);
  private _currentTransfer = signal<TransferRequestDto | null>(null);
  private _transferSummary = signal<TransferSummaryDto | null>(null);
  private _branchComparisons = signal<BranchStockComparisonDto[]>([]);
  private _recommendations = signal<TransferRecommendationDto[]>([]);
  private _loading = signal<boolean>(false);
  private _error = signal<string | null>(null);

  // Public readonly signals
  readonly transfers = this._transfers.asReadonly();
  readonly currentTransfer = this._currentTransfer.asReadonly();
  readonly transferSummary = this._transferSummary.asReadonly();
  readonly branchComparisons = this._branchComparisons.asReadonly();
  readonly recommendations = this._recommendations.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();

  // Computed properties
  readonly pendingTransfers = computed(() => 
    this._transfers().filter(t => ['Requested', 'PendingApproval'].includes(t.status))
  );

  readonly activeTransfers = computed(() => 
    this._transfers().filter(t => ['Approved', 'InPreparation', 'InTransit', 'Delivered'].includes(t.status))
  );

  readonly completedTransfers = computed(() => 
    this._transfers().filter(t => ['Completed', 'Cancelled', 'Rejected'].includes(t.status))
  );

  readonly myTransfers = computed(() => {
    const user = this.stateService.user();
    return this._transfers().filter(t => t.requestedBy === user?.id);
  });

  readonly transfersByBranch = computed(() => {
    const transfers = this._transfers();
    const grouped = new Map<string, TransferRequestDto[]>();
    
    transfers.forEach(transfer => {
      const key = `${transfer.sourceBranchId}-${transfer.targetBranchId}`;
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(transfer);
    });
    
    return grouped;
  });

  // CRUD Operations
  async getTransfers(filter?: TransferFilterDto): Promise<ApiResponse<TransferRequestDto[]>> {
    this._loading.set(true);
    this._error.set(null);

    try {
      let params = new HttpParams();
      
      if (filter) {
        if (filter.branchIds?.length) {
          params = params.set('branchIds', filter.branchIds.join(','));
        }
        if (filter.status?.length) {
          params = params.set('status', filter.status.join(','));
        }
        if (filter.priority?.length) {
          params = params.set('priority', filter.priority.join(','));
        }
        if (filter.startDate) {
          params = params.set('startDate', filter.startDate);
        }
        if (filter.endDate) {
          params = params.set('endDate', filter.endDate);
        }
        if (filter.search) {
          params = params.set('search', filter.search);
        }
        if (filter.page) {
          params = params.set('page', filter.page.toString());
        }
        if (filter.pageSize) {
          params = params.set('pageSize', filter.pageSize.toString());
        }
        if (filter.sortBy) {
          params = params.set('sortBy', filter.sortBy);
        }
        if (filter.sortDirection) {
          params = params.set('sortDirection', filter.sortDirection);
        }
      }

      const response = await firstValueFrom(
        this.http.get<ApiResponse<TransferRequestDto[]>>(`${this.baseUrl}`, { params })
      );

      if (response.success) {
        this._transfers.set(response.data);
        return response;
      } else {
        this._error.set(response.message || 'Failed to load transfers');
        return response;
      }
    } catch (error: any) {
      const errorMessage = 'Network error occurred while loading transfers';
      this._error.set(errorMessage);
      console.error('Error loading transfers:', error);
      return { 
        success: false, 
        data: [], 
        message: errorMessage 
      };
    } finally {
      this._loading.set(false);
    }
  }

  async getTransferById(id: number): Promise<ApiResponse<TransferRequestDto>> {
    this._loading.set(true);
    
    try {
      const response = await firstValueFrom(
        this.http.get<ApiResponse<TransferRequestDto>>(`${this.baseUrl}/${id}`)
      );

      if (response.success) {
        this._currentTransfer.set(response.data);
        return response;
      } else {
        this._error.set(response.message || 'Failed to load transfer details');
        return response;
      }
    } catch (error: any) {
      const errorMessage = 'Network error occurred while loading transfer details';
      this._error.set(errorMessage);
      console.error('Error loading transfer details:', error);
      return { 
        success: false, 
        data: {} as TransferRequestDto, 
        message: errorMessage 
      };
    } finally {
      this._loading.set(false);
    }
  }

  async createTransfer(transfer: CreateTransferRequestDto): Promise<ApiResponse<TransferRequestDto>> {
    this._loading.set(true);

    try {
      const response = await firstValueFrom(
        this.http.post<ApiResponse<TransferRequestDto>>(`${this.baseUrl}`, transfer)
      );

      if (response.success) {
        // Update local state
        this._transfers.update(transfers => [response.data, ...transfers]);
        
        // Show success notification
        this.notificationService.showSuccess('Transfer request created successfully');
        
        return response;
      } else {
        this._error.set(response.message || 'Failed to create transfer request');
        return response;
      }
    } catch (error: any) {
      const errorMessage = 'Network error occurred while creating transfer request';
      this._error.set(errorMessage);
      console.error('Error creating transfer:', error);
      return { 
        success: false, 
        data: {} as TransferRequestDto, 
        message: errorMessage 
      };
    } finally {
      this._loading.set(false);
    }
  }

  async updateTransferStatus(id: number, updateData: UpdateTransferStatusDto): Promise<ApiResponse<TransferRequestDto>> {
    this._loading.set(true);

    try {
      const response = await firstValueFrom(
        this.http.patch<ApiResponse<TransferRequestDto>>(`${this.baseUrl}/${id}/status`, updateData)
      );

      if (response.success) {
        // Update local state
        this._transfers.update(transfers => 
          transfers.map(t => t.id === id ? response.data : t)
        );
        
        if (this._currentTransfer()?.id === id) {
          this._currentTransfer.set(response.data);
        }

        // Show success notification
        this.notificationService.showSuccess(`Transfer status updated to ${response.data.status}`);
        
        return response;
      } else {
        this._error.set(response.message || 'Failed to update transfer status');
        return response;
      }
    } catch (error: any) {
      const errorMessage = 'Network error occurred while updating transfer status';
      this._error.set(errorMessage);
      console.error('Error updating transfer status:', error);
      return { 
        success: false, 
        data: {} as TransferRequestDto, 
        message: errorMessage 
      };
    } finally {
      this._loading.set(false);
    }
  }

  async deleteTransfer(id: number): Promise<ApiResponse<boolean>> {
    try {
      const response = await firstValueFrom(
        this.http.delete<ApiResponse<boolean>>(`${this.baseUrl}/${id}`)
      );

      if (response.success) {
        // Update local state
        this._transfers.update(transfers => 
          transfers.filter(t => t.id !== id)
        );

        if (this._currentTransfer()?.id === id) {
          this._currentTransfer.set(null);
        }

        this.notificationService.showSuccess('Transfer request deleted successfully');
        return response;
      } else {
        this._error.set(response.message || 'Failed to delete transfer request');
        return response;
      }
    } catch (error: any) {
      const errorMessage = 'Network error occurred while deleting transfer request';
      this._error.set(errorMessage);
      console.error('Error deleting transfer:', error);
      return { 
        success: false, 
        data: false, 
        message: errorMessage 
      };
    }
  }

  // Analytics and Summary Operations
  async getTransferSummary(branchIds?: number[]): Promise<ApiResponse<TransferSummaryDto>> {
    try {
      let params = new HttpParams();
      if (branchIds?.length) {
        params = params.set('branchIds', branchIds.join(','));
      }

      const response = await firstValueFrom(
        this.http.get<ApiResponse<TransferSummaryDto>>(`${this.baseUrl}/summary`, { params })
      );

      if (response.success) {
        this._transferSummary.set(response.data);
        return response;
      } else {
        this._error.set(response.message || 'Failed to load transfer summary');
        return response;
      }
    } catch (error: any) {
      const errorMessage = 'Network error occurred while loading transfer summary';
      this._error.set(errorMessage);
      console.error('Error loading transfer summary:', error);
      return { 
        success: false, 
        data: {} as TransferSummaryDto, 
        message: errorMessage 
      };
    }
  }

  async getBranchStockComparison(productIds?: number[]): Promise<ApiResponse<BranchStockComparisonDto[]>> {
    try {
      let params = new HttpParams();
      if (productIds?.length) {
        params = params.set('productIds', productIds.join(','));
      }

      const response = await firstValueFrom(
        this.http.get<ApiResponse<BranchStockComparisonDto[]>>(`${this.baseUrl}/branch-comparison`, { params })
      );

      if (response.success) {
        this._branchComparisons.set(response.data);
        return response;
      } else {
        this._error.set(response.message || 'Failed to load branch stock comparison');
        return response;
      }
    } catch (error: any) {
      const errorMessage = 'Network error occurred while loading branch comparison';
      this._error.set(errorMessage);
      console.error('Error loading branch comparison:', error);
      return { 
        success: false, 
        data: [], 
        message: errorMessage 
      };
    }
  }

  async getTransferRecommendations(branchIds?: number[]): Promise<ApiResponse<TransferRecommendationDto[]>> {
    try {
      let params = new HttpParams();
      if (branchIds?.length) {
        params = params.set('branchIds', branchIds.join(','));
      }

      const response = await firstValueFrom(
        this.http.get<ApiResponse<TransferRecommendationDto[]>>(`${this.baseUrl}/recommendations`, { params })
      );

      if (response.success) {
        this._recommendations.set(response.data);
        return response;
      } else {
        this._error.set(response.message || 'Failed to load transfer recommendations');
        return response;
      }
    } catch (error: any) {
      const errorMessage = 'Network error occurred while loading recommendations';
      this._error.set(errorMessage);
      console.error('Error loading recommendations:', error);
      return { 
        success: false, 
        data: [], 
        message: errorMessage 
      };
    }
  }

  // Utility methods
  clearError(): void {
    this._error.set(null);
  }

  clearCurrentTransfer(): void {
    this._currentTransfer.set(null);
  }

  refreshTransfers(): void {
    this.getTransfers();
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  }

  formatDateTime(dateString: string): string {
    if (!dateString) return '-';
    
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('id-ID', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  }

  getStatusColor(status: string): string {
    const statusColors: Record<string, string> = {
      'Draft': '#6B7280',
      'Requested': '#3B82F6',
      'PendingApproval': '#F59E0B',
      'Approved': '#10B981',
      'Rejected': '#EF4444',
      'InPreparation': '#8B5CF6',
      'InTransit': '#06B6D4',
      'Delivered': '#84CC16',
      'Received': '#22C55E',
      'Completed': '#059669',
      'Cancelled': '#6B7280',
      'PartiallyReceived': '#F97316'
    };
    return statusColors[status] || '#6B7280';
  }

  getPriorityColor(priority: string): string {
    const priorityColors: Record<string, string> = {
      'Low': '#10B981',
      'Medium': '#F59E0B',
      'High': '#F97316',
      'Critical': '#EF4444'
    };
    return priorityColors[priority] || '#6B7280';
  }
}