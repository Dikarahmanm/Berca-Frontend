// src/app/modules/category-management/category-form-modal/category-form-modal.component.ts
// ✅ FIXED - Standalone Component sesuai dengan repository structure

import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';

// Services & Models
import { CategoryService } from '../services/category.service';
import { 
  Category, 
  CreateCategoryRequest, 
  UpdateCategoryRequest,
  DEFAULT_CATEGORY_COLORS,
  CATEGORY_SUGGESTIONS,
  isValidHexColor,
  getRandomColor,
  getContrastTextColor,
  adjustColorBrightness
} from '../models/category.models';

@Component({
  selector: 'app-category-form-modal',
  templateUrl: './category-form-modal.component.html',
  styleUrls: ['./category-form-modal.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule
  ],
  providers: [
    CategoryService
  ]
})
export class CategoryFormModalComponent implements OnInit, OnDestroy {
  @Input() isOpen = false;
  @Input() mode: 'create' | 'edit' = 'create';
  @Input() category: Category | null = null;

  @Output() categoryCreated = new EventEmitter<Category>();
  @Output() categoryUpdated = new EventEmitter<Category>();
  @Output() modalClosed = new EventEmitter<void>();

  @ViewChild('nameInput', { static: false }) nameInput!: ElementRef<HTMLInputElement>;
  @ViewChild('colorInput', { static: false }) colorInput!: ElementRef<HTMLInputElement>;

  // Form
  categoryForm: FormGroup;
  
  // State
  isLoading = false;
  isSubmitting = false;
  isCheckingName = false;
  nameExists = false;
  showColorPicker = false;
  showSuggestions = false;
  selectedColorTab: 'predefined' | 'custom' | 'suggestions' = 'predefined';

  // Color picker state
  customColor = '#FF914D';
  recentColors: string[] = [];
  
  // Constants
  readonly defaultColors = DEFAULT_CATEGORY_COLORS;
  readonly suggestions = CATEGORY_SUGGESTIONS as any;
  readonly maxNameLength = 100;
  readonly maxDescriptionLength = 500;

