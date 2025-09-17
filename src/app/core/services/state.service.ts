// src/app/core/services/state.service.ts
// Enhanced Multi-Branch State Management with Angular 20 Signals
import { Injectable, signal, computed, inject, effect } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService, CurrentUser } from './auth.service';
import { NotificationService } from './notification.service';
import { LayoutService } from '../../shared/services/layout.service';
import { BranchService } from './branch.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { 
  BranchAccessDto, 
  BranchHierarchyDto, 
  BranchSwitchContextDto, 
  BranchSummaryDto, 
  BranchUserRoleDto,
  MultiBranchFilterDto
} from '../interfaces/branch.interfaces';
import { AccessibleBranchDto } from '../models/branch.interface';
import { Branch, HealthStatus } from '../models/branch.models';

// === DESIGN GUIDE INTERFACES ===

export interface User {
  id: number;
  username: string;
  role: 'Admin' | 'HeadManager' | 'BranchManager' | 'Manager' | 'User';
  branchId?: number;
  branch?: Branch;
  permissions: string[];
  isMultiBranchUser: boolean;
}

@Injectable({ providedIn: 'root' })
export class StateService {
  // ===== Existing State Signals =====
  private _user = signal<CurrentUser | null>(null);
  private _loading = signal<boolean>(false);
  private _sidebarCollapsed = signal<boolean>(false);
  private _isMobile = signal<boolean>(false);
  private _unreadNotificationCount = signal<number>(0);

  // ===== NEW: Multi-Branch State Signals =====
  private _accessibleBranches = signal<BranchAccessDto[]>([]);
  private _selectedBranchId = signal<number | null>(null);
  private _selectedBranchIds = signal<number[]>([]);
  private _isMultiSelectMode = signal<boolean>(false);
  private _branchHierarchy = signal<BranchHierarchyDto[]>([]);
  private _branchSummaries = signal<BranchSummaryDto[]>([]);
  private _userBranchRoles = signal<BranchUserRoleDto[]>([]);
  private _branchSwitchHistory = signal<{branchId: number, timestamp: string}[]>([]);
  private _branchLoadingStates = signal<Map<number, boolean>>(new Map());
  private _branchErrors = signal<Map<number, string>>(new Map());
  private _lastBranchSync = signal<string | null>(null);

  // === DESIGN GUIDE NEW SIGNALS ===
  private readonly _availableBranches = signal<Branch[]>([]);
  private readonly _branchRequired = signal<boolean>(false);
  private readonly _coordinationAlerts = signal<number>(0);

  // ===== Public readonly - Existing =====
  readonly user = this._user.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly sidebarCollapsed = this._sidebarCollapsed.asReadonly();
  readonly isMobile = this._isMobile.asReadonly();
  readonly unreadNotificationCount = this._unreadNotificationCount.asReadonly();

  // ===== NEW: Multi-Branch Public Readonly Signals =====
  readonly accessibleBranches = this._accessibleBranches.asReadonly();
  readonly selectedBranchId = this._selectedBranchId.asReadonly();
  readonly selectedBranchIds = this._selectedBranchIds.asReadonly();
  readonly isMultiSelectMode = this._isMultiSelectMode.asReadonly();
  readonly branchHierarchy = this._branchHierarchy.asReadonly();
  readonly branchSummaries = this._branchSummaries.asReadonly();
  readonly userBranchRoles = this._userBranchRoles.asReadonly();
  readonly branchSwitchHistory = this._branchSwitchHistory.asReadonly();
  readonly branchLoadingStates = this._branchLoadingStates.asReadonly();
  readonly branchErrors = this._branchErrors.asReadonly();
  readonly lastBranchSync = this._lastBranchSync.asReadonly();

  // === DESIGN GUIDE NEW PUBLIC READONLY SIGNALS ===
  readonly availableBranches = this._availableBranches.asReadonly();
  readonly branchRequired = this._branchRequired.asReadonly();
  readonly coordinationAlerts = this._coordinationAlerts.asReadonly();

  // ===== Existing Computed Properties =====
  readonly isAuthenticated = computed(() => !!this._user());
  readonly userPermissions = computed<string[]>(() => {
    const role = this._user()?.role;
    return role ? [role] : [];
  });
  readonly criticalNotificationCount = computed(() => this._unreadNotificationCount() >= 10);
  readonly isSidebarOpen = computed(() => !this._sidebarCollapsed());

