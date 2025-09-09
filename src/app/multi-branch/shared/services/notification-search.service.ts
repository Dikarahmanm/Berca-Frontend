// Advanced search and filtering service for multi-branch notifications
import { Injectable, signal, computed } from '@angular/core';
import { BehaviorSubject, Observable, combineLatest, of } from 'rxjs';
import { map, debounceTime, distinctUntilChanged, switchMap, tap } from 'rxjs/operators';
import { MultiBranchNotification } from './notification.service';

export interface SearchFilter {
  id: string;
  name: string;
  type: 'text' | 'select' | 'date' | 'range' | 'boolean' | 'multi-select';
  field: keyof MultiBranchNotification | 'custom';
  operator: FilterOperator;
  value: any;
  isActive: boolean;
  isCustom: boolean;
}

export type FilterOperator = 
  | 'equals' 
  | 'not_equals'
  | 'contains' 
  | 'not_contains'
  | 'starts_with' 
  | 'ends_with'
  | 'greater_than' 
  | 'less_than'
  | 'between'
  | 'in' 
  | 'not_in'
  | 'is_null' 
  | 'is_not_null'
  | 'regex';

export interface SearchQuery {
  id: string;
  name: string;
  text?: string;
  filters: SearchFilter[];
  sortBy: keyof MultiBranchNotification;
  sortOrder: 'asc' | 'desc';
  limit?: number;
  offset?: number;
  isTemporary: boolean;
  createdAt: string;
  lastUsed?: string;
}

export interface SearchResult {
  notifications: MultiBranchNotification[];
  totalCount: number;
  filteredCount: number;
  facets: SearchFacet[];
  executionTime: number;
  query: SearchQuery;
}

export interface SearchFacet {
  field: string;
  values: FacetValue[];
}

export interface FacetValue {
  value: any;
  count: number;
  selected: boolean;
}

export interface SavedSearch {
  id: string;
  name: string;
  description?: string;
  query: SearchQuery;
  isPublic: boolean;
  createdBy: string;
  createdAt: string;
  usageCount: number;
  lastUsed?: string;
}

export interface SearchSuggestion {
  type: 'filter' | 'value' | 'field' | 'operator';
  text: string;
  value: any;
  score: number;
  description?: string;
}

export interface SearchAnalytics {
  popularSearches: string[];
  commonFilters: string[];
  searchPatterns: SearchPattern[];
  performanceMetrics: {
    averageExecutionTime: number;
    searchVolume: number;
    successRate: number;
  };
}

export interface SearchPattern {
  pattern: string;
  frequency: number;
  effectiveness: number;
  suggestions: string[];
}

@Injectable({
  providedIn: 'root'
})
export class NotificationSearchService {
  // State management
  private readonly _currentQuery = signal<SearchQuery>(this.createEmptyQuery());
  private readonly _searchResults = signal<SearchResult | null>(null);
  private readonly _savedSearches = signal<SavedSearch[]>([]);
  private readonly _isSearching = signal<boolean>(false);
  private readonly _searchHistory = signal<SearchQuery[]>([]);
  private readonly _availableFilters = signal<SearchFilter[]>([]);
  private readonly _searchAnalytics = signal<SearchAnalytics | null>(null);

  // Data source
  private notificationsSubject = new BehaviorSubject<MultiBranchNotification[]>([]);

  // Public readonly signals
  readonly currentQuery = this._currentQuery.asReadonly();
  readonly searchResults = this._searchResults.asReadonly();
  readonly savedSearches = this._savedSearches.asReadonly();
  readonly isSearching = this._isSearching.asReadonly();
  readonly searchHistory = this._searchHistory.asReadonly();
  readonly availableFilters = this._availableFilters.asReadonly();
  readonly searchAnalytics = this._searchAnalytics.asReadonly();

  // Computed properties
  readonly activeFilters = computed(() => 
    this._currentQuery().filters.filter(f => f.isActive)
  );

  readonly hasActiveSearch = computed(() => {
    const query = this._currentQuery();
    return !!(query.text?.trim() || this.activeFilters().length > 0);
  });

  readonly quickStats = computed(() => {
    const results = this._searchResults();
    if (!results) return null;

    return {
      total: results.totalCount,
      filtered: results.filteredCount,
      percentage: results.totalCount > 0 ? (results.filteredCount / results.totalCount) * 100 : 0,
      executionTime: results.executionTime
    };
  });