  // Validation messages
  validationMessages = {
    name: {
      required: 'Category name is required',
      minlength: 'Name must be at least 2 characters',
      maxlength: `Name cannot exceed ${this.maxNameLength} characters`,
      nameExists: 'This category name already exists'
    },
    color: {
      required: 'Color is required',
      invalidColor: 'Please enter a valid hex color (e.g., #FF914D)'
    },
    description: {
      maxlength: `Description cannot exceed ${this.maxDescriptionLength} characters`
    }
  };

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private categoryService: CategoryService
  ) {
    this.categoryForm = this.createForm();
    this.loadRecentColors();
  }

  ngOnInit(): void {
    this.setupForm();
    this.setupNameValidation();
    this.setupColorValidation();
    
    if (this.mode === 'edit' && this.category) {
      this.populateForm();
    } else {
      this.setRandomColor();
    }

    // Focus name input when modal opens
    setTimeout(() => {
      if (this.nameInput) {
        this.nameInput.nativeElement.focus();
      }
    }, 200);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Form Setup
  private createForm(): FormGroup {
    return this.fb.group({
      name: ['', [
        Validators.required,
        Validators.minLength(2),
        Validators.maxLength(this.maxNameLength)
      ]],
      color: ['#FF914D', [
        Validators.required,
        this.hexColorValidator
      ]],
      description: ['', [
        Validators.maxLength(this.maxDescriptionLength)
      ]]
    });
  }

  private setupForm(): void {
    // Set initial color
    this.customColor = this.categoryForm.get('color')?.value || '#FF914D';
  }

  private setupNameValidation(): void {
    const nameControl = this.categoryForm.get('name');
    if (!nameControl) return;

    nameControl.valueChanges.pipe(
      debounceTime(500),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(name => {
      if (name && name.trim() && nameControl.valid) {
        this.checkNameAvailability(name.trim());
      } else {
        this.nameExists = false;
        this.isCheckingName = false;
      }
    });
  }

  private setupColorValidation(): void {
    const colorControl = this.categoryForm.get('color');
    if (!colorControl) return;

    colorControl.valueChanges.pipe(
      debounceTime(100),
      takeUntil(this.destroy$)
    ).subscribe(color => {
      if (color && isValidHexColor(color)) {
        this.customColor = color;
      }
    });
  }

  private populateForm(): void {
    if (!this.category) return;

    this.categoryForm.patchValue({
      name: this.category.name,
      color: this.category.color,
      description: this.category.description || ''
    });
    
    this.customColor = this.category.color;
  }

  // Validation
  private hexColorValidator(control: AbstractControl): { [key: string]: any } | null {
    if (!control.value) return null;
    return isValidHexColor(control.value) ? null : { invalidColor: true };
  }

  private checkNameAvailability(name: string): void {
    this.isCheckingName = true;
    
    const excludeId = this.mode === 'edit' ? this.category?.id : undefined;
    
    this.categoryService.checkCategoryName(name, excludeId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (exists) => {
          this.nameExists = exists || false;
          
          // Update form validity
          const nameControl = this.categoryForm.get('name');
          if (nameControl) {
            if (this.nameExists) {
              nameControl.setErrors({ nameExists: true });
            } else {
              const errors = nameControl.errors;
              if (errors && errors['nameExists']) {
                delete errors['nameExists'];
                nameControl.setErrors(Object.keys(errors).length ? errors : null);
              }
            }
          }
          this.isCheckingName = false;
        },
        error: (error) => {
          console.error('Error checking name availability:', error);
          this.isCheckingName = false;
        }
      });
  }

  // Form Actions
  onSubmit(): void {
    if (this.categoryForm.invalid || this.nameExists || this.isSubmitting) {
      this.markFormGroupTouched();
      return;
    }

    const formValue = this.categoryForm.value;
    const categoryData = {
      name: formValue.name.trim(),
      color: formValue.color.toUpperCase(),
      description: formValue.description?.trim() || undefined
    };

    this.isSubmitting = true;

    if (this.mode === 'create') {
      this.createCategory(categoryData);
    } else if (this.mode === 'edit' && this.category) {
      this.updateCategory(this.category.id, categoryData);
    }
  }

  private createCategory(data: CreateCategoryRequest): void {
    this.categoryService.createCategory(data)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (category) => {
          console.log('✅ Category created:', category);
          this.addToRecentColors(category.color);
          this.categoryCreated.emit(category);
          this.closeModal();
        },
        error: (error) => {
          console.error('❌ Error creating category:', error);
          this.isSubmitting = false;
        }
      });
  }

  private updateCategory(id: number, data: UpdateCategoryRequest): void {
    this.categoryService.updateCategory(id, data)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (category) => {
          console.log('✅ Category updated:', category);
          this.addToRecentColors(category.color);
          this.categoryUpdated.emit(category);
          this.closeModal();
        },
        error: (error) => {
          console.error('❌ Error updating category:', error);
          this.isSubmitting = false;
        }
      });
  }

  private markFormGroupTouched(): void {
    Object.keys(this.categoryForm.controls).forEach(key => {
      const control = this.categoryForm.get(key);
      control?.markAsTouched();
    });
  }

  // Color Picker
  onColorSelect(color: string): void {
    this.categoryForm.patchValue({ color });
    this.customColor = color;
    this.addToRecentColors(color);
  }

  onCustomColorChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const color = input.value;
    
    if (isValidHexColor(color)) {
      this.onColorSelect(color);
    }
  }

  onCustomColorInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.customColor = input.value;
    this.categoryForm.patchValue({ color: input.value });
  }

  generateRandomColor(): void {
    const randomColor = getRandomColor();
    this.onColorSelect(randomColor);
  }

  toggleColorPicker(): void {
    this.showColorPicker = !this.showColorPicker;
  }

  setColorTab(tab: 'predefined' | 'custom' | 'suggestions'): void {
    this.selectedColorTab = tab;
  }

  // Recent Colors Management
  private loadRecentColors(): void {
    const stored = localStorage.getItem('category-recent-colors');
    if (stored) {
      try {
        this.recentColors = JSON.parse(stored);
      } catch {
        this.recentColors = [];
      }
    }
  }

  private addToRecentColors(color: string): void {
    const colorUpper = color.toUpperCase();
    this.recentColors = [
      colorUpper,
      ...this.recentColors.filter(c => c !== colorUpper)
    ].slice(0, 8); // Keep only 8 recent colors
    
    localStorage.setItem('category-recent-colors', JSON.stringify(this.recentColors));
  }

  // Suggestions
  applySuggestion(suggestion: any): void {
    this.categoryForm.patchValue({
      name: suggestion.name,
      color: suggestion.color,
      description: suggestion.description
    });
    this.customColor = suggestion.color;
    this.showSuggestions = false;
  }

  toggleSuggestions(): void {
    this.showSuggestions = !this.showSuggestions;
  }

  getRandomSuggestion(): void {
    if (!this.suggestions || this.suggestions.length === 0) {
      return;
    }

    const randomIndex = Math.floor(Math.random() * this.suggestions.length);
    const suggestion = this.suggestions[randomIndex];
    this.applySuggestion(suggestion);
  }

  setRandomColor(): void {
    const randomColor = getRandomColor();
    this.onColorSelect(randomColor);
  }

  // Utility Methods
  isFieldInvalid(fieldName: string): boolean {
    const field = this.categoryForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  getFieldError(fieldName: string): string {
    const field = this.categoryForm.get(fieldName);
    if (!field || !field.errors) return '';

    const errors = field.errors;
    const messages = this.validationMessages[fieldName as keyof typeof this.validationMessages];

    if (!messages) return '';

    for (const errorType in errors) {
      if (messages[errorType as keyof typeof messages]) {
        return messages[errorType as keyof typeof messages];
      }
    }

    return '';
  }

  getContrastTextColor(backgroundColor: string): string {
    return getContrastTextColor(backgroundColor);
  }

  getDarkerColor(color: string): string {
    return adjustColorBrightness(color, -20);
  }

  getLighterColor(color: string): string {
    return adjustColorBrightness(color, 20);
  }

  isValidHexColor(color: string): boolean {
    return isValidHexColor(color);
  }

  get currentColorPreview(): string {
    return this.categoryForm.get('color')?.value || '#FF914D';
  }

  get isFormValid(): boolean {
    return this.categoryForm.valid && !this.nameExists && !this.isCheckingName;
  }

  get modalTitle(): string {
    return this.mode === 'create' ? 'Create New Category' : 'Edit Category';
  }

  get submitButtonText(): string {
    if (this.isSubmitting) {
      return this.mode === 'create' ? 'Creating...' : 'Updating...';
    }
    return this.mode === 'create' ? 'Create Category' : 'Update Category';
  }

  get nameCharCount(): number {
    return this.categoryForm.get('name')?.value?.length || 0;
  }

  get descriptionCharCount(): number {
    return this.categoryForm.get('description')?.value?.length || 0;
  }

  // Modal Controls
  closeModal(): void {
    if (this.isSubmitting) return;
    
    this.categoryForm.reset();
    this.nameExists = false;
    this.isCheckingName = false;
    this.isSubmitting = false;
    this.showColorPicker = false;
    this.showSuggestions = false;
    this.selectedColorTab = 'predefined';
    this.modalClosed.emit();
  }

  onBackdropClick(event: Event): void {
    if (event.target === event.currentTarget) {
      this.closeModal();
    }
  }

  onEscapeKey(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      this.closeModal();
    }
  }

  // ✅ ADD: Keyboard event handler for template
  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      this.onEscapeKey(event);
    }
  }
}