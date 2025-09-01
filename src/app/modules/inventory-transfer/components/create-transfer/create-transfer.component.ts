// src/app/modules/inventory-transfer/components/create-transfer/create-transfer.component.ts
// Component for creating new inter-branch inventory transfers

import { Component, OnInit, signal, computed, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatCardModule } from '@angular/material/card';
import { MatStepperModule } from '@angular/material/stepper';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';

import { TransferService } from '../../services/transfer.service';
import { StateService } from '../../../../core/services/state.service';
import { InventoryService } from '../../../inventory/services/inventory.service';
import { 
  CreateTransferRequestDto, 
  CreateTransferItemDto, 
  TransferPriority 
} from '../../interfaces/transfer.interfaces';
import { Product } from '../../../inventory/interfaces/inventory.interfaces';

@Component({
  selector: 'app-create-transfer',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatIconModule,
    MatButtonModule,
    MatSelectModule,
    MatInputModule,
    MatFormFieldModule,
    MatCardModule,
    MatStepperModule,
    MatProgressBarModule,
    MatProgressSpinnerModule,
    MatChipsModule
  ],
  templateUrl: './create-transfer.component.html',
  styleUrls: ['./create-transfer.component.scss']
})
export class CreateTransferComponent implements OnInit {
  private transferService = inject(TransferService);
  private stateService = inject(StateService);
  private inventoryService = inject(InventoryService);
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  // Signals for reactive state
  isLoading = signal<boolean>(false);
  isSubmitting = signal<boolean>(false);
  products = signal<Product[]>([]);
  selectedSourceBranch = signal<number | null>(null);
  selectedTargetBranch = signal<number | null>(null);

  // Form
  transferForm: FormGroup = this.fb.group({
    sourceBranchId: ['', Validators.required],
    targetBranchId: ['', Validators.required],
    priority: ['Medium', Validators.required],
    reason: ['', [Validators.required, Validators.minLength(10)]],
    notes: [''],
    items: this.fb.array([], Validators.required)
  });

  // Data from services
  readonly accessibleBranches = this.stateService.accessibleBranches;
  readonly user = this.stateService.user;

  // Computed properties
  readonly availableSourceBranches = computed(() => {
    return this.accessibleBranches().filter(b => b.canTransfer);
  });

  readonly availableTargetBranches = computed(() => {
    const sourceBranchId = this.selectedSourceBranch();
    return this.accessibleBranches().filter(b => 
      b.canRead && b.branchId !== sourceBranchId
    );
  });

  readonly availableProducts = computed(() => {
    const sourceBranchId = this.selectedSourceBranch();
    if (!sourceBranchId) return [];
    
    // Filter products that have stock in source branch
    return this.products().filter(p => p.stock > 0);
  });

  readonly totalItems = computed(() => {
    const items = this.itemsArray.value;
    return items.reduce((total: number, item: any) => total + (item.requestedQuantity || 0), 0);
  });

  readonly totalValue = computed(() => {
    const items = this.itemsArray.value;
    return items.reduce((total: number, item: any) => {
      const product = this.products().find(p => p.id === item.productId);
      const quantity = item.requestedQuantity || 0;
      return total + (product?.buyPrice || 0) * quantity;
    }, 0);
  });

  // Form array getter
  get itemsArray(): FormArray {
    return this.transferForm.get('items') as FormArray;
  }

  // Priority options
  priorityOptions: { value: TransferPriority; label: string; description: string }[] = [
    { value: 'Low', label: 'Low', description: 'Standard transfer, no rush' },
    { value: 'Medium', label: 'Medium', description: 'Normal business need' },
    { value: 'High', label: 'High', description: 'Urgent business requirement' },
    { value: 'Critical', label: 'Critical', description: 'Emergency stock need' }
  ];

  ngOnInit(): void {
    this.setupFormSubscriptions();
    this.checkRouteParameters();
    this.addInitialItem();
  }

  private setupFormSubscriptions(): void {
    // Watch source branch changes
    this.transferForm.get('sourceBranchId')?.valueChanges.subscribe(branchId => {
      this.selectedSourceBranch.set(branchId ? parseInt(branchId) : null);
      if (branchId) {
        this.loadBranchProducts(parseInt(branchId));
      }
      // Clear items when source branch changes
      this.clearItems();
    });

    // Watch target branch changes
    this.transferForm.get('targetBranchId')?.valueChanges.subscribe(branchId => {
      this.selectedTargetBranch.set(branchId ? parseInt(branchId) : null);
    });
  }

  private checkRouteParameters(): void {
    const transferId = this.route.snapshot.queryParams['id'];
    const duplicateId = this.route.snapshot.queryParams['duplicate'];

    if (transferId) {
      this.loadTransferForEdit(parseInt(transferId));
    } else if (duplicateId) {
      this.loadTransferForDuplicate(parseInt(duplicateId));
    }
  }