  constructor() {
    this.initializeFilters();
    this.initializeSavedSearches();
    this.initializeMockData();
    this.startAnalytics();
  }

  private initializeFilters() {
    const defaultFilters: SearchFilter[] = [
      {
        id: 'type-filter',
        name: 'Notification Type',
        type: 'select',
        field: 'type',
        operator: 'equals',
        value: '',
        isActive: false,
        isCustom: false
      },
      {
        id: 'severity-filter',
        name: 'Severity Level',
        type: 'select',
        field: 'severity',
        operator: 'equals',
        value: '',
        isActive: false,
        isCustom: false
      },
      {
        id: 'branch-filter',
        name: 'Branch',
        type: 'select',
        field: 'branchId',
        operator: 'equals',
        value: '',
        isActive: false,
        isCustom: false
      },
      {
        id: 'read-status-filter',
        name: 'Read Status',
        type: 'boolean',
        field: 'isRead',
        operator: 'equals',
        value: false,
        isActive: false,
        isCustom: false
      },
      {
        id: 'action-required-filter',
        name: 'Action Required',
        type: 'boolean',
        field: 'actionRequired',
        operator: 'equals',
        value: true,
        isActive: false,
        isCustom: false
      },
      {
        id: 'date-range-filter',
        name: 'Date Range',
        type: 'date',
        field: 'timestamp',
        operator: 'between',
        value: { start: '', end: '' },
        isActive: false,
        isCustom: false
      },
      {
        id: 'user-filter',
        name: 'User',
        type: 'text',
        field: 'userName',
        operator: 'contains',
        value: '',
        isActive: false,
        isCustom: false
      }
    ];

    this._availableFilters.set(defaultFilters);
  }

  private initializeSavedSearches() {
    const defaultSavedSearches: SavedSearch[] = [
      {
        id: 'unread-critical',
        name: 'Unread Critical Alerts',
        description: 'All unread notifications with critical severity',
        query: {
          id: 'unread-critical-query',
          name: 'Unread Critical',
          filters: [
            { ...this.createFilter('severity', 'equals', 'error'), isActive: true },
            { ...this.createFilter('isRead', 'equals', false), isActive: true }
          ],
          sortBy: 'timestamp',
          sortOrder: 'desc',
          isTemporary: false,
          createdAt: new Date().toISOString()
        },
        isPublic: true,
        createdBy: 'system',
        createdAt: new Date().toISOString(),
        usageCount: 45
      },
      {
        id: 'transfer-requests',
        name: 'Pending Transfer Requests',
        description: 'Transfer notifications requiring action',
        query: {
          id: 'transfer-requests-query',
          name: 'Transfer Requests',
          filters: [
            { ...this.createFilter('type', 'equals', 'transfer'), isActive: true },
            { ...this.createFilter('actionRequired', 'equals', true), isActive: true }
          ],
          sortBy: 'timestamp',
          sortOrder: 'desc',
          isTemporary: false,
          createdAt: new Date().toISOString()
        },
        isPublic: true,
        createdBy: 'admin',
        createdAt: new Date().toISOString(),
        usageCount: 23
      },
      {
        id: 'system-errors',
        name: 'System Error Notifications',
        description: 'All system-related error notifications',
        query: {
          id: 'system-errors-query',
          name: 'System Errors',
          filters: [
            { ...this.createFilter('type', 'equals', 'system'), isActive: true },
            { ...this.createFilter('severity', 'equals', 'error'), isActive: true }
          ],
          sortBy: 'timestamp',
          sortOrder: 'desc',
          isTemporary: false,
          createdAt: new Date().toISOString()
        },
        isPublic: false,
        createdBy: 'tech-team',
        createdAt: new Date().toISOString(),
        usageCount: 67
      }
    ];

    this._savedSearches.set(defaultSavedSearches);
  }

  private initializeMockData() {
    // Initialize with mock notifications data
    const mockNotifications: MultiBranchNotification[] = [
      // This would be populated from the notification service
    ];
    
    this.notificationsSubject.next(mockNotifications);
  }

  private createFilter(
    field: keyof MultiBranchNotification, 
    operator: FilterOperator, 
    value: any
  ): SearchFilter {
    return {
      id: `${field}-${Date.now()}`,
      name: field.toString(),
      type: 'text',
      field,
      operator,
      value,
      isActive: false,
      isCustom: true
    };
  }