  // ===== NEW: Multi-Branch Computed Properties =====
  readonly activeBranch = computed(() => {
    const branches = this._accessibleBranches();
    const selectedId = this._selectedBranchId();
    return branches.find(b => b.branchId === selectedId) || null;
  });

  readonly activeBranchIds = computed(() => {
    const multiSelect = this._isMultiSelectMode();
    const selectedIds = this._selectedBranchIds();
    const selectedId = this._selectedBranchId();
    
    if (multiSelect && selectedIds.length > 0) {
      return selectedIds;
    } else if (selectedId) {
      return [selectedId];
    }
    return [];
  });

  readonly canSwitchBranches = computed(() => {
    const user = this._user();
    const branches = this._accessibleBranches();
    return user && branches.length > 0 && 
           ['Admin', 'Manager', 'BranchManager', 'HeadManager'].includes(user.role);
  });

  readonly branchSwitchContext = computed((): BranchSwitchContextDto => {
    return {
      selectedBranchId: this._selectedBranchId(),
      selectedBranchIds: this._selectedBranchIds(),
      isMultiSelectMode: this._isMultiSelectMode(),
      accessibleBranches: this._accessibleBranches(),
      branchHierarchy: this._branchHierarchy(),
      lastSwitchAt: this._branchSwitchHistory()[0]?.timestamp || new Date().toISOString()
    };
  });

  readonly headOfficeBranches = computed(() => 
    this._accessibleBranches().filter(b => b.branchType === 'Head')
  );

  readonly regularBranches = computed(() => 
    this._accessibleBranches().filter(b => b.branchType === 'Branch')
  );

  readonly subBranches = computed(() => 
    this._accessibleBranches().filter(b => b.branchType === 'SubBranch')
  );

  readonly branchDisplayText = computed(() => {
    const isMulti = this._isMultiSelectMode();
    const selectedIds = this._selectedBranchIds();
    const activeBranch = this.activeBranch();
    
    if (isMulti && selectedIds.length > 1) {
      return `${selectedIds.length} Branches Selected`;
    } else if (isMulti && selectedIds.length === 1) {
      const branch = this._accessibleBranches().find(b => b.branchId === selectedIds[0]);
      return branch ? branch.branchName : 'Unknown Branch';
    } else if (activeBranch) {
      return activeBranch.branchName;
    }
    return 'Select Branch';
  });

  readonly onlineBranches = computed(() => 
    this._branchSummaries().filter(b => b.status === 'online')
  );

  readonly offlineBranches = computed(() => 
    this._branchSummaries().filter(b => b.status === 'offline')
  );

  readonly totalBranchSales = computed(() => 
    this._branchSummaries().reduce((total, branch) => total + branch.dailySales, 0)
  );

  readonly totalBranchProducts = computed(() => 
    this._branchSummaries().reduce((total, branch) => total + branch.totalProducts, 0)
  );

  readonly totalStockValue = computed(() => 
    this._branchSummaries().reduce((total, branch) => total + branch.totalStockValue, 0)
  );

  readonly hasMultipleBranches = computed(() => this._accessibleBranches().length > 1);

  // === DESIGN GUIDE NEW COMPUTED PROPERTIES ===
  readonly selectedBranch = computed(() => {
    const branchId = this._selectedBranchId();
    const branches = this._availableBranches();
    return branches.find(b => b.id === branchId) || null;
  });

  readonly isMultiBranchMode = computed(() => {
    const user = this._user();
    return user && this.hasMultipleBranches() && ['Admin', 'HeadManager'].includes(user.role);
  });

  readonly canSelectBranch = computed(() => {
    const user = this._user();
    return user && ['Admin', 'HeadManager', 'BranchManager'].includes(user.role);
  });

  readonly branchHealthStatus = computed((): HealthStatus => {
    const branch = this.selectedBranch();
    if (!branch?.healthScore) return 'unknown';
    
    if (branch.healthScore >= 90) return 'excellent';
    if (branch.healthScore >= 75) return 'good';
    if (branch.healthScore >= 50) return 'warning';
    return 'critical';
  });

  readonly currentBranchPermissions = computed(() => {
    const branchId = this._selectedBranchId();
    const userRoles = this._userBranchRoles();
    const branchRole = userRoles.find(r => r.branchId === branchId);
    return branchRole?.permissions || [];
  });

