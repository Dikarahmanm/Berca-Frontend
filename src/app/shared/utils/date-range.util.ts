// src/app/shared/utils/date-range.util.ts
export class DateRangeUtil {
  
  /**
   * Get current month date range (first day to today)
   * This should be used consistently across Analytics and Reports
   */
  static getCurrentMonthRange(): { startDate: Date; endDate: Date } {
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth(), 1); // First day of current month
    const endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate()); // Today
    
    return { startDate, endDate };
  }

  /**
   * Get last 30 days range
   */
  static getLast30DaysRange(): { startDate: Date; endDate: Date } {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    
    return { startDate, endDate };
  }

  /**
   * Get current year range
   */
  static getCurrentYearRange(): { startDate: Date; endDate: Date } {
    const now = new Date();
    const startDate = new Date(now.getFullYear(), 0, 1); // Jan 1st
    const endDate = new Date(); // Today
    
    return { startDate, endDate };
  }

  /**
   * Format date for API consistency
   */
  static formatDateForApi(date: Date): string {
    return date.toISOString();
  }

  /**
   * Check if two date ranges are equal
   */
  static isDateRangeEqual(
    range1: { startDate: Date; endDate: Date },
    range2: { startDate: Date; endDate: Date }
  ): boolean {
    return range1.startDate.getTime() === range2.startDate.getTime() &&
           range1.endDate.getTime() === range2.endDate.getTime();
  }
}
