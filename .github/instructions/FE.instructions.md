# 🚀 Frontend Development Instructions - Toko Eniwan POS

_Updated Final Revision • Sprint 2-3 Complete • Enhanced for Sprint 4+ Implementation_

---

## ⚠️ CRITICAL CODE GENERATION RULES

### 🚫 **NEVER GENERATE CODE WITHOUT PERMISSION**

- **ALWAYS ASK**: "May I generate the code now, Tuan Maharaja Dika?"
- **EXPLAIN FIRST**: Describe component structure, patterns, and reasoning
- **WAIT FOR PERMISSION**: Only proceed after explicit "yes/boleh/silakan"
- **SUGGEST NEXT STEPS**: Provide recommendations after generation

### 🔄 **MANDATORY Workflow:**

```
1. Request: "Create SupplierListComponent"
2. Response:
   - "I'll create SupplierListComponent using Angular 20 standalone pattern"
   - "It will include signals for state, mobile-first responsive design"
   - "Uses OnPush change detection for performance optimization"
   - "Includes branch-aware supplier management and facture integration"
   - "MAY I GENERATE THE CODE NOW, Tuan Maharaja Dika?"
3. Wait for: "yes/boleh/silakan"
4. Generate: Component with proper patterns
5. Suggest: "Next, we should create SupplierService and SupplierDto interfaces"
```

---

## 🏗️ **Architecture & Technology Stack**

### **Core Technologies**

- **Angular 20** with Standalone Components
- **Angular Build System** for fast development and building
- **Angular Signals** for reactive state management
- **RxJS** for async operations and data streams
- **PWA** with Service Worker for offline functionality
- **Web Notification API** for browser/tab notifications
- **Clean Simple Design** (high contrast, no glass-morphism, no mixins)

### **Project Structure (Enhanced)**

```
src/app/
├── core/                 # Core services, guards, interceptors
│   ├── services/        # Global services (auth, state, theme, receipt, notification)
│   ├── guards/          # Route guards (auth, role-based)
│   ├── interceptors/    # HTTP interceptors (auth, error handling)
│   └── models/          # TypeScript interfaces/types
├── shared/              # Shared components, pipes, directives
│   ├── components/      # Reusable UI components (data-table, form-controls)
│   ├── pipes/           # Custom pipes (currency, date formatting)
│   ├── directives/      # Custom directives
│   └── utils/           # Utility functions
├── modules/             # Feature modules (Sprint-based organization)
│   ├── pos/            # Point of Sale (Sprint 2 ✅ Complete)
│   │   ├── pos/        # Main POS interface
│   │   ├── receipt-preview/  # Receipt generation & printing
│   │   ├── barcode-tools/    # Barcode scanner integration
│   │   └── transaction-detail/ # Transaction management
│   ├── inventory/      # Product & inventory management (Sprint 2 ✅ Complete)
│   ├── dashboard/      # Analytics dashboard (Sprint 3 ✅ Complete)
│   ├── notifications/  # Notification center (Sprint 3 ✅ Complete)
│   ├── membership/     # Member management (Sprint 2 ✅ Complete)
│   ├── supplier/       # Supplier management (Sprint 4 🔄 Next)
│   ├── facture/        # Facture management (Sprint 5 🔄 Future)
│   ├── branch/         # Branch management (Sprint 4 🔄 Next)
│   ├── member-debt/    # Member debt system (Sprint 5 🔄 Future)
│   └── user-profile/   # User profile management
├── layouts/            # Layout components (sidebar, topbar)
└── styles/             # Global styles (variables, components, utilities)
```

---

## 🎨 **Enhanced Design System (Clean & Simple)**

### **Global CSS Variables (High Contrast, No Mixins)**

```scss
// styles/variables.scss - Clean Simple Design System
:root {
  // High Contrast Color Palette - Light Theme Only
  --primary: #ff914d; // Orange primary
  --primary-hover: #e07a3b; // Orange hover
  --primary-light: #fff4ef; // Light orange background
  --success: #4bbf7b; // Green success
  --warning: #ffb84d; // Yellow warning
  --error: #e15a4f; // Red error
  --info: #3b82f6; // Blue info

  // High Contrast Surfaces - NO Transparency
  --surface: #ffffff; // Pure white surfaces
  --bg: #f8f9fa; // Light gray background
  --bg-secondary: #f5f5f5; // Secondary gray background
  --text: #212529; // Dark text for high contrast
  --text-secondary: #6c757d; // Secondary gray text
  --text-muted: #adb5bd; // Muted text
  --border: #dee2e6; // Light borders
  --shadow: rgba(0, 0, 0, 0.08); // Subtle shadows

  // NO Dark Theme Variables - Light Theme Only
  // NO Transparency/Opacity Usage
  // ALWAYS Ensure High Contrast Between Text and Background

  // Spacing System (8px grid)
  --s1: 4px;
  --s2: 8px;
  --s3: 12px;
  --s4: 16px;
  --s5: 20px;
  --s6: 24px;
  --s8: 32px;
  --s10: 40px;
  --s12: 48px;
  --s16: 64px;
  --s20: 80px;

  // Typography - Readable Sizes
  --text-xs: 12px;
  --text-sm: 14px;
  --text-base: 16px;
  --text-lg: 18px;
  --text-xl: 20px;
  --text-2xl: 24px;
  --text-3xl: 30px;
  --text-4xl: 36px;

  // Font Weights
  --font-normal: 400;
  --font-medium: 500;
  --font-semibold: 600;
  --font-bold: 700;

  // Line Heights
  --leading-tight: 1.25;
  --leading-normal: 1.5;
  --leading-relaxed: 1.75;

  // Simple Transitions - No Complex Animations
  --transition: 150ms ease;
  --transition-fast: 100ms ease;
  --transition-slow: 300ms ease;

  // Border Radius - Simple Rounded Corners
  --radius-sm: 4px;
  --radius: 6px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;

  // Simple Shadows - Minimal Depth
  --shadow-sm: 0 1px 3px var(--shadow);
  --shadow-md: 0 4px 12px var(--shadow);
  --shadow-lg: 0 8px 24px var(--shadow);

  // Mobile Responsive Breakpoints
  --mobile: 640px;
  --tablet: 768px;
  --desktop: 1024px;
  --wide: 1280px;
}

// Design Principles - Clean & Simple
// ✅ High contrast text/background combinations
// ✅ No transparency or opacity effects
// ✅ Light themes only - no dark modes
// ✅ Simple, clean, reusable components
// ❌ No "modern" glass effects or complex animations
// ❌ No dark themes or low contrast elements
// ❌ No transparency that reduces readability
```