  private createEmptyQuery(): SearchQuery {
    return {
      id: `query-${Date.now()}`,
      name: 'New Search',
      text: '',
      filters: [],
      sortBy: 'timestamp',
      sortOrder: 'desc',
      isTemporary: true,
      createdAt: new Date().toISOString()
    };
  }

  // Public API
  updateSearchText(text: string): void {
    const currentQuery = this._currentQuery();
    this._currentQuery.set({
      ...currentQuery,
      text: text.trim()
    });

    this.executeSearchDebounced();
  }

  addFilter(filter: SearchFilter): void {
    const currentQuery = this._currentQuery();
    const existingIndex = currentQuery.filters.findIndex(f => f.id === filter.id);
    
    let updatedFilters: SearchFilter[];
    if (existingIndex >= 0) {
      updatedFilters = currentQuery.filters.map(f => 
        f.id === filter.id ? { ...filter, isActive: true } : f
      );
    } else {
      updatedFilters = [...currentQuery.filters, { ...filter, isActive: true }];
    }

    this._currentQuery.set({
      ...currentQuery,
      filters: updatedFilters
    });

    this.executeSearch();
  }

  removeFilter(filterId: string): void {
    const currentQuery = this._currentQuery();
    const updatedFilters = currentQuery.filters.filter(f => f.id !== filterId);
    
    this._currentQuery.set({
      ...currentQuery,
      filters: updatedFilters
    });

    this.executeSearch();
  }

  toggleFilter(filterId: string): void {
    const currentQuery = this._currentQuery();
    const updatedFilters = currentQuery.filters.map(f => 
      f.id === filterId ? { ...f, isActive: !f.isActive } : f
    );
    
    this._currentQuery.set({
      ...currentQuery,
      filters: updatedFilters
    });

    this.executeSearch();
  }

  updateFilter(filterId: string, updates: Partial<SearchFilter>): void {
    const currentQuery = this._currentQuery();
    const updatedFilters = currentQuery.filters.map(f => 
      f.id === filterId ? { ...f, ...updates } : f
    );
    
    this._currentQuery.set({
      ...currentQuery,
      filters: updatedFilters
    });

    this.executeSearch();
  }

  setSorting(sortBy: keyof MultiBranchNotification, sortOrder: 'asc' | 'desc'): void {
    const currentQuery = this._currentQuery();
    this._currentQuery.set({
      ...currentQuery,
      sortBy,
      sortOrder
    });

    this.executeSearch();
  }

  clearSearch(): void {
    this._currentQuery.set(this.createEmptyQuery());
    this._searchResults.set(null);
  }

  // Search execution
  executeSearch(): Observable<SearchResult> {
    this._isSearching.set(true);
    const startTime = Date.now();
    
    return this.performSearch(this._currentQuery()).pipe(
      tap(result => {
        result.executionTime = Date.now() - startTime;
        this._searchResults.set(result);
        this._isSearching.set(false);
        this.addToHistory(this._currentQuery());
      })
    );
  }

  private executeSearchDebounced = this.debounce(() => {
    this.executeSearch().subscribe();
  }, 300);

  private performSearch(query: SearchQuery): Observable<SearchResult> {
    return this.notificationsSubject.pipe(
      map(notifications => {
        let filtered = [...notifications];

        // Apply text search
        if (query.text) {
          const searchText = query.text.toLowerCase();
          filtered = filtered.filter(notification => 
            notification.title.toLowerCase().includes(searchText) ||
            notification.message.toLowerCase().includes(searchText) ||
            notification.branchName?.toLowerCase().includes(searchText) ||
            notification.userName?.toLowerCase().includes(searchText)
          );
        }

        // Apply filters
        for (const filter of query.filters.filter(f => f.isActive)) {
          filtered = this.applyFilter(filtered, filter);
        }

        // Apply sorting
        filtered = this.sortNotifications(filtered, query.sortBy, query.sortOrder);

        // Apply pagination
        let paginatedResults = filtered;
        if (query.limit) {
          const offset = query.offset || 0;
          paginatedResults = filtered.slice(offset, offset + query.limit);
        }

        // Generate facets
        const facets = this.generateFacets(notifications, filtered);

        return {
          notifications: paginatedResults,
          totalCount: notifications.length,
          filteredCount: filtered.length,
          facets,
          executionTime: 0, // Will be set later
          query
        };
      })
    );
  }

