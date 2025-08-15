// ✅ REDESIGNED: User Profile with Angular Signals & Enhanced Desktop UI
import { Component, OnInit, OnDestroy, signal, computed, inject, ViewChild, ElementRef, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, timer } from 'rxjs';
import { takeUntil, debounceTime } from 'rxjs/operators';

import { UserProfileService, UserProfileDto, UpdateUserProfileDto } from '../../core/services/user-profile.service';

// Minimal Material imports for clean design
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

// Enhanced interfaces for better type safety
interface ProfileFormData {
  fullName: string;
  gender: string;
  email: string;
  department: string;
  position: string;
  division: string;
  phoneNumber: string;
  bio: string;
}

interface ProfileStats {
  profileCompleteness: number;
  lastUpdated: Date;
  photoSize: number;
  accountAge: number;
}

@Component({
  selector: 'app-user-profile',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './user-profile.component.html',
  styleUrls: ['./user-profile.component.scss']
})
export class UserProfileComponent implements OnInit, OnDestroy {
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;
  
  private destroy$ = new Subject<void>();

  // ===== SIGNAL-BASED STATE MANAGEMENT =====
  // Inject services
  private fb = inject(FormBuilder);
  private userProfileService = inject(UserProfileService);
  private router = inject(Router);

  // Core data signals
  private profileData = signal<UserProfileDto | null>(null);
  private avatarPreviewUrl = signal<string | null>(null);
  private selectedPhotoFile = signal<File | null>(null);

  // UI state signals
  private loadingState = signal<boolean>(false);
  private uploadingState = signal<boolean>(false);
  private savingState = signal<boolean>(false);
  private dragOverState = signal<boolean>(false);
  
  // Message signals
  private successMsg = signal<string>('');
  private errorMsg = signal<string>('');

  // Form options signals
  private genderOpts = signal<any[]>([]);
  private departmentOpts = signal<any[]>([]);
  private positionOpts = signal<any[]>([]);

  // Form
  profileForm!: FormGroup;

  // ===== COMPUTED PROPERTIES =====
  readonly currentProfile = computed(() => this.profileData());
  readonly avatarPreview = computed(() => this.avatarPreviewUrl());
  readonly selectedFile = computed(() => this.selectedPhotoFile());
  readonly isLoading = computed(() => this.loadingState());
  readonly isUploading = computed(() => this.uploadingState());
  readonly isSaving = computed(() => this.savingState());
  readonly isDragOver = computed(() => this.dragOverState());
  readonly successMessage = computed(() => this.successMsg());
  readonly errorMessage = computed(() => this.errorMsg());
  
  readonly genderOptions = computed(() => this.genderOpts());
  readonly departmentOptions = computed(() => this.departmentOpts());
  readonly positionOptions = computed(() => this.positionOpts());

  readonly hasChanges = computed(() => {
    return this.profileForm?.dirty || !!this.selectedFile();
  });

  readonly charCount = computed(() => {
    return this.profileForm?.get('bio')?.value?.length || 0;
  });

  readonly currentAvatarUrl = computed(() => {
    return this.avatarPreview() || 
           this.userProfileService.getAvatarUrl(this.currentProfile()?.photoUrl);
  });

  readonly hasCustomPhoto = computed(() => {
    return !!this.currentProfile()?.photoUrl;
  });

  readonly profileStats = computed((): ProfileStats => {
    const profile = this.currentProfile();
    if (!profile) {
      return {
        profileCompleteness: 0,
        lastUpdated: new Date(),
        photoSize: 0,
        accountAge: 0
      };
    }

    // Calculate profile completeness
    const requiredFields = ['fullName', 'email', 'gender'];
    const optionalFields = ['department', 'position', 'division', 'phoneNumber', 'bio'];
    
    let completed = 0;
    let total = requiredFields.length + optionalFields.length + (profile.photoUrl ? 1 : 0);

    // Check required fields
    requiredFields.forEach(field => {
      if ((profile as any)[field]) completed++;
    });

    // Check optional fields
    optionalFields.forEach(field => {
      if ((profile as any)[field]) completed++;
    });

    // Add photo if exists
    if (profile.photoUrl) completed++;
    total++; // Include photo in total

    const completeness = Math.round((completed / total) * 100);

    return {
      profileCompleteness: completeness,
      lastUpdated: profile.updatedAt ? new Date(profile.updatedAt) : new Date(),
      photoSize: 0, // Would need to be calculated from actual file
      accountAge: profile.createdAt 
        ? Math.floor((Date.now() - new Date(profile.createdAt).getTime()) / (1000 * 60 * 60 * 24))
        : 0
    };
  });

  constructor() {
    this.initializeForm();
    this.initializeOptions();
    this.setupAutoSave();
  }