### **Reusable Component Classes (Performance Optimized)**

```scss
// styles/components.scss - Clean Simple Components
.card {
  background: var(--surface);
  border: 2px solid var(--border); // High contrast borders
  border-radius: var(--radius-lg);
  padding: var(--s6);
  transition: var(--transition);

  // NO shadows, NO transparency - simple clean design
  &:hover {
    border-color: var(--primary);
  }
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--s2);
  padding: var(--s3) var(--s4);
  border: 2px solid transparent;
  border-radius: var(--radius);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  cursor: pointer;
  transition: var(--transition);
  text-decoration: none;
  min-height: 44px; // Touch target for mobile

  // High Contrast Button Variants
  &.btn-primary {
    background: var(--primary);
    color: white; // High contrast on primary
    border-color: var(--primary);

    &:hover:not(:disabled) {
      background: var(--primary-hover);
      border-color: var(--primary-hover);
    }
  }

  &.btn-outline {
    background: var(--surface);
    color: var(--text);
    border-color: var(--border);

    &:hover:not(:disabled) {
      background: var(--primary);
      color: white; // High contrast on hover
      border-color: var(--primary);
    }
  }

  &.btn-secondary {
    background: var(--bg-secondary);
    color: var(--text);
    border-color: var(--border);

    &:hover:not(:disabled) {
      background: var(--border);
    }
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
}

.form-field {
  margin-bottom: var(--s4);

  label {
    display: block;
    font-size: var(--text-sm);
    font-weight: var(--font-medium);
    color: var(--text);
    margin-bottom: var(--s2);
  }

  input,
  select,
  textarea {
    width: 100%;
    padding: var(--s3);
    border: 2px solid var(--border); // High contrast borders
    border-radius: var(--radius);
    font-size: var(--text-base);
    background: var(--surface);
    color: var(--text);
    transition: var(--transition);
    min-height: 44px; // Touch target

    &:focus {
      outline: none;
      border-color: var(--primary);
      // NO glow effects, simple border change
    }
  }

  .error-message {
    color: var(--error);
    font-size: var(--text-xs);
    margin-top: var(--s1);
  }
}

// Simple Grid System - No Mixins
.grid {
  display: grid;
  gap: var(--s6);

  &.grid-2 {
    grid-template-columns: repeat(2, 1fr);
  }
  &.grid-3 {
    grid-template-columns: repeat(3, 1fr);
  }
  &.grid-4 {
    grid-template-columns: repeat(4, 1fr);
  }
}
```

### **Mobile-First Responsive Layout (No Mixins)**

```scss
// styles/layout.scss - Mobile-First Clean Layout
.container {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 var(--s4);
}

// Mobile First - Stack everything
@media (max-width: 640px) {
  .grid-2,
  .grid-3,
  .grid-4 {
    grid-template-columns: 1fr;
  }

  .btn {
    min-height: 48px; // Larger touch targets on mobile
    padding: var(--s4) var(--s5);
  }

  .form-field input,
  .form-field select,
  .form-field textarea {
    min-height: 48px; // Touch-friendly inputs
  }
}

// Tablet - Show 2 columns for grid-3 and grid-4
@media (min-width: 641px) and (max-width: 1023px) {
  .grid-3,
  .grid-4 {
    grid-template-columns: repeat(2, 1fr);
  }
}

// Desktop - Full layout
@media (min-width: 1024px) {
  .grid-auto {
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  }
}
```

---

## 🧩 **Enhanced Component Architecture Patterns**

### **Standalone Component Template (Sprint 4+ Ready)**

