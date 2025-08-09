# Frontend Development Instructions - Toko Eniwan POS

## ⚠️ CRITICAL CODE GENERATION RULES

### 🚫 **NEVER GENERATE CODE WITHOUT PERMISSION**

- **ALWAYS ASK**: "May I generate the code now, Tuan Maharaja Dika?"
- **EXPLAIN FIRST**: Describe component structure, patterns, and reasoning
- **WAIT FOR PERMISSION**: Only proceed after explicit "yes/boleh/silakan"
- **SUGGEST NEXT STEPS**: Provide recommendations after generation

### 🔄 **MANDATORY Workflow:**

```
1. Request: "Create ProductListComponent"
2. Response:
   - "I'll create ProductListComponent using Angular 20 standalone pattern"
   - "It will include signals for state, mobile-first responsive design"
   - "Uses OnPush change detection for performance optimization"
   - "MAY I GENERATE THE CODE NOW, Tuan Maharaja Dika?"
3. Wait for: "yes/boleh/silakan"
4. Generate: Component with proper patterns
5. Suggest: "Next, we should create ProductService and ProductDto interfaces"
```

---

## 🏗️ **Architecture & Stack**

### Technology Stack

- **Angular 20** with Standalone Components
- **Angular Build System** for fast development and building
- **Angular Signals** for reactive state management
- **RxJS** for async operations and data streams
- **PWA** with Service Worker for offline functionality
- **Web Notification API** for browser/tab notifications
- **Modern Simple Design** (no glass-morphism, no mixins)

### Project Structure

```
src/app/
├── core/                 # Core services, guards, interceptors
│   ├── services/        # Global services (auth, state, theme)
│   ├── guards/          # Route guards
│   ├── interceptors/    # HTTP interceptors
│   └── models/          # TypeScript interfaces/types
├── shared/              # Shared components, pipes, directives
│   ├── components/      # Reusable UI components
│   ├── pipes/           # Custom pipes
│   ├── directives/      # Custom directives
│   └── utils/           # Utility functions
├── modules/             # Feature modules
│   ├── pos/            # Point of Sale
│   ├── inventory/      # Product & inventory management
│   ├── facture/        # Facture management
│   ├── supplier/       # Supplier management
│   ├── notifications/  # Notification center
│   └── user-profile/   # User profile management
├── layouts/            # Layout components
└── styles/             # Global styles (variables, components, utilities)
```

---

## 🎨 **Modern Simple Design System**

### Global CSS Variables (No Mixins)

```scss
// styles/variables.scss - Global Variables Only
:root {
  // Colors - Light Theme
  --primary: #ff914d;
  --primary-hover: #e07a3b;
  --primary-light: #fff4ef;
  --success: #4bbf7b;
  --warning: #ffb84d;
  --error: #e15a4f;
  --surface: #ffffff;
  --bg: #fafafa;
  --bg-secondary: #f5f5f5;
  --text: #1a1a1a;
  --text-secondary: #4a5568;
  --border: #e5e5e5;
  --shadow: rgba(0, 0, 0, 0.08);

  // Dark Theme
  --surface-dark: #2d3748;
  --bg-dark: #1a202c;
  --bg-secondary-dark: #2d3748;
  --text-dark: #f7fafc;
  --text-secondary-dark: #a0aec0;
  --border-dark: #4a5568;
  --shadow-dark: rgba(0, 0, 0, 0.3);

  // Spacing (8px grid system)
  --s1: 4px;
  --s2: 8px;
  --s3: 12px;
  --s4: 16px;
  --s5: 20px;
  --s6: 24px;
  --s8: 32px;
  --s10: 40px;
  --s12: 48px;

  // Typography
  --text-xs: 12px;
  --text-sm: 14px;
  --text-base: 16px;
  --text-lg: 18px;
  --text-xl: 20px;
  --text-2xl: 24px;
  --text-3xl: 32px;

  // Borders & Effects
  --radius: 6px;
  --radius-lg: 8px;
  --border-width: 1px;
  --transition: 150ms ease;

  // Shadows (simple, minimal)
  --shadow-sm: 0 1px 3px var(--shadow);
  --shadow-md: 0 4px 12px var(--shadow);

  // Mobile responsive breakpoints
  --mobile: 640px;
  --tablet: 768px;
  --desktop: 1024px;
}

// Dark theme application
:root[data-theme="dark"] {
  --surface: var(--surface-dark);
  --bg: var(--bg-dark);
  --bg-secondary: var(--bg-secondary-dark);
  --text: var(--text-dark);
  --text-secondary: var(--text-secondary-dark);
  --border: var(--border-dark);
  --shadow: var(--shadow-dark);
}
```

### Reusable Component Classes

```scss
// styles/components.scss - Reusable Component Classes
.card {
  background: var(--surface);
  border: var(--border-width) solid var(--border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
  padding: var(--s6);
  transition: box-shadow var(--transition);

  &:hover {
    box-shadow: var(--shadow-md);
  }
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: var(--s3) var(--s4);
  border: none;
  border-radius: var(--radius);
  font-size: var(--text-sm);
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition);
  text-decoration: none;
  min-height: 44px; /* Touch target for mobile */

  &.btn-primary {
    background: var(--primary);
    color: white;

    &:hover:not(:disabled) {
      background: var(--primary-hover);
    }
  }

  &.btn-outline {
    background: transparent;
    border: var(--border-width) solid var(--border);
    color: var(--text);

    &:hover:not(:disabled) {
      background: var(--bg-secondary);
      border-color: var(--primary);
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
    font-weight: 500;
    color: var(--text);
    margin-bottom: var(--s2);
  }

  input,
  select,
  textarea {
    width: 100%;
    padding: var(--s3);
    border: var(--border-width) solid var(--border);
    border-radius: var(--radius);
    font-size: var(--text-base);
    background: var(--surface);
    color: var(--text);
    transition: border-color var(--transition);
    min-height: 44px; /* Touch target */

    &:focus {
      outline: none;
      border-color: var(--primary);
      box-shadow: 0 0 0 3px rgba(255, 145, 77, 0.1);
    }
  }

  .error-message {
    color: var(--error);
    font-size: var(--text-xs);
    margin-top: var(--s1);
  }
}

// Grid system
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

### Mobile-First Responsive Layout (No Mixins)

```scss
// styles/layout.scss - Mobile-First Responsive Layout
.container {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 var(--s4);
}