  private async loadBranchProducts(branchId: number): Promise<void> {
    this.isLoading.set(true);
    try {
      // Use the existing getProducts method
      this.inventoryService.getProducts().subscribe({
        next: (response) => {
          this.products.set(response.products);
        },
        error: (error) => {
          console.error('Error loading branch products:', error);
        }
      });
    } catch (error) {
      console.error('Error loading branch products:', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  private async loadTransferForEdit(transferId: number): Promise<void> {
    // TODO: Implement loading existing transfer for editing
    console.log('Load transfer for edit:', transferId);
  }

  private async loadTransferForDuplicate(transferId: number): Promise<void> {
    // TODO: Implement loading existing transfer for duplication
    console.log('Load transfer for duplicate:', transferId);
  }

  // Item management methods
  addInitialItem(): void {
    if (this.itemsArray.length === 0) {
      this.addItem();
    }
  }

  addItem(): void {
    const itemGroup = this.fb.group({
      productId: ['', Validators.required],
      requestedQuantity: [1, [Validators.required, Validators.min(1)]],
      notes: ['']
    });

    this.itemsArray.push(itemGroup);
  }

  removeItem(index: number): void {
    if (this.itemsArray.length > 1) {
      this.itemsArray.removeAt(index);
    }
  }

  clearItems(): void {
    while (this.itemsArray.length > 0) {
      this.itemsArray.removeAt(0);
    }
    this.addInitialItem();
  }

  duplicateItem(index: number): void {
    const item = this.itemsArray.at(index);
    const duplicatedItem = this.fb.group({
      productId: [item.get('productId')?.value, Validators.required],
      requestedQuantity: [item.get('requestedQuantity')?.value, [Validators.required, Validators.min(1)]],
      notes: [item.get('notes')?.value]
    });

    this.itemsArray.insert(index + 1, duplicatedItem);
  }

  // Product selection methods
  onProductSelect(index: number, productId: number): void {
    const product = this.products().find(p => p.id === productId);
    if (product) {
      const item = this.itemsArray.at(index);
      
      // Set reasonable default quantity based on stock
      const suggestedQuantity = Math.min(10, Math.floor(product.stock * 0.1));
      item.get('requestedQuantity')?.setValue(suggestedQuantity || 1);
    }
  }

  getProductStock(productId: number): number {
    const product = this.products().find(p => p.id === productId);
    return product?.stock || 0;
  }

  getProductName(productId: number): string {
    const product = this.products().find(p => p.id === productId);
    return product?.name || 'Unknown Product';
  }

  getMaxQuantity(productId: number): number {
    const product = this.products().find(p => p.id === productId);
    return product?.stock || 0;
  }

  // Form submission
  async onSubmit(): Promise<void> {
    if (!this.transferForm.valid) {
      this.markFormGroupTouched();
      return;
    }

    this.isSubmitting.set(true);
    
    try {
      const formValue = this.transferForm.value;
      
      const createDto: CreateTransferRequestDto = {
        sourceBranchId: parseInt(formValue.sourceBranchId),
        targetBranchId: parseInt(formValue.targetBranchId),
        priority: formValue.priority,
        reason: formValue.reason,
        notes: formValue.notes || undefined,
        items: formValue.items.map((item: any) => ({
          productId: parseInt(item.productId),
          requestedQuantity: parseInt(item.requestedQuantity),
          notes: item.notes || undefined
        }))
      };

      const response = await this.transferService.createTransfer(createDto);
      
      if (response.success) {
        // Navigate to transfer details
        this.router.navigate(['/dashboard/inventory-transfer/detail', response.data.id]);
      } else {
        // Handle error - service will show notification
        console.error('Transfer creation failed:', response.message);
      }
    } catch (error) {
      console.error('Transfer submission error:', error);
    } finally {
      this.isSubmitting.set(false);
    }
  }

  private markFormGroupTouched(): void {
    Object.keys(this.transferForm.controls).forEach(key => {
      const control = this.transferForm.get(key);
      control?.markAsTouched();

      if (control instanceof FormArray) {
        control.controls.forEach(itemControl => {
          if (itemControl instanceof FormGroup) {
            Object.keys(itemControl.controls).forEach(itemKey => {
              itemControl.get(itemKey)?.markAsTouched();
            });
          }
        });
      }
    });
  }

  // Navigation methods
  cancel(): void {
    this.router.navigate(['/dashboard/inventory-transfer']);
  }

  saveDraft(): void {
    // TODO: Implement save as draft functionality
    console.log('Save as draft functionality to be implemented');
  }

  // Utility methods
  formatCurrency(amount: number): string {
    return this.transferService.formatCurrency(amount);
  }

  getPriorityColor(priority: string): string {
    return this.transferService.getPriorityColor(priority);
  }

  getBranchName(branchId: number): string {
    const branch = this.accessibleBranches().find(b => b.branchId === branchId);
    return branch?.branchName || 'Unknown Branch';
  }

  // Form validation helpers
  isFieldInvalid(fieldName: string): boolean {
    const field = this.transferForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  isItemFieldInvalid(index: number, fieldName: string): boolean {
    const item = this.itemsArray.at(index);
    const field = item.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  getFieldError(fieldName: string): string {
    const field = this.transferForm.get(fieldName);
    if (field?.errors) {
      if (field.errors['required']) return `${fieldName} is required`;
      if (field.errors['minlength']) return `${fieldName} is too short`;
    }
    return '';
  }

  getItemFieldError(index: number, fieldName: string): string {
    const item = this.itemsArray.at(index);
    const field = item.get(fieldName);
    if (field?.errors) {
      if (field.errors['required']) return `${fieldName} is required`;
      if (field.errors['min']) return `Quantity must be at least 1`;
    }
    return '';
  }
}