  ngOnInit(): void {
    console.log('🔍 User Profile Component initialized with Signals');
    this.loadProfile();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ===== INITIALIZATION METHODS =====
  private initializeForm(): void {
    this.profileForm = this.fb.group({
      fullName: ['', [Validators.required, Validators.maxLength(100)]],
      gender: ['', Validators.required],
      email: ['', [Validators.required, Validators.email, Validators.maxLength(100)]],
      department: [''],
      position: [''],
      division: ['', Validators.maxLength(50)],
      phoneNumber: ['', [Validators.pattern(/^[0-9+\-\s]+$/), Validators.maxLength(20)]],
      bio: ['', Validators.maxLength(500)]
    });
  }

  private initializeOptions(): void {
    this.genderOpts.set(this.userProfileService.getGenderOptions());
    this.departmentOpts.set(this.userProfileService.getDepartmentOptions());
    this.positionOpts.set(this.userProfileService.getPositionOptions());
  }

  private setupAutoSave(): void {
    // Auto-save draft changes every 30 seconds
    timer(30000, 30000).pipe(
      takeUntil(this.destroy$)
    ).subscribe(() => {
      if (this.hasChanges() && this.profileForm.valid) {
        console.log('💾 Auto-saving profile draft...');
        // Could implement draft saving here
      }
    });
  }

  // ===== DATA LOADING METHODS WITH SIGNALS =====
  private async loadProfile(): Promise<void> {
    this.loadingState.set(true);
    this.clearMessages();

    try {
      const response = await this.userProfileService.getCurrentProfile().toPromise();
      if (response?.success && response.data) {
        this.profileData.set(response.data);
        this.populateForm(response.data);
        this.avatarPreviewUrl.set(this.userProfileService.getAvatarUrl(response.data.photoUrl));
        console.log('✅ Profile loaded successfully');
      } else {
        this.showError(response?.message || 'Failed to load profile');
      }
    } catch (error: any) {
      console.error('Error loading profile:', error);
      this.showError('Failed to load profile. Please try again.');
    } finally {
      this.loadingState.set(false);
    }
  }

  refreshProfile(): void {
    console.log('🔄 Manual profile refresh triggered');
    this.loadProfile();
  }

  private populateForm(profile: UserProfileDto): void {
    this.profileForm.patchValue({
      fullName: profile.fullName,
      gender: profile.gender,
      email: profile.email,
      department: profile.department || '',
      position: profile.position || '',
      division: profile.division || '',
      phoneNumber: profile.phoneNumber || '',
      bio: profile.bio || ''
    });
  }

  // ===== PHOTO HANDLING WITH SIGNALS =====
  onPhotoSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    
    if (!file) return;
    this.processSelectedFile(file);
  }