  readonly canManageCurrentBranch = computed(() => {
    const permissions = this.currentBranchPermissions();
    return permissions.includes('branch.manage');
  });

  private auth = inject(AuthService, { optional: true });
  private layout = inject(LayoutService);
  private notif = inject(NotificationService);
  private branchService = inject(BranchService);
  private router = inject(Router);

  constructor() {
    // Initialize with mock branches for development
    this._availableBranches.set([
      {
        id: 1,
        branchId: 1,
        branchName: 'Main Branch',
        branchCode: 'MAIN',
        address: 'Jl. Sudirman No. 123',
        city: 'Jakarta',
        province: 'DKI Jakarta',
        isActive: true,
        branchType: 'head_office',
        openingDate: '2020-01-01',
        healthScore: 95,
        coordinationStatus: 'optimal',
        pendingTransfers: 2,
        criticalAlerts: 0
      },
      {
        id: 2,
        branchId: 2,
        branchName: 'Branch Bekasi',
        branchCode: 'BKS',
        address: 'Jl. Ahmad Yani No. 456',
        city: 'Bekasi',
        province: 'Jawa Barat',
        isActive: true,
        branchType: 'regional',
        openingDate: '2021-03-15',
        healthScore: 87,
        coordinationStatus: 'optimal',
        pendingTransfers: 1,
        criticalAlerts: 1
      },
      {
        id: 3,
        branchId: 3,
        branchName: 'Branch Tangerang',
        branchCode: 'TNG',
        address: 'Jl. Raya Serpong No. 789',
        city: 'Tangerang',
        province: 'Banten',
        isActive: true,
        branchType: 'local',
        openingDate: '2021-06-01',
        healthScore: 82,
        coordinationStatus: 'warning',
        pendingTransfers: 3,
        criticalAlerts: 2
      }
    ]);

    // Seed awal (kalau AuthService sudah punya user dari cookie/localStorage)
    try {
      const seed = this.auth?.getCurrentUser?.();
      if (seed) this._user.set(seed);
    } catch (error) {
      console.warn('StateService: Could not get current user during initialization:', error);
    }

    // === DESIGN GUIDE AUTO-SAVE EFFECT ===
    // Auto-save selected branch to localStorage
    effect(() => {
      const branchId = this._selectedBranchId();
      console.log('🔄 [DEBUG StateService] Branch ID effect triggered:', {
        branchId,
        willSaveToLocalStorage: !!branchId,
        timestamp: new Date().toISOString()
      });

      if (branchId) {
        localStorage.setItem('selectedBranchId', branchId.toString());
        console.log('💾 [DEBUG StateService] Branch ID saved to localStorage:', branchId);
      }
    });

    // Load saved branch on startup
    this.loadSavedBranchSelection();

    // Mirror AuthService → signals (with null safety)
    if (this.auth) {
      this.auth.currentUser$
        .pipe(takeUntilDestroyed())
        .subscribe((u) => this._user.set(u));

      this.auth.isLoggedIn$
        .pipe(takeUntilDestroyed())
        .subscribe((logged) => {
          if (!logged) {
            this._user.set(null);
            // Clear branch data on logout
            this._accessibleBranches.set([]);
            this._selectedBranchId.set(null);
            this._selectedBranchIds.set([]);
          } else {
            // Load accessible branches on login
            this.loadMyAccessibleBranches();
          }
        });
    } else {
      console.warn('StateService: AuthService not available during initialization');
    }

    // Mirror LayoutService → signals
    this.layout.sidebarCollapsed$
      .pipe(takeUntilDestroyed())
      .subscribe((v) => this._sidebarCollapsed.set(v));

    this.layout.isMobile$
      .pipe(takeUntilDestroyed())
      .subscribe((v) => this._isMobile.set(v));

    // Mirror NotificationService → unread count; update badge di sidebar
    this.notif.unreadCount$
      .pipe(takeUntilDestroyed())
      .subscribe((count) => {
        this._unreadNotificationCount.set(count);
        this.layout.updateNotificationBadge(count);
      });
  }

  // ===== Existing Actions =====
  setLoading(v: boolean) { this._loading.set(v); }