```typescript
import { Component, input, output, signal, computed, inject, ChangeDetectionStrategy } from "@angular/core";
import { CommonModule } from "@angular/common";
import { ReactiveFormsModule } from "@angular/forms";

// Enhanced interfaces for Sprint 4+ features
export interface SupplierDto {
  id: number;
  supplierCode: string;
  companyName: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  paymentTerms: number;
  creditLimit: number;
  isActive: boolean;
  branchId?: number; // NEW: Branch-aware suppliers
  createdAt: string;
  updatedAt: string;
}

export interface BranchDto {
  id: number;
  branchCode: string;
  branchName: string;
  parentBranchId?: number;
  branchType: "Head" | "Branch" | "SubBranch";
  address: string;
  managerName: string;
  phone: string;
  isActive: boolean;
}

@Component({
  selector: "app-supplier-list",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule], // Minimal imports only
  changeDetection: ChangeDetectionStrategy.OnPush, // Performance optimization
  template: `
    <div class="supplier-container">
      <!-- Header with Actions -->
      <div class="flex justify-between items-center mb-6">
        <h2 class="text-2xl font-bold">Supplier Management</h2>

        <!-- Branch Filter for Multi-Branch Support -->
        <div class="flex gap-4 items-center">
          <select class="form-control" [(ngModel)]="selectedBranchId">
            <option value="">All Branches</option>
            <option *ngFor="let branch of branches()" [value]="branch.id">
              {{ branch.branchName }}
            </option>
          </select>

          <button class="btn btn-primary" (click)="onCreateSupplier()">Add Supplier</button>
        </div>
      </div>

      <!-- Search and Filters -->
      <div class="grid grid-3 gap-4 mb-6">
        <div class="form-field">
          <input type="text" placeholder="Search suppliers..." [(ngModel)]="searchQuery" (input)="onSearchChange($event)" class="form-control" />
        </div>

        <div class="form-field">
          <select [(ngModel)]="statusFilter" class="form-control">
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        <div class="form-field">
          <select [(ngModel)]="paymentTermsFilter" class="form-control">
            <option value="">All Payment Terms</option>
            <option value="30">30 Days</option>
            <option value="60">60 Days</option>
            <option value="90">90 Days</option>
          </select>
        </div>
      </div>

      <!-- Loading State -->
      <div *ngIf="loading()" class="text-center py-8">
        <div class="loading-spinner"></div>
        <p class="text-secondary mt-2">Loading suppliers...</p>
      </div>

      <!-- Error State -->
      <div *ngIf="error()" class="card error-card mb-4">
        <p class="text-error">{{ error() }}</p>
        <button class="btn btn-outline mt-2" (click)="loadSuppliers()">Try Again</button>
      </div>

      <!-- Mobile Card View -->
      <div class="mobile-view sm-block md-hidden">
        <div *ngFor="let supplier of filteredSuppliers(); trackBy: trackBySupplier" class="card mb-4 supplier-card">
          <div class="flex justify-between items-start">
            <div class="flex-1">
              <h4 class="text-lg font-semibold">{{ supplier.companyName }}</h4>
              <p class="text-sm text-secondary">{{ supplier.supplierCode }}</p>
              <p class="text-sm mt-2">Contact: {{ supplier.contactPerson }}</p>
              <p class="text-sm">Terms: {{ supplier.paymentTerms }} days</p>

              <div class="flex items-center gap-2 mt-3">
                <span class="badge" [class.badge-success]="supplier.isActive" [class.badge-secondary]="!supplier.isActive">
                  {{ supplier.isActive ? "Active" : "Inactive" }}
                </span>

                <!-- Branch Info for Multi-Branch -->
                <span *ngIf="supplier.branchId" class="badge badge-info">
                  {{ getBranchName(supplier.branchId) }}
                </span>
              </div>
            </div>

            <!-- Mobile Actions -->
            <div class="flex flex-col gap-2 ml-4">
              <button class="btn btn-sm btn-outline" (click)="onEditSupplier(supplier)">Edit</button>
              <button class="btn btn-sm btn-outline" (click)="onViewFactures(supplier)">Factures</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Desktop Table View -->
      <div class="desktop-view sm-hidden md-block">
        <div class="card">
          <table class="w-full">
            <thead>
              <tr class="border-b">
                <th class="text-left p-3 font-medium">Supplier Code</th>
                <th class="text-left p-3 font-medium">Company Name</th>
                <th class="text-left p-3 font-medium">Contact Person</th>
                <th class="text-left p-3 font-medium">Payment Terms</th>
                <th class="text-left p-3 font-medium">Credit Limit</th>
                <th class="text-left p-3 font-medium">Branch</th>
                <th class="text-left p-3 font-medium">Status</th>
                <th class="text-left p-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let supplier of filteredSuppliers(); trackBy: trackBySupplier" class="border-b hover:bg-secondary transition-colors">
                <td class="p-3 text-sm font-medium">{{ supplier.supplierCode }}</td>
                <td class="p-3 text-sm">{{ supplier.companyName }}</td>
                <td class="p-3 text-sm">{{ supplier.contactPerson }}</td>
                <td class="p-3 text-sm">{{ supplier.paymentTerms }} days</td>
                <td class="p-3 text-sm">{{ formatCurrency(supplier.creditLimit) }}</td>
                <td class="p-3 text-sm">
                  <span *ngIf="supplier.branchId" class="badge badge-info">
                    {{ getBranchName(supplier.branchId) }}
                  </span>
                  <span *ngIf="!supplier.branchId" class="text-muted">All Branches</span>
                </td>
                <td class="p-3 text-sm">
                  <span class="badge" [class.badge-success]="supplier.isActive" [class.badge-secondary]="!supplier.isActive">
                    {{ supplier.isActive ? "Active" : "Inactive" }}
                  </span>
                </td>
                <td class="p-3 text-sm">
                  <div class="flex gap-2">
                    <button class="btn btn-sm btn-outline" (click)="onEditSupplier(supplier)">Edit</button>
                    <button class="btn btn-sm btn-outline" (click)="onViewFactures(supplier)">Factures</button>
                    <button class="btn btn-sm" [class.btn-primary]="!supplier.isActive" [class.btn-secondary]="supplier.isActive" (click)="onToggleStatus(supplier)">
                      {{ supplier.isActive ? "Deactivate" : "Activate" }}
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Empty State -->
      <div *ngIf="filteredSuppliers().length === 0 && !loading()" class="empty-state">
        <div class="text-center py-12">
          <div class="text-6xl mb-4">🏢</div>
          <h3 class="text-lg font-medium mb-2">No suppliers found</h3>
          <p class="text-secondary mb-4">Start by adding your first supplier.</p>
          <button class="btn btn-primary" (click)="onCreateSupplier()">Add Supplier</button>
        </div>
      </div>

      <!-- Simple Pagination -->
      <div class="pagination mt-6" *ngIf="totalPages() > 1">
        <div class="flex justify-between items-center">
          <button class="btn btn-outline" [disabled]="currentPage() === 1" (click)="previousPage()">Previous</button>

          <span class="text-sm text-secondary"> Page {{ currentPage() }} of {{ totalPages() }} </span>

          <button class="btn btn-outline" [disabled]="currentPage() === totalPages()" (click)="nextPage()">Next</button>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .supplier-container {
        padding: var(--s6);
        max-width: 1200px;
        margin: 0 auto;
      }

      .supplier-card {
        transition: var(--transition);

        &:hover {
          border-color: var(--primary);
        }
      }

      .badge {
        padding: var(--s1) var(--s2);
        border-radius: var(--radius);
        font-size: var(--text-xs);
        font-weight: var(--font-medium);

        &.badge-success {
          background: var(--success);
          color: white;
        }

        &.badge-secondary {
          background: var(--bg-secondary);
          color: var(--text);
        }

        &.badge-info {
          background: var(--info);
          color: white;
        }
      }

      .btn-sm {
        padding: var(--s2) var(--s3);
        font-size: var(--text-xs);
        min-height: 36px;
      }

      .loading-spinner {
        width: 24px;
        height: 24px;
        border: 2px solid var(--border);
        border-top: 2px solid var(--primary);
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin: 0 auto;
      }

      @keyframes spin {
        0% {
          transform: rotate(0deg);
        }
        100% {
          transform: rotate(360deg);
        }
      }

      .error-card {
        border-color: var(--error);
        background: rgba(225, 90, 79, 0.1);
      }

      // Mobile responsiveness
      @media (max-width: 640px) {
        .supplier-container {
          padding: var(--s4);
        }

        .grid-3 {
          grid-template-columns: 1fr;
        }

        .flex {
          flex-direction: column;
          gap: var(--s3);
        }
      }
    `,
  ],
})
export class SupplierListComponent {
  // Inject services
  private supplierService = inject(SupplierService);
  private branchService = inject(BranchService);
  private router = inject(Router);
  private notificationService = inject(NotificationService);

  // Signal-based state management
  suppliers = signal<SupplierDto[]>([]);
  branches = signal<BranchDto[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);

  // Filter state
  searchQuery = signal("");
  statusFilter = signal<string>("");
  paymentTermsFilter = signal<string>("");
  selectedBranchId = signal<number | null>(null);

  // Pagination state
  currentPage = signal(1);
  pageSize = signal(20);

  // Computed properties for efficient filtering
  filteredSuppliers = computed(() => {
    let filtered = this.suppliers();

    // Search filter
    const search = this.searchQuery().toLowerCase();
    if (search) {
      filtered = filtered.filter((supplier) => supplier.companyName.toLowerCase().includes(search) || supplier.supplierCode.toLowerCase().includes(search) || supplier.contactPerson.toLowerCase().includes(search));
    }

    // Status filter
    const status = this.statusFilter();
    if (status) {
      filtered = filtered.filter((supplier) => (status === "active" ? supplier.isActive : !supplier.isActive));
    }

    // Payment terms filter
    const paymentTerms = this.paymentTermsFilter();
    if (paymentTerms) {
      filtered = filtered.filter((supplier) => supplier.paymentTerms === parseInt(paymentTerms));
    }

    // Branch filter
    const branchId = this.selectedBranchId();
    if (branchId) {
      filtered = filtered.filter((supplier) => supplier.branchId === branchId);
    }

    // Pagination
    const start = (this.currentPage() - 1) * this.pageSize();
    return filtered.slice(start, start + this.pageSize());
  });

  totalPages = computed(() => Math.ceil(this.suppliers().length / this.pageSize()));

  // TrackBy function for performance
  trackBySupplier = (index: number, supplier: SupplierDto): number => supplier.id;

  ngOnInit() {
    this.loadSuppliers();
    this.loadBranches();
  }

  // Data loading methods
  async loadSuppliers(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);

    try {
      const response = await this.supplierService.getSuppliers();
      if (response.success) {
        this.suppliers.set(response.data);
      } else {
        this.error.set(response.message || "Failed to load suppliers");
      }
    } catch (error: any) {
      this.error.set("Network error occurred");
      console.error("Error loading suppliers:", error);
    } finally {
      this.loading.set(false);
    }
  }

  async loadBranches(): Promise<void> {
    try {
      const response = await this.branchService.getBranches();
      if (response.success) {
        this.branches.set(response.data);
      }
    } catch (error) {
      console.error("Error loading branches:", error);
    }
  }

  // Event handlers
  onSearchChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.searchQuery.set(target.value);
    this.currentPage.set(1); // Reset to first page on search
  }

  onCreateSupplier(): void {
    this.router.navigate(["/dashboard/supplier/create"]);
  }

  onEditSupplier(supplier: SupplierDto): void {
    this.router.navigate(["/dashboard/supplier/edit", supplier.id]);
  }

  onViewFactures(supplier: SupplierDto): void {
    this.router.navigate(["/dashboard/facture"], {
      queryParams: { supplierId: supplier.id },
    });
  }

  async onToggleStatus(supplier: SupplierDto): Promise<void> {
    try {
      const response = await this.supplierService.updateSupplierStatus(supplier.id, !supplier.isActive);

      if (response.success) {
        // Update local state
        this.suppliers.update((suppliers) => suppliers.map((s) => (s.id === supplier.id ? { ...s, isActive: !s.isActive } : s)));

        this.notificationService.showSuccess(`Supplier ${supplier.isActive ? "deactivated" : "activated"} successfully`);
      } else {
        this.notificationService.showError(response.message || "Failed to update supplier");
      }
    } catch (error) {
      this.notificationService.showError("Network error occurred");
    }
  }

  // Pagination methods
  previousPage(): void {
    if (this.currentPage() > 1) {
      this.currentPage.update((page) => page - 1);
    }
  }

  nextPage(): void {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.update((page) => page + 1);
    }
  }

  // Utility methods
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  }

  getBranchName(branchId: number): string {
    const branch = this.branches().find((b) => b.id === branchId);
    return branch?.branchName || "Unknown Branch";
  }
}
```