.topbar {
  height: 64px;
  background: var(--surface);
  border-bottom: var(--border-width) solid var(--border);
  padding: 0 var(--s4);
  display: flex;
  align-items: center;
  justify-content: space-between;

  .logo {
    font-size: var(--text-xl);
    font-weight: 700;
    color: var(--primary);
  }

  .nav-actions {
    display: flex;
    align-items: center;
    gap: var(--s3);
  }
}

.sidebar {
  width: 240px;
  background: var(--surface);
  border-right: var(--border-width) solid var(--border);
  height: 100vh;
  position: fixed;
  left: 0;
  top: 64px;
  transform: translateX(-100%);
  transition: transform var(--transition);
  z-index: 100;

  &.open {
    transform: translateX(0);
  }

  .nav-item {
    display: flex;
    align-items: center;
    padding: var(--s4);
    color: var(--text);
    text-decoration: none;
    transition: background-color var(--transition);
    min-height: 48px; /* Touch target */

    &:hover {
      background: var(--bg-secondary);
    }

    &.active {
      background: var(--primary-light);
      color: var(--primary);
      border-right: 3px solid var(--primary);
    }

    .icon {
      margin-right: var(--s3);
      font-size: var(--text-lg);
    }
  }
}

.main-content {
  margin-left: 0;
  padding: var(--s6) var(--s4);
  min-height: calc(100vh - 64px);
  transition: margin-left var(--transition);
}

/* Mobile First - Stack everything */
@media (max-width: 640px) {
  .grid-2,
  .grid-3,
  .grid-4 {
    grid-template-columns: 1fr;
  }

  .btn {
    min-height: 48px; /* Larger touch targets on mobile */
    padding: var(--s4) var(--s5);
  }

  .card {
    padding: var(--s4);
  }

  .sidebar {
    width: 100%;
  }
}

/* Tablet - Show sidebar, adjust grid */
@media (min-width: 641px) and (max-width: 1023px) {
  .grid-3,
  .grid-4 {
    grid-template-columns: repeat(2, 1fr);
  }

  .sidebar {
    position: relative;
    transform: translateX(0);
    height: calc(100vh - 64px);
  }

  .main-content {
    margin-left: 240px;
    padding: var(--s8);
  }
}

/* Desktop - Full layout */
@media (min-width: 1024px) {
  .sidebar {
    position: relative;
    transform: translateX(0);
    height: calc(100vh - 64px);
  }

  .main-content {
    margin-left: 240px;
    padding: var(--s10);
  }

  .grid-auto {
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  }
}
```

### Utility Classes (Minimal)

```scss
// styles/utilities.scss - Minimal Utility Classes
.text-xs {
  font-size: var(--text-xs);
}
.text-sm {
  font-size: var(--text-sm);
}
.text-base {
  font-size: var(--text-base);
}
.text-lg {
  font-size: var(--text-lg);
}

.text-primary {
  color: var(--text);
}
.text-secondary {
  color: var(--text-secondary);
}
.text-success {
  color: var(--success);
}
.text-warning {
  color: var(--warning);
}
.text-error {
  color: var(--error);
}

.flex {
  display: flex;
}
.flex-col {
  flex-direction: column;
}
.items-center {
  align-items: center;
}
.justify-center {
  justify-content: center;
}
.justify-between {
  justify-content: space-between;
}

.w-full {
  width: 100%;
}
.h-full {
  height: 100%;
}

.p-2 {
  padding: var(--s2);
}
.p-4 {
  padding: var(--s4);
}
.p-6 {
  padding: var(--s6);
}

.m-2 {
  margin: var(--s2);
}
.m-4 {
  margin: var(--s4);
}
.m-6 {
  margin: var(--s6);
}

.hidden {
  display: none;
}

/* Mobile utilities */
@media (max-width: 640px) {
  .sm-hidden {
    display: none;
  }
  .sm-block {
    display: block;
  }
  .sm-flex {
    display: flex;
  }
  .sm-text-sm {
    font-size: var(--text-sm);
  }
}

/* Tablet utilities */
@media (min-width: 641px) and (max-width: 1023px) {
  .md-hidden {
    display: none;
  }
  .md-block {
    display: block;
  }
  .md-flex {
    display: flex;
  }
}
```

---

## 🧩 **Component Architecture Patterns**

### Standalone Component Template (Performance Optimized)

```typescript
import { Component, input, output, signal, computed, inject, ChangeDetectionStrategy } from "@angular/core";
import { CommonModule } from "@angular/common";

export interface EntityDto {
  id: number;
  name: string;
  // ... other properties
}