  private applyFilter(notifications: MultiBranchNotification[], filter: SearchFilter): MultiBranchNotification[] {
    return notifications.filter(notification => {
      const fieldValue = notification[filter.field as keyof MultiBranchNotification];
      return this.evaluateFilterCondition(fieldValue, filter.operator, filter.value);
    });
  }

  private evaluateFilterCondition(fieldValue: any, operator: FilterOperator, filterValue: any): boolean {
    switch (operator) {
      case 'equals':
        return fieldValue === filterValue;
      case 'not_equals':
        return fieldValue !== filterValue;
      case 'contains':
        return String(fieldValue).toLowerCase().includes(String(filterValue).toLowerCase());
      case 'not_contains':
        return !String(fieldValue).toLowerCase().includes(String(filterValue).toLowerCase());
      case 'starts_with':
        return String(fieldValue).toLowerCase().startsWith(String(filterValue).toLowerCase());
      case 'ends_with':
        return String(fieldValue).toLowerCase().endsWith(String(filterValue).toLowerCase());
      case 'greater_than':
        return Number(fieldValue) > Number(filterValue);
      case 'less_than':
        return Number(fieldValue) < Number(filterValue);
      case 'between':
        if (filterValue.start && filterValue.end) {
          const date = new Date(fieldValue);
          return date >= new Date(filterValue.start) && date <= new Date(filterValue.end);
        }
        return true;
      case 'in':
        return Array.isArray(filterValue) && filterValue.includes(fieldValue);
      case 'not_in':
        return Array.isArray(filterValue) && !filterValue.includes(fieldValue);
      case 'is_null':
        return fieldValue === null || fieldValue === undefined;
      case 'is_not_null':
        return fieldValue !== null && fieldValue !== undefined;
      case 'regex':
        try {
          return new RegExp(String(filterValue), 'i').test(String(fieldValue));
        } catch {
          return false;
        }
      default:
        return true;
    }
  }

  private sortNotifications(
    notifications: MultiBranchNotification[], 
    sortBy: keyof MultiBranchNotification, 
    sortOrder: 'asc' | 'desc'
  ): MultiBranchNotification[] {
    return [...notifications].sort((a, b) => {
      const aValue = a[sortBy];
      const bValue = b[sortBy];

      let comparison = 0;
      if (aValue != null && bValue != null) {
        if (aValue < bValue) comparison = -1;
        else if (aValue > bValue) comparison = 1;
      } else if (aValue == null && bValue != null) {
        comparison = 1;
      } else if (aValue != null && bValue == null) {
        comparison = -1;
      }

      return sortOrder === 'desc' ? -comparison : comparison;
    });
  }

  private generateFacets(allNotifications: MultiBranchNotification[], filteredNotifications: MultiBranchNotification[]): SearchFacet[] {
    const facets: SearchFacet[] = [];

    // Type facet
    const typeCounts = new Map<string, number>();
    filteredNotifications.forEach(n => {
      const count = typeCounts.get(n.type) || 0;
      typeCounts.set(n.type, count + 1);
    });

    facets.push({
      field: 'type',
      values: Array.from(typeCounts.entries()).map(([value, count]) => ({
        value,
        count,
        selected: false
      }))
    });

    // Severity facet
    const severityCounts = new Map<string, number>();
    filteredNotifications.forEach(n => {
      const count = severityCounts.get(n.severity) || 0;
      severityCounts.set(n.severity, count + 1);
    });

    facets.push({
      field: 'severity',
      values: Array.from(severityCounts.entries()).map(([value, count]) => ({
        value,
        count,
        selected: false
      }))
    });

    // Branch facet
    const branchCounts = new Map<string, number>();
    filteredNotifications.forEach(n => {
      if (n.branchName) {
        const count = branchCounts.get(n.branchName) || 0;
        branchCounts.set(n.branchName, count + 1);
      }
    });

    facets.push({
      field: 'branchName',
      values: Array.from(branchCounts.entries()).map(([value, count]) => ({
        value,
        count,
        selected: false
      }))
    });

    return facets;
  }

  // Saved searches
  saveCurrentSearch(name: string, description?: string, isPublic: boolean = false): void {
    const currentQuery = this._currentQuery();
    const savedSearch: SavedSearch = {
      id: `saved-${Date.now()}`,
      name,
      description,
      query: {
        ...currentQuery,
        name,
        isTemporary: false
      },
      isPublic,
      createdBy: 'current-user', // Would come from auth service
      createdAt: new Date().toISOString(),
      usageCount: 0
    };

    const current = this._savedSearches();
    this._savedSearches.set([savedSearch, ...current]);
  }