  toggleSidebar() {
    const next = !this._sidebarCollapsed();
    this._sidebarCollapsed.set(next);
    this.layout.setSidebarCollapsed(next);
  }

  setUserLegacy(u: CurrentUser | null) {
    this._user.set(u);
    if (u) {
      this.initializeUserBranchContext(u);
    }
  }

  hasPermission(required: string): boolean {
    const role = this._user()?.role;
    return !required || (!!role && role === required);
  }

  markNotificationsAsRead() {
    this.notif.markAllAsRead().subscribe();
  }

  logoutToLogin() {
    if (this.auth) {
      this.auth.logout().subscribe();
    }
    this.clearBranchState();
  }

  // === DESIGN GUIDE NEW METHODS ===

  setUser(user: User): void {
    this._user.set(user as any);
    
    // Auto-set branch for single-branch users
    if (user.branchId && !user.isMultiBranchUser) {
      this._selectedBranchId.set(user.branchId);
    }
    
    // Load available branches for multi-branch users
    if (user.isMultiBranchUser) {
      this.loadAvailableBranches();
    }
  }

  logout(): void {
    this._user.set(null);
    this._selectedBranchId.set(null);
    this._availableBranches.set([]);
    this._branchRequired.set(false);
    this._coordinationAlerts.set(0);
    
    localStorage.removeItem('selectedBranchId');
    this.router.navigate(['/login']);
  }

  /**
   * Set selected branch for operations
   */
  selectBranch(branchId: number): void {
    const branches = this._availableBranches();
    const branch = branches.find(b => b.id === branchId);

    console.log('🏢 [DEBUG StateService] selectBranch called:', {
      branchId,
      foundBranch: branch,
      availableBranches: branches.length,
      previousBranchId: this._selectedBranchId(),
      timestamp: new Date().toISOString()
    });

    if (branch && branch.isActive) {
      this._selectedBranchId.set(branchId);
      this._branchRequired.set(false);

      console.log('✅ [DEBUG StateService] Branch selected successfully:', {
        newBranchId: branchId,
        branchName: branch.branchName,
        branchCode: branch.branchCode,
        timestamp: new Date().toISOString()
      });

      // Navigate to appropriate page if currently on branch-required page
      if (this.router.url.includes('branch-required')) {
        this.router.navigate(['/dashboard']);
      }
    } else {
      console.warn('⚠️ [DEBUG StateService] Branch selection failed:', {
        branchId,
        branch,
        isActive: branch?.isActive,
        reason: !branch ? 'Branch not found' : 'Branch inactive'
      });
    }
  }

  /**
   * Set available branches list
   */
  setAvailableBranches(branches: Branch[]): void {
    this._availableBranches.set(branches);
  }

  /**
   * Update branch health score
   */
  updateBranchHealth(branchId: number, healthScore: number, coordinationStatus: 'optimal' | 'warning' | 'error'): void {
    const branches = this._availableBranches();
    const updatedBranches = branches.map(branch => 
      branch.id === branchId 
        ? { ...branch, healthScore, coordinationStatus, lastSync: new Date().toISOString() }
        : branch
    );
    this._availableBranches.set(updatedBranches);
  }

  /**
   * Set branch requirement flag
   */
  setBranchRequired(required: boolean): void {
    this._branchRequired.set(required);
  }

  /**
   * Update coordination alerts count
   */
  setCoordinationAlerts(count: number): void {
    this._coordinationAlerts.set(count);
  }

  /**
   * Check if user has multi-branch permissions
   */
  hasMultiBranchAccess(): boolean {
    const user = this._user();
    return user?.isMultiBranchUser || ['Admin', 'HeadManager'].includes(user?.role || '');
  }

  /**
   * Check if specific branch access is allowed
   */
  canAccessBranch(branchId: number): boolean {
    const user = this._user();
    if (!user) return false;

    // Admin and HeadManager can access all branches
    if (['Admin', 'HeadManager'].includes(user.role)) return true;

    // Multi-branch users can access branches in their list
    if (user.isMultiBranchUser) {
      return this._availableBranches().some(b => b.id === branchId);
    }

    // Single-branch users can only access their own branch
    return user.branchId === branchId;
  }

  // ===== NEW: Multi-Branch Actions =====
  
