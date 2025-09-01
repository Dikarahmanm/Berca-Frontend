// src/app/shared/components/topbar/topbar.component.ts
// src/app/shared/components/topbar/topbar.component.ts
// ✅ Refactor: sinkron dgn StateService (signals) + tetap pertahankan fungsi yang ada
import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, Injector, runInInjectionContext, ChangeDetectionStrategy, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatBadgeModule } from '@angular/material/badge';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { toObservable } from '@angular/core/rxjs-interop';

import { AuthService } from '../../core/services/auth.service';
import { StateService } from '../../core/services/state.service';
import { UnifiedNotificationCenterComponent } from '../components/unified-notification-center/unified-notification-center.component';
import { BranchAccessDto } from '../../core/interfaces/branch.interfaces';

@Component({
  selector: 'app-topbar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    MatBadgeModule,
    MatTooltipModule,
    MatDividerModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    UnifiedNotificationCenterComponent
  ],
  templateUrl: './topbar.component.html',
  styleUrls: ['./topbar.component.scss']
})
export class TopbarComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // Inputs (tetap)
  @Input() pageTitle: string = '';
  @Input() brandTitle: string = 'Toko Eniwan';
  @Input() username: string = '';
  @Input() role: string = '';
  @Input() userPhoto?: string;
  @Input() notificationCount: number = 0;
  @Input() showMenuToggle: boolean = false;
  @Input() showBreadcrumb: boolean = true;
  @Input() showQuickActions: boolean = false;
  @Input() breadcrumb: string[] = [];
  @Input() isMobile: boolean = false;

  // Outputs (tetap)
  @Output() logoutClicked = new EventEmitter<void>();
  @Output() menuToggleClicked = new EventEmitter<void>();

  // State internal (simplified - notifications now handled by UnifiedNotificationCenterComponent)
  isLoggingOut: boolean = false;
  isDarkMode: boolean = false;
  showProfileDropdown: boolean = false;

  // ===== NEW: Multi-Branch State =====
  branchDropdownOpen = signal<boolean>(false);
  branchSearchQuery = signal<string>('');
  branchLoading = signal<boolean>(false);

  private roleDisplayMap: { [key: string]: string } = {
    'Admin': 'Administrator',
    'Manager': 'Manager',
    'User': 'Kasir',
    'Cashier': 'Kasir',
    'Staff': 'Staff'
  };

  // ===== NEW: Multi-Branch Service Injection =====
  private state = inject(StateService);
  
  // ===== NEW: Multi-Branch Computed Properties =====
  readonly accessibleBranches = this.state.accessibleBranches;
  readonly selectedBranchId = this.state.selectedBranchId;
  readonly selectedBranchIds = this.state.selectedBranchIds;
  readonly isMultiSelectMode = this.state.isMultiSelectMode;
  readonly activeBranch = this.state.activeBranch;
  readonly canSwitchBranches = this.state.canSwitchBranches;
  readonly hasMultipleBranches = this.state.hasMultipleBranches;
  readonly branchDisplayText = this.state.branchDisplayText;

  readonly filteredBranches = computed(() => {
    const branches = this.accessibleBranches();
    const query = this.branchSearchQuery().toLowerCase();
    
    if (!query) return branches;
    
    return branches.filter(branch => 
      branch.branchName.toLowerCase().includes(query) ||
      branch.branchCode.toLowerCase().includes(query)
    );
  });

  constructor(
    private router: Router,
    private authService: AuthService,
    private snackBar: MatSnackBar,
    private injector: Injector
  ) {}

  ngOnInit(): void {
    this.initializeTopbar();
    this.checkMobileState();
    this.setupDocumentClickListener();
    this.initializeBranchData();

    // ===== Signals → Observable (aman NG0203) =====
    const user$    = runInInjectionContext(this.injector, () => toObservable(this.state.user));
    const mobile$  = runInInjectionContext(this.injector, () => toObservable(this.state.isMobile));

    user$.pipe(takeUntil(this.destroy$)).subscribe(u => {
      if (u) {
        this.username = u.username ?? this.username;
        this.role = u.role ?? this.role;
      }
    });
    mobile$.pipe(takeUntil(this.destroy$)).subscribe(v => {
      this.isMobile = v;
      if (this.isMobile && !this.showMenuToggle) this.showMenuToggle = true;
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    document.removeEventListener('click', this.onDocumentClick.bind(this));
    document.body.style.overflow = '';
  }

  private initializeTopbar(): void {
    console.log('🔝 Topbar initialized');
    
    // Load theme preference
    this.isDarkMode = localStorage.getItem('darkMode') === 'true';
  }


  private checkMobileState(): void {
    this.isMobile = window.innerWidth <= 768;
    
    // Also check for showMenuToggle on mobile
    if (this.isMobile && !this.showMenuToggle) {
      this.showMenuToggle = true;
    }
    
    window.addEventListener('resize', () => {
      const wasMobile = this.isMobile;
      this.isMobile = window.innerWidth <= 768;
      
      // Update showMenuToggle based on mobile state
      if (this.isMobile && !this.showMenuToggle) {
        this.showMenuToggle = true;
      }
      
      // Close dropdowns when switching between mobile/desktop
      if (wasMobile !== this.isMobile) {
        this.showProfileDropdown = false;
      }
    });
  }

  private setupDocumentClickListener(): void {
    document.addEventListener('click', this.onDocumentClick.bind(this));
  }

  private onDocumentClick(event: Event): void {
    const target = event.target as HTMLElement;
    const profileWrapper = target.closest('.profile-wrapper');
    const branchWrapper = target.closest('.branch-selector-wrapper');
    
    if (!profileWrapper) {
      this.showProfileDropdown = false;
    }
    
    if (!branchWrapper) {
      this.branchDropdownOpen.set(false);
    }
  }

  toggleProfileDropdown(): void {
    this.showProfileDropdown = !this.showProfileDropdown;
    // Close branch dropdown if open
    if (this.showProfileDropdown) {
      this.branchDropdownOpen.set(false);
    }
  }


  // Navigation methods
  navigateHome(): void {
    this.router.navigate(['/dashboard']);
  }

  navigateToProfile(): void {
    this.router.navigate(['/dashboard/profile']);
  }

  navigateToSettings(): void {
    this.router.navigate(['/dashboard/settings']);
  }

  navigateToNotifications(): void {
    this.router.navigate(['/dashboard/notifications']);
  }

  // User actions
  logout(): void {
    this.isLoggingOut = true;
    this.logoutClicked.emit();
    
    // Reset loading state after timeout
    setTimeout(() => {
      this.isLoggingOut = false;
    }, 3000);
  }

  toggleTheme(): void {
    this.isDarkMode = !this.isDarkMode;
    localStorage.setItem('darkMode', this.isDarkMode.toString());
    document.body.classList.toggle('dark-mode', this.isDarkMode);
    
    this.showSuccessMessage(`Switched to ${this.isDarkMode ? 'dark' : 'light'} mode`);
  }

  // Utility methods
  getInitials(name: string): string {
    if (!name) return 'U';
    
    const words = name.trim().split(' ');
    if (words.length === 1) {
      return words[0].charAt(0).toUpperCase();
    } else {
      return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
    }
  }

  getRoleDisplay(role: string): string {
    return this.roleDisplayMap[role] || role;
  }

  private showSuccessMessage(message: string): void {
    this.snackBar.open(message, 'Tutup', {
      duration: 3000,
      panelClass: ['snackbar-success']
    });
  }

  private showErrorMessage(message: string): void {
    this.snackBar.open(message, 'Tutup', {
      duration: 5000,
      panelClass: ['snackbar-error']
    });
  }

  // ===== NEW: Multi-Branch Methods =====

  private initializeBranchData(): void {
    console.log('🔧 Starting initializeBranchData...');
    
    // Load branch access data when component initializes
    const branchAccess = this.authService.getCurrentBranchAccess();
    console.log('🔍 Branch access from AuthService:', branchAccess);
    
    if (branchAccess?.success) {
      this.state.setAccessibleBranches(branchAccess.data.accessibleBranches);
      this.state.setBranchHierarchy(branchAccess.data.branchHierarchy);
      this.state.setUserBranchRoles(branchAccess.data.userBranchRoles);
      console.log('✅ Branch data loaded from AuthService');
    } else {
      console.log('⚠️ No branch access from AuthService, trying API load...');
      // Try to load branch access from API, fallback to mock data
      this.loadBranchAccess();
    }

    // TEMPORARY: For testing, always load mock data if no branches are available
    setTimeout(() => {
      console.log('🔍 Final branch data check:', {
        accessibleBranches: this.state.accessibleBranches().length,
        canSwitchBranches: this.state.canSwitchBranches(),
        hasMultipleBranches: this.state.hasMultipleBranches(),
        currentUser: this.authService.getCurrentUser(),
        actualBranches: this.state.accessibleBranches()
      });
      
      if (this.state.accessibleBranches().length === 0) {
        console.log('🧪 Loading mock branch data for testing...');
        this.loadMockBranchData();
        
        // Verify mock data was loaded
        setTimeout(() => {
          console.log('📋 After mock data load:', {
            accessibleBranches: this.state.accessibleBranches().length,
            canSwitchBranches: this.state.canSwitchBranches(),
            actualBranches: this.state.accessibleBranches()
          });
        }, 100);
      }
    }, 1000);
  }

  private loadBranchAccess(): void {
    this.branchLoading.set(true);
    
    this.authService.loadUserBranchAccess()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (branchAccess) => {
          if (branchAccess.success) {
            this.state.setAccessibleBranches(branchAccess.data.accessibleBranches);
            this.state.setBranchHierarchy(branchAccess.data.branchHierarchy);
            this.state.setUserBranchRoles(branchAccess.data.userBranchRoles);
            console.log('🏢 Branch access loaded in TopbarComponent');
          }
        },
        error: (error) => {
          console.error('❌ Failed to load branch access:', error);
          this.showErrorMessage('Failed to load branch data');
        },
        complete: () => {
          this.branchLoading.set(false);
        }
      });
  }

  toggleBranchDropdown(): void {
    this.branchDropdownOpen.update(open => !open);
    if (this.branchDropdownOpen()) {
      // Clear search when opening
      this.branchSearchQuery.set('');
    }
  }

  selectBranch(branchId: number): void {
    if (!this.canSwitchBranches()) {
      this.showErrorMessage('You do not have permission to switch branches');
      return;
    }

    const branch = this.accessibleBranches().find(b => b.branchId === branchId);
    if (!branch) {
      this.showErrorMessage('Invalid branch selection');
      return;
    }

    // Update selected branch
    this.state.selectBranch(branchId);
    
    // Close dropdown
    this.branchDropdownOpen.set(false);
    this.branchSearchQuery.set('');
    
    // Show success message
    this.showSuccessMessage(`Switched to ${branch.branchName}`);
    
    console.log('🔄 Branch switched to:', branch.branchName);
  }

  toggleMultiSelectMode(): void {
    if (!this.canSwitchBranches()) {
      this.showErrorMessage('You do not have permission to select multiple branches');
      return;
    }

    const currentBranchId = this.selectedBranchId();
    if (currentBranchId) {
      this.state.setMultiSelectBranches([currentBranchId]);
      this.showSuccessMessage('Multi-branch mode enabled');
    }
  }

  toggleBranchSelection(branchId: number, event: Event): void {
    event.stopPropagation();
    
    if (!this.canSwitchBranches()) {
      this.showErrorMessage('You do not have permission to select branches');
      return;
    }

    this.state.toggleBranchSelection(branchId);
    
    const selectedCount = this.selectedBranchIds().length;
    if (selectedCount > 1) {
      this.showSuccessMessage(`${selectedCount} branches selected`);
    }
  }

  isBranchSelected(branchId: number): boolean {
    const selectedIds = this.selectedBranchIds();
    const currentId = this.selectedBranchId();
    return selectedIds.includes(branchId) || currentId === branchId;
  }

  onBranchSearchChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.branchSearchQuery.set(target.value);
  }

  getBranchIcon(branch: BranchAccessDto | null): string {
    if (!branch) return 'location_on';
    if (branch.isHeadOffice) return 'corporate_fare';
    if (branch.branchType === 'Branch') return 'store';
    if (branch.branchType === 'SubBranch') return 'storefront';
    return 'location_on';
  }

  getBranchAccessLevelColor(accessLevel: string): string {
    switch (accessLevel) {
      case 'Full': return 'var(--success)';
      case 'Limited': return 'var(--warning)';
      case 'ReadOnly': return 'var(--info)';
      default: return 'var(--text-secondary)';
    }
  }

  getBranchAccessLevelIcon(accessLevel: string): string {
    switch (accessLevel) {
      case 'Full': return 'admin_panel_settings';
      case 'Limited': return 'edit';
      case 'ReadOnly': return 'visibility';
      default: return 'help_outline';
    }
  }

  refreshBranchData(): void {
    this.loadBranchAccess();
  }

  clearBranchSelection(): void {
    if (!this.isMultiSelectMode()) return;
    
    this.state.setMultiSelectBranches([]);
    this.showSuccessMessage('Branch selection cleared');
  }

  // TEMPORARY: Load mock branch data for testing
  private loadMockBranchData(): void {
    const currentUser = this.authService.getCurrentUser();
    const mockBranchAccess = {
      success: true,
      data: {
        accessibleBranches: this.generateMockBranchAccess(currentUser),
        branchHierarchy: this.generateMockBranchHierarchy(),
        userBranchRoles: this.generateMockUserBranchRoles(currentUser),
        defaultBranchId: 1
      },
      message: 'Mock branch data loaded for testing'
    };

    this.state.setAccessibleBranches(mockBranchAccess.data.accessibleBranches);
    this.state.setBranchHierarchy(mockBranchAccess.data.branchHierarchy);
    this.state.setUserBranchRoles(mockBranchAccess.data.userBranchRoles);
    
    console.log('🧪 Mock branch data loaded:', mockBranchAccess.data.accessibleBranches.length, 'branches');
  }

  private generateMockBranchAccess(currentUser: any): BranchAccessDto[] {
    const isAdmin = currentUser?.role === 'Admin';
    const isManager = ['Manager', 'BranchManager', 'HeadManager'].includes(currentUser?.role || '');
    
    return [
      {
        branchId: 1,
        branchCode: 'HQ001',
        branchName: 'Cabang Utama Jakarta',
        branchType: 'Head',
        isHeadOffice: true,
        level: 0,
        canRead: true,
        canWrite: isAdmin || isManager,
        canManage: isAdmin,
        canTransfer: isAdmin || isManager,
        accessLevel: isAdmin ? 'Full' : isManager ? 'Limited' : 'ReadOnly'
      },
      {
        branchId: 2,
        branchCode: 'BR002',
        branchName: 'Cabang Bekasi Timur',
        branchType: 'Branch',
        isHeadOffice: false,
        level: 1,
        canRead: true,
        canWrite: isAdmin || isManager,
        canManage: isAdmin,
        canTransfer: isAdmin || isManager,
        accessLevel: isAdmin ? 'Full' : isManager ? 'Limited' : 'ReadOnly'
      },
      {
        branchId: 3,
        branchCode: 'BR003',
        branchName: 'Cabang Tangerang Selatan',
        branchType: 'Branch',
        isHeadOffice: false,
        level: 1,
        canRead: true,
        canWrite: isAdmin || isManager,
        canManage: isAdmin,
        canTransfer: isAdmin || isManager,
        accessLevel: isAdmin ? 'Full' : isManager ? 'Limited' : 'ReadOnly'
      }
    ];
  }

  private generateMockBranchHierarchy(): any[] {
    return [
      {
        branchId: 1,
        branchName: 'Cabang Utama Jakarta',
        branchCode: 'HQ001',
        branchType: 'Head',
        level: 0,
        children: [
          {
            branchId: 2,
            branchName: 'Cabang Bekasi Timur',
            branchCode: 'BR002',
            branchType: 'Branch',
            level: 1,
            parentBranchId: 1,
            children: []
          },
          {
            branchId: 3,
            branchName: 'Cabang Tangerang Selatan',
            branchCode: 'BR003',
            branchType: 'Branch',
            level: 1,
            parentBranchId: 1,
            children: []
          }
        ]
      }
    ];
  }

  private generateMockUserBranchRoles(currentUser: any): any[] {
    const userRole = currentUser?.role || 'User';
    const basePermissions = this.getRolePermissions(userRole);
    
    return [
      {
        branchId: 1,
        branchName: 'Cabang Utama Jakarta',
        role: userRole,
        permissions: basePermissions,
        canSwitchToOtherBranches: ['Admin', 'Manager', 'BranchManager', 'HeadManager'].includes(userRole),
        defaultBranch: true
      },
      {
        branchId: 2,
        branchName: 'Cabang Bekasi Timur',
        role: userRole,
        permissions: basePermissions.filter(p => p !== 'branch.manage'),
        canSwitchToOtherBranches: ['Admin', 'Manager', 'BranchManager', 'HeadManager'].includes(userRole),
        defaultBranch: false
      }
    ];
  }

  private getRolePermissions(role: string): string[] {
    const rolePermissions: Record<string, string[]> = {
      'Admin': ['inventory.write', 'facture.write', 'reports.export', 'users.manage', 'supplier.write', 'branch.manage'],
      'Manager': ['inventory.write', 'pos.operate', 'supplier.read'],
      'User': ['inventory.read', 'pos.operate'],
      'Cashier': ['pos.operate']
    };
    
    return rolePermissions[role] || ['pos.operate'];
  }

  // TrackBy function for branch list performance
  trackByBranch = (index: number, branch: BranchAccessDto): number => branch.branchId;

}