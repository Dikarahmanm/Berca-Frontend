// src/app/shared/services/data-sync.service.ts
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { DateRangeUtil } from '../utils/date-range.util';

export interface SyncedDateRange {
  startDate: Date;
  endDate: Date;
  period: 'currentMonth' | 'last30Days' | 'currentYear' | 'custom';
}

@Injectable({
  providedIn: 'root'
})
export class DataSyncService {
  
  private currentDateRange = new BehaviorSubject<SyncedDateRange>({
    ...DateRangeUtil.getCurrentMonthRange(),
    period: 'currentMonth'
  });

  public dateRange$ = this.currentDateRange.asObservable();

  constructor() {
    console.log('🔄 DataSyncService initialized with current month range');
  }

  /**
   * Update the synchronized date range across all components
   */
  updateDateRange(dateRange: SyncedDateRange): void {
    console.log('🔄 Updating synchronized date range:', dateRange);
    this.currentDateRange.next(dateRange);
  }

  /**
   * Get current synchronized date range
   */
  getCurrentDateRange(): SyncedDateRange {
    return this.currentDateRange.value;
  }

  /**
   * Set predefined date range
   */
  setPredefinedRange(period: 'currentMonth' | 'last30Days' | 'currentYear'): void {
    let dateRange: { startDate: Date; endDate: Date };
    
    switch (period) {
      case 'currentMonth':
        dateRange = DateRangeUtil.getCurrentMonthRange();
        break;
      case 'last30Days':
        dateRange = DateRangeUtil.getLast30DaysRange();
        break;
      case 'currentYear':
        dateRange = DateRangeUtil.getCurrentYearRange();
        break;
      default:
        dateRange = DateRangeUtil.getCurrentMonthRange();
    }

    this.updateDateRange({
      ...dateRange,
      period
    });
  }

  /**
   * Check if analytics and reports are using the same date range
   */
  validateSynchronization(
    analyticsRange: { startDate: Date; endDate: Date },
    reportsRange: { startDate: Date; endDate: Date }
  ): boolean {
    const isSync = DateRangeUtil.isDateRangeEqual(analyticsRange, reportsRange);
    
    if (!isSync) {
      console.warn('⚠️ Date range mismatch detected:', {
        analytics: analyticsRange,
        reports: reportsRange
      });
    } else {
      console.log('✅ Date ranges are synchronized');
    }
    
    return isSync;
  }
}
