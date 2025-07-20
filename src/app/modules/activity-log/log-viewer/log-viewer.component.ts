import { Component, OnInit } from '@angular/core';
import { LogService, LogActivity } from '../services/log.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-log-viewer',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './log-viewer.component.html',
  styleUrls: ['./log-viewer.component.scss']
})
export class LogViewerComponent implements OnInit {
  logs: LogActivity[] = [];
  loading = false;
  exportLoading = false;
  error = '';

  search = '';
  fromDate: string = '';
  toDate: string = '';

  page = 1;
  pageSize = 5;
  total = 0;

  // ✅ NEW: Page size options
  pageSizeOptions = [
    { value: 5, label: '5 per page' },
    { value: 15, label: '15 per page' },
    { value: 30, label: '30 per page' },
    { value: 50, label: '50 per page' },
    //{ value: -1, label: 'Show All' }
  ];

  // For Math.min in template
  Math = Math;

  constructor(private logService: LogService) {}

  ngOnInit(): void {
    this.fetchLogs();
  }

  // ✅ NEW: Handle page size change
  onPageSizeChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    const newPageSize = parseInt(target.value);
    
    console.log(`📄 Changing page size from ${this.pageSize} to ${newPageSize === -1 ? 'All' : newPageSize}`);
    
    this.pageSize = newPageSize;
    this.page = 1; // Reset to first page
    this.fetchLogs();
  }

  fetchLogs() {
    this.loading = true;
    this.error = '';
    
    console.log('📋 Fetching logs...', {
      page: this.page,
      pageSize: this.pageSize,
      search: this.search,
      fromDate: this.fromDate,
      toDate: this.toDate
    });

    // If pageSize is -1 (Show All), pass a large number or handle differently
    const requestPageSize = this.pageSize === -1 ? 1000 : this.pageSize;
    const requestPage = this.pageSize === -1 ? 1 : this.page;
    
    this.logService
      .getLogs(requestPage, requestPageSize, this.search, this.fromDate, this.toDate)
      .subscribe({
        next: (res) => {
          console.log('✅ Logs fetched successfully:', res);
          this.logs = res.logs;
          this.total = res.total;
          this.loading = false;
        },
        error: (err) => {
          console.error('❌ Failed to fetch logs:', err);
          this.error = 'Failed to load activity logs. Please try again.';
          this.loading = false;
        }
      });
  }

  onSearchChange() {
    this.page = 1;
    this.fetchLogs();
  }

  onDateChange() {
    this.page = 1;
    this.fetchLogs();
  }

  onExportXlsx() {
    if (this.exportLoading) return;
    
    this.exportLoading = true;
    console.log('📥 Exporting logs to XLSX...');
    
    this.logService
      .exportLogsToXlsx(this.search, this.fromDate, this.toDate)
      .subscribe({
        next: (blob) => {
          console.log('✅ Export successful');
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `activity-logs-${new Date().toISOString().split('T')[0]}.xlsx`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          this.exportLoading = false;
          
          // Show success feedback
          this.showSuccessMessage('Export completed successfully!');
        },
        error: (err) => {
          console.error('❌ Export failed:', err);
          this.error = 'Failed to export logs. Please try again.';
          this.exportLoading = false;
        }
      });
  }

  nextPage() {
    if (this.pageSize !== -1 && this.page * this.pageSize < this.total) {
      this.page++;
      this.fetchLogs();
    }
  }

  prevPage() {
    if (this.page > 1 && this.pageSize !== -1) {
      this.page--;
      this.fetchLogs();
    }
  }

  // ✅ UPDATED: Helper methods with Show All support
  get canGoPrevious(): boolean {
    return this.page > 1 && this.pageSize !== -1;
  }

  get canGoNext(): boolean {
    return this.pageSize !== -1 && this.page * this.pageSize < this.total;
  }

  get totalPages(): number {
    if (this.pageSize === -1) return 1; // Show All = 1 page
    return Math.ceil(this.total / this.pageSize);
  }

  // ✅ NEW: Get displayed items info
  get displayedItemsInfo(): string {
    if (this.pageSize === -1) {
      return `Showing all ${this.total} logs`;
    }
    
    const startItem = (this.page - 1) * this.pageSize + 1;
    const endItem = Math.min(this.page * this.pageSize, this.total);
    
    return `Showing ${startItem}-${endItem} of ${this.total} logs`;
  }

  // ✅ FILTER MANAGEMENT
  hasActiveFilters(): boolean {
    return !!(this.search || this.fromDate || this.toDate);
  }

  clearFilters() {
    this.search = '';
    this.fromDate = '';
    this.toDate = '';
    this.page = 1;
    this.fetchLogs();
  }

  clearSearch() {
    this.search = '';
    this.page = 1;
    this.fetchLogs();
  }

  clearFromDate() {
    this.fromDate = '';
    this.page = 1;
    this.fetchLogs();
  }

  clearToDate() {
    this.toDate = '';
    this.page = 1;
    this.fetchLogs();
  }

  // ✅ ACTION ICONS & STYLING
  getActionIcon(action: string): string {
    const actionType = action.toLowerCase();
    
    if (actionType.includes('login')) {
      return 'M11 7L9.6 8.4l2.6 2.6H2v2h10.2l-2.6 2.6L11 17l5-5-5-5z';
    } else if (actionType.includes('logout')) {
      return 'M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.59L17 17l5-5z';
    } else if (actionType.includes('created') || actionType.includes('added')) {
      return 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11h-4v4h-2v-4H7v-2h4V7h2v4h4v2z';
    } else if (actionType.includes('deleted') || actionType.includes('removed')) {
      return 'M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z';
    } else if (actionType.includes('updated') || actionType.includes('modified')) {
      return 'M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z';
    } else {
      return 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z';
    }
  }

  getActionClass(action: string): string {
    const actionType = action.toLowerCase();
    
    if (actionType.includes('login')) return 'action-login';
    if (actionType.includes('logout')) return 'action-logout';
    if (actionType.includes('created') || actionType.includes('added')) return 'action-create';
    if (actionType.includes('deleted') || actionType.includes('removed')) return 'action-delete';
    if (actionType.includes('updated') || actionType.includes('modified')) return 'action-update';
    
    return 'action-default';
  }

  private showSuccessMessage(message: string): void {
    // Simple success feedback
    const successDiv = document.createElement('div');
    successDiv.className = 'success-toast';
    successDiv.textContent = `✅ ${message}`;
    successDiv.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #10b981;
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
      z-index: 1000;
      animation: slideIn 0.3s ease;
    `;
    
    document.body.appendChild(successDiv);
    
    setTimeout(() => {
      successDiv.remove();
    }, 3000);
  }
}