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
  template: `
    <div class="profile-container">
      
      <!-- Enhanced Header -->
      <section class="profile-header">
        <div class="header-content">
          <div class="header-text">
            <h1 class="page-title">
              <mat-icon>account_circle</mat-icon>
              User Profile
            </h1>
            <p class="page-subtitle">Manage your account information and preferences</p>
          </div>
          
          <div class="header-actions">
            <button class="btn btn-outline" (click)="goBack()" [disabled]="isLoading()">
              <mat-icon>arrow_back</mat-icon>
              Back to Dashboard
            </button>
            
            <button 
              class="btn btn-primary" 
              (click)="refreshProfile()"
              [disabled]="isLoading()">
              <mat-icon [class.spinning]="isLoading()">refresh</mat-icon>
              Refresh
            </button>
          </div>
        </div>
      </section>

      <!-- Profile Stats Cards -->
      <section class="profile-stats-section">
        <div class="stats-grid">
          <div class="stat-card completeness">
            <div class="stat-icon">
              <mat-icon>trending_up</mat-icon>
            </div>
            <div class="stat-content">
              <div class="stat-value">{{ profileStats().profileCompleteness }}%</div>
              <div class="stat-label">Profile Complete</div>
              <div class="stat-meta">{{ getCompletenessMessage() }}</div>
            </div>
          </div>
          
          <div class="stat-card updated">
            <div class="stat-icon">
              <mat-icon>schedule</mat-icon>
            </div>
            <div class="stat-content">
              <div class="stat-value">{{ formatRelativeTime(profileStats().lastUpdated) }}</div>
              <div class="stat-label">Last Updated</div>
              <div class="stat-meta">Profile information</div>
            </div>
          </div>
          
          <div class="stat-card role">
            <div class="stat-icon">
              <mat-icon>{{ getRoleIcon() }}</mat-icon>
            </div>
            <div class="stat-content">
              <div class="stat-value">{{ getRoleDisplayName() }}</div>
              <div class="stat-label">Current Role</div>
              <div class="stat-meta">System access level</div>
            </div>
          </div>
          
          <div class="stat-card account-age">
            <div class="stat-icon">
              <mat-icon>cake</mat-icon>
            </div>
            <div class="stat-content">
              <div class="stat-value">{{ profileStats().accountAge }}</div>
              <div class="stat-label">Days Active</div>
              <div class="stat-meta">Since registration</div>
            </div>
          </div>
        </div>
      </section>

      <!-- Success/Error Messages -->
      <div class="message-container" *ngIf="successMessage() || errorMessage()">
        <div class="message success-message" *ngIf="successMessage()">
          <mat-icon>check_circle</mat-icon>
          <span>{{ successMessage() }}</span>
          <button class="close-btn" (click)="clearMessages()">
            <mat-icon>close</mat-icon>
          </button>
        </div>
        
        <div class="message error-message" *ngIf="errorMessage()">
          <mat-icon>error</mat-icon>
          <span>{{ errorMessage() }}</span>
          <button class="close-btn" (click)="clearMessages()">
            <mat-icon>close</mat-icon>
          </button>
        </div>
      </div>

      <!-- Main Profile Content -->
      <div class="profile-content">
        
        <!-- Loading State -->
        <div class="loading-container" *ngIf="isLoading() && !currentProfile()">
          <div class="loading-spinner">
            <mat-spinner></mat-spinner>
          </div>
          <p>Loading profile...</p>
        </div>

        <!-- Profile Form -->
        <div class="profile-form-container" *ngIf="!isLoading() || currentProfile()">
          
          <!-- Avatar Section -->
          <section class="avatar-section">
            <div class="avatar-container">
              <div class="avatar-wrapper"
                   (dragover)="onDragOver($event)"
                   (dragleave)="onDragLeave($event)"
                   (drop)="onDrop($event)"
                   [class.drag-over]="isDragOver()">
                
                <div class="avatar-image">
                  <img [src]="currentAvatarUrl()" 
                       alt="Profile Photo"
                       class="avatar-img">
                  <div class="avatar-overlay">
                    <mat-icon>camera_alt</mat-icon>
                    <span>Change Photo</span>
                  </div>
                </div>
                
                <input #fileInput 
                       type="file" 
                       accept="image/*" 
                       (change)="onPhotoSelect($event)"
                       class="file-input">
              </div>
              
              <div class="avatar-actions">
                <button class="btn btn-outline btn-sm" 
                        (click)="triggerFileInput()"
                        [disabled]="isUploading()">
                  <mat-icon>upload</mat-icon>
                  Upload Photo
                </button>
                
                <button class="btn btn-outline btn-sm" 
                        *ngIf="hasCustomPhoto()"
                        (click)="deletePhoto()"
                        [disabled]="isUploading()">
                  <mat-icon>delete</mat-icon>
                  Remove
                </button>
                
                <button class="btn btn-primary btn-sm" 
                        *ngIf="selectedFile()"
                        (click)="uploadPhoto()"
                        [disabled]="isUploading()">
                  <mat-icon [class.spinning]="isUploading()">cloud_upload</mat-icon>
                  {{ isUploading() ? 'Uploading...' : 'Save Photo' }}
                </button>
              </div>
              
              <div class="avatar-info">
                <p class="photo-requirements">
                  <mat-icon>info</mat-icon>
                  Max 2MB • JPG, PNG, WEBP • 400x400 recommended
                </p>
              </div>
            </div>
          </section>

          <!-- Form Section -->
          <section class="form-section">
            <form [formGroup]="profileForm" (ngSubmit)="onSubmit()">
              
              <!-- Personal Information -->
              <div class="form-group-section">
                <h3 class="section-title">
                  <mat-icon>person</mat-icon>
                  Personal Information
                </h3>
                
                <div class="form-grid">
                  <!-- Full Name -->
                  <div class="form-field">
                    <label for="fullName" class="required">Full Name</label>
                    <input 
                      id="fullName"
                      type="text" 
                      formControlName="fullName"
                      class="form-control"
                      [class.error]="isFieldInvalid('fullName')"
                      placeholder="Enter your full name">
                    <div class="error-message" *ngIf="isFieldInvalid('fullName')">
                      {{ getFieldError('fullName') }}
                    </div>
                  </div>
                  
                  <!-- Gender -->
                  <div class="form-field">
                    <label for="gender" class="required">Gender</label>
                    <select 
                      id="gender"
                      formControlName="gender"
                      class="form-control"
                      [class.error]="isFieldInvalid('gender')">
                      <option value="">Select gender</option>
                      <option *ngFor="let option of genderOptions()" [value]="option.value">
                        {{ option.label }}
                      </option>
                    </select>
                    <div class="error-message" *ngIf="isFieldInvalid('gender')">
                      {{ getFieldError('gender') }}
                    </div>
                  </div>
                  
                  <!-- Email -->
                  <div class="form-field full-width">
                    <label for="email" class="required">Email Address</label>
                    <input 
                      id="email"
                      type="email" 
                      formControlName="email"
                      class="form-control"
                      [class.error]="isFieldInvalid('email')"
                      placeholder="Enter your email address">
                    <div class="error-message" *ngIf="isFieldInvalid('email')">
                      {{ getFieldError('email') }}
                    </div>
                  </div>
                  
                  <!-- Phone -->
                  <div class="form-field full-width">
                    <label for="phoneNumber">Phone Number</label>
                    <input 
                      id="phoneNumber"
                      type="tel" 
                      formControlName="phoneNumber"
                      class="form-control"
                      [class.error]="isFieldInvalid('phoneNumber')"
                      placeholder="Enter your phone number">
                    <div class="error-message" *ngIf="isFieldInvalid('phoneNumber')">
                      {{ getFieldError('phoneNumber') }}
                    </div>
                  </div>
                </div>
              </div>

              <!-- Work Information -->
              <div class="form-group-section">
                <h3 class="section-title">
                  <mat-icon>business</mat-icon>
                  Work Information
                </h3>
                
                <div class="form-grid">
                  <!-- Department -->
                  <div class="form-field">
                    <label for="department">Department</label>
                    <select 
                      id="department"
                      formControlName="department"
                      class="form-control">
                      <option value="">Select department</option>
                      <option *ngFor="let option of departmentOptions()" [value]="option.value">
                        {{ option.label }}
                      </option>
                    </select>
                  </div>
                  
                  <!-- Position -->
                  <div class="form-field">
                    <label for="position">Position</label>
                    <select 
                      id="position"
                      formControlName="position"
                      class="form-control">
                      <option value="">Select position</option>
                      <option *ngFor="let option of positionOptions()" [value]="option.value">
                        {{ option.label }}
                      </option>
                    </select>
                  </div>
                  
                  <!-- Division -->
                  <div class="form-field full-width">
                    <label for="division">Division</label>
                    <input 
                      id="division"
                      type="text" 
                      formControlName="division"
                      class="form-control"
                      placeholder="Enter your division">
                  </div>
                </div>
              </div>

              <!-- Bio Section -->
              <div class="form-group-section">
                <h3 class="section-title">
                  <mat-icon>description</mat-icon>
                  About Me
                </h3>
                
                <div class="form-field">
                  <label for="bio">Bio</label>
                  <textarea 
                    id="bio"
                    formControlName="bio"
                    class="form-control"
                    rows="4"
                    maxlength="500"
                    placeholder="Tell us about yourself..."></textarea>
                  <div class="char-counter">
                    {{ charCount() }}/500 characters
                  </div>
                </div>
              </div>

              <!-- Form Actions -->
              <div class="form-actions">
                <button type="button" 
                        class="btn btn-outline" 
                        (click)="resetForm()"
                        [disabled]="isSaving() || !hasChanges()">
                  <mat-icon>refresh</mat-icon>
                  Reset Changes
                </button>
                
                <button type="submit" 
                        class="btn btn-primary" 
                        [disabled]="profileForm.invalid || isSaving() || !hasChanges()">
                  <mat-icon [class.spinning]="isSaving()">save</mat-icon>
                  {{ isSaving() ? 'Saving...' : 'Save Profile' }}
                </button>
              </div>
            </form>
          </section>
        </div>
      </div>
    </div>
  `,
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