  setAccessibleBranches(branches: BranchAccessDto[]): void {
    this._accessibleBranches.set(branches);
    
    // Auto-select first branch if none selected
    if (branches.length > 0 && !this._selectedBranchId()) {
      const defaultBranch = branches.find(b => b.canWrite) || branches[0];
      this._selectedBranchId.set(defaultBranch.branchId);
    }
  }

  selectBranchLegacy(branchId: number): void {
    const canAccess = this.canAccessBranchLegacy(branchId);
    const previousBranchId = this._selectedBranchId();

    console.log('🏢 [DEBUG StateService] selectBranchLegacy called:', {
      branchId,
      canAccess,
      previousBranchId,
      isMultiSelectMode: this._isMultiSelectMode(),
      accessibleBranchesCount: this._accessibleBranches().length,
      timestamp: new Date().toISOString()
    });

    if (canAccess) {
      this._selectedBranchId.set(branchId);
      this._isMultiSelectMode.set(false);
      this._selectedBranchIds.set([]);

      // Update last sync timestamp
      this._lastBranchSync.set(new Date().toISOString());

      // Add to switch history
      this.addBranchSwitchToHistory(branchId);

      console.log('✅ [DEBUG StateService] Legacy branch selected successfully:', {
        newBranchId: branchId,
        previousBranchId,
        syncTimestamp: new Date().toISOString(),
        activeBranchIds: this.activeBranchIds(),
        branchContext: this.getBranchContextForAPI()
      });
    } else {
      console.warn('⚠️ [DEBUG StateService] Legacy branch selection failed:', {
        branchId,
        reason: 'Cannot access branch',
        accessibleBranches: this._accessibleBranches().map(b => ({ id: b.branchId, name: b.branchName }))
      });
    }
  }

  setMultiSelectBranches(branchIds: number[]): void {
    const validIds = branchIds.filter(id => this.canAccessBranchLegacy(id));
    this._selectedBranchIds.set(validIds);
    this._isMultiSelectMode.set(true);
    this._selectedBranchId.set(null);
  }

  toggleBranchSelection(branchId: number): void {
    if (!this._isMultiSelectMode()) {
      this.setMultiSelectBranches([branchId]);
      return;
    }

    const currentIds = this._selectedBranchIds();
    const index = currentIds.indexOf(branchId);
    
    if (index === -1) {
      this._selectedBranchIds.set([...currentIds, branchId]);
    } else {
      this._selectedBranchIds.set(currentIds.filter(id => id !== branchId));
    }
  }

  setBranchHierarchy(hierarchy: BranchHierarchyDto[]): void {
    this._branchHierarchy.set(hierarchy);
  }

  setBranchSummaries(summaries: BranchSummaryDto[]): void {
    this._branchSummaries.set(summaries);
    this._lastBranchSync.set(new Date().toISOString());
  }

  setUserBranchRoles(roles: BranchUserRoleDto[]): void {
    this._userBranchRoles.set(roles);
  }

  // ===== NEW: Dynamic API Integration Methods =====

  /**
   * Load accessible branches from API
   */
  async loadAccessibleBranches(): Promise<void> {
    try {
      this._loading.set(true);
      console.log('🔄 Loading accessible branches from API...');
      
      const branches = await this.branchService.getAccessibleBranches().toPromise();
      if (branches && branches.length > 0) {
        // Convert AccessibleBranchDto to BranchAccessDto format
        const accessibleBranches: BranchAccessDto[] = branches.map(branch => {
          // Determine access level based on permissions
          let accessLevel: 'Full' | 'Limited' | 'ReadOnly' = 'ReadOnly';
          if (branch.canApprove && branch.canWrite) {
            accessLevel = 'Full';
          } else if (branch.canWrite) {
            accessLevel = 'Limited';
          }

          return {
            branchId: branch.branchId,
            branchName: branch.branchName,
            branchCode: branch.branchCode,
            branchType: branch.branchType as 'Head' | 'Branch' | 'SubBranch',
            address: branch.address,
            managerName: branch.managerName,
            phone: branch.phone,
            isActive: branch.isActive,
            canRead: branch.canRead,
            canWrite: branch.canWrite,
            canManage: branch.canApprove || false,
            canApprove: branch.canApprove,
            canTransfer: branch.canTransfer,
            level: branch.level,
            parentBranchId: branch.parentBranchId,
            isHeadOffice: branch.isHeadOffice,
            accessLevel: accessLevel,
            createdAt: branch.createdAt,
            updatedAt: branch.updatedAt
          };
        });

        this._accessibleBranches.set(accessibleBranches);
        
        // Set default branch if none selected
        if (!this._selectedBranchId() && accessibleBranches.length > 0) {
          // Prioritize head office or first active branch
          const defaultBranch = accessibleBranches.find(b => b.isHeadOffice) || accessibleBranches[0];
          this.selectBranch(defaultBranch.branchId);
        }

        console.log('✅ Loaded', accessibleBranches.length, 'accessible branches');
      }
    } catch (error) {
      console.error('❌ Error loading accessible branches:', error);
      this.notif.showError('Failed to load branches');
    } finally {
      this._loading.set(false);
    }
  }