---

## 🔔 **Enhanced Notification & PWA Patterns**

### **Browser Notification Service (Enhanced)**

```typescript
import { Injectable, signal, computed } from "@angular/core";

export interface NotificationDto {
  id: number;
  type: string;
  title: string;
  message: string;
  priority: "Low" | "Medium" | "High" | "Critical";
  isRead: boolean;
  actionUrl?: string;
  relatedId?: number;
  createdAt: string;
  branchId?: number; // NEW: Branch-specific notifications
}

@Injectable({ providedIn: "root" })
export class BrowserNotificationService {
  private permission = signal<NotificationPermission>("default");
  private notificationCount = signal<number>(0);

  // Computed properties
  readonly canNotify = computed(() => this.permission() === "granted");
  readonly shouldRequestPermission = computed(() => this.permission() === "default");

  constructor() {
    if ("Notification" in window) {
      this.permission.set(Notification.permission as NotificationPermission);
    }
  }

  async requestPermission(): Promise<boolean> {
    if (!("Notification" in window)) {
      console.warn("This browser does not support notifications");
      return false;
    }

    if (this.permission() === "granted") return true;

    const permission = await Notification.requestPermission();
    this.permission.set(permission as NotificationPermission);
    return permission === "granted";
  }

  // Enhanced notification with priority handling
  showNotification(notification: NotificationDto): void {
    if (this.permission() !== "granted") {
      console.warn("Notification permission not granted");
      return;
    }

    const options: NotificationOptions = {
      icon: "/assets/icons/icon-192x192.png",
      badge: "/assets/icons/badge-72x72.png",
      dir: "ltr",
      lang: "id-ID",
      renotify: true,
      tag: notification.type,
      data: {
        id: notification.id,
        actionUrl: notification.actionUrl,
        relatedId: notification.relatedId,
      },
    };

    // Priority-based behavior
    switch (notification.priority) {
      case "Critical":
        options.requireInteraction = true;
        options.silent = false;
        this.showTabNotification(1, "URGENT");
        break;
      case "High":
        options.requireInteraction = false;
        options.silent = false;
        this.showTabNotification(this.notificationCount() + 1);
        break;
      case "Medium":
        options.requireInteraction = false;
        options.silent = true;
        this.showTabNotification(this.notificationCount() + 1);
        break;
      case "Low":
        // Only tab notification for low priority
        this.showTabNotification(this.notificationCount() + 1);
        return;
    }

    const browserNotification = new Notification(notification.title, {
      body: notification.message,
      ...options,
    });

    browserNotification.onclick = (event) => {
      event.preventDefault();
      window.focus();

      // Navigate to action URL if provided
      if (notification.actionUrl) {
        window.location.href = notification.actionUrl;
      }

      browserNotification.close();
    };

    // Auto close for non-critical notifications
    if (notification.priority !== "Critical") {
      setTimeout(() => browserNotification.close(), 5000);
    }
  }

  showTabNotification(count: number, title?: string): void {
    this.notificationCount.set(count);
    this.updateFaviconBadge(count);

    if (count > 0) {
      const baseTitle = "Toko Eniwan POS";
      const notificationTitle = title ?? "New Notifications";
      document.title = `(${count}) ${notificationTitle} - ${baseTitle}`;
    } else {
      document.title = "Toko Eniwan POS";
    }
  }

  private updateFaviconBadge(count: number): void {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    canvas.width = canvas.height = 32;

    if (ctx && count > 0) {
      // Draw orange circle with count
      ctx.fillStyle = "#FF914D";
      ctx.beginPath();
      ctx.arc(16, 16, 16, 0, 2 * Math.PI);
      ctx.fill();

      ctx.fillStyle = "white";
      ctx.font = "bold 18px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      const text = count > 99 ? "!" : String(count);
      ctx.fillText(text, 16, 16);
    }

    const link = document.querySelector('link[rel="icon"]') as HTMLLinkElement;
    if (link) {
      link.href = canvas.toDataURL();
    }
  }

  clearTabNotification(): void {
    this.showTabNotification(0);
  }

  // Enhanced methods for different notification types
  showDebtReminder(memberName: string, amount: number, dueDate: string): void {
    this.showNotification({
      id: Date.now(),
      type: "DEBT_REMINDER",
      title: "Payment Reminder",
      message: `${memberName} has payment of ${this.formatCurrency(amount)} due on ${dueDate}`,
      priority: "High",
      isRead: false,
      createdAt: new Date().toISOString(),
    });
  }

  showFactureOverdue(supplierName: string, factureNumber: string): void {
    this.showNotification({
      id: Date.now(),
      type: "FACTURE_OVERDUE",
      title: "Facture Overdue",
      message: `Facture ${factureNumber} from ${supplierName} is overdue`,
      priority: "Critical",
      isRead: false,
      actionUrl: `/dashboard/facture/${factureNumber}`,
      createdAt: new Date().toISOString(),
    });
  }

  showLowStock(productName: string, currentStock: number): void {
    this.showNotification({
      id: Date.now(),
      type: "LOW_STOCK",
      title: "Low Stock Alert",
      message: `${productName} is running low (${currentStock} remaining)`,
      priority: "Medium",
      isRead: false,
      actionUrl: "/dashboard/inventory",
      createdAt: new Date().toISOString(),
    });
  }

  private formatCurrency(amount: number): string {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  }
}
```

