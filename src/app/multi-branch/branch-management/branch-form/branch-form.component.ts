import { Component, OnInit, OnDestroy, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { MultiBranchCoordinationService } from '../../../core/services/multi-branch-coordination.service';
import { StateService } from '../../../core/services/state.service';
import { Branch } from '../../../core/models/branch.models';
import { Subscription } from 'rxjs';

// Extended Branch Form Interface
export interface BranchFormData {
  branchId?: number;
  branchName: string;
  branchCode: string;
  managerName: string;
  managerEmail: string;
  managerPhone: string;
  address: string;
  city: string;
  region: string;
  postalCode: string;
  latitude?: number;
  longitude?: number;
  isActive: boolean;
  allowedServices: string[];
  operatingHours: OperatingHours;
  contactInfo: ContactInfo;
  systemSettings: SystemSettings;
  complianceSettings: ComplianceSettings;
}

export interface OperatingHours {
  monday: DaySchedule;
  tuesday: DaySchedule;
  wednesday: DaySchedule;
  thursday: DaySchedule;
  friday: DaySchedule;
  saturday: DaySchedule;
  sunday: DaySchedule;
}

export interface DaySchedule {
  isOpen: boolean;
  openTime: string;
  closeTime: string;
  breakStart?: string;
  breakEnd?: string;
}

export interface ContactInfo {
  phone: string;
  email: string;
  website?: string;
  socialMedia?: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
  };
}

export interface SystemSettings {
  timezone: string;
  currency: string;
  language: string;
  maxDailyTransactions: number;
  backupFrequency: 'hourly' | 'daily' | 'weekly';
  maintenanceWindow: string;
  autoSyncEnabled: boolean;
  notificationsEnabled: boolean;
}

export interface ComplianceSettings {
  requireManagerApproval: boolean;
  maxTransactionAmount: number;
  auditLogRetention: number;
  dataEncryptionLevel: 'basic' | 'standard' | 'advanced';
  accessControlLevel: 'basic' | 'standard' | 'strict';
  reportingFrequency: 'daily' | 'weekly' | 'monthly';
}

export interface ValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

@Component({
  selector: 'app-branch-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './branch-form.component.html',
  styleUrls: ['./branch-form.component.scss']
})
export class BranchFormComponent implements OnInit, OnDestroy {
  // Form state
  branchForm!: FormGroup;
  
  // Component state signals
  private readonly _isLoading = signal<boolean>(false);
  private readonly _isSaving = signal<boolean>(false);
  private readonly _isEditMode = signal<boolean>(false);
  private readonly _currentStep = signal<number>(1);
  private readonly _validationErrors = signal<ValidationError[]>([]);
  private readonly _branchId = signal<number | null>(null);
  private readonly _existingBranch = signal<Branch | null>(null);

  // Component state getters
  isLoading = this._isLoading.asReadonly();
  isSaving = this._isSaving.asReadonly();
  isEditMode = this._isEditMode.asReadonly();
  currentStep = this._currentStep.asReadonly();
  validationErrors = this._validationErrors.asReadonly();
  branchId = this._branchId.asReadonly();
  existingBranch = this._existingBranch.asReadonly();

  // Form configuration
  readonly maxSteps = 4;
  readonly stepTitles = [
    'Basic Information',
    'Contact & Location',
    'Operating Hours',
    'System & Compliance Settings'
  ];

  // Options for form selects
  readonly availableServices = [
    'Cash Transactions',
    'Digital Payments',
    'Money Transfer',
    'Bill Payments',
    'Account Services',
    'Loan Services',
    'Investment Services',
    'Foreign Exchange'
  ];

  readonly availableRegions = [
    'Jakarta',
    'Surabaya',
    'Bandung',
    'Medan',
    'Semarang',
    'Makassar',
    'Palembang',
    'Yogyakarta',
    'Denpasar',
    'Balikpapan'
  ];