  /**
   * Refresh branch data from API
   */
  async refreshBranchData(): Promise<void> {
    await this.loadAccessibleBranches();
    await this.syncBranchSummaries();
  }

  /**
   * Load branches for user selection dropdown
   */
  async loadMyAccessibleBranches(): Promise<void> {
    try {
      const simpleBranches = await this.branchService.getMyAccessibleBranches().toPromise();
      if (simpleBranches && simpleBranches.length > 0) {
        // Update accessible branches with simple data
        const accessibleBranches: BranchAccessDto[] = simpleBranches.map(branch => ({
          branchId: branch.branchId,
          branchName: branch.branchName,
          branchCode: branch.branchCode,
          branchType: branch.branchType === 0 ? 'Head' as const : 'Branch' as const,
          address: '',
          managerName: '',
          phone: '',
          isActive: branch.isActive,
          canRead: true,
          canWrite: true,
          canManage: false,
          canApprove: false,
          canTransfer: false,
          level: 0,
          parentBranchId: null,
          isHeadOffice: branch.branchType === 0,
          accessLevel: 'Limited' as const,
          createdAt: '',
          updatedAt: ''
        }));

        this._accessibleBranches.set(accessibleBranches);
        console.log('✅ Loaded', accessibleBranches.length, 'simple accessible branches');
      }
    } catch (error) {
      console.error('❌ Error loading my accessible branches:', error);
    }
  }

  setBranchLoading(branchId: number, loading: boolean): void {
    const loadingStates = new Map(this._branchLoadingStates());
    loadingStates.set(branchId, loading);
    this._branchLoadingStates.set(loadingStates);
  }

  setBranchError(branchId: number, error: string | null): void {
    const errorStates = new Map(this._branchErrors());
    if (error) {
      errorStates.set(branchId, error);
    } else {
      errorStates.delete(branchId);
    }
    this._branchErrors.set(errorStates);
  }

  clearBranchError(branchId: number): void {
    this.setBranchError(branchId, null);
  }

  clearAllBranchErrors(): void {
    this._branchErrors.set(new Map());
  }

  // ===== Branch Context Management =====

  getMultiBranchFilter(): MultiBranchFilterDto {
    return {
      branchIds: this.activeBranchIds(),
      includeSubBranches: true,
      dataType: 'all'
    };
  }

  getBranchContextForAPI(): { branchIds: string } {
    const branchIds = this.activeBranchIds();
    return {
      branchIds: branchIds.join(',')
    };
  }

  private canAccessBranchLegacy(branchId: number): boolean {
    const branches = this._accessibleBranches();
    return branches.some(b => b.branchId === branchId && b.canRead);
  }

  private initializeUserBranchContext(user: CurrentUser): void {
    // This would typically load user's accessible branches from API
    // For now, we'll use mock data structure
    console.log('🏢 Initializing branch context for user:', user.username);
  }

  private clearBranchState(): void {
    this._accessibleBranches.set([]);
    this._selectedBranchId.set(null);
    this._selectedBranchIds.set([]);
    this._isMultiSelectMode.set(false);
    this._branchHierarchy.set([]);
    this._branchSummaries.set([]);
    this._userBranchRoles.set([]);
    this._branchSwitchHistory.set([]);
    this._branchLoadingStates.set(new Map());
    this._branchErrors.set(new Map());
    this._lastBranchSync.set(null);
    
    // Clear localStorage
    localStorage.removeItem('selected-branch-id');
    localStorage.removeItem('selected-branch-ids');
    localStorage.removeItem('is-multi-select-mode');
  }