  // Enhanced drag & drop with signals
  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.dragOverState.set(true);
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.dragOverState.set(false);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.dragOverState.set(false);
    
    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.processSelectedFile(files[0]);
    }
  }

  private processSelectedFile(file: File): void {
    // Validate file
    const validation = this.userProfileService.validatePhoto(file);
    if (!validation.valid) {
      this.showError(validation.error!);
      return;
    }

    this.selectedPhotoFile.set(file);
    
    // Create preview with signals
    const reader = new FileReader();
    reader.onload = (e) => {
      this.avatarPreviewUrl.set(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  }

  async uploadPhoto(): Promise<void> {
    const file = this.selectedFile();
    if (!file) return;

    this.uploadingState.set(true);
    this.clearMessages();

    try {
      const response = await this.userProfileService.uploadPhoto(file).toPromise();
      if (response?.success) {
        this.showSuccess('Photo uploaded successfully!');
        this.selectedPhotoFile.set(null);
        // Refresh profile to get updated photo URL
        await this.loadProfile();
      } else {
        this.showError(response?.message || 'Failed to upload photo');
      }
    } catch (error: any) {
      console.error('Error uploading photo:', error);
      this.showError('Failed to upload photo. Please try again.');
    } finally {
      this.uploadingState.set(false);
    }
  }

  async deletePhoto(): Promise<void> {
    const profile = this.currentProfile();
    if (!profile?.photoUrl) return;

    if (!confirm('Are you sure you want to delete your profile photo?')) return;

    this.uploadingState.set(true);
    this.clearMessages();

    try {
      const response = await this.userProfileService.deletePhoto().toPromise();
      if (response?.success) {
        this.showSuccess('Photo deleted successfully!');
        this.avatarPreviewUrl.set(this.userProfileService.getAvatarUrl());
        this.selectedPhotoFile.set(null);
        // Refresh profile to update data
        await this.loadProfile();
      } else {
        this.showError(response?.message || 'Failed to delete photo');
      }
    } catch (error: any) {
      console.error('Error deleting photo:', error);
      this.showError('Failed to delete photo. Please try again.');
    } finally {
      this.uploadingState.set(false);
    }
  }

  triggerFileInput(): void {
    this.fileInput.nativeElement.click();
  }

  // ===== FORM SUBMISSION WITH SIGNALS =====
  async onSubmit(): Promise<void> {
    if (this.profileForm.invalid) {
      this.markFormGroupTouched();
      this.showError('Please fill in all required fields correctly');
      return;
    }

    this.savingState.set(true);
    this.clearMessages();

    const updateDto: UpdateUserProfileDto = this.profileForm.value;

    try {
      const response = await this.userProfileService.updateProfile(updateDto).toPromise();
      if (response?.success) {
        this.showSuccess('Profile updated successfully!');
        if (response.data) {
          this.profileData.set(response.data);
        }
        // Mark form as pristine after successful save
        this.profileForm.markAsPristine();
      } else {
        this.showError(response?.message || 'Failed to update profile');
      }
    } catch (error: any) {
      console.error('Error updating profile:', error);
      this.showError('Failed to update profile. Please try again.');
    } finally {
      this.savingState.set(false);
    }
  }

  resetForm(): void {
    const profile = this.currentProfile();
    if (profile) {
      this.populateForm(profile);
      this.selectedPhotoFile.set(null);
      this.avatarPreviewUrl.set(this.userProfileService.getAvatarUrl(profile.photoUrl));
    }
  }

  private markFormGroupTouched(): void {
    Object.keys(this.profileForm.controls).forEach(key => {
      const control = this.profileForm.get(key);
      control?.markAsTouched();
    });
  }

  // Form validation helpers
  isFieldInvalid(fieldName: string): boolean {
    const field = this.profileForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  getFieldError(fieldName: string): string {
    const field = this.profileForm.get(fieldName);
    if (field && field.errors && (field.dirty || field.touched)) {
      if (field.errors['required']) return `${this.getFieldLabel(fieldName)} wajib diisi`;
      if (field.errors['email']) return 'Format email tidak valid';
      if (field.errors['maxlength']) return `${this.getFieldLabel(fieldName)} terlalu panjang`;
      if (field.errors['pattern']) return `Format ${this.getFieldLabel(fieldName)} tidak valid`;
    }
    return '';
  }

  private getFieldLabel(fieldName: string): string {
    const labels: { [key: string]: string } = {
      fullName: 'Nama lengkap',
      gender: 'Jenis kelamin',
      email: 'Email',
      department: 'Departemen',
      position: 'Jabatan',
      division: 'Divisi',
      phoneNumber: 'Nomor telepon',
      bio: 'Bio'
    };
    return labels[fieldName] || fieldName;
  }

  // ===== MESSAGE HANDLING WITH SIGNALS =====
  private showSuccess(message: string): void {
    this.successMsg.set(message);
    this.errorMsg.set('');
    setTimeout(() => this.successMsg.set(''), 5000);
  }

  private showError(message: string): void {
    this.errorMsg.set(message);
    this.successMsg.set('');
    setTimeout(() => this.errorMsg.set(''), 5000);
  }

  clearMessages(): void {
    this.successMsg.set('');
    this.errorMsg.set('');
  }

  // ===== NAVIGATION METHODS =====
  goBack(): void {
    this.router.navigate(['/dashboard']);
  }

  // ===== UTILITY METHODS FOR TEMPLATE =====
  getCompletenessMessage(): string {
    const completeness = this.profileStats().profileCompleteness;
    if (completeness >= 80) return 'Excellent profile!';
    if (completeness >= 60) return 'Good progress';
    if (completeness >= 40) return 'Keep improving';
    return 'Complete your profile';
  }

  formatRelativeTime(date: Date): string {
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 30) return `${diffInDays}d ago`;
    
    const diffInMonths = Math.floor(diffInDays / 30);
    return `${diffInMonths}mo ago`;
  }

  getRoleIcon(): string {
    const profile = this.currentProfile();
    if (!profile) return 'person';
    
    switch (profile.role?.toLowerCase()) {
      case 'admin':
        return 'admin_panel_settings';
      case 'manager':
        return 'manage_accounts';
      case 'user':
        return 'person';
      default:
        return 'person';
    }
  }

  getRoleDisplayName(): string {
    const profile = this.currentProfile();
    if (!profile) return 'Karyawan';
    
    switch (profile.role?.toLowerCase()) {
      case 'admin':
        return 'Administrator Toko';
      case 'manager':
        return 'Manager Toko';
      case 'user':
        return 'Karyawan';
      default:
        return profile.role || 'Karyawan';
    }
  }
}