  readonly availableTimezones = [
    'Asia/Jakarta',
    'Asia/Pontianak',
    'Asia/Makassar',
    'Asia/Jayapura'
  ];

  readonly availableCurrencies = [
    'IDR',
    'USD',
    'EUR',
    'SGD',
    'MYR'
  ];

  readonly availableLanguages = [
    'Indonesian',
    'English',
    'Javanese',
    'Sundanese'
  ];

  // Computed properties
  canProceedToNextStep = computed(() => {
    const step = this._currentStep();
    const form = this.branchForm;
    if (!form) return false;

    switch (step) {
      case 1:
        return form.get('branchName')?.valid && 
               form.get('branchCode')?.valid && 
               form.get('managerName')?.valid;
      case 2:
        return form.get('address')?.valid && 
               form.get('city')?.valid && 
               form.get('region')?.valid;
      case 3:
        return true; // Operating hours are optional
      case 4:
        return form.valid;
      default:
        return false;
    }
  });

  formProgress = computed(() => {
    return (this._currentStep() / this.maxSteps) * 100;
  });

  pageTitle = computed(() => {
    return this._isEditMode() ? 'Edit Branch' : 'Create New Branch';
  });

  private subscriptions = new Subscription();

  constructor(
    private fb: FormBuilder,
    private coordinationService: MultiBranchCoordinationService,
    private stateService: StateService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.initializeForm();
  }

  ngOnInit() {
    // Check if this is edit mode
    const branchId = this.route.snapshot.params['id'];
    if (branchId) {
      this._isEditMode.set(true);
      this._branchId.set(+branchId);
      this.loadExistingBranch(+branchId);
    }

    // Form validation effect
    effect(() => {
      if (this.branchForm) {
        this.validateCurrentStep();
      }
    });
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }

