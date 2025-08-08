// src/app/modules/membership/components/membership-form/membership-form.component.ts
// ✅ Membership Form Component - Create/Edit/View

import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { Subscription, Observable } from 'rxjs';

// Angular Material imports
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatStepperModule } from '@angular/material/stepper';
import { MatTooltipModule } from '@angular/material/tooltip';

// Services and interfaces
import { MembershipService } from '../../services/membership.service';
import type {
  MemberDto,
  CreateMemberRequest,
  UpdateMemberRequest,
  MemberFormMode,
  GenderOption
} from '../../interfaces/membership.interfaces';

@Component({
  selector: 'app-membership-form',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    // Material modules
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    MatSlideToggleModule,
    MatStepperModule,
    MatTooltipModule
  ],
  templateUrl: './membership-form.component.html',
  styleUrls: ['./membership-form.component.scss']
})
export class MembershipFormComponent implements OnInit, OnDestroy {
  // Form configuration
  memberForm: FormGroup;
  formMode: MemberFormMode = { mode: 'create' };
  
  // Data
  member: MemberDto | null = null;
  memberId: number | null = null;
  
  // State
  loading$: Observable<boolean>;
  error$: Observable<string | null>;
  isSubmitting = false;
  phoneExists = false;
  
  // Options
  genderOptions: GenderOption[] = [
    { value: 'Male', label: 'Male', icon: 'man' },
    { value: 'Female', label: 'Female', icon: 'woman' },
    { value: 'Other', label: 'Other', icon: 'person' }
  ];

  // Validation
  maxDate = new Date(); // Can't select future dates for birth date
  minDate = new Date(1900, 0, 1); // Minimum birth year 1900

  // Subscription management
  private subscriptions = new Subscription();

  constructor(
    private membershipService: MembershipService,
    private fb: FormBuilder,
    public router: Router,
    private route: ActivatedRoute,
    private snackBar: MatSnackBar
  ) {
    this.memberForm = this.initializeForm();
    this.loading$ = this.membershipService.loading$;
    this.error$ = this.membershipService.error$;
  }