@Component({
  selector: "app-entity-component",
  standalone: true,
  imports: [CommonModule], // Minimal imports only
  changeDetection: ChangeDetectionStrategy.OnPush, // Performance optimization
  template: `
    <div class="card">
      <!-- Mobile-first responsive template -->
      <div class="flex justify-between items-center">
        <h3 class="text-lg">{{ data().name }}</h3>
        <span class="badge" [class]="statusClass()">{{ status() }}</span>
      </div>

      <!-- Hide details on mobile, show on tablet+ -->
      <div class="sm-hidden md-block">
        <p class="text-sm text-secondary">Additional info here</p>
      </div>

      <div class="flex justify-between items-center mt-4">
        <div class="flex flex-col">
          <span class="text-xs text-secondary">Secondary info</span>
          <span class="text-sm">Primary info</span>
        </div>

        <div class="flex gap-2">
          <button class="btn btn-outline" (click)="onEdit()">Edit</button>
          <button class="btn btn-primary" (click)="onAction()">Action</button>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .badge {
        padding: var(--s1) var(--s2);
        border-radius: var(--radius);
        font-size: var(--text-xs);
        font-weight: 500;

        &.success {
          background: var(--success);
          color: white;
        }
        &.warning {
          background: var(--warning);
          color: white;
        }
        &.error {
          background: var(--error);
          color: white;
        }
      }

      @media (max-width: 640px) {
        .btn {
          font-size: var(--text-xs);
          padding: var(--s2) var(--s3);
        }
      }
    `,
  ],
})
export class EntityComponent {
  // Signal inputs (Angular 20 feature)
  data = input.required<EntityDto>();

  // Signal outputs
  edit = output<EntityDto>();
  action = output<EntityDto>();

  // Internal state signals
  loading = signal(false);
  error = signal<string | null>(null);

  // Computed properties (efficient reactivity)
  status = computed(() => {
    const item = this.data();
    // Simple business logic here
    return item.name ? "Active" : "Inactive";
  });

  statusClass = computed(() => {
    const status = this.status();
    return status === "Active" ? "success" : "warning";
  });

  // Event handlers
  onEdit(): void {
    this.edit.emit(this.data());
  }

  onAction(): void {
    this.action.emit(this.data());
  }
}
```

### Service Pattern with Signals

```typescript
import { Injectable, signal, computed, inject } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { environment } from "../../environments/environment";

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
  errors: string[];
}

@Injectable({ providedIn: "root" })
export class EntityService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/Entity`;

  // Signal-based state management
  private _entities = signal<EntityDto[]>([]);
  private _loading = signal<boolean>(false);
  private _error = signal<string | null>(null);

  // Public read-only signals
  readonly entities = this._entities.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();

  // CRUD operations with proper error handling
  async getEntities(): Promise<void> {
    this._loading.set(true);
    this._error.set(null);

    try {
      const response = await this.http.get<ApiResponse<EntityDto[]>>(this.baseUrl).toPromise();
      if (response?.success) {
        this._entities.set(response.data);
      } else {
        this._error.set(response?.message || "Failed to load entities");
      }
    } catch (error) {
      this._error.set("Network error occurred");
      console.error("Error loading entities:", error);
    } finally {
      this._loading.set(false);
    }
  }
}
```

---

## 🛡️ **Guards & Interceptors**

### Auth Guard with Signals

```typescript
import { Injectable, inject } from "@angular/core";
import { CanActivate, Router, ActivatedRouteSnapshot } from "@angular/router";
import { StateService } from "../services/state.service";

@Injectable({ providedIn: "root" })
export class AuthGuard implements CanActivate {
  private readonly stateService = inject(StateService);
  private readonly router = inject(Router);

  async canActivate(route: ActivatedRouteSnapshot): Promise<boolean> {
    // Check if user is authenticated
    if (!this.stateService.isAuthenticated()) {
      await this.router.navigate(["/login"]);
      return false;
    }

    // Check role-based permissions
    const requiredRoles = route.data?.["roles"] as string[];
    if (requiredRoles) {
      const user = this.stateService.user();
      if (!user || !requiredRoles.includes(user.role)) {
        await this.router.navigate(["/dashboard"]);
        return false;
      }
    }

    // Check permission-based access
    const requiredPermission = route.data?.["permission"] as string;
    if (requiredPermission && !this.stateService.hasPermission(requiredPermission)) {
      await this.router.navigate(["/dashboard"]);
      return false;
    }

    return true;
  }
}
```

### HTTP Interceptor for API calls

```typescript
import { Injectable, inject } from "@angular/core";
import { HttpInterceptor, HttpRequest, HttpHandler, HttpErrorResponse } from "@angular/common/http";
import { Router } from "@angular/router";
import { StateService } from "../services/state.service";
import { catchError, finalize, throwError } from "rxjs";

@Injectable()
export class ApiInterceptor implements HttpInterceptor {
  private readonly router = inject(Router);
  private readonly stateService = inject(StateService);

  intercept(req: HttpRequest<any>, next: HttpHandler) {
    // Show loading for API requests
    this.stateService.setLoading(true);

    // Add common headers
    const apiReq = req.clone({
      setHeaders: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      withCredentials: true, // Include cookies for authentication
    });

    return next.handle(apiReq).pipe(
      catchError((error: HttpErrorResponse) => this.handleError(error)),
      finalize(() => this.stateService.setLoading(false))
    );
  }

  private handleError(error: HttpErrorResponse) {
    switch (error.status) {
      case 401:
        this.router.navigate(["/login"]);
        this.showError("Session expired. Please login again.");
        break;

      case 403:
        this.showError("You do not have permission to perform this action.");
        break;

      case 404:
        this.showError("Resource not found.");
        break;

      case 500:
        this.showError("Server error occurred. Please try again later.");
        break;

      default:
        if (error.error?.message) {
          this.showError(error.error.message);
        } else {
          this.showError("An unexpected error occurred.");
        }
        break;
    }

    return throwError(() => error);
  }

  private showError(message: string): void {
    // You can integrate with a toast service here
    console.error(message);
  }
}
```

---

## 📱 **Form Handling Patterns**

### Reactive Form with Validation (Performance Optimized)