  loadSavedSearch(searchId: string): void {
    const savedSearch = this._savedSearches().find(s => s.id === searchId);
    if (savedSearch) {
      this._currentQuery.set({
        ...savedSearch.query,
        id: `query-${Date.now()}`,
        isTemporary: true
      });

      // Update usage count
      this.updateSavedSearchUsage(searchId);
      
      this.executeSearch().subscribe();
    }
  }

  deleteSavedSearch(searchId: string): void {
    const current = this._savedSearches();
    this._savedSearches.set(current.filter(s => s.id !== searchId));
  }

  private updateSavedSearchUsage(searchId: string): void {
    const current = this._savedSearches();
    const updated = current.map(search => 
      search.id === searchId 
        ? { ...search, usageCount: search.usageCount + 1, lastUsed: new Date().toISOString() }
        : search
    );
    this._savedSearches.set(updated);
  }

  // Search history
  private addToHistory(query: SearchQuery): void {
    if (query.text || query.filters.some(f => f.isActive)) {
      const current = this._searchHistory();
      const newHistory = [query, ...current.slice(0, 9)]; // Keep last 10 searches
      this._searchHistory.set(newHistory);
    }
  }

  clearSearchHistory(): void {
    this._searchHistory.set([]);
  }

  // Search suggestions
  getSearchSuggestions(input: string): Observable<SearchSuggestion[]> {
    return of(input).pipe(
      debounceTime(150),
      distinctUntilChanged(),
      switchMap(text => {
        if (!text || text.length < 2) {
          return of([]);
        }

        const suggestions: SearchSuggestion[] = [];

        // Field suggestions
        const fields = ['title', 'message', 'type', 'severity', 'branchName', 'userName'];
        fields.forEach(field => {
          if (field.toLowerCase().includes(text.toLowerCase())) {
            suggestions.push({
              type: 'field',
              text: field,
              value: field,
              score: this.calculateSuggestionScore(field, text),
              description: `Search in ${field}`
            });
          }
        });

        // Value suggestions based on existing data
        // This would query actual notification data for value suggestions

        return of(suggestions.sort((a, b) => b.score - a.score).slice(0, 10));
      })
    );
  }

  private calculateSuggestionScore(suggestion: string, input: string): number {
    const lowerSuggestion = suggestion.toLowerCase();
    const lowerInput = input.toLowerCase();

    if (lowerSuggestion === lowerInput) return 100;
    if (lowerSuggestion.startsWith(lowerInput)) return 80;
    if (lowerSuggestion.includes(lowerInput)) return 60;
    
    return 0;
  }

  // Analytics
  private startAnalytics(): void {
    // Initialize mock analytics
    this._searchAnalytics.set({
      popularSearches: ['unread', 'critical', 'transfer', 'system error'],
      commonFilters: ['severity', 'type', 'branchId', 'isRead'],
      searchPatterns: [
        {
          pattern: 'severity:error AND type:system',
          frequency: 15,
          effectiveness: 85,
          suggestions: ['Add time filter', 'Include branch filter']
        }
      ],
      performanceMetrics: {
        averageExecutionTime: 45, // milliseconds
        searchVolume: 234,
        successRate: 92.5
      }
    });
  }

  getSearchAnalytics(): Observable<SearchAnalytics> {
    const analytics = this._searchAnalytics();
    return new BehaviorSubject(analytics || {
      popularSearches: [],
      commonFilters: [],
      searchPatterns: [],
      performanceMetrics: {
        averageExecutionTime: 0,
        searchVolume: 0,
        successRate: 0
      }
    }).asObservable();
  }

  // Utility methods
  private debounce<T extends (...args: any[]) => any>(func: T, wait: number): T {
    let timeout: ReturnType<typeof setTimeout>;
    return ((...args: Parameters<T>) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    }) as T;
  }

  exportSearchResults(): any {
    const results = this._searchResults();
    if (!results) return null;

    return {
      query: results.query,
      results: results.notifications,
      totalCount: results.totalCount,
      filteredCount: results.filteredCount,
      facets: results.facets,
      exportedAt: new Date().toISOString()
    };
  }

  // External data source integration
  setNotificationDataSource(notifications$: Observable<MultiBranchNotification[]>): void {
    notifications$.subscribe(notifications => {
      this.notificationsSubject.next(notifications);
    });
  }
}