---

## 🚀 **Enhanced State Management with Signals**

### **Global State Service (Sprint 4+ Ready)**

```typescript
import { Injectable, signal, computed, inject } from "@angular/core";

export interface UserDto {
  id: number;
  username: string;
  role: "Admin" | "Manager" | "User" | "Cashier";
  fullName?: string;
  email?: string;
  branchId?: number; // NEW: User's assigned branch
}

export interface BranchContextDto {
  currentBranchId: number | null;
  availableBranches: BranchDto[];
  canSwitchBranches: boolean;
}

@Injectable({ providedIn: "root" })
export class StateService {
  // Private state signals
  private _user = signal<UserDto | null>(null);
  private _sidebarCollapsed = signal<boolean>(false);
  private _notifications = signal<NotificationDto[]>([]);
  private _loading = signal<boolean>(false);
  private _branchContext = signal<BranchContextDto>({
    currentBranchId: null,
    availableBranches: [],
    canSwitchBranches: false,
  });

  // Public readonly state
  readonly user = this._user.asReadonly();
  readonly sidebarCollapsed = this._sidebarCollapsed.asReadonly();
  readonly notifications = this._notifications.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly branchContext = this._branchContext.asReadonly();

  // Computed state
  readonly isAuthenticated = computed(() => this._user() !== null);

  readonly unreadNotificationCount = computed(() => this._notifications().filter((n) => !n.isRead).length);

  readonly criticalNotificationCount = computed(() => this._notifications().filter((n) => !n.isRead && n.priority === "Critical").length);

  readonly currentBranch = computed(() => {
    const context = this._branchContext();
    return context.availableBranches.find((b) => b.id === context.currentBranchId) || null;
  });

  readonly userPermissions = computed(() => {
    const user = this._user();
    if (!user) return [];

    // Enhanced role permissions for Sprint 4+
    const rolePermissions: Record<string, string[]> = {
      Admin: ["inventory.write", "facture.write", "reports.export", "users.manage", "supplier.write", "branch.manage", "member-debt.write"],
      Manager: ["inventory.write", "facture.write", "reports.export", "supplier.write", "member-debt.write"],
      User: ["inventory.write", "pos.operate", "supplier.read"],
      Cashier: ["pos.operate", "member-debt.read"],
    };

    return rolePermissions[user.role] || [];
  });

  readonly canManageBranches = computed(() => this.hasPermission("branch.manage"));

  readonly canManageSuppliers = computed(() => this.hasPermission("supplier.write"));

  readonly canManageMemberDebt = computed(() => this.hasPermission("member-debt.write"));

  // Actions
  setUser(user: UserDto | null): void {
    this._user.set(user);

    // Set default branch context for user
    if (user?.branchId) {
      this.setBranchContext({
        currentBranchId: user.branchId,
        availableBranches: [],
        canSwitchBranches: ["Admin", "Manager"].includes(user.role),
      });
    }
  }

  setBranchContext(context: BranchContextDto): void {
    this._branchContext.set(context);
    localStorage.setItem("current-branch-id", String(context.currentBranchId));
  }

  switchBranch(branchId: number): void {
    const context = this._branchContext();
    if (context.canSwitchBranches) {
      this._branchContext.update((ctx) => ({
        ...ctx,
        currentBranchId: branchId,
      }));
      localStorage.setItem("current-branch-id", String(branchId));
    }
  }

  toggleSidebar(): void {
    this._sidebarCollapsed.update((collapsed) => !collapsed);
    localStorage.setItem("sidebar-collapsed", this._sidebarCollapsed().toString());
  }

  setLoading(loading: boolean): void {
    this._loading.set(loading);
  }

  // Enhanced notification management
  addNotification(notification: NotificationDto): void {
    this._notifications.update((notifications) => [notification, ...notifications]);

    // Show browser notification for high priority
    if (["High", "Critical"].includes(notification.priority)) {
      const browserService = inject(BrowserNotificationService);
      browserService.showNotification(notification);
    }
  }

  addDebtNotification(memberName: string, amount: number, dueDate: string): void {
    this.addNotification({
      id: Date.now(),
      type: "MEMBER_DEBT_DUE",
      title: "Member Payment Due",
      message: `${memberName} has payment of ${this.formatCurrency(amount)} due on ${dueDate}`,
      priority: "High",
      isRead: false,
      actionUrl: "/dashboard/member-debt",
      createdAt: new Date().toISOString(),
    });
  }

  addFactureNotification(supplierName: string, factureNumber: string, dueDate: string): void {
    this.addNotification({
      id: Date.now(),
      type: "FACTURE_DUE",
      title: "Facture Payment Due",
      message: `Facture ${factureNumber} from ${supplierName} is due on ${dueDate}`,
      priority: "High",
      isRead: false,
      actionUrl: `/dashboard/facture/${factureNumber}`,
      createdAt: new Date().toISOString(),
    });
  }

  markNotificationAsRead(notificationId: number): void {
    this._notifications.update((notifications) => notifications.map((n) => (n.id === notificationId ? { ...n, isRead: true } : n)));
  }

  markAllNotificationsAsRead(): void {
    this._notifications.update((notifications) => notifications.map((n) => ({ ...n, isRead: true })));
  }

  clearNotifications(): void {
    this._notifications.set([]);
  }

  // Permission check utility
  hasPermission(permission: string): boolean {
    return this.userPermissions().includes(permission);
  }

  // Initialize state from localStorage
  initializeFromStorage(): void {
    const sidebarCollapsed = localStorage.getItem("sidebar-collapsed") === "true";
    this._sidebarCollapsed.set(sidebarCollapsed);

    const currentBranchId = localStorage.getItem("current-branch-id");
    if (currentBranchId) {
      this._branchContext.update((ctx) => ({
        ...ctx,
        currentBranchId: parseInt(currentBranchId),
      }));
    }
  }

  private formatCurrency(amount: number): string {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  }
}
```