  ngOnInit(): void {
    this.determineFormMode();
    this.setupFormValidation();
    
    if (this.memberId) {
      this.loadMember();
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  // ===== INITIALIZATION =====

  private initializeForm(): FormGroup {
    return this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
      phone: ['', [Validators.required, Validators.pattern(/^[0-9+\-\s()]+$/), Validators.minLength(10)]],
      email: ['', [Validators.required, Validators.email]],
      address: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(500)]],
      dateOfBirth: ['', [Validators.required]],
      gender: ['', [Validators.required]],
      isActive: [true] // Only visible in edit mode
    });
  }

  private updateFormState(): void {
    const isReadOnly = this.isReadOnlyMode();
    
    // Enable/disable form controls based on read-only mode
    Object.keys(this.memberForm.controls).forEach(key => {
      const control = this.memberForm.get(key);
      if (control) {
        if (isReadOnly) {
          control.disable();
        } else {
          control.enable();
        }
      }
    });
  }

  // Helper method to determine if datepicker toggle should be disabled
  isDatePickerDisabled(): boolean {
    return this.isReadOnlyMode();
  }

  // Helper method to determine if submit button should be disabled
  isSubmitButtonDisabled(): boolean {
    return this.memberForm.invalid || this.isSubmitting || this.phoneExists;
  }

  private determineFormMode(): void {
    const url = this.router.url;
    const id = this.route.snapshot.paramMap.get('id');
    
    if (url.includes('/create')) {
      this.formMode = { mode: 'create' };
    } else if (url.includes('/edit') && id) {
      this.formMode = { mode: 'edit' };
      this.memberId = parseInt(id);
    } else if (url.includes('/view') && id) {
      this.formMode = { mode: 'view' };
      this.memberId = parseInt(id);
    }
    
    // Update form state based on mode
    this.updateFormState();
  }

  private setupFormValidation(): void {
    // Phone number validation
    this.subscriptions.add(
      this.memberForm.get('phone')?.valueChanges.subscribe(phone => {
        if (phone && phone.length >= 10) {
          this.validatePhoneNumber(phone);
        }
      })
    );

    // Date of birth validation
    this.subscriptions.add(
      this.memberForm.get('dateOfBirth')?.valueChanges.subscribe(date => {
        if (date) {
          this.validateDateOfBirth(date);
        }
      })
    );
  }

  private loadMember(): void {
    if (!this.memberId) return;

    this.subscriptions.add(
      this.membershipService.getMemberById(this.memberId).subscribe({
        next: (member) => {
          this.member = member;
          this.formMode.member = member;
          this.populateForm(member);
        },
        error: (error) => {
          this.showError('Failed to load member data');
          this.navigateBack();
        }
      })
    );
  }

  private populateForm(member: MemberDto): void {
    this.memberForm.patchValue({
      name: member.name,
      phone: member.phone,
      email: member.email,
      address: member.address,
      dateOfBirth: new Date(member.dateOfBirth),
      gender: member.gender,
      isActive: member.isActive
    });
  }

  // ===== VALIDATION =====

  private validatePhoneNumber(phone: string): void {
    const excludeId = this.formMode.mode === 'edit' && this.memberId ? this.memberId : undefined;
    
    this.subscriptions.add(
      this.membershipService.validatePhone(phone, excludeId).subscribe({
        next: (exists) => {
          this.phoneExists = exists;
          
          if (exists) {
            this.memberForm.get('phone')?.setErrors({ phoneExists: true });
          } else {
            // Remove phoneExists error if it exists
            const currentErrors = this.memberForm.get('phone')?.errors;
            if (currentErrors && currentErrors['phoneExists']) {
              delete currentErrors['phoneExists'];
              const hasOtherErrors = Object.keys(currentErrors).length > 0;
              this.memberForm.get('phone')?.setErrors(hasOtherErrors ? currentErrors : null);
            }
          }
        },
        error: (error) => {
          console.error('Phone validation error:', error);
        }
      })
    );
  }

  private validateDateOfBirth(date: Date): void {
    const today = new Date();
    const age = today.getFullYear() - date.getFullYear();
    
    if (age < 12) {
      this.memberForm.get('dateOfBirth')?.setErrors({ tooYoung: true });
    }
  }

  // ===== FORM SUBMISSION =====

  onSubmit(): void {
    if (this.memberForm.invalid || this.isSubmitting || this.phoneExists) {
      this.markFormGroupTouched();
      return;
    }

    this.isSubmitting = true;
    
    if (this.formMode.mode === 'create') {
      this.createMember();
    } else if (this.formMode.mode === 'edit') {
      this.updateMember();
    }
  }

  private createMember(): void {
    const formValue = this.memberForm.value;
    const request: CreateMemberRequest = {
      name: formValue.name.trim(),
      phone: formValue.phone.trim(),
      email: formValue.email.trim(),
      address: formValue.address.trim(),
      dateOfBirth: formValue.dateOfBirth,
      gender: formValue.gender
    };

    this.subscriptions.add(
      this.membershipService.createMember(request).subscribe({
        next: (member) => {
          this.showSuccess('Member created successfully');
          this.router.navigate(['/dashboard/membership/view', member.id]);
        },
        error: (error) => {
          this.showError('Failed to create member');
          this.isSubmitting = false;
        }
      })
    );
  }

  private updateMember(): void {
    if (!this.memberId) return;

    const formValue = this.memberForm.value;
    const request: UpdateMemberRequest = {
      name: formValue.name.trim(),
      phone: formValue.phone.trim(),
      email: formValue.email.trim(),
      address: formValue.address.trim(),
      dateOfBirth: formValue.dateOfBirth,
      gender: formValue.gender,
      isActive: formValue.isActive
    };

    this.subscriptions.add(
      this.membershipService.updateMember(this.memberId, request).subscribe({
        next: (member) => {
          this.showSuccess('Member updated successfully');
          this.router.navigate(['/dashboard/membership/view', member.id]);
        },
        error: (error) => {
          this.showError('Failed to update member');
          this.isSubmitting = false;
        }
      })
    );
  }

  // ===== FORM HELPERS =====

  private markFormGroupTouched(): void {
    Object.keys(this.memberForm.controls).forEach(key => {
      this.memberForm.get(key)?.markAsTouched();
    });
  }

  getFieldError(fieldName: string): string | null {
    const field = this.memberForm.get(fieldName);
    
    if (field?.errors && field.touched) {
      if (field.errors['required']) return `${fieldName} is required`;
      if (field.errors['email']) return 'Please enter a valid email address';
      if (field.errors['minlength']) return `${fieldName} is too short`;
      if (field.errors['maxlength']) return `${fieldName} is too long`;
      if (field.errors['pattern']) return 'Please enter a valid phone number';
      if (field.errors['phoneExists']) return 'This phone number is already registered';
      if (field.errors['tooYoung']) return 'Member must be at least 12 years old';
    }
    
    return null;
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.memberForm.get(fieldName);
    return !!(field?.invalid && field.touched);
  }

  // ===== NAVIGATION =====

  navigateBack(): void {
    this.router.navigate(['/dashboard/membership']);
  }

  editMember(): void {
    if (this.memberId) {
      this.router.navigate(['/dashboard/membership/edit', this.memberId]);
    }
  }

  viewMember(): void {
    if (this.memberId) {
      this.router.navigate(['/dashboard/membership/view', this.memberId]);
    }
  }

  // ===== UTILITY METHODS =====

  getFormTitle(): string {
    switch (this.formMode.mode) {
      case 'create': return 'Add New Member';
      case 'edit': return 'Edit Member';
      case 'view': return 'Member Details';
      default: return 'Member Form';
    }
  }

  getFormIcon(): string {
    switch (this.formMode.mode) {
      case 'create': return 'person_add';
      case 'edit': return 'edit';
      case 'view': return 'visibility';
      default: return 'person';
    }
  }

  getSubmitButtonText(): string {
    if (this.isSubmitting) return 'Saving...';
    return this.formMode.mode === 'create' ? 'Create Member' : 'Update Member';
  }

  isReadOnlyMode(): boolean {
    return this.formMode.mode === 'view';
  }

  isEditMode(): boolean {
    return this.formMode.mode === 'edit';
  }

  canShowActiveToggle(): boolean {
    return this.formMode.mode === 'edit';
  }

  // ===== UI HELPERS =====

  private showSuccess(message: string): void {
    this.snackBar.open(message, 'Tutup', {
      duration: 3000,
      panelClass: ['success-snackbar']
    });
  }

  private showError(message: string): void {
    this.snackBar.open(message, 'Tutup', {
      duration: 5000,
      panelClass: ['error-snackbar']
    });
  }

  // ===== AGE CALCULATION =====

  calculateAge(birthDate: Date): number {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    
    return age;
  }

  getDisplayAge(): string {
    if (this.member?.dateOfBirth) {
      const age = this.calculateAge(new Date(this.member.dateOfBirth));
      return `${age} years old`;
    }
    return '';
  }

  // ===== UTILITY METHODS =====

  formatDate(date: Date | string | null): string {
    if (!date) return '-';
    const d = new Date(date);
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  }

  formatNumber(num: number): string {
    return new Intl.NumberFormat('id-ID').format(num);
  }

  getTierInfo(tier: string): { color: string; icon: string; name: string } {
    return this.membershipService.getMemberTierInfo(tier);
  }
}