  private addBranchSwitchToHistory(branchId: number): void {
    const history = this._branchSwitchHistory();
    const newEntry = {
      branchId,
      timestamp: new Date().toISOString()
    };
    
    // Keep only last 10 switches
    const updatedHistory = [newEntry, ...history.slice(0, 9)];
    this._branchSwitchHistory.set(updatedHistory);
  }

  private async syncBranchSummaries(): Promise<void> {
    const branchIds = this.activeBranchIds();
    if (branchIds.length === 0) return;

    console.log('🔄 Syncing branch summaries for:', branchIds);
    // This would call the actual API to sync branch data
    // For now, just update the sync timestamp
    this._lastBranchSync.set(new Date().toISOString());
  }

  // === DESIGN GUIDE PRIVATE METHODS ===

  private loadSavedBranchSelection(): void {
    const savedBranchId = localStorage.getItem('selectedBranchId');
    if (savedBranchId) {
      this._selectedBranchId.set(parseInt(savedBranchId, 10));
    }
  }

  private loadAvailableBranches(): void {
    // This would typically call an API
    // For now, using mock data structure
    const mockBranches: Branch[] = [
      {
        id: 1,
        branchName: 'Head Office Jakarta',
        branchCode: 'HO-JKT',
        address: 'Jl. Sudirman No. 123, Jakarta',
        city: 'Jakarta',
        province: 'DKI Jakarta',
        phone: '+62-21-1234-5678',
        email: 'hq@tokoeniwan.com',
        managerName: 'Budi Santoso',
        isActive: true,
        branchType: 'head_office',
        openingDate: '2024-01-01',
        healthScore: 95,
        coordinationStatus: 'optimal'
      },
      // ... more branches would be loaded from API
    ];
    
    this._availableBranches.set(mockBranches);
  }

  // ===== Branch Permission Helpers =====

  hasBranchPermission(branchId: number, permission: string): boolean {
    const userRoles = this._userBranchRoles();
    const branchRole = userRoles.find(r => r.branchId === branchId);
    return branchRole?.permissions.includes(permission) || false;
  }

  canWriteToBranch(branchId: number): boolean {
    const branches = this._accessibleBranches();
    const branch = branches.find(b => b.branchId === branchId);
    return branch?.canWrite || false;
  }

  canManageBranch(branchId: number): boolean {
    const branches = this._accessibleBranches();
    const branch = branches.find(b => b.branchId === branchId);
    return branch?.canManage || false;
  }

  canTransferFromBranch(branchId: number): boolean {
    const branches = this._accessibleBranches();
    const branch = branches.find(b => b.branchId === branchId);
    return branch?.canTransfer || false;
  }

  // ===== Enhanced Permission System =====

  hasEnhancedPermission(permission: string): boolean {
    // Check current branch permissions
    const currentPermissions = this.currentBranchPermissions();
    
    // Check user role permissions  
    const userPermissions = this.userPermissions();
    
    return currentPermissions.includes(permission) || 
           userPermissions.some(role => this.getRolePermissions(role).includes(permission));
  }

  private getRolePermissions(role: string): string[] {
    const rolePermissions: Record<string, string[]> = {
      'Admin': ['*'], // All permissions
      'HeadManager': ['inventory.write', 'facture.write', 'reports.export', 'branch.read', 'branch.write'],
      'BranchManager': ['inventory.write', 'pos.operate', 'reports.read', 'branch.read'],
      'Manager': ['inventory.read', 'pos.operate', 'reports.read'],
      'User': ['inventory.read', 'pos.operate'],
      'Cashier': ['pos.operate']
    };
    
    return rolePermissions[role] || [];
  }

  // ===== Debug Helpers =====

  getBranchStateSnapshot(): any {
    return {
      selectedBranchId: this._selectedBranchId(),
      selectedBranchIds: this._selectedBranchIds(),
      isMultiSelectMode: this._isMultiSelectMode(),
      accessibleBranchesCount: this._accessibleBranches().length,
      branchHierarchyCount: this._branchHierarchy().length,
      branchSummariesCount: this._branchSummaries().length,
      lastSync: this._lastBranchSync(),
      switchHistoryCount: this._branchSwitchHistory().length,
      errorCount: this._branchErrors().size,
      loadingCount: Array.from(this._branchLoadingStates().values()).filter(Boolean).length
    };
  }
}