  private initializeForm() {
    this.branchForm = this.fb.group({
      // Basic Information
      branchName: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(100)]],
      branchCode: ['', [Validators.required, Validators.pattern(/^[A-Z0-9]{3,10}$/)]],
      managerName: ['', [Validators.required, Validators.minLength(2)]],
      managerEmail: ['', [Validators.required, Validators.email]],
      managerPhone: ['', [Validators.required, Validators.pattern(/^[0-9\-\+\(\)\s]{10,15}$/)]],
      isActive: [true],
      allowedServices: [[]],

      // Contact & Location
      address: ['', [Validators.required, Validators.minLength(10)]],
      city: ['', [Validators.required]],
      region: ['', [Validators.required]],
      postalCode: ['', [Validators.required, Validators.pattern(/^[0-9]{5}$/)]],
      latitude: [null],
      longitude: [null],
      phone: ['', [Validators.required, Validators.pattern(/^[0-9\-\+\(\)\s]{10,15}$/)]],
      email: ['', [Validators.required, Validators.email]],
      website: [''],

      // Operating Hours
      operatingHours: this.fb.group({
        monday: this.createDayScheduleGroup(),
        tuesday: this.createDayScheduleGroup(),
        wednesday: this.createDayScheduleGroup(),
        thursday: this.createDayScheduleGroup(),
        friday: this.createDayScheduleGroup(),
        saturday: this.createDayScheduleGroup(),
        sunday: this.createDayScheduleGroup()
      }),

      // System Settings
      timezone: ['Asia/Jakarta', [Validators.required]],
      currency: ['IDR', [Validators.required]],
      language: ['Indonesian', [Validators.required]],
      maxDailyTransactions: [1000, [Validators.required, Validators.min(100), Validators.max(10000)]],
      backupFrequency: ['daily', [Validators.required]],
      maintenanceWindow: ['02:00-04:00', [Validators.required]],
      autoSyncEnabled: [true],
      notificationsEnabled: [true],

      // Compliance Settings
      requireManagerApproval: [true],
      maxTransactionAmount: [10000000, [Validators.required, Validators.min(1000000)]],
      auditLogRetention: [365, [Validators.required, Validators.min(30), Validators.max(2555)]],
      dataEncryptionLevel: ['standard', [Validators.required]],
      accessControlLevel: ['standard', [Validators.required]],
      reportingFrequency: ['daily', [Validators.required]]
    });
  }

  private createDayScheduleGroup(): FormGroup {
    return this.fb.group({
      isOpen: [true],
      openTime: ['08:00'],
      closeTime: ['17:00'],
      breakStart: ['12:00'],
      breakEnd: ['13:00']
    });
  }

  private async loadExistingBranch(id: number) {
    this._isLoading.set(true);
    
    try {
      // Simulate API call to load existing branch
      setTimeout(() => {
        // Mock existing branch data
        const existingBranch: Branch = {
          id: id,
          branchId: id,
          branchName: 'Branch Jakarta Pusat',
          branchCode: 'JKT001',
          managerName: 'Sarah Manager',
          address: 'Jl. Sudirman No. 123, Jakarta Pusat',
          city: 'Jakarta',
          province: 'DKI Jakarta',
          region: 'Jakarta',
          isActive: true,
          branchType: 'regional',
          openingDate: '2020-01-15',
          coordinationStatus: 'optimal',
          lastSync: new Date().toISOString()
        };

        this._existingBranch.set(existingBranch);
        this.populateFormWithExistingData(existingBranch);
        this._isLoading.set(false);
      }, 800);
    } catch (error) {
      console.error('Failed to load branch:', error);
      this._isLoading.set(false);
      this.router.navigate(['/branches']);
    }
  }

  private populateFormWithExistingData(branch: Branch) {
    // Populate form with existing branch data
    this.branchForm.patchValue({
      branchName: branch.branchName,
      branchCode: branch.branchCode,
      managerName: branch.managerName,
      address: branch.address,
      city: branch.city,
      region: branch.region,
      isActive: branch.isActive,
      // Add more fields as needed
      managerEmail: 'sarah.manager@company.com',
      managerPhone: '+62-21-12345678',
      postalCode: '10220',
      phone: '+62-21-12345678',
      email: 'jakarta.pusat@company.com'
    });
  }

  // Step navigation methods
  nextStep() {
    if (this.canProceedToNextStep() && this._currentStep() < this.maxSteps) {
      this._currentStep.update(step => step + 1);
    }
  }

  previousStep() {
    if (this._currentStep() > 1) {
      this._currentStep.update(step => step - 1);
    }
  }

  goToStep(step: number) {
    if (step >= 1 && step <= this.maxSteps) {
      this._currentStep.set(step);
    }
  }

  // Form validation
  private validateCurrentStep() {
    const errors: ValidationError[] = [];
    const step = this._currentStep();
    const form = this.branchForm;

    if (!form) return;

    // Validate based on current step
    switch (step) {
      case 1:
        this.validateBasicInfo(errors);
        break;
      case 2:
        this.validateContactLocation(errors);
        break;
      case 3:
        this.validateOperatingHours(errors);
        break;
      case 4:
        this.validateSystemCompliance(errors);
        break;
    }

    this._validationErrors.set(errors);
  }

  private validateBasicInfo(errors: ValidationError[]) {
    const branchName = this.branchForm.get('branchName');
    const branchCode = this.branchForm.get('branchCode');
    const managerName = this.branchForm.get('managerName');

    if (branchName?.errors) {
      if (branchName.errors['required']) {
        errors.push({ field: 'branchName', message: 'Branch name is required', severity: 'error' });
      }
      if (branchName.errors['minlength']) {
        errors.push({ field: 'branchName', message: 'Branch name must be at least 3 characters', severity: 'error' });
      }
    }

    if (branchCode?.errors) {
      if (branchCode.errors['required']) {
        errors.push({ field: 'branchCode', message: 'Branch code is required', severity: 'error' });
      }
      if (branchCode.errors['pattern']) {
        errors.push({ field: 'branchCode', message: 'Branch code must be 3-10 uppercase letters and numbers', severity: 'error' });
      }
    }

    if (managerName?.errors?.['required']) {
      errors.push({ field: 'managerName', message: 'Manager name is required', severity: 'error' });
    }
  }

  private validateContactLocation(errors: ValidationError[]) {
    const address = this.branchForm.get('address');
    const postalCode = this.branchForm.get('postalCode');

    if (address?.errors?.['required']) {
      errors.push({ field: 'address', message: 'Address is required', severity: 'error' });
    }

    if (postalCode?.errors) {
      if (postalCode.errors['required']) {
        errors.push({ field: 'postalCode', message: 'Postal code is required', severity: 'error' });
      }
      if (postalCode.errors['pattern']) {
        errors.push({ field: 'postalCode', message: 'Postal code must be 5 digits', severity: 'error' });
      }
    }
  }

  private validateOperatingHours(errors: ValidationError[]) {
    const operatingHours = this.branchForm.get('operatingHours');
    
    if (operatingHours) {
      let hasOpenDay = false;
      
      Object.keys((operatingHours as FormGroup).controls).forEach(day => {
        const dayControl = operatingHours.get(day);
        if (dayControl?.get('isOpen')?.value) {
          hasOpenDay = true;
        }
      });
      
      if (!hasOpenDay) {
        errors.push({ 
          field: 'operatingHours', 
          message: 'Branch must be open at least one day per week', 
          severity: 'warning' 
        });
      }
    }
  }

  private validateSystemCompliance(errors: ValidationError[]) {
    const maxTransactionAmount = this.branchForm.get('maxTransactionAmount');
    
    if (maxTransactionAmount?.value && maxTransactionAmount.value < 1000000) {
      errors.push({ 
        field: 'maxTransactionAmount', 
        message: 'Maximum transaction amount should be at least IDR 1,000,000', 
        severity: 'warning' 
      });
    }
  }

  // Form submission
  async onSubmit() {
    if (!this.branchForm.valid) {
      this.markFormGroupTouched(this.branchForm);
      return;
    }

    this._isSaving.set(true);

    try {
      const formData = this.prepareFormData();
      
      if (this._isEditMode()) {
        await this.updateBranch(formData);
      } else {
        await this.createBranch(formData);
      }

      // Success - navigate back to list
      this.router.navigate(['/branches'], {
        queryParams: { 
          message: this._isEditMode() ? 'Branch updated successfully' : 'Branch created successfully' 
        }
      });

    } catch (error) {
      console.error('Failed to save branch:', error);
      alert('Failed to save branch. Please try again.');
    } finally {
      this._isSaving.set(false);
    }
  }

  private prepareFormData(): BranchFormData {
    const formValues = this.branchForm.value;
    
    return {
      branchId: this._isEditMode() ? (this._branchId() ?? undefined) : undefined,
      branchName: formValues.branchName,
      branchCode: formValues.branchCode,
      managerName: formValues.managerName,
      managerEmail: formValues.managerEmail,
      managerPhone: formValues.managerPhone,
      address: formValues.address,
      city: formValues.city,
      region: formValues.region,
      postalCode: formValues.postalCode,
      latitude: formValues.latitude,
      longitude: formValues.longitude,
      isActive: formValues.isActive,
      allowedServices: formValues.allowedServices,
      operatingHours: formValues.operatingHours,
      contactInfo: {
        phone: formValues.phone,
        email: formValues.email,
        website: formValues.website
      },
      systemSettings: {
        timezone: formValues.timezone,
        currency: formValues.currency,
        language: formValues.language,
        maxDailyTransactions: formValues.maxDailyTransactions,
        backupFrequency: formValues.backupFrequency,
        maintenanceWindow: formValues.maintenanceWindow,
        autoSyncEnabled: formValues.autoSyncEnabled,
        notificationsEnabled: formValues.notificationsEnabled
      },
      complianceSettings: {
        requireManagerApproval: formValues.requireManagerApproval,
        maxTransactionAmount: formValues.maxTransactionAmount,
        auditLogRetention: formValues.auditLogRetention,
        dataEncryptionLevel: formValues.dataEncryptionLevel,
        accessControlLevel: formValues.accessControlLevel,
        reportingFrequency: formValues.reportingFrequency
      }
    };
  }

  private async createBranch(branchData: BranchFormData) {
    // Simulate API call
    return new Promise(resolve => {
      setTimeout(() => {
        console.log('Creating branch:', branchData);
        resolve(branchData);
      }, 1000);
    });
  }

  private async updateBranch(branchData: BranchFormData) {
    // Simulate API call
    return new Promise(resolve => {
      setTimeout(() => {
        console.log('Updating branch:', branchData);
        resolve(branchData);
      }, 1000);
    });
  }

  // Helper methods
  private markFormGroupTouched(formGroup: FormGroup) {
    Object.keys(formGroup.controls).forEach(field => {
      const control = formGroup.get(field);
      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      } else {
        control?.markAsTouched();
      }
    });
  }

  // Service methods
  onServiceToggle(service: string) {
    const services = this.branchForm.get('allowedServices')?.value || [];
    const index = services.indexOf(service);
    
    if (index > -1) {
      services.splice(index, 1);
    } else {
      services.push(service);
    }
    
    this.branchForm.get('allowedServices')?.setValue(services);
  }

  isServiceSelected(service: string): boolean {
    const services = this.branchForm.get('allowedServices')?.value || [];
    return services.includes(service);
  }

  // Operating hours methods
  copyScheduleToAll(dayName: string) {
    const sourceDay = this.branchForm.get(`operatingHours.${dayName}`);
    if (!sourceDay) return;

    const scheduleValue = sourceDay.value;
    const operatingHours = this.branchForm.get('operatingHours');
    
    if (operatingHours) {
      Object.keys((operatingHours as FormGroup).controls).forEach(day => {
        if (day !== dayName) {
          operatingHours.get(day)?.patchValue(scheduleValue);
        }
      });
    }
  }

  toggleAllDays(isOpen: boolean) {
    const operatingHours = this.branchForm.get('operatingHours');
    
    if (operatingHours) {
      Object.keys((operatingHours as FormGroup).controls).forEach(day => {
        operatingHours.get(day)?.get('isOpen')?.setValue(isOpen);
      });
    }
  }

  // Navigation methods
  cancel() {
    if (this.branchForm.dirty) {
      const confirmed = confirm('You have unsaved changes. Are you sure you want to leave?');
      if (!confirmed) return;
    }
    
    this.router.navigate(['/branches']);
  }

  // Utility methods
  getFieldError(fieldName: string): string | null {
    const field = this.branchForm.get(fieldName);
    if (field?.touched && field?.errors) {
      const errors = field.errors;
      if (errors['required']) return `${this.getFieldLabel(fieldName)} is required`;
      if (errors['email']) return 'Please enter a valid email address';
      if (errors['pattern']) return `Please enter a valid ${this.getFieldLabel(fieldName)}`;
      if (errors['minlength']) return `${this.getFieldLabel(fieldName)} is too short`;
      if (errors['maxlength']) return `${this.getFieldLabel(fieldName)} is too long`;
      if (errors['min']) return `${this.getFieldLabel(fieldName)} is too small`;
      if (errors['max']) return `${this.getFieldLabel(fieldName)} is too large`;
    }
    return null;
  }

  private getFieldLabel(fieldName: string): string {
    const labels: Record<string, string> = {
      branchName: 'Branch name',
      branchCode: 'Branch code',
      managerName: 'Manager name',
      managerEmail: 'Manager email',
      managerPhone: 'Manager phone',
      address: 'Address',
      city: 'City',
      region: 'Region',
      postalCode: 'Postal code',
      phone: 'Phone',
      email: 'Email',
      maxDailyTransactions: 'Max daily transactions',
      maxTransactionAmount: 'Max transaction amount',
      auditLogRetention: 'Audit log retention'
    };
    return labels[fieldName] || fieldName;
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  }
}