```typescript
import { Component, inject, signal, computed, ChangeDetectionStrategy } from "@angular/core";
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from "@angular/forms";
import { CommonModule } from "@angular/common";

export interface CreateProductDto {
  name: string;
  barcode: string;
  expiryDate: string; // MANDATORY
  batchNumber?: string;
  manufacturedDate?: string;
  buyPrice: number;
  sellPrice: number;
  stock: number;
  categoryId: number;
}

@Component({
  selector: "app-product-form",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <form [formGroup]="productForm" (ngSubmit)="onSubmit()" class="form-container">
      <div class="grid grid-2 gap-4">
        <!-- Basic Information -->
        <div class="form-field">
          <label for="name">Product Name *</label>
          <input id="name" formControlName="name" placeholder="Enter product name" />
          <span class="error-message" *ngIf="isFieldInvalid('name')">
            {{ getFieldError("name") }}
          </span>
        </div>

        <div class="form-field">
          <label for="barcode">Barcode *</label>
          <input id="barcode" formControlName="barcode" placeholder="Scan or enter barcode" />
          <span class="error-message" *ngIf="isFieldInvalid('barcode')">
            {{ getFieldError("barcode") }}
          </span>
        </div>

        <!-- Mandatory Expiry Date -->
        <div class="form-field">
          <label for="expiryDate">Expiry Date *</label>
          <input id="expiryDate" type="date" formControlName="expiryDate" />
          <span class="error-message" *ngIf="isFieldInvalid('expiryDate')">
            {{ getFieldError("expiryDate") }}
          </span>
        </div>

        <div class="form-field">
          <label for="batchNumber">Batch Number</label>
          <input id="batchNumber" formControlName="batchNumber" placeholder="Optional batch number" />
        </div>

        <!-- Pricing -->
        <div class="form-field">
          <label for="buyPrice">Buy Price *</label>
          <input id="buyPrice" type="number" formControlName="buyPrice" placeholder="0" />
          <span class="error-message" *ngIf="isFieldInvalid('buyPrice')">
            {{ getFieldError("buyPrice") }}
          </span>
        </div>

        <div class="form-field">
          <label for="sellPrice">Sell Price *</label>
          <input id="sellPrice" type="number" formControlName="sellPrice" placeholder="0" />
          <span class="error-message" *ngIf="isFieldInvalid('sellPrice')">
            {{ getFieldError("sellPrice") }}
          </span>
        </div>
      </div>

      <!-- Profit Preview -->
      <div class="profit-preview" *ngIf="profitMargin() !== null">
        <div class="card">
          <h4>Profit Analysis</h4>
          <p>
            Margin: <strong>{{ profitMargin() }}%</strong>
          </p>
          <p>
            Profit per Unit: <strong>{{ profitAmount() }}</strong>
          </p>
        </div>
      </div>

      <div class="flex justify-between mt-6">
        <button type="button" class="btn btn-outline" (click)="onCancel()">Cancel</button>
        <button type="submit" class="btn btn-primary" [disabled]="productForm.invalid || submitting()">
          {{ submitting() ? "Saving..." : "Save Product" }}
        </button>
      </div>
    </form>
  `,
  styles: [
    `
      .form-container {
        max-width: 800px;
        margin: 0 auto;
        padding: var(--s6);
        background: var(--surface);
        border-radius: var(--radius-lg);
        border: var(--border-width) solid var(--border);
      }

      .profit-preview .card {
        background: var(--primary-light);
        border-color: var(--primary);
        padding: var(--s4);
      }

      .profit-preview h4 {
        margin: 0 0 var(--s2) 0;
        font-size: var(--text-base);
        color: var(--primary);
      }

      .profit-preview p {
        margin: 0;
        font-size: var(--text-sm);
      }

      @media (max-width: 640px) {
        .form-container {
          padding: var(--s4);
        }

        .grid-2 {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class ProductFormComponent {
  private fb = inject(FormBuilder);
  private productService = inject(ProductService);

  // Signals for component state
  submitting = signal(false);
  categories = signal<CategoryDto[]>([]);

  // Form definition
  productForm: FormGroup;

  // Computed properties for business logic
  profitMargin = computed(() => {
    const buyPrice = this.productForm.get("buyPrice")?.value;
    const sellPrice = this.productForm.get("sellPrice")?.value;

    if (!buyPrice || !sellPrice || buyPrice <= 0) return null;

    return Math.round(((sellPrice - buyPrice) / buyPrice) * 100);
  });

  profitAmount = computed(() => {
    const buyPrice = this.productForm.get("buyPrice")?.value || 0;
    const sellPrice = this.productForm.get("sellPrice")?.value || 0;

    const profit = sellPrice - buyPrice;
    return this.formatCurrency(profit);
  });

  constructor() {
    this.productForm = this.fb.group({
      name: ["", [Validators.required, Validators.maxLength(100)]],
      barcode: ["", [Validators.required, Validators.maxLength(50)]],
      expiryDate: ["", Validators.required], // MANDATORY
      batchNumber: ["", Validators.maxLength(50)],
      manufacturedDate: [""],
      buyPrice: [0, [Validators.required, Validators.min(0)]],
      sellPrice: [0, [Validators.required, Validators.min(0)]],
      stock: [0, [Validators.required, Validators.min(0)]],
      categoryId: ["", Validators.required],
    });

    // Add custom validators
    this.productForm.addValidators([this.sellPriceGreaterThanBuyPrice.bind(this), this.expiryDateFutureValidator.bind(this)]);
  }

  async onSubmit(): Promise<void> {
    if (this.productForm.invalid) {
      this.markAllFieldsAsTouched();
      return;
    }

    this.submitting.set(true);

    try {
      const formValue = this.productForm.value as CreateProductDto;
      await this.productService.createProduct(formValue);

      // Success - navigate back or show success message
      this.onCancel();
    } catch (error) {
      console.error("Error saving product:", error);
      // Handle error - show toast or error message
    } finally {
      this.submitting.set(false);
    }
  }

  onCancel(): void {
    // Navigate back to product list
    // Router navigation logic
  }

  // Form validation helpers
  isFieldInvalid(fieldName: string): boolean {
    const field = this.productForm.get(fieldName);
    return !!(field?.invalid && (field?.dirty || field?.touched));
  }

  getFieldError(fieldName: string): string {
    const field = this.productForm.get(fieldName);

    if (field?.hasError("required")) {
      return `${this.getFieldLabel(fieldName)} is required`;
    }

    if (field?.hasError("maxlength")) {
      const maxLength = field.errors?.["maxlength"].requiredLength;
      return `${this.getFieldLabel(fieldName)} cannot exceed ${maxLength} characters`;
    }

    if (field?.hasError("min")) {
      return `${this.getFieldLabel(fieldName)} must be greater than 0`;
    }

    if (field?.hasError("sellPriceTooLow")) {
      return "Sell price must be greater than buy price";
    }

    if (field?.hasError("expiryDatePast")) {
      return "Expiry date must be in the future";
    }

    return "Invalid input";
  }

  // Custom validators
  private sellPriceGreaterThanBuyPrice(form: FormGroup) {
    const buyPrice = form.get("buyPrice")?.value;
    const sellPrice = form.get("sellPrice")?.value;

    if (buyPrice && sellPrice && sellPrice <= buyPrice) {
      form.get("sellPrice")?.setErrors({ sellPriceTooLow: true });
      return { sellPriceTooLow: true };
    }

    return null;
  }

  private expiryDateFutureValidator(form: FormGroup) {
    const expiryDate = form.get("expiryDate")?.value;

    if (expiryDate && new Date(expiryDate) <= new Date()) {
      form.get("expiryDate")?.setErrors({ expiryDatePast: true });
      return { expiryDatePast: true };
    }

    return null;
  }

  private markAllFieldsAsTouched(): void {
    Object.keys(this.productForm.controls).forEach((key) => {
      this.productForm.get(key)?.markAsTouched();
    });
  }

  private getFieldLabel(fieldName: string): string {
    const labels: Record<string, string> = {
      name: "Product Name",
      barcode: "Barcode",
      expiryDate: "Expiry Date",
      buyPrice: "Buy Price",
      sellPrice: "Sell Price",
    };

    return labels[fieldName] || fieldName;
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

## 📊 **Data Table Component (Mobile Responsive)**

### Reusable Data Table with Mobile Support

```typescript
import { Component, input, output, computed, ChangeDetectionStrategy } from "@angular/core";
import { CommonModule } from "@angular/common";

export interface TableColumn {
  key: string;
  label: string;
  sortable?: boolean;
  width?: string;
  type?: "text" | "number" | "date" | "currency" | "badge" | "actions";
  mobileHidden?: boolean; // Hide on mobile
}

export interface TableAction {
  icon: string;
  label: string;
  color?: string;
  action: (row: any) => void;
}

@Component({
  selector: "app-data-table",
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="table-container">
      <!-- Mobile Card View -->
      <div class="mobile-view sm-block md-hidden">
        <div *ngFor="let row of paginatedData(); trackBy: trackByFn" class="mobile-card card">
          <div class="flex justify-between items-start">
            <div class="flex-1">
              <h4 class="text-base font-medium">{{ row[primaryColumn()] }}</h4>
              <div class="mt-2 space-y-1">
                <div *ngFor="let col of visibleColumns()" class="text-sm">
                  <span class="text-secondary">{{ col.label }}:</span>
                  <span class="ml-2" [ngSwitch]="col.type">
                    <span *ngSwitchCase="'currency'">{{ formatCurrency(row[col.key]) }}</span>
                    <span *ngSwitchCase="'date'">{{ formatDate(row[col.key]) }}</span>
                    <span *ngSwitchCase="'badge'" class="badge" [class]="getBadgeClass(row[col.key])">
                      {{ row[col.key] }}
                    </span>
                    <span *ngSwitchDefault>{{ row[col.key] }}</span>
                  </span>
                </div>
              </div>
            </div>

            <!-- Mobile Actions -->
            <div class="flex gap-1 ml-4">
              <button *ngFor="let action of actions()" class="btn btn-sm" [style.color]="action.color" (click)="action.action(row)">
                {{ action.icon }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Desktop Table View -->
      <div class="desktop-view sm-hidden md-block">
        <div class="table-wrapper">
          <table class="w-full">
            <thead>
              <tr class="border-b">
                <th *ngFor="let col of columns()" class="text-left p-3 text-sm font-medium" [style.width]="col.width" [class.cursor-pointer]="col.sortable" (click)="col.sortable ? onSort(col.key) : null">
                  {{ col.label }}
                  <span *ngIf="col.sortable && currentSort() === col.key">
                    {{ sortDirection() === "asc" ? "↑" : "↓" }}
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let row of paginatedData(); trackBy: trackByFn" class="border-b hover:bg-secondary transition-colors">
                <td *ngFor="let col of columns()" class="p-3 text-sm">
                  <ng-container [ngSwitch]="col.type">
                    <span *ngSwitchCase="'currency'">
                      {{ formatCurrency(row[col.key]) }}
                    </span>
                    <span *ngSwitchCase="'date'">
                      {{ formatDate(row[col.key]) }}
                    </span>
                    <span *ngSwitchCase="'badge'" class="badge" [class]="getBadgeClass(row[col.key])">
                      {{ row[col.key] }}
                    </span>
                    <div *ngSwitchCase="'actions'" class="flex gap-2">
                      <button *ngFor="let action of actions()" class="btn btn-sm btn-outline" [style.color]="action.color" [attr.title]="action.label" (click)="action.action(row)">
                        {{ action.icon }}
                      </button>
                    </div>
                    <span *ngSwitchDefault>{{ row[col.key] }}</span>
                  </ng-container>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Empty State -->
      <div *ngIf="data().length === 0" class="empty-state">
        <div class="text-center p-8">
          <div class="text-6xl mb-4">📝</div>
          <h3 class="text-lg font-medium mb-2">No data available</h3>
          <p class="text-secondary">{{ emptyMessage() }}</p>
        </div>
      </div>

      <!-- Simple Pagination -->
      <div class="pagination" *ngIf="totalPages() > 1">
        <div class="flex justify-between items-center p-4 border-t">
          <button class="btn btn-outline" [disabled]="currentPage() === 1" (click)="previousPage()">Previous</button>

          <span class="text-sm text-secondary"> Page {{ currentPage() }} of {{ totalPages() }} </span>

          <button class="btn btn-outline" [disabled]="currentPage() === totalPages()" (click)="nextPage()">Next</button>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .table-container {
        background: var(--surface);
        border: var(--border-width) solid var(--border);
        border-radius: var(--radius-lg);
        overflow: hidden;
      }

      .table-wrapper {
        overflow-x: auto;
      }

      table {
        min-width: 600px;
      }

      .mobile-card {
        margin-bottom: var(--s4);
        padding: var(--s4);
      }

      .badge {
        padding: var(--s1) var(--s2);
        border-radius: var(--radius);
        font-size: var(--text-xs);
        font-weight: 500;

        &.success {
          background: var(--success);
          color: white;
        }
        &.warning {
          background: var(--warning);
          color: white;
        }
        &.error {
          background: var(--error);
          color: white;
        }
        &.secondary {
          background: var(--bg-secondary);
          color: var(--text);
        }
      }

      .btn-sm {
        padding: var(--s1) var(--s2);
        font-size: var(--text-xs);
        min-height: 32px;
      }

      .space-y-1 > * + * {
        margin-top: var(--s1);
      }

      @media (max-width: 640px) {
        table {
          min-width: 500px;
        }
        .p-3 {
          padding: var(--s2);
        }
      }
    `,
  ],
})
export class DataTableComponent<T> {
  // Inputs
  data = input.required<T[]>();
  columns = input.required<TableColumn[]>();
  actions = input<TableAction[]>([]);
  pageSize = input<number>(20);
  emptyMessage = input<string>("No data to display");

  // Internal state
  currentPage = signal<number>(1);
  currentSort = signal<string>("");
  sortDirection = signal<"asc" | "desc">("asc");

  // Outputs
  pageChange = output<number>();
  sortChange = output<{ column: string; direction: "asc" | "desc" }>();

  // Computed properties
  totalPages = computed(() => Math.ceil(this.data().length / this.pageSize()));

  paginatedData = computed(() => {
    let sortedData = [...this.data()];

    // Apply sorting
    if (this.currentSort()) {
      sortedData.sort((a, b) => {
        const aValue = a[this.currentSort() as keyof T];
        const bValue = b[this.currentSort() as keyof T];

        let comparison = 0;
        if (aValue > bValue) comparison = 1;
        if (aValue < bValue) comparison = -1;

        return this.sortDirection() === "desc" ? -comparison : comparison;
      });
    }

    // Apply pagination
    const start = (this.currentPage() - 1) * this.pageSize();
    return sortedData.slice(start, start + this.pageSize());
  });

  // For mobile view - columns that aren't actions and aren't hidden
  visibleColumns = computed(
    () =>
      this.columns()
        .filter((col) => col.type !== "actions" && !col.mobileHidden)
        .slice(0, 3) // Show max 3 columns on mobile
  );

  // Primary column for mobile card title
  primaryColumn = computed(() => this.columns().find((col) => col.type === "text")?.key || this.columns()[0]?.key || "id");

  // TrackBy function for performance
  trackByFn = (index: number, item: T): any => {
    return (item as any).id || index;
  };

  // Pagination methods
  previousPage(): void {
    if (this.currentPage() > 1) {
      this.currentPage.update((page) => page - 1);
      this.pageChange.emit(this.currentPage());
    }
  }

  nextPage(): void {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.update((page) => page + 1);
      this.pageChange.emit(this.currentPage());
    }
  }

  // Sorting
  onSort(column: string): void {
    if (this.currentSort() === column) {
      // Toggle direction
      this.sortDirection.update((dir) => (dir === "asc" ? "desc" : "asc"));
    } else {
      // New column
      this.currentSort.set(column);
      this.sortDirection.set("asc");
    }

    this.sortChange.emit({
      column: this.currentSort(),
      direction: this.sortDirection(),
    });
  }

  // Formatting utilities
  formatCurrency = (value: number): string =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(value);

  formatDate = (value: string): string => new Date(value).toLocaleDateString("id-ID");

  getBadgeClass = (value: string): string => {
    const classes: Record<string, string> = {
      Active: "success",
      Inactive: "secondary",
      "Low Stock": "warning",
      "Out of Stock": "error",
      Pending: "warning",
      Approved: "success",
      Cancelled: "error",
    };
    return classes[value] || "secondary";
  };
}
```

---

## 🚀 **Performance Optimization Guidelines**

### Essential Performance Rules

1. **OnPush change detection** for all components
2. **Minimal imports** - only import what you need
3. **TrackBy functions** for all \*ngFor loops
4. **Lazy loading** for feature modules
5. **CSS variables** instead of computed styles
6. **Single transition** value (150ms ease)
7. **Signals** for reactive state management
8. **Minimal component styles** - use global classes

### Mobile Performance Optimization

```typescript
// Mobile-specific optimizations
export class MobileOptimizedComponent {
  // Use computed signals for expensive calculations
  expensiveCalculation = computed(() => {
    // Only recalculates when dependencies change
    return this.data().reduce((sum, item) => sum + item.value, 0);
  });

  // Efficient event handling
  @HostListener("touchstart", ["$event"], { passive: true })
  onTouchStart(event: TouchEvent): void {
    // Passive event listeners for better scroll performance
  }

  // Virtual scrolling for large lists
  trackByFn = (index: number, item: any): any => item.id;
}
```

---

## 📋 **Final Checklist for All Frontend Code**

### ✅ **Must Have:**

- [ ] Standalone component with minimal imports
- [ ] OnPush change detection strategy
- [ ] Signal-based state management
- [ ] Mobile-first responsive design
- [ ] Touch targets minimum 44px
- [ ] TrackBy functions for \*ngFor loops
- [ ] Proper error handling and loading states
- [ ] TypeScript strict mode compliance
- [ ] Accessibility attributes (aria-label, etc.)

### ✅ **Performance:**

- [ ] Lazy loading for feature modules
- [ ] Minimal component styles (use global classes)
- [ ] Efficient change detection (OnPush + signals)
- [ ] Optimized bundle size
- [ ] Fast rendering (avoid complex calculations in templates)

### ✅ **Mobile & Responsive:**

- [ ] Mobile-first CSS (no mixins)
- [ ] Touch-friendly interactions
- [ ] Readable text without zoom
- [ ] Efficient navigation for thumbs
- [ ] Responsive grid system

siap! aku rapihin markdown-nya biar rapi, konsisten, dan enak dibaca. aku juga benerin fence code + bahasa untuk highlight, menutup blok yang kepotong, dan bikin struktur langkahnya jelas.

---

## 🔧 Development Workflow for Copilot

### ✅ Langkah Wajib

#### 1) Request Analysis

```text
User Request: "Create ProductListComponent with filters"

Assistant Analysis:
- Component menampilkan daftar produk dengan pagination
- Ada search dan filter kategori
- Desain mobile-responsive: card (mobile) / table (desktop)
- Menggunakan Signals untuk state management
- Ada loading dan error states
```

#### 2) Approach Explanation

```text
"I'll create ProductListComponent with these features:
- Standalone Angular 20 component (ChangeDetection: OnPush)
- Mobile-first responsive (cards on mobile, table on desktop)
- Signal-based state + computed filters
- Search & category filter
- Pagination (Previous/Next)
- Loading skeleton & error handling
- Touch-friendly interactions"
```

#### 3) Permission Request

```text
"MAY I GENERATE THE CODE NOW, Tuan Maharaja Dika?"
```

#### 4) Wait for Permission

```text
Tunggu persetujuan eksplisit: "yes", "boleh", "silakan", "go ahead"
```

#### 5) Code Generation

```text
Generate komponen lengkap dan fungsional mengikuti pola & guideline di atas.
```

#### 6) Next Steps Suggestion

```text
"Component generated successfully!

Suggested next steps:
1. Buat ProductService untuk manajemen data
2. Tambah ProductDto interface untuk type safety
3. Implement ProductFilterComponent (advanced filtering)
4. Tambah unit tests
5. Integrasi dengan routing & navigation

Which would you like to implement next, Tuan Maharaja Dika?"
```

> **Ingat, Tuan Maharaja Dika**: Jangan pernah generate kode tanpa izin eksplisit. Selalu jelaskan pendekatan dulu, minta izin, baru generate kode yang bersih, performan, dan mobile-first. Setelah itu, selalu sarankan next steps yang logis.

---

## 🧱 (Opsional) Contoh Service: Entity Service dengan Signals

> Catatan: Bagian ini hanya contoh format rapi untuk snippet yang tadi kepotong. Sesuaikan tipe (`EntityDto`, `CreateEntityDto`, `ApiResponse`) dan `baseUrl` dengan proyek Anda.

```typescript
import { Injectable, computed, signal } from "@angular/core";
import { HttpClient } from "@angular/common/http";

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

interface EntityDto {
  id: string;
  name: string;
  isActive: boolean;
}

interface CreateEntityDto {
  name: string;
  isActive?: boolean;
}

@Injectable({ providedIn: "root" })
export class EntityService {
  private readonly baseUrl = "/api/entities";

  // State signals
  private readonly _entities = signal<EntityDto[]>([]);
  private readonly _loading = signal<boolean>(false);
  private readonly _error = signal<string | null>(null);

  // Readonly selectors
  readonly entities = this._entities.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();

  // Computed signals
  readonly activeEntities = computed(() => this._entities().filter((e) => e.isActive));
  readonly entityCount = computed(() => this._entities().length);

  constructor(private readonly http: HttpClient) {}

  // CRUD Operations with proper error handling
  async getEntities(): Promise<void> {
    this._loading.set(true);
    this._error.set(null);
    try {
      const response = await this.http.get<ApiResponse<EntityDto[]>>(this.baseUrl).toPromise();

      if (response?.success) {
        this._entities.set(response.data);
      } else {
        this._error.set(response?.message ?? "Failed to load entities");
      }
    } catch (error) {
      this._error.set("Network error occurred");
      console.error("Error loading entities:", error);
    } finally {
      this._loading.set(false);
    }
  }

  async createEntity(entity: CreateEntityDto): Promise<EntityDto | null> {
    this._loading.set(true);
    try {
      const response = await this.http.post<ApiResponse<EntityDto>>(this.baseUrl, entity).toPromise();

      if (response?.success && response.data) {
        this._entities.update((entities) => [...entities, response.data]);
        return response.data;
      } else {
        this._error.set(response?.message ?? "Failed to create entity");
        return null;
      }
    } catch (error) {
      this._error.set("Failed to create entity");
      console.error("Error creating entity:", error);
      return null;
    } finally {
      this._loading.set(false);
    }
  }

  // Utilities
  clearError(): void {
    this._error.set(null);
  }
}
```

---

## 🔔 Browser & Tab Notification System

### Browser Notification Service

```typescript
import { Injectable, signal } from "@angular/core";

export type NotificationPermission = "default" | "granted" | "denied";

@Injectable({ providedIn: "root" })
export class BrowserNotificationService {
  private permission = signal<NotificationPermission>("default");

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

  showNotification(title: string, options: NotificationOptions = {}): void {
    if (this.permission() !== "granted") {
      console.warn("Notification permission not granted");
      return;
    }

    const notification = new Notification(title, {
      icon: "/assets/icons/icon-192x192.png",
      badge: "/assets/icons/badge-72x72.png",
      dir: "ltr",
      lang: "id-ID",
      renotify: true,
      requireInteraction: false,
      ...options,
    });

    if (!options.requireInteraction) {
      setTimeout(() => notification.close(), 5000);
    }

    notification.onclick = (event) => {
      event.preventDefault();
      window.focus();
      notification.close();
    };
  }

  showTabNotification(count: number, title?: string): void {
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

    if (ctx) {
      if (count > 0) {
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
      } else {
        ctx.clearRect(0, 0, 32, 32);
      }
    }

    const link = document.querySelector('link[rel="icon"]') as HTMLLinkElement;
    if (link) {
      link.href = canvas.toDataURL();
    }
  }

  clearTabNotification(): void {
    this.showTabNotification(0);
  }
}
```

---

mau disesuaikan lagi (mis. tone bahasa full Indonesia/Inggris, atau ganti ikon/title default)? bilang aja, aku rapihin.

---

## 🔄 **State Management with Signals**

### Global State Service

```typescript
import { Injectable, signal, computed } from "@angular/core";

export interface UserDto {
  id: number;
  username: string;
  role: string;
  preferredTheme: "light" | "dark";
  fullName?: string;
  email?: string;
}

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
}

@Injectable({ providedIn: "root" })
export class StateService {
  // Private state signals
  private _user = signal<UserDto | null>(null);
  private _theme = signal<"light" | "dark">("light");
  private _sidebarCollapsed = signal<boolean>(false);
  private _notifications = signal<NotificationDto[]>([]);
  private _loading = signal<boolean>(false);

  // Public readonly state
  readonly user = this._user.asReadonly();
  readonly theme = this._theme.asReadonly();
  readonly sidebarCollapsed = this._sidebarCollapsed.asReadonly();
  readonly notifications = this._notifications.asReadonly();
  readonly loading = this._loading.asReadonly();

  // Computed state
  readonly isAuthenticated = computed(() => this._user() !== null);

  readonly unreadNotificationCount = computed(() => this._notifications().filter((n) => !n.isRead).length);

  readonly criticalNotificationCount = computed(() => this._notifications().filter((n) => !n.isRead && n.priority === "Critical").length);

  readonly userPermissions = computed(() => {
    const user = this._user();
    if (!user) return [];

    // Map role to permissions
    const rolePermissions: Record<string, string[]> = {
      Admin: ["inventory.write", "facture.write", "reports.export", "users.manage"],
      Manager: ["inventory.write", "facture.write", "reports.export"],
      User: ["inventory.write", "pos.operate"],
      Cashier: ["pos.operate"],
    };

    return rolePermissions[user.role] || [];
  });

  // Actions
  setUser(user: UserDto | null): void {
    this._user.set(user);
    if (user?.preferredTheme) {
      this.setTheme(user.preferredTheme);
    }
  }

  setTheme(theme: "light" | "dark"): void {
    this._theme.set(theme);
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("preferred-theme", theme);
  }

  toggleSidebar(): void {
    this._sidebarCollapsed.update((collapsed) => !collapsed);
    localStorage.setItem("sidebar-collapsed", this._sidebarCollapsed().toString());
  }

  setLoading(loading: boolean): void {
    this._loading.set(loading);
  }

  addNotification(notification: NotificationDto): void {
    this._notifications.update((notifications) => [notification, ...notifications]);
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
    const savedTheme = localStorage.getItem("preferred-theme") as "light" | "dark";
    if (savedTheme) {
      this.setTheme(savedTheme);
    }

    const sidebarCollapsed = localStorage.getItem("sidebar-collapsed") === "true";
    this._sidebarCollapsed.set(sidebarCollapsed);
  }
}
```

---

## 📝 **Code Generation Guidelines for Copilot**

### Essential Development Rules

#### ⚠️ **CRITICAL RULES:**

1. **NEVER generate code** without explicit permission from Tuan Maharaja Dika
2. **ALWAYS explain approach** and reasoning before asking permission
3. **ALWAYS ask**: "May I generate the code now, Tuan Maharaja Dika?"
4. **WAIT for permission**: "yes/boleh/silakan/go ahead"
5. **SUGGEST next steps** after code generation

#### 🎯 **Development Priorities:**

1. **Mobile-first responsive** design (no mixins)
2. **Performance optimization** (OnPush, signals, minimal imports)
3. **Accessibility** (WCAG 2.1 AA compliance)
4. **Touch targets** minimum 44px for mobile
5. **Clean, minimal code** with efficient rendering

### Component Generation Template

```typescript
// Standard template for all new components
@Component({
  selector: "app-component-name",
  standalone: true,
  imports: [CommonModule], // Minimal imports only
  changeDetection: ChangeDetectionStrategy.OnPush, // Performance
  template: `
    <!-- Mobile-first responsive template -->
    <div class="component-container">
      <!-- Component content here -->
    </div>
  `,
  styles: [
    `
      .component-container {
        /* Component-specific styles only */
        /* Use global CSS variables */
        /* Mobile-first responsive */
      }
    `,
  ],
})
export class ComponentNameComponent {
  // Signal-based state management
  data = signal<DataType[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);

  // Computed properties for derived state
  filteredData = computed(() => this.data().filter((item) => item.active));

  // Event handlers
  onAction(): void {
    // Implementation
  }

  // TrackBy function for performance
  trackById = (index: number, item: DataType): any => item.id;
}
```

### Service Generation Template

```typescript
// Standard template for all new services
@Injectable({ providedIn: 'root' })
export class EntityService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/Entity`;

  // Signal-based state
  private _entities = signal<EntityDto[]>([]);
  private _loading = signal<boolean>(false);
  private _error = signal<string | null>(null);

  // Public readonly signals
  readonly entities = this._entities.asReadonly();
  readonly loading = this._loading.asRea
```