---

## 🗂️ **Enhanced Service Patterns (Sprint 4+ Ready)**

### **Supplier Service with Branch Support**

```typescript
import { Injectable, signal, computed, inject } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { environment } from "../../../environment/environment";

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  errors?: string[];
}

export interface CreateSupplierDto {
  supplierCode: string;
  companyName: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  paymentTerms: number;
  creditLimit: number;
  branchId?: number;
}

export interface UpdateSupplierDto extends Partial<CreateSupplierDto> {
  isActive?: boolean;
}

export interface SupplierQueryParams {
  search?: string;
  branchId?: number;
  isActive?: boolean;
  paymentTerms?: number;
  page?: number;
  pageSize?: number;
}

@Injectable({ providedIn: "root" })
export class SupplierService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/Supplier`;

  // Signal-based state
  private _suppliers = signal<SupplierDto[]>([]);
  private _loading = signal<boolean>(false);
  private _error = signal<string | null>(null);

  // Public readonly signals
  readonly suppliers = this._suppliers.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();

  // Computed properties
  readonly activeSuppliers = computed(() => this._suppliers().filter((s) => s.isActive));

  readonly suppliersByBranch = computed(() => {
    const suppliers = this._suppliers();
    const grouped = new Map<number | string, SupplierDto[]>();

    suppliers.forEach((supplier) => {
      const branchKey = supplier.branchId || "all-branches";
      if (!grouped.has(branchKey)) {
        grouped.set(branchKey, []);
      }
      grouped.get(branchKey)!.push(supplier);
    });

    return grouped;
  });

  // CRUD Operations
  async getSuppliers(params?: SupplierQueryParams): Promise<ApiResponse<SupplierDto[]>> {
    this._loading.set(true);
    this._error.set(null);

    try {
      const queryParams = new URLSearchParams();
      if (params?.search) queryParams.append("search", params.search);
      if (params?.branchId) queryParams.append("branchId", params.branchId.toString());
      if (params?.isActive !== undefined) queryParams.append("isActive", params.isActive.toString());
      if (params?.paymentTerms) queryParams.append("paymentTerms", params.paymentTerms.toString());
      if (params?.page) queryParams.append("page", params.page.toString());
      if (params?.pageSize) queryParams.append("pageSize", params.pageSize.toString());

      const url = `${this.baseUrl}?${queryParams.toString()}`;
      const response = await this.http.get<ApiResponse<SupplierDto[]>>(url).toPromise();

      if (response?.success) {
        this._suppliers.set(response.data);
        return response;
      } else {
        this._error.set(response?.message || "Failed to load suppliers");
        return response || { success: false, data: [], message: "Failed to load suppliers" };
      }
    } catch (error: any) {
      this._error.set("Network error occurred");
      console.error("Error loading suppliers:", error);
      return { success: false, data: [], message: "Network error occurred" };
    } finally {
      this._loading.set(false);
    }
  }

  async createSupplier(supplier: CreateSupplierDto): Promise<ApiResponse<SupplierDto>> {
    this._loading.set(true);

    try {
      const response = await this.http.post<ApiResponse<SupplierDto>>(this.baseUrl, supplier).toPromise();

      if (response?.success && response.data) {
        // Update local state
        this._suppliers.update((suppliers) => [...suppliers, response.data]);
        return response;
      }

      return response || { success: false, data: {} as SupplierDto, message: "Failed to create supplier" };
    } catch (error) {
      console.error("Error creating supplier:", error);
      return { success: false, data: {} as SupplierDto, message: "Network error occurred" };
    } finally {
      this._loading.set(false);
    }
  }

  async updateSupplierStatus(id: number, isActive: boolean): Promise<ApiResponse<boolean>> {
    try {
      const response = await this.http.patch<ApiResponse<boolean>>(`${this.baseUrl}/${id}/status`, { isActive }).toPromise();

      if (response?.success) {
        // Update local state
        this._suppliers.update((suppliers) => suppliers.map((s) => (s.id === id ? { ...s, isActive } : s)));
      }

      return response || { success: false, data: false, message: "Failed to update supplier status" };
    } catch (error) {
      console.error("Error updating supplier status:", error);
      return { success: false, data: false, message: "Network error occurred" };
    }
  }

  // Utility methods
  clearError(): void {
    this._error.set(null);
  }

  refreshSuppliers(): void {
    this.getSuppliers();
  }
}
```

---

## 📝 **Final Development Checklist (Sprint 4+ Ready)**

### ✅ **Enhanced Must-Have Requirements**

#### **Component Level:**

- [ ] Standalone component with OnPush change detection
- [ ] Signal-based state management with computed properties
- [ ] Mobile-first responsive design (card/table views)
- [ ] Touch targets minimum 44px (48px on mobile)
- [ ] TrackBy functions for all \*ngFor loops
- [ ] Proper error handling with user-friendly messages
- [ ] Loading states with skeleton loaders
- [ ] TypeScript strict mode compliance
- [ ] High contrast design (no transparency/opacity)
- [ ] Branch-aware functionality (where applicable)

#### **Service Level:**

- [ ] Signal-based state with readonly selectors
- [ ] Comprehensive CRUD operations
- [ ] Proper error handling and retry logic
- [ ] Branch filtering and multi-tenant support
- [ ] Optimistic updates for better UX
- [ ] Caching strategy for performance
- [ ] Real-time updates via SignalR integration

#### **Form Level:**

- [ ] Reactive forms with comprehensive validation
- [ ] Real-time validation feedback
- [ ] Custom validators for business rules
- [ ] Proper accessibility attributes
- [ ] Touch-friendly inputs on mobile
- [ ] Progress indication for multi-step forms
- [ ] Auto-save functionality (where appropriate)

### ✅ **Sprint 4+ Specific Requirements**

#### **Branch Management:**

- [ ] Hierarchical branch display
- [ ] Branch user assignment
- [ ] Branch-specific data filtering
- [ ] Parent-child relationship management
- [ ] Branch performance metrics

#### **Supplier Management:**

- [ ] Supplier CRUD with branch assignment
- [ ] Credit limit and payment terms
- [ ] Contact validation and management
- [ ] Supplier performance tracking
- [ ] Integration with facture system

#### **Enhanced Notifications:**

- [ ] Branch-specific notifications
- [ ] Priority-based notification handling
- [ ] Debt and facture reminder system
- [ ] Real-time browser notifications
- [ ] Tab notification badges

### ✅ **Performance & Accessibility**

#### **Performance:**

- [ ] Lazy loading for feature modules
- [ ] Minimal component styles (use global classes)
- [ ] Efficient change detection (OnPush + signals)
- [ ] Optimized bundle size
- [ ] Fast rendering (avoid expensive operations in templates)

#### **Mobile & Responsive:**

- [ ] Mobile-first CSS (no mixins, CSS variables only)
- [ ] Touch-friendly interactions
- [ ] Readable text without zoom
- [ ] Efficient navigation for thumbs
- [ ] Responsive grid system

#### **Accessibility:**

- [ ] WCAG 2.1 AA compliance
- [ ] Proper ARIA labels and roles
- [ ] Keyboard navigation support
- [ ] Screen reader compatibility
- [ ] High contrast text/background ratios

---

## 🎯 **Summary & Next Steps**

This enhanced frontend development guide now includes:

### ✅ **Completed Sprint Features (Reference Patterns):**

- **Sprint 2**: POS System, Receipt Generation, Barcode Scanner
- **Sprint 3**: Dashboard Analytics, Notification System

### ✅ **Sprint 4+ Ready Patterns:**

- **Supplier Management**: Complete CRUD with branch support
- **Branch Management**: Hierarchical structure management
- **Enhanced Notifications**: Priority-based, branch-aware notifications
- **Member Debt System**: Credit limit and payment tracking
- **Facture System**: Supplier invoice management

### ✅ **Enhanced Architecture:**

- **Multi-tenant Branch Support**: Branch-aware components and services
- **Advanced State Management**: Enhanced StateService with branch context
- **Notification Integration**: Browser and tab notifications with priorities
- **Mobile-First Responsive**: Card/table views with touch optimization
- **Performance Optimized**: Signals, OnPush, minimal imports

### 🚀 **Ready for Implementation:**

The guidelines now provide complete patterns for implementing Sprint 4+ features while maintaining consistency with the completed Sprint 2-3 architecture. All components follow the clean, simple design principles with high contrast and mobile-first responsive design.

**Next development priorities:**

1. **Sprint 4**: Supplier Management + Branch Setup + Category-Based Expiry
2. **Sprint 5**: Member Debt System + Facture Management
3. **Sprint 6**: Enhanced PWA + Advanced Notifications

All patterns are ready for immediate implementation following the mandatory permission workflow